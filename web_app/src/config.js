const defaultConfig = {
  apiBaseUrl: "https://jw7jhjmjfb.execute-api.eu-west-3.amazonaws.com",
  pollingIntervalMs: 5000,
  board: { width: 256, height: 256 },
  discordAuthorizeEndpoint: "https://discord.com/oauth2/authorize",
  discordClientId: "1436365247056314569",
  discordScopes: "identify",
  discordRedirectUri: null,
  authExchangePath: "/auth/discord/exchange",
  redirectAuthUri:
    "https://jw7jhjmjfb.execute-api.eu-west-3.amazonaws.com/auth",
};

export const appConfig = {
  ...defaultConfig,
  ...(typeof window !== "undefined" ? window.__PIXEL_APP_CONFIG__ ?? {} : {}),
};

export const colorPalette = [
  "#000000",
  "#FFFFFF",
  "#FF4500",
  "#FFA800",
  "#FFD700",
  "#00A368",
  "#3690EA",
  "#9C27B0",
  "#FFC0CB",
  "#8B4513",
];

export const blankSnapshot = {
  width: defaultConfig.board.width,
  height: defaultConfig.board.height,
  pixels: [],
};
