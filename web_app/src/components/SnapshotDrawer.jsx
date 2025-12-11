import { motion } from "motion/react";
import { formatDate } from "../utils/date";

export function SnapshotDrawer({
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
      <motion.div
        className="snapshot-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.aside
        className="snapshot-drawer is-open"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
                <li key={snapshot.id} className="snapshot-item">
                  <motion.a
                    href={snapshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="snapshot-preview"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <img src={snapshot.url} alt={`Snapshot ${snapshot.id}`} />
                  </motion.a>
                  <div className="snapshot-info">
                    <p className="snapshot-date">
                      {snapshot.createdAt
                        ? formatDate(snapshot.createdAt)
                        : "Date inconnue"}
                    </p>
                    <p className="snapshot-key">
                      ID: {snapshot.id.slice(0, 8)}...
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune snapshot.</p>
          )}
        </div>
      </motion.aside>
    </>
  );
}
