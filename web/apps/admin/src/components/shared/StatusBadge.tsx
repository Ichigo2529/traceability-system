import { ObjectStatus } from "@ui5/webcomponents-react";

const statusToState: Record<string, "None" | "Positive" | "Critical" | "Negative" | "Information"> = {
  complete: "Positive",
  completed: "Positive",
  pass: "Positive",
  ok: "Positive",
  wip: "Information",
  active: "Positive",
  requested: "Critical",
  approved: "Positive",
  issued: "Positive",
  rejected: "Negative",
  waiting: "Critical",
  hold: "Critical",
  maintenance: "Critical",
  ng: "Negative",
  fail: "Negative",
  error: "Negative",
  disabled: "None",
  inactive: "None",
};

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const state = statusToState[normalized] ?? "None";
  
  return (
    <ObjectStatus state={state} inverted>
      {status.toUpperCase()}
    </ObjectStatus>
  );
}
