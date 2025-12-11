import { useCallback } from "react";
import {
  cleanOAuthQuery,
  clearOAuthSession,
  generateRandomString,
  pkceChallenge,
  readOAuthSession,
  resolveRedirectUri,
  storeOAuthSession,
} from "../utils/oauth";

export const useDiscordAuth = ({ api, config, onUser, onStatus }) => {
  const notify = (type, message) => {
    if (!onStatus) return;
    onStatus({ type, message });
  };

  const fetchUser = useCallback(async () => {
    if (!api.token) return;
    try {
      const profile = await api.me();
      onUser(profile);
    } catch (error) {
      console.warn("Profil indisponible", error);
      api.setToken(null);
      onUser(null);
    }
  }, [api, onUser]);

  const startDiscordLogin = useCallback(() => {
    if (!config.discordClientId) return;

    const redirectUri = resolveRedirectUri(config.redirectAuthUri);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.discordClientId,
      redirect_uri: redirectUri,
      scope: config.discordScopes ?? "identify",
    });

    const authorizeEndpoint =
      config.discordAuthorizeEndpoint ?? "https://discord.com/oauth2/authorize";
    window.location.href = `${authorizeEndpoint}?${params.toString()}`;
  }, [config]);

  const checkOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code")) return;

    try {
      const data = await api.exchangeDiscordCode({
        code: params.get("code"),
      });
      const token = data.token ?? data.access_token;
      if (!token) return;

      api.setToken(token);
      onUser(data.user ?? null);
      cleanOAuthQuery();
    } catch {
      cleanOAuthQuery();
    }
  }, [api, onUser]);

  return {
    fetchUser,
    startDiscordLogin,
    checkOAuthCallback,
  };
};
