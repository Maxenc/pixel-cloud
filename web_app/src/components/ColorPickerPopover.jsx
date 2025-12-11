import { motion } from "motion/react";

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
    <motion.div
      className="color-popover"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-100%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-120%" }}
      exit={{ opacity: 0, scale: 0.8, x: "-50%", y: "-100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <p>Choisis ta couleur</p>
      <div className="color-popover__grid">
        {colors.map((color, index) => (
          <motion.button
            key={color}
            className={`color-swatch${color === value ? " is-active" : ""}`}
            style={{
              background: color,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
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
        <motion.button
          className="ghost-button"
          onClick={onCancel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Annuler
        </motion.button>
        <motion.button
          className="primary-button"
          onClick={onConfirm}
          disabled={loading || cooldown > 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? "..." : cooldown > 0 ? `Attends ${cooldown}s` : "Valider"}
        </motion.button>
      </div>
    </motion.div>
  );
}
