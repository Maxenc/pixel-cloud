const OAUTH_STATE_KEY = "discord_oauth_state";
const OAUTH_VERIFIER_KEY = "discord_code_verifier";

export const resolveRedirectUri = (override) => {
  if (override) {
    const normalized = override.trim();
    if (normalized) return normalized;
  }
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const pathname = window.location.pathname || "/";
  const normalizedPath =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  const redirectUri = `${origin}${normalizedPath}`;
  console.log("[OAuth] Redirect URI résolu:", redirectUri);
  return redirectUri;
};

export const storeOAuthSession = ({ state, codeVerifier }) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  sessionStorage.setItem(OAUTH_VERIFIER_KEY, codeVerifier);
};

export const readOAuthSession = () => {
  if (typeof window === "undefined") return { state: null, codeVerifier: null };
  return {
    state: sessionStorage.getItem(OAUTH_STATE_KEY),
    codeVerifier: sessionStorage.getItem(OAUTH_VERIFIER_KEY),
  };
};

export const clearOAuthSession = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
};

export const cleanOAuthQuery = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, url.toString());
};

export const extractSessionDataFromUrl = () => {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return null;
  const username = url.searchParams.get("username");
  const avatar = url.searchParams.get("avatar");
  const userId = url.searchParams.get("userId");

  url.searchParams.delete("sessionId");
  url.searchParams.delete("username");
  url.searchParams.delete("avatar");
  url.searchParams.delete("userId");
  window.history.replaceState({}, document.title, url.toString());
  return {
    sessionId,
    username: username || null,
    avatar: avatar || null,
    userId: userId || null,
  };
};

export const generateRandomString = (length = 64) => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values)
    .map((value) => charset[value % charset.length])
    .join("");
};

export const pkceChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
