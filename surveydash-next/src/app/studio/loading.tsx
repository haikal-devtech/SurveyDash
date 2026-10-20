export default function Loading() {
  return (
    <div className="empty-state">
      <span className="animate-pulse" style={{ color: 'var(--muted)' }}>
        Memuat workspace…
      </span>
    </div>
  );
}
