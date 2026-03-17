export function BigCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-5xl font-black tabular-nums text-foreground">{value}</p>
    </div>
  );
}
