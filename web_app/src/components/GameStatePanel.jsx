import { formatDate } from "../utils/date";

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    value ?? 0
  );

export function GameStatePanel({ gameState, loading, onRefresh }) {
  if (!gameState) return null;

  const status = gameState?.status ?? "UNKNOWN";
  const isPaused = status === "PAUSED";
  const statusLabel =
    status === "RUNNING"
      ? "Session active"
      : status === "PAUSED"
      ? "Session en pause"
      : "Statut inconnu";
  const statusTone =
    status === "RUNNING"
      ? "is-running"
      : status === "PAUSED"
      ? "is-paused"
      : "";

  const stats = [
    {
      label: "Pixels joués",
      value: formatNumber(gameState?.pixelCount ?? 0),
    },
    {
      label: "Connexions actives",
      value: formatNumber(gameState?.activeConnections ?? 0),
    },
    // {
    //   label: "Dernière snapshot",
    //   value: gameState?.lastSnapshotAt
    //     ? formatDate(gameState.lastSnapshotAt)
    //     : "n/a",
    // },
  ];

  return (
    <section className="game-state-chip" aria-live="polite">
      <div>
        <p className="game-state-chip__label">État</p>
        <p className={`game-state-chip__status ${statusTone}`}>{statusLabel}</p>
      </div>
      <div className="game-state-chip__stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="game-state-chip__stat-label">{stat.label}</p>
            <p className="game-state-chip__stat-value">{stat.value}</p>
          </div>
        ))}
      </div>
      <button
        className="ghost-button game-state-chip__refresh"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? "..." : "↻"}
      </button>
    </section>
  );
}
