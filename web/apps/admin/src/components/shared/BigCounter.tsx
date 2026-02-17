export function BigCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-big-counter">
      <p className="admin-big-counter-label">{label}</p>
      <p className="admin-big-counter-value">{value}</p>
    </div>
  );
}
