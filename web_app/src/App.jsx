import { useCallback, useEffect, useMemo, useState } from "react";
import { appConfig, blankSnapshot, colorPalette } from "./config";
import { PixelApi } from "./services/pixelApi";
import { buildMockMeta } from "./utils/mock";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { CanvasStage } from "./components/CanvasStage";
import { ColorModal } from "./components/ColorModal";
import { extractSessionDataFromUrl } from "./utils/oauth";

export default function App() {
  const api = useMemo(() => new PixelApi(appConfig), []);
  const [snapshot, setSnapshot] = useState(blankSnapshot);
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
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const refreshSnapshot = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingSnapshot(true);
      try {
        const data = await api.getSnapshot();
        setSnapshot(data ?? blankSnapshot);
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

  const fetchPixelMeta = useCallback(
    async (x, y) => {
      try {
        const meta = await api.getPixelMeta(x, y);
        setPixelMeta(meta);
      } catch (error) {
        console.warn("Meta indisponible, fallback mock", error);
        setPixelMeta(buildMockMeta(x, y, currentColor));
      }
    },
    [api, currentColor]
  );

  const handleSelectPixel = useCallback(
    ({ x, y }) => {
      setSelectedPixel({ x, y });
      setColorModalOpen(false);
      fetchPixelMeta(x, y);
    },
    [fetchPixelMeta]
  );

  const handlePlacePixelClick = () => {
    if (!selectedPixel || !user) return;
    setColorModalOpen(true);
  };

  const handleConfirmPlacement = async () => {
    if (!selectedPixel) return;
    setPlacingPixel(true);
    try {
      await api.placePixel({
        x: selectedPixel.x,
        y: selectedPixel.y,
        color: currentColor,
      });
      setPixelMeta({
        x: selectedPixel.x,
        y: selectedPixel.y,
        color: currentColor,
        author: user?.username ?? "n/a",
        updated_at: new Date().toISOString(),
      });
      setStatus({ type: "success", message: "Pixel posé avec succès." });
      await refreshSnapshot(true);
    } catch (error) {
      console.error("Placement KO", error);
      setStatus({
        type: "error",
        message: "Impossible de placer le pixel.",
      });
    } finally {
      setPlacingPixel(false);
      setColorModalOpen(false);
    }
  };

  const handleCancelPlacement = () => setColorModalOpen(false);

  useEffect(() => {
    setZoomLevel(colorModalOpen ? 1.15 : 1);
  }, [colorModalOpen]);

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
      await refreshSnapshot();
    };
    bootstrap();
  }, [api, persistUser, refreshSnapshot]);

  const handleLogout = useCallback(() => {
    api.setToken(null);
    persistUser(null);
  }, [api, persistUser]);

  useEffect(() => {
    const interval = setInterval(
      () => refreshSnapshot(true),
      appConfig.pollingIntervalMs
    );
    return () => clearInterval(interval);
  }, [refreshSnapshot]);

  return (
    <div className="page">
      <Header user={user} onLogin={startDiscordLogin} onLogout={handleLogout} />
      <main className="layout">
        <Sidebar
          selectedPixel={selectedPixel}
          pixelMeta={pixelMeta}
          currentColor={currentColor}
          onPlacePixel={handlePlacePixelClick}
          onRefresh={() => refreshSnapshot()}
          canPlacePixel={Boolean(selectedPixel && user)}
          loadingSnapshot={loadingSnapshot}
          status={status}
        />
        <CanvasStage
          snapshot={snapshot}
          selectedPixel={selectedPixel}
          zoomLevel={zoomLevel}
          onSelect={handleSelectPixel}
        />
      </main>
      <ColorModal
        open={colorModalOpen}
        colors={colorPalette}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        onConfirm={handleConfirmPlacement}
        onCancel={handleCancelPlacement}
        loading={placingPixel}
      />
    </div>
  );
}
