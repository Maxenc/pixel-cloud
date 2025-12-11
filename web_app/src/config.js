const defaultConfig = {
  apiBaseUrl: "https://mahymtjou4.execute-api.eu-west-3.amazonaws.com",
  pollingIntervalMs: 5000,
  wsBaseUrl: "wss://qiq8g139y4.execute-api.eu-west-3.amazonaws.com/cloud/",
  board: { width: 256, height: 256 },
  discordAuthorizeEndpoint: "https://discord.com/oauth2/authorize",
  discordClientId: "1436365247056314569",
  discordScopes: "identify",
  discordRedirectUri: null,
  authExchangePath: "/auth/discord/exchange",
  redirectAuthUri:
    "https://mahymtjou4.execute-api.eu-west-3.amazonaws.com/auth",
  rateLimit: {
    maxPlacements: 20,
    windowSeconds: 60,
  },
  snapshotAdminId: "285192042693525510",
};

const runtimeConfig =
  typeof window !== "undefined" ? window.__PIXEL_APP_CONFIG__ ?? {} : {};

export const appConfig = {
  ...defaultConfig,
  ...runtimeConfig,
  rateLimit: {
    ...defaultConfig.rateLimit,
    ...(runtimeConfig?.rateLimit ?? {}),
  },
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
