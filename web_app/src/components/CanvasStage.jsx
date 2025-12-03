import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react";
import { appConfig } from "../config";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 30;
const clampZoom = (value) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
const DRAG_THRESHOLD = 4;
const WHEEL_SENSITIVITY = 0.005;
const MAX_WHEEL_STEP = 1.5;

export const CanvasStage = forwardRef(function CanvasStage(
  { snapshot, selectedPixel, onSelect, onPixelPositionChange, onZoomChange },
  ref
) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const [zoom, setZoom] = useState(3);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    start: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    didInit: false,
  });
  const panRef = useRef(pan);
  const baseWidth = snapshot?.width ?? appConfig.board.width;
  const baseHeight = snapshot?.height ?? appConfig.board.height;

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const width = snapshot?.width ?? appConfig.board.width;
    const height = snapshot?.height ?? appConfig.board.height;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    (snapshot?.pixels ?? []).forEach(({ index, color }) => {
      if (typeof index !== "number") return;
      const x = index % width;
      const y = Math.floor(index / width);
      ctx.fillStyle = color ?? "#000000";
      // Draw with a small gap to create a border effect
      // Using 0.9 size centered (offset 0.05) creates a gap
      // To make the grid lines visible (grey), we can rely on the background color #0f172a
      // or draw a stroke. Let's use stroke for a subtle grey grid.
      ctx.fillRect(x, y, 1, 1); // Fill full pixel first
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Subtle grey/white stroke
      ctx.strokeRect(x, y, 1, 1);
    });
  }, [snapshot]);

  useEffect(() => {
    if (!selectedPixel || !viewportRef.current) {
      onPixelPositionChange?.(null);
      return;
    }
    const viewport = viewportRef.current.getBoundingClientRect();
    const point = {
      x: viewport.left + pan.x + (selectedPixel.x + 0.5) * zoom,
      y: viewport.top + pan.y + (selectedPixel.y + 0.5) * zoom,
    };
    onPixelPositionChange?.(point);
  }, [selectedPixel, zoom, pan, onPixelPositionChange]);

  useEffect(() => {
    if (dragRef.current.didInit || !viewportRef.current) return;
    const viewport = viewportRef.current.getBoundingClientRect();
    setPan({
      x: viewport.width / 2 - (baseWidth * zoom) / 2,
      y: viewport.height / 2 - (baseHeight * zoom) / 2,
    });
    dragRef.current.didInit = true;
  }, [baseWidth, baseHeight, zoom]);

  const updateZoom = useCallback((nextZoom, focusPoint) => {
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) {
      setZoom((prev) => clampZoom(nextZoom ?? prev));
      return;
    }
    setZoom((prevZoom) => {
      const target = clampZoom(nextZoom ?? prevZoom);
      const pointer = focusPoint ?? {
        x: viewport.width / 2,
        y: viewport.height / 2,
      };
      const prevPan = panRef.current;
      // Use target zoom for world coordinate calculation to ensure precision
      const worldX = (pointer.x - prevPan.x) / prevZoom;
      const worldY = (pointer.y - prevPan.y) / prevZoom;

      setPan({
        x: pointer.x - worldX * target,
        y: pointer.y - worldY * target,
      });
      return target;
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      event.preventDefault();

      const rect = viewport.getBoundingClientRect();
      const focus = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const rawDelta = -event.deltaY * WHEEL_SENSITIVITY;
      if (!rawDelta) return;
      const delta = Math.max(
        -MAX_WHEEL_STEP,
        Math.min(MAX_WHEEL_STEP, rawDelta)
      );

      updateZoom(zoom + delta, focus);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoom, updateZoom]);

  const selectAt = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate scale based on actual rendered size vs logic size
    const scaleX = baseWidth / rect.width;
    const scaleY = baseHeight / rect.height;

    // Add a small epsilon to handle floating point inaccuracies (e.g. 9.9999 -> 10)
    // This prevents selecting the previous pixel due to minute sub-pixel offsets
    const EPSILON = 0.05;
    const x = Math.floor((clientX - rect.left) * scaleX + EPSILON);
    const y = Math.floor((clientY - rect.top) * scaleY + EPSILON);

    if (x < 0 || y < 0 || x >= baseWidth || y >= baseHeight) {
      // Clicked outside the board -> deselect
      onSelect?.(null);
      return;
    }
    onSelect?.({ x, y });

    // Auto-center on the selected pixel
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (viewport) {
      // Important: use current zoom state, not targetZoom constant
      // and calculate center based on the precise pixel center
      setPan({
        x: viewport.width / 2 - (x + 0.5) * zoom,
        y: viewport.height / 2 - (y + 0.5) * zoom,
      });
    }
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    dragRef.current = {
      ...dragRef.current,
      active: true,
      moved: false,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      panStart: { ...panRef.current },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.start.x;
    const dy = event.clientY - dragRef.current.start.y;
    if (
      !dragRef.current.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
    ) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    setPan({
      x: dragRef.current.panStart.x + dx,
      y: dragRef.current.panStart.y + dy,
    });
  };

  const finishPointer = (event, cancelled = false) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* no-op */
    }
    if (!dragRef.current.moved && !cancelled) {
      selectAt(event.clientX, event.clientY);
    }
    dragRef.current.moved = false;
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => updateZoom(zoom + 0.3),
    zoomOut: () => updateZoom(zoom - 0.3),
    resetView: () => updateZoom(3),
    zoomToPixel(pixel, targetZoom = 3.5) {
      if (!pixel || !viewportRef.current) return;
      const viewport = viewportRef.current.getBoundingClientRect();
      const target = clampZoom(targetZoom);
      setZoom(target);
      setPan({
        x: viewport.width / 2 - (pixel.x + 0.5) * target,
        y: viewport.height / 2 - (pixel.y + 0.5) * target,
      });
    },
  }));

  return (
    <section className="canvas-wrapper">
      <div
        className="canvas-viewport"
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointer(event)}
        onPointerLeave={(event) => finishPointer(event, true)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="canvas-pan"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          <div className="canvas-inner" style={{ transform: `scale(${zoom})` }}>
            <canvas
              ref={canvasRef}
              className="pixel-canvas"
              width={baseWidth}
              height={baseHeight}
              style={{ display: "block" }}
            />
            {selectedPixel && (
              <div
                className="pixel-highlight"
                style={{
                  left: 0,
                  top: 0,
                  transform: `translate(${selectedPixel.x}px, ${selectedPixel.y}px)`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
