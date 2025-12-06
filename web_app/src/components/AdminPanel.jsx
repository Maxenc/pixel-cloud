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
    <div className="admin-panel-overlay" onClick={onClose} role="dialog">
      <div
        className="admin-panel"
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
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
              disabled={!isPaused}
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
      </div>
    </div>
  );
}