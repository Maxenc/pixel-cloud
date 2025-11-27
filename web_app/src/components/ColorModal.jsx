export function ColorModal({
  open,
  colors,
  currentColor,
  onColorChange,
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Choisis ta couleur</h2>
        <div className="palette">
          {colors.map((color) => (
            <button
              key={color}
              className={`palette-item ${
                color === currentColor ? "selected" : ""
              }`}
              style={{ background: color }}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "..." : "Succès"}
          </button>
          <button className="ghost-button" onClick={onCancel}>
            Croix
          </button>
        </div>
      </div>
    </div>
  );
}

