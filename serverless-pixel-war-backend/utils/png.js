const zlib = require("zlib");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_TYPE_RGBA = 6;
const BIT_DEPTH = 8;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const generatePngBuffer = ({
  width,
  height,
  pixels,
  background = "#000000",
}) => {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("PNG dimensions invalid");
  }
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    rawData[offset] = 0; // no filter
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      const color = pixels.get(key) || background;
      const { r, g, b, a } = parseColor(color);
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
      rawData[offset + 3] = a;
      offset += 4;
    }
  }

  const ihdr = buildIHDR(width, height);
  const idat = buildIDAT(rawData);
  const iend = buildChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([PNG_SIGNATURE, ihdr, idat, iend]);
};

function buildIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = BIT_DEPTH;
  data[9] = COLOR_TYPE_RGBA;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return buildChunk("IHDR", data);
}

function buildIDAT(rawData) {
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return buildChunk("IDAT", compressed);
}

function buildChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([size, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseColor(color) {
  if (!color) return { r: 0, g: 0, b: 0, a: 255 };
  let hex = color.trim();
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) || 0xff : 0xff;
  return { r, g, b, a };
}

module.exports = { generatePngBuffer };
