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
    return this.#request(`/pixels/${x}/${y}`);
  }

  async #request(path, options = {}) {
    const url = path.startsWith("http") ? path : `${this.#baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (this.#sessionId) headers.Authorization = `Bearer ${this.#sessionId}`;

    const response = await fetch(url, { ...options, headers });
    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const message = payload?.message || `API ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }
}
