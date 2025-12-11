import { formatDate } from "../utils/date";

export function PixelInfoCard({
  pixel,
  meta,
  position,
  onClose,
  onPlace,
  canPlace,
  cooldown = 0,
}) {
  if (!pixel || !meta || !position) return null;

  const hasAuthor =
    meta.author && meta.author !== "n/a" && meta.author !== "inconnu";
  const hasDate = !!meta.updated_at;

  return (
    <div className="pixel-card" style={{ left: position.x, top: position.y }}>
      <div className="pixel-card__header">
        <div>
          <p className="pixel-card__coords">
            {pixel.x}, {pixel.y}
          </p>
          {hasAuthor && <p className="pixel-card__author">{meta.author}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>
      {hasDate && (
        <div className="pixel-card__meta">
          <span>Dernière maj</span>
          <strong>{formatDate(meta.updated_at)}</strong>
        </div>
      )}
      {meta.color && (
        <div
          className="pixel-card__color"
          style={{ backgroundColor: meta.color }}
        />
      )}
      {cooldown > 0 && (
        <p className="rate-limit-note">
          Patiente encore {cooldown}s avant le prochain pixel.
        </p>
      )}
      <button className="primary-button" onClick={onPlace} disabled={!canPlace}>
        {cooldown > 0 ? `Attends ${cooldown}s` : "Placer un pixel"}
      </button>
    </div>
  );
}
