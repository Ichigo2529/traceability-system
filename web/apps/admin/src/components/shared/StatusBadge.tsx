import { Badge } from "../ui/badge";

const statusToVariant: Record<string, "success" | "default" | "warning" | "danger" | "muted"> = {
  complete: "success",
  completed: "success",
  pass: "success",
  ok: "success",
  wip: "default",
  active: "default",
  requested: "warning",
  approved: "default",
  issued: "success",
  rejected: "danger",
  waiting: "warning",
  hold: "warning",
  maintenance: "warning",
  ng: "danger",
  fail: "danger",
  error: "danger",
  disabled: "muted",
  inactive: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant = statusToVariant[normalized] ?? "default";
  return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
}
