import { formatDate } from "../utils/date";
import { StatusToast } from "./StatusToast";

export function Sidebar({
  selectedPixel,
  pixelMeta,
  currentColor,
  onPlacePixel,
  onRefresh,
  canPlacePixel,
  loadingSnapshot,
  status,
}) {
  return (
    <section className="sidebar">
      <div className="panel">
        <div className="panel-row">
          <span>Pixel sélectionné</span>
          <strong>
            {selectedPixel ? `${selectedPixel.x}, ${selectedPixel.y}` : "—"}
          </strong>
        </div>
        <div className="panel-row">
          <span>Auteur</span>
          <strong>{pixelMeta?.author ?? "n/a"}</strong>
        </div>
        <div className="panel-row">
          <span>Dernière maj</span>
          <strong>{formatDate(pixelMeta?.updated_at)}</strong>
        </div>
      </div>

      <div className="panel">
        <span>Couleur choisie</span>
        <div className="color-preview" style={{ background: currentColor }}>
          {currentColor}
        </div>
      </div>

      <div className="panel">
        <button
          className="primary-button"
          disabled={!canPlacePixel || loadingSnapshot}
          onClick={onPlacePixel}
        >
          Placer un pixel
        </button>
        <button
          className="ghost-button"
          onClick={onRefresh}
          disabled={loadingSnapshot}
        >
          {loadingSnapshot ? "Chargement..." : "Recharger"}
        </button>
      </div>

      <StatusToast status={status} />
    </section>
  );
}
