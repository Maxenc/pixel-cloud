import { motion } from "motion/react";

export function AdminPanel({
  isPaused,
  onPause,
  onResume,
  onRequestSnapshot,
  onClose,
}) {
  const subtitle = isPaused
    ? "Relance la session pour permettre aux joueurs de continuer."
    : "Tu peux mettre la session en pause à tout moment.";

  return (
    <motion.div
      className="admin-panel-overlay"
      onClick={onClose}
      role="dialog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="admin-panel"
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <header className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Control center</p>
            <h2>Administration</h2>
            <p className="admin-panel__subtitle">{subtitle}</p>
          </div>
          <button
            className="icon-button admin-panel__close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </header>

        <section className="admin-panel__section">
          <div className="admin-panel__section-header">
            <h3>Session</h3>
            <p>Contrôle en un clic de l'état global.</p>
          </div>
          <div className="admin-panel__actions">
            <button
              className="ghost-button"
              onClick={onPause}
              disabled={isPaused}
            >
              Mettre en pause
            </button>
            <button
              className="primary-button"
              onClick={onResume}
              disabled={false}
            >
              Reprendre
            </button>
          </div>
        </section>

        <section className="admin-panel__section">
          <div className="admin-panel__section-header">
            <h3>Snapshots</h3>
            <p>Déclenche manuellement un rendu de la toile.</p>
          </div>
          <button
            className="primary-button admin-panel__full-width"
            onClick={onRequestSnapshot}
          >
            Générer une snapshot
          </button>
        </section>
      </motion.div>
    </motion.div>
  );
}
