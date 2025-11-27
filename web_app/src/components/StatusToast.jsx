export function StatusToast({ status }) {
  if (!status?.type) return null;
  return (
    <div className={`status status-${status.type}`}>{status.message}</div>
  );
}

