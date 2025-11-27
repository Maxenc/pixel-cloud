import { useCallback, useEffect, useRef, useState } from "react";
import { appConfig } from "../config";

const drawSnapshot = (canvas, snapshot) => {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = snapshot?.width ?? appConfig.board.width;
  const height = snapshot?.height ?? appConfig.board.height;

  canvas.width = width;
  canvas.height = height;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  (snapshot?.pixels ?? []).forEach(({ index, color }) => {
    if (typeof index !== "number") return;
    const x = index % width;
    const y = Math.floor(index / width);
    ctx.fillStyle = color ?? "#000000";
    ctx.fillRect(x, y, 1, 1);
  });
};

const computeHighlightStyle = (canvas, pixel) => {
  if (!canvas || !pixel) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const pixelWidth = rect.width / canvas.width;
  const pixelHeight = rect.height / canvas.height;

  return {
    width: `${pixelWidth}px`,
    height: `${pixelHeight}px`,
    left: `${pixel.x * pixelWidth}px`,
    top: `${pixel.y * pixelHeight}px`,
  };
};

export function CanvasStage({ snapshot, selectedPixel, zoomLevel, onSelect }) {
  const canvasRef = useRef(null);
  const [highlightStyle, setHighlightStyle] = useState(null);

  useEffect(() => {
    drawSnapshot(canvasRef.current, snapshot);
  }, [snapshot]);

  const updateHighlight = useCallback(() => {
    setHighlightStyle(computeHighlightStyle(canvasRef.current, selectedPixel));
  }, [selectedPixel, snapshot]);

  useEffect(() => {
    updateHighlight();
    if (typeof window === "undefined") return undefined;
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [updateHighlight]);

  useEffect(() => {
    updateHighlight();
  }, [zoomLevel, updateHighlight]);

  useEffect(() => {
    updateHighlight();
  }, [snapshot, updateHighlight]);

  const handleClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    onSelect({ x, y });
  };

  return (
    <section className="canvas-wrapper">
      <div
        className="canvas-inner"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <canvas
          ref={canvasRef}
          className="pixel-canvas"
          onClick={handleClick}
        />
        {selectedPixel && highlightStyle && (
          <div className="pixel-highlight" style={highlightStyle} />
        )}
      </div>
    </section>
  );
}

