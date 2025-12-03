import { formatDate } from "../utils/date";

export function SnapshotDrawer({
  open,
  snapshots,
  loading,
  onClose,
  onRefresh,
  canCreateSnapshot,
  onCreateSnapshot,
  requestingSnapshot,
}) {
  return (
    <>
      {open && <div className="snapshot-backdrop" onClick={onClose} />}
      <aside className={`snapshot-drawer${open ? " is-open" : ""}`}>
        <div className="snapshot-drawer__header">
          <h2>Snapshots</h2>
          <div className="snapshot-drawer__actions">
            {canCreateSnapshot && (
              <button
                className="primary-button"
                onClick={onCreateSnapshot}
                disabled={requestingSnapshot}
              >
                {requestingSnapshot ? "En cours..." : "Nouvelle snapshot"}
              </button>
            )}
            <button
              className="ghost-button"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? "..." : "Rafraîchir"}
            </button>
            <button
              className="icon-button snapshot-drawer__close"
              onClick={onClose}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
        <div className="snapshot-drawer__content">
          {loading ? (
            <p>Chargement...</p>
          ) : snapshots?.length ? (
            <ul className="snapshot-list">
              {snapshots.map((snapshot) => (
                <li key={snapshot.key} className="snapshot-item">
                  <a
                    href={snapshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snapshot-preview"
                  >
                    <img src={snapshot.url} alt={`Snapshot ${snapshot.key}`} />
                  </a>
                  <div className="snapshot-info">
                    <p className="snapshot-date">
                      {snapshot.lastModified
                        ? formatDate(snapshot.lastModified)
                        : "Date inconnue"}
                    </p>
                    <p className="snapshot-key">ID: {snapshot.key.slice(0, 8)}...</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune snapshot.</p>
          )}
        </div>
      </aside>
    </>
  );
}
