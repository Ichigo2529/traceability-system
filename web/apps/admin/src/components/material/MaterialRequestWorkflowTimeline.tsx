import { MaterialRequestDetail } from "@traceability/sdk";
import { Check, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WORKFLOW_STEPS = [
  { key: "requested", label: "Requested", sub: "Production" },
  { key: "approved", label: "Approved", sub: "Store" },
  { key: "dispatched", label: "Dispatched", sub: "Store / Forklift" },
  { key: "issued", label: "Issued", sub: "Forklift" },
  { key: "prod_ack", label: "Prod. ACK", sub: "Production" },
  { key: "fork_ack", label: "Forklift ACK", sub: "Forklift" },
] as const;

function getStepState(detail: MaterialRequestDetail) {
  const approved = ["APPROVED", "ISSUED"].includes(detail.status ?? "") || Boolean((detail as any).dispatched_at);
  const dispatched = Boolean((detail as any).dispatched_at);
  const issued = detail.status === "ISSUED" || Boolean((detail as any).production_ack_at);
  const prodAck = Boolean((detail as any).production_ack_at);
  const forkliftAck = Boolean((detail as any).forklift_ack_at);

  return [true, approved, dispatched, issued, prodAck, forkliftAck];
}

function getStepMeta(detail: MaterialRequestDetail) {
  const runtime = detail as any;

  return [
    { by: detail.requested_by_name, at: detail.created_at ?? detail.request_date, dateOnly: !detail.created_at },
    { by: runtime.approved_by_name ?? null, at: runtime.approved_at ?? null, dateOnly: false },
    { by: runtime.dispatched_by_name ?? null, at: runtime.dispatched_at ?? null, dateOnly: false },
    { by: detail.issued_by_name, at: detail.issued_at, dateOnly: false },
    { by: runtime.production_ack_by_name ?? null, at: runtime.production_ack_at ?? null, dateOnly: false },
    { by: runtime.forklift_ack_by_name ?? null, at: runtime.forklift_ack_at ?? null, dateOnly: false },
  ];
}

export function MaterialRequestWorkflowTimeline({
  detail,
  formatDate,
  formatDateTime,
  pendingText,
  title = "Request Workflow",
  description = "Track approval, issue, and acknowledgement across the traceability flow.",
}: {
  detail: MaterialRequestDetail;
  formatDate: (value?: string | null) => string;
  formatDateTime: (value?: string | null) => string;
  pendingText?: string;
  title?: string;
  description?: string;
}) {
  const isTerminalStatus = detail.status === "REJECTED" || detail.status === "CANCELLED";
  const workflowStepsDone = getStepState(detail);
  const workflowStepMeta = getStepMeta(detail);
  const firstIncompleteIdx = isTerminalStatus ? -1 : workflowStepsDone.findIndex((done) => !done);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <nav className="w-full overflow-x-auto" aria-label="Workflow steps">
          <ol className="relative flex min-w-[34rem]">
            {WORKFLOW_STEPS.map((step, idx) => {
              const done = workflowStepsDone[idx];
              const active = idx === firstIncompleteIdx;
              const rejected = isTerminalStatus && !done && idx > 0;
              const prevDone = workflowStepsDone[idx - 1] ?? false;
              const meta = workflowStepMeta[idx];

              const circleCls = done
                ? "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                : active
                  ? "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-primary"
                  : rejected
                    ? "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-card text-destructive/60"
                    : "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground";

              return (
                <li key={step.key} className="relative flex flex-1 flex-col items-center">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "absolute top-4 left-0 right-1/2 h-0.5 -translate-y-px",
                        prevDone ? "bg-primary" : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "absolute top-4 left-1/2 right-0 h-0.5 -translate-y-px",
                        done ? "bg-primary" : "bg-border"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <div className={circleCls} aria-current={active ? "step" : undefined}>
                    {done ? (
                      <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    ) : rejected ? (
                      <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    ) : active ? (
                      <Clock3 className="size-4" strokeWidth={2.25} aria-hidden="true" />
                    ) : (
                      <span className="text-xs font-semibold tabular-nums">{idx + 1}</span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-col items-center gap-0.5 px-1 text-center">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        done
                          ? "text-foreground"
                          : active
                            ? "font-semibold text-primary"
                            : rejected
                              ? "text-destructive/60"
                              : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{step.sub}</span>
                    {active && (
                      <span className="mt-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Current
                      </span>
                    )}
                    {done && (meta.by || meta.at) && (
                      <div className="mt-1 space-y-0.5">
                        {meta.by && <p className="text-[11px] text-foreground/70">{meta.by}</p>}
                        {meta.at && (
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {meta.dateOnly ? formatDate(meta.at) : formatDateTime(meta.at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>

        {pendingText && !isTerminalStatus && (
          <Alert>
            <AlertDescription>
              <span className="font-medium">Waiting:</span> {pendingText}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
