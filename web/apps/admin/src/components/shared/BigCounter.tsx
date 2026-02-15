export function BigCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-6xl font-bold tracking-tight text-primary">{value}</p>
    </div>
  );
}
