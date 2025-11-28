export function ColorPickerPopover({
  position,
  colors,
  value,
  onSelect,
  onConfirm,
  onCancel,
  loading,
  cooldown = 0,
}) {
  if (!position) return null;

  return (
    <div
      className="color-popover"
      style={{ left: position.x, top: position.y }}
    >
      <p>Choisis ta couleur</p>
      <div className="color-popover__grid">
        {colors.map((color) => (
          <button
            key={color}
            className={`color-swatch${color === value ? " is-active" : ""}`}
            style={{ background: color }}
            onClick={() => onSelect(color)}
            aria-label={`Choisir ${color}`}
          />
        ))}
      </div>
      {cooldown > 0 && (
        <p className="rate-limit-note">
          Encore {cooldown}s avant de confirmer un pixel.
        </p>
      )}
      <div className="color-popover__actions">
        <button className="ghost-button" onClick={onCancel}>
          Annuler
        </button>
        <button
          className="primary-button"
          onClick={onConfirm}
          disabled={loading || cooldown > 0}
        >
          {loading ? "Placement..." : cooldown > 0 ? `Attends ${cooldown}s` : "Valider"}
        </button>
      </div>
    </div>
  );
}
