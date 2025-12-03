import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// Pixel command
const PIXEL_COMMAND = {
  name: "pixel",
  description: "Place a pixel on the canvas",
  options: [
    {
      type: 3, // STRING
      name: "color",
      description: "Choose a color",
      required: true,
      choices: [
        { name: "Black", value: "#000000" },
        { name: "White", value: "#FFFFFF" },
        { name: "Red", value: "#FF4500" },
        { name: "Orange", value: "#FFA800" },
        { name: "Yellow", value: "#FFD700" },
        { name: "Green", value: "#00A368" },
        { name: "Blue", value: "#3690EA" },
        { name: "Purple", value: "#9C27B0" },
        { name: "Pink", value: "#FFC0CB" },
        { name: "Brown", value: "#8B4513" },
      ],
    },
    {
      type: 4, // INTEGER
      name: "x",
      description: "X coordinate (0-255)",
      required: true,
      min_value: 0,
      max_value: 255,
    },
    {
      type: 4, // INTEGER
      name: "y",
      description: "Y coordinate (0-255)",
      required: true,
      min_value: 0,
      max_value: 255,
    },
  ],
  type: 1,
};

// Snapshot command
const SNAPSHOT_COMMAND = {
  name: "snapshot",
  description: "Create a snapshot of the canvas (Admin only)",
  type: 1,
};

const ALL_COMMANDS = [PIXEL_COMMAND, SNAPSHOT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
