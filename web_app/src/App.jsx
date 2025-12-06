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
import { AdminPanel } from "./components/AdminPanel";
import { GameStatePanel } from "./components/GameStatePanel";
import { SnapshotDrawer } from "./components/SnapshotDrawer";
import { extractSessionDataFromUrl } from "./utils/oauth";

export default function App() {
  const api = useMemo(() => new PixelApi(appConfig), []);
  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const refreshSnapshotRef = useRef(null);
  const lastGameStateSyncRef = useRef(0);
  const [snapshot, setSnapshot] = useState(blankSnapshot);
  const [clientId] = useState(() => {
    if (typeof window === "undefined") return null;
    const existing = window.localStorage.getItem("pixel_client_id");
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
      `client-${Date.now().toString(36)}-${Math.random()
        .toString(16)
        .slice(2, 8)}`;
    window.localStorage.setItem("pixel_client_id", generated);
    return generated;
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
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [requestingSnapshot, setRequestingSnapshot] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [loadingGameState, setLoadingGameState] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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

  const canPlacePixel = Boolean(user) && cooldown === 0 && !isPaused;
  const isAdmin = user?.id === appConfig.snapshotAdminId;

  const notifyCooldown = () => {
    setStatus({
      type: "error",
      message: `Attends ${cooldown || cooldownDuration}s avant de rejouer.`,
    });
  };

  const loadSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const data = await api.getSnapshots();
      setSnapshots(data?.snapshots ?? []);
    } catch (error) {
      console.error("Snapshots fetch error", error);
      setStatus({
        type: "error",
        message: "Impossible de récupérer les snapshots.",
      });
    } finally {
      setLoadingSnapshots(false);
    }
  }, [api]);

  const refreshGameState = useCallback(
    async (silent = true) => {
      setLoadingGameState(true);
      try {
        const data = await api.getGameState();
        setGameState(data);
        if (data?.status) {
          setIsPaused(data.status === "PAUSED");
        }
      } catch (error) {
        console.error("Game state fetch error", error);
        if (!silent) {
          setStatus({
            type: "error",
            message: "Impossible de récupérer l'état du jeu.",
          });
        }
      } finally {
        setLoadingGameState(false);
      }
    },
    [api, setStatus]
  );

  const syncGameStateFromServer = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastGameStateSyncRef.current < 5000) {
        return;
      }
      lastGameStateSyncRef.current = now;
      refreshGameState(true);
    },
    [refreshGameState]
  );

  const handleSnapshotReady = useCallback(
    (payload) => {
      setStatus({
        type: "success",
        message: "Nouvelle snapshot disponible.",
      });
      loadSnapshots();
    },
    [loadSnapshots]
  );

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
        username: pixel.username ?? "inconnu",
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
        author: pixel.username ?? prev.author,
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

  const openLiveConnection = useCallback(() => {
    if (!appConfig.wsBaseUrl) return;
    closeLiveConnection();
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (api.token) params.append("sessionId", api.token);

    const socket = new WebSocket(`${appConfig.wsBaseUrl}?${params.toString()}`);
    wsRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (
          message?.type === "pixel.drawn" ||
          (message?.type === "pixel" && message.payload)
        ) {
          const p = message.payload || message;
          applyPixelUpdate(p);
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  pixelCount: Math.max(0, (prev.pixelCount ?? 0) + 1),
                }
              : prev
          );
          syncGameStateFromServer();
        } else if (message?.type === "snapshot.ready") {
          handleSnapshotReady(message);
        } else if (message?.type === "session.paused") {
          setIsPaused(true);
          setStatus({
            type: "warning",
            message: "Session mise en pause par un admin.",
          });
          setGameState((prev) => (prev ? { ...prev, status: "PAUSED" } : prev));
          syncGameStateFromServer(true);
        } else if (message?.type === "session.resumed") {
          setIsPaused(false);
          setStatus({
            type: "success",
            message: "Session reprise ! À vos pixels !",
          });
          setGameState((prev) =>
            prev ? { ...prev, status: "RUNNING" } : prev
          );
          syncGameStateFromServer(true);
        }
      } catch (error) {
        console.warn("Message WebSocket invalide", error);
      }
    };

    socket.onclose = () => {
      wsRef.current = null;
    };
  }, [
    api.token,
    applyPixelUpdate,
    clientId,
    closeLiveConnection,
    handleSnapshotReady,
    syncGameStateFromServer,
  ]);

  useEffect(() => {
    openLiveConnection();
    return () => closeLiveConnection();
  }, [openLiveConnection, closeLiveConnection]);

  const refreshSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingSnapshot(true);
      try {
        const data = await api.getSnapshot({
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
              username: pixel.username ?? "inconnu",
              timestamp: pixel.timestamp ?? new Date().toISOString(),
              x: pixel.x,
              y: pixel.y,
            };
          })
          .filter(Boolean);

        setSnapshot({ ...blankSnapshot, pixels });
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
    [api]
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
              author: current.username ?? "inconnu",
              updated_at: current.timestamp ?? new Date().toISOString(),
            }
          : buildMockMeta(x, y, null)
      );
    },
    [snapshot]
  );

  const handleSelectPixel = useCallback(
    ({ x, y }) => {
      if (x === undefined || y === undefined || x === null || y === null) {
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
    if (isPaused) {
      setStatus({ type: "warning", message: "Le jeu est en pause." });
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
        userId: user?.id,
        username: user?.username,
      });
      setCooldown(cooldownDuration);
      setStatus({ type: "success", message: "Pixel envoyé..." });
      setShowPalette(false);
    } catch (error) {
      console.error("Placement KO", error);
      setStatus({
        type: "error",
        message: error.message || "Impossible de placer le pixel.",
      });
    } finally {
      setPlacingPixel(false);
    }
  };

  const handleCancelPlacement = () => setShowPalette(false);

  const handleRequestSnapshot = useCallback(async () => {
    if (!user || !isAdmin) return;
    setSnapshotsOpen(true);
    setRequestingSnapshot(true);
    try {
      await api.requestSnapshot(user.id);
      setStatus({
        type: "success",
        message: "Snapshot en cours de génération...",
        duration: 6000,
      });
    } catch (error) {
      console.error("Snapshot request error", error);
      setStatus({
        type: "error",
        message: "Impossible de lancer la snapshot.",
      });
    } finally {
      setRequestingSnapshot(false);
    }
  }, [api, user, isAdmin]);

  const handlePauseGame = async () => {
    try {
      await api.pauseGame(user.id);
      setStatus({ type: "success", message: "Pause demandée." });
      setIsPaused(true);
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    }
  };

  const handleResumeGame = async () => {
    try {
      await api.resumeGame(user.id);
      setStatus({ type: "success", message: "Reprise demandée." });
      setIsPaused(false);
    } catch (e) {
      setStatus({ type: "error", message: e.message });
    }
  };

  useEffect(() => {
    if (!status?.type) return undefined;
    const duration =
      typeof status.duration === "number" ? status.duration : 4000;
    if (duration <= 0 || Number.isNaN(duration)) {
      return undefined;
    }
    const timer = setTimeout(() => setStatus(null), duration);
    return () => clearTimeout(timer);
  }, [status]);

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
  }, [api, persistUser]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  const handleLogout = useCallback(() => {
    api.setToken(null);
    persistUser(null);
    closeLiveConnection();
    setCooldown(0);
  }, [api, persistUser, closeLiveConnection]);

  return (
    <div className="app-shell">
      <Header
        user={user}
        onLogin={startDiscordLogin}
        onLogout={handleLogout}
        onToggleSnapshots={() => setSnapshotsOpen((prev) => !prev)}
        snapshotsOpen={snapshotsOpen}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          setShowAdminPanel(true);
          refreshGameState(false);
        }}
      />

      {showAdminPanel && isAdmin && (
        <AdminPanel
          isPaused={isPaused}
          onPause={handlePauseGame}
          onResume={handleResumeGame}
          onRequestSnapshot={handleRequestSnapshot}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {cooldown > 0 && (
        <div className="rate-limit-banner">
          Encore {cooldown}s avant de pouvoir rejouer.
        </div>
      )}
      {isPaused && (
        <div
          className="rate-limit-banner"
          style={{ backgroundColor: "#e74c3c" }}
        >
          ⏸️ PAUSED
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
        <GameStatePanel
          gameState={gameState}
          loading={loadingGameState}
          onRefresh={() => refreshGameState(false)}
        />
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

      <SnapshotDrawer
        open={snapshotsOpen}
        snapshots={snapshots}
        loading={loadingSnapshots}
        onClose={() => setSnapshotsOpen(false)}
        onRefresh={loadSnapshots}
        canCreateSnapshot={isAdmin}
        onCreateSnapshot={handleRequestSnapshot}
        requestingSnapshot={requestingSnapshot}
      />

      <StatusToast status={status} />
    </div>
  );
}
