import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appConfig, blankSnapshot, colorPalette } from "./config";
import { PixelApi } from "./services/pixelApi";
import { buildMockMeta } from "./utils/mock";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { Header } from "./components/Header";
import { CanvasStage } from "./components/CanvasStage";
import { PixelInfoCard } from "./components/PixelInfoCard";
import { ColorPickerPopover } from "./components/ColorPickerPopover";
import { StatusToast } from "./components/StatusToast";
import { extractSessionDataFromUrl } from "./utils/oauth";

export default function App() {
  const api = useMemo(() => new PixelApi(appConfig), []);
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const refreshSnapshotRef = useRef(null);
  const [snapshot, setSnapshot] = useState(blankSnapshot);
  const [clientId, setClientId] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("pixel_client_id");
  });
  const [user, setUserState] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("pixel_user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [pixelMeta, setPixelMeta] = useState(null);
  const [currentColor, setCurrentColor] = useState(colorPalette[0]);
  const [status, setStatus] = useState(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [placingPixel, setPlacingPixel] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pixelAnchor, setPixelAnchor] = useState(null);

  const quickPalette = colorPalette.slice(0, 8);
  const cooldownDuration = appConfig.rateLimit?.windowSeconds ?? 60;
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const id = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const canPlacePixel = Boolean(user) && cooldown === 0;

  const notifyCooldown = () => {
    setStatus({
      type: "error",
      message: `Attends ${cooldown || cooldownDuration}s avant de rejouer.`,
    });
  };

  const persistUser = useCallback((nextUser) => {
    setUserState(nextUser);
    if (typeof window === "undefined") return;
    if (nextUser)
      window.localStorage.setItem("pixel_user", JSON.stringify(nextUser));
    else window.localStorage.removeItem("pixel_user");
  }, []);

  const { startDiscordLogin } = useDiscordAuth({
    api,
    config: appConfig,
    onUser: persistUser,
    onStatus: ({ type, message }) => setStatus(type ? { type, message } : null),
  });

  const applyPixelUpdate = useCallback((pixel) => {
    if (!pixel) return;
    const width = appConfig.board.width;
    const index =
      typeof pixel.x === "number" && typeof pixel.y === "number"
        ? pixel.y * width + pixel.x
        : pixel.index;
    if (typeof index !== "number") return;
    const fallbackX = typeof pixel.x === "number" ? pixel.x : index % width;
    const fallbackY =
      typeof pixel.y === "number" ? pixel.y : Math.floor(index / width);
    const nextColor = pixel.color ?? "#000000";
    setSnapshot((prev) => {
      const remaining = prev.pixels.filter(
        ({ index: currentIndex }) => currentIndex !== index
      );
      const payload = {
        index,
        color: nextColor,
        user: pixel.user ?? "inconnu",
        timestamp: pixel.timestamp ?? new Date().toISOString(),
        x: fallbackX,
        y: fallbackY,
      };
      return { ...prev, pixels: [...remaining, payload] };
    });
    setPixelMeta((prev) => {
      if (!prev || prev.x !== fallbackX || prev.y !== fallbackY) return prev;
      return {
        ...prev,
        color: nextColor,
        author: pixel.user ?? prev.author,
        updated_at: pixel.timestamp ?? new Date().toISOString(),
      };
    });
  }, []);

  const closeLiveConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const openLiveConnection = useCallback(
    (connId) => {
      if (!connId || !appConfig.wsBaseUrl) return;
      closeLiveConnection();
      const params = new URLSearchParams();
      params.append("clientId", connId);
      if (api.token) params.append("sessionId", api.token);
      const socket = new WebSocket(
        `${appConfig.wsBaseUrl}?${params.toString()}`
      );
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "pixel" && message.payload) {
            applyPixelUpdate(message.payload);
          }
        } catch (error) {
          console.warn("Message WebSocket invalide", error);
        }
      };

      socket.onclose = () => {
        wsRef.current = null;
      };
    },
    [applyPixelUpdate, closeLiveConnection]
  );

  const refreshSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingSnapshot(true);
      try {
        const data = await api.getSnapshot({
          clientId,
          sessionId: api.token ?? null,
        });
        const pixels = (data?.pixels ?? [])
          .map((pixel) => {
            if (
              typeof pixel.x !== "number" ||
              typeof pixel.y !== "number" ||
              !Array.isArray(blankSnapshot.pixels)
            ) {
              return null;
            }
            const width = appConfig.board.width;
            const index = pixel.y * width + pixel.x;
            return {
              index,
              color: pixel.color ?? "#000000",
              user: pixel.user ?? "inconnu",
              timestamp: pixel.timestamp ?? new Date().toISOString(),
              x: pixel.x,
              y: pixel.y,
            };
          })
          .filter(Boolean);

        setSnapshot({ ...blankSnapshot, pixels });
        if (data?.connectionId) {
          setClientId((prev) => {
            if (prev !== data.connectionId) {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "pixel_client_id",
                  data.connectionId
                );
              }
              openLiveConnection(data.connectionId);
            }
            return data.connectionId;
          });
        }
      } catch (error) {
        console.error("Snapshot error", error);
        setStatus({
          type: "error",
          message: "Impossible de récupérer la toile pour le moment.",
        });
      } finally {
        if (!silent) setLoadingSnapshot(false);
      }
    },
    [api, clientId, openLiveConnection]
  );
  refreshSnapshotRef.current = refreshSnapshot;

  const fetchPixelMeta = useCallback(
    async (x, y) => {
      const current = snapshot.pixels.find(
        (p) => typeof p?.x === "number" && p.x === x && p.y === y
      );

      setPixelMeta(
        current
          ? {
              x,
              y,
              color: current.color ?? "#000000",
              author: current.user ?? "inconnu",
              updated_at: current.timestamp ?? new Date().toISOString(),
            }
          : buildMockMeta(x, y, currentColor)
      );
    },
    [snapshot, currentColor]
  );

  const handleSelectPixel = useCallback(
    ({ x, y }) => {
      if (x === undefined || y === undefined || x === null || y === null) {
        // Deselection logic
        setSelectedPixel(null);
        setPixelAnchor(null);
        setShowPalette(false);
        setPixelMeta(null);
        return;
      }
      setSelectedPixel({ x, y });
      setPixelAnchor(null);
      setShowPalette(false);
      fetchPixelMeta(x, y);
    },
    [fetchPixelMeta]
  );

  const handlePlacePixelClick = () => {
    if (!selectedPixel) return;
    if (!user) {
      setStatus({
        type: "error",
        message: "Connecte-toi pour placer un pixel.",
      });
      startDiscordLogin();
      return;
    }
    if (cooldown > 0) {
      notifyCooldown();
      return;
    }
    setShowPalette(true);
    canvasRef.current?.zoomToPixel?.(selectedPixel, 10);
  };

  const handleConfirmPlacement = async () => {
    if (!selectedPixel) return;
    if (cooldown > 0) {
      notifyCooldown();
      setShowPalette(false);
      return;
    }
    setPlacingPixel(true);
    try {
      await api.placePixel({
        x: selectedPixel.x,
        y: selectedPixel.y,
        color: currentColor,
        user: user?.username ?? "n/a",
      });
      setCooldown(cooldownDuration);
      setPixelMeta({
        x: selectedPixel.x,
        y: selectedPixel.y,
        color: currentColor,
        author: user?.username ?? "n/a",
        updated_at: new Date().toISOString(),
      });
      setStatus({ type: "success", message: "Pixel posé avec succès." });
      await refreshSnapshot(true);
      setShowPalette(false);
    } catch (error) {
      console.error("Placement KO", error);
      setStatus({
        type: "error",
        message: "Impossible de placer le pixel.",
      });
    } finally {
      setPlacingPixel(false);
    }
  };

  const handleCancelPlacement = () => setShowPalette(false);

  useEffect(() => {
    const bootstrap = async () => {
      const sessionData = extractSessionDataFromUrl();
      if (sessionData?.sessionId) {
        api.setToken(sessionData.sessionId);
        if (sessionData.username || sessionData.avatar || sessionData.userId) {
          persistUser({
            id: sessionData.userId,
            username: sessionData.username ?? "Discord user",
            avatar: sessionData.avatar,
          });
        }
      }
      await refreshSnapshotRef.current?.();
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, persistUser]);

  const handleLogout = useCallback(() => {
    api.setToken(null);
    persistUser(null);
    closeLiveConnection();
    setCooldown(0);
  }, [api, persistUser, closeLiveConnection]);

  useEffect(
    () => () => {
      closeLiveConnection();
    },
    [closeLiveConnection]
  );

  return (
    <div className="app-shell">
      <Header user={user} onLogin={startDiscordLogin} onLogout={handleLogout} />
      {cooldown > 0 && (
        <div className="rate-limit-banner">
          Encore {cooldown}s avant de pouvoir rejouer.
        </div>
      )}
      <section className="canvas-section">
        <CanvasStage
          ref={canvasRef}
          snapshot={snapshot}
          selectedPixel={selectedPixel}
          onSelect={handleSelectPixel}
          onPixelPositionChange={setPixelAnchor}
          onZoomChange={setZoomLevel}
        />
        <div className="zoom-toolbar">
          <button
            className="hud-button"
            onClick={() => canvasRef.current?.zoomOut?.()}
            aria-label="Dézoomer"
          >
            –
          </button>
          <span className="zoom-value">{zoomLevel.toFixed(2)}x</span>
          <button
            className="hud-button"
            onClick={() => canvasRef.current?.zoomIn?.()}
            aria-label="Zoomer"
          >
            +
          </button>
          <button
            className="ghost-button"
            onClick={() => canvasRef.current?.resetView?.()}
          >
            Reset
          </button>
          <button
            className="ghost-button"
            onClick={() => refreshSnapshot()}
            disabled={loadingSnapshot}
          >
            {loadingSnapshot ? "..." : "Refresh"}
          </button>
        </div>
      </section>

      <PixelInfoCard
        pixel={selectedPixel}
        meta={pixelMeta}
        position={pixelAnchor}
        onClose={() => {
          setSelectedPixel(null);
          setPixelMeta(null);
          setShowPalette(false);
        }}
        onPlace={handlePlacePixelClick}
        canPlace={canPlacePixel}
        cooldown={cooldown}
      />

      {showPalette && selectedPixel && (
        <ColorPickerPopover
          position={pixelAnchor}
          colors={quickPalette}
          value={currentColor}
          onSelect={setCurrentColor}
          onConfirm={handleConfirmPlacement}
          onCancel={handleCancelPlacement}
          loading={placingPixel}
          cooldown={cooldown}
        />
      )}

      <StatusToast status={status} />
    </div>
  );
}
