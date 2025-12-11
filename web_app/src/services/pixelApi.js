export class PixelApi {
  #sessionId = null;
  #baseUrl;

  constructor(config) {
    this.#baseUrl = config.apiBaseUrl?.replace(/\/$/, "") ?? "";
    if (typeof window !== "undefined") {
      this.#sessionId = window.localStorage.getItem("pixel_token");
    }
  }

  setToken(token) {
    this.#sessionId = token;
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem("pixel_token", token);
    else window.localStorage.removeItem("pixel_token");
  }

  get token() {
    return this.#sessionId;
  }

  async getSnapshot({ clientId, sessionId } = {}) {
    const params = new URLSearchParams();
    if (clientId) params.append("connectionId", clientId);
    if (sessionId) params.append("sessionId", sessionId);
    const suffix = params.toString() ? `/view?${params.toString()}` : "/view";
    return this.#request(suffix);
  }

  async placePixel(payload) {
    return this.#request("/draw", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getPixelMeta(x, y) {
    return {
      x,
      y,
      color: "#000000",
      author: "loading...",
      updated_at: new Date().toISOString(),
    };
  }

  async requestSnapshot(userId) {
    return this.#request("/admin/snapshots", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async pauseGame(userId) {
    return this.#request("/admin/session/pause", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async resumeGame(userId) {
    return this.#request("/admin/session/resume", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async getSnapshots() {
    return this.#request("/snapshots");
  }

  async getGameState() {
    return this.#request("/state");
  }

  async #request(path, options = {}) {
    const url = path.startsWith("http") ? path : `${this.#baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (this.#sessionId) headers.Authorization = `Bearer ${this.#sessionId}`;

    const response = await fetch(url, { ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();
    let payload = null;

    if (rawBody) {
      const parseJson = () => {
        try {
          return JSON.parse(rawBody);
        } catch {
          return rawBody;
        }
      };

      if (contentType.toLowerCase().includes("application/json")) {
        payload = parseJson();
      } else {
        payload = parseJson();
      }
    }

    if (!response.ok) {
      const message =
        payload?.error || payload?.message || `API ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }
}
