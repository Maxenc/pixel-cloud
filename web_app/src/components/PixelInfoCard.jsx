import { motion } from "motion/react";
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
    <motion.div
      className="pixel-card"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-100%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-120%" }}
      exit={{ opacity: 0, scale: 0.8, x: "-50%", y: "-100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="pixel-card__header">
        <div>
          <p className="pixel-card__coords">
            {pixel.x}, {pixel.y}
          </p>
          {hasAuthor && <p className="pixel-card__author">{meta.author}</p>}
        </div>
        <motion.button
          className="icon-button"
          onClick={onClose}
          aria-label="Fermer"
          whileHover={{ scale: 1.2, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
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
      <motion.button
        className="primary-button"
        onClick={onPlace}
        disabled={!canPlace}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {cooldown > 0 ? `Attends ${cooldown}s` : "Placer un pixel"}
      </motion.button>
    </motion.div>
  );
}
