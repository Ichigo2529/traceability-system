import { cn } from "../lib/utils";

const statusToVariant: Record<string, "default" | "success" | "warning" | "destructive" | "muted"> = {
  complete: "success",
  completed: "success",
  pass: "success",
  ok: "success",
  wip: "default",
  active: "success",
  requested: "warning",
  approved: "success",
  issued: "success",
  rejected: "destructive",
  cancelled: "muted",
  waiting: "warning",
  hold: "warning",
  maintenance: "warning",
  ng: "destructive",
  fail: "destructive",
  error: "destructive",
  disabled: "muted",
  inactive: "muted",
};

const variantClasses = {
  default: "bg-primary/10 text-primary border-transparent",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent",
  destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-transparent",
  muted: "bg-muted text-muted-foreground border-transparent",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant = statusToVariant[normalized] ?? "default";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant]
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
