import { MaterialRequestDetail } from "@traceability/sdk";
import { useIssueAllocationWorkbench } from "@traceability/material";
import { StatusBadge } from "@traceability/ui";

function defaultFormatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 10);
}

function defaultFormatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function formatQty(value?: number | null) {
  return Number.isFinite(Number(value)) ? `${Number(value)}` : "—";
}

export function MaterialRequestVoucherView({
  detail,
  workbench,
  showIssueOptions,
  hideIssueTotalsBeforeIssued = false,
  formatDate = defaultFormatDate,
  formatDateTime = defaultFormatDateTime,
  handoverBatchNo,
}: {
  detail: MaterialRequestDetail;
  onBack?: () => void;
  workbench?: ReturnType<typeof useIssueAllocationWorkbench>;
  showIssueOptions?: boolean;
  hideTopBarActions?: boolean;
  hideIssueTotalsBeforeIssued?: boolean;
  formatDate?: (v?: string | null) => string;
  formatDateTime?: (v?: string | null) => string;
  handoverBatchNo?: string | null;
}) {
  const isIssuedCompleted =
    detail.status === "ISSUED" ||
    Boolean(detail.issued_at) ||
    detail.items.some((item) => (item.issue_allocations?.length ?? 0) > 0 || Number(item.issued_qty ?? 0) > 0);
  const shouldShowIssueTotals = !hideIssueTotalsBeforeIssued || isIssuedCompleted;

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Material Request
              </p>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {detail.request_no ?? "Material Request"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Task-oriented summary for request tracking, warehouse issue allocation, and production
                  acknowledgement.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {detail.model_code ?? "No model"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaRow label="Request No." value={detail.request_no ?? "—"} />
            <MetaRow label="DMI No." value={detail.dmi_no ?? "—"} />
            <MetaRow label="Request Date" value={formatDate(detail.request_date)} />
            <MetaRow label="Requestor" value={detail.requested_by_name ?? "—"} />
            <MetaRow label="Department" value={detail.request_department_name ?? "—"} />
            <MetaRow label="Section" value={detail.section ?? "—"} />
            <MetaRow label="Cost Center" value={detail.cost_center ?? "—"} />
            <MetaRow label="Model" value={detail.model_code ?? "—"} />
          </div>

          {(handoverBatchNo || detail.handover_batch_no) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Handover Batch</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {handoverBatchNo || detail.handover_batch_no}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this batch number during kiosk pickup and handover acknowledgement.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-6 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Request Items</h3>
            <p className="text-xs text-muted-foreground">
              Requested, issued, and draft allocation status by line item.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {detail.items.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-12 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Item
                </th>
                <th className="w-40 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Part Number
                </th>
                <th className="min-w-[16rem] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </th>
                <th className="w-28 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Requested
                </th>
                <th className="w-28 px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Issued
                </th>
                <th className="min-w-[18rem] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Allocation Summary
                </th>
                <th className="min-w-[12rem] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.items.length ? (
                detail.items.map((item) => {
                  const allocations = item.issue_allocations ?? [];
                  const requestedQty = Number(item.requested_qty ?? 0);
                  const issuedFromSavedRows =
                    allocations.length > 0
                      ? allocations.reduce((sum, row) => sum + Number(row.issued_qty || 0), 0)
                      : Number(item.issued_qty ?? 0);
                  const draftIssuedQty =
                    workbench && showIssueOptions && item.id ? (workbench.allocationTotalsByItem[item.id] ?? 0) : 0;
                  const absoluteIssuedQty = issuedFromSavedRows + draftIssuedQty;
                  const qtyDelta = absoluteIssuedQty - requestedQty;
                  const draftRows =
                    workbench && showIssueOptions && item.id
                      ? workbench.manualAllocations.filter((row) => row.item_id === item.id)
                      : [];

                  return (
                    <tr
                      key={item.id || `${item.item_no}-${item.part_number}`}
                      className="border-b border-border/60 align-top"
                    >
                      <td className="px-4 py-4 text-sm font-medium tabular-nums text-foreground">{item.item_no}</td>
                      <td className="px-4 py-4 text-sm font-medium tabular-nums text-foreground">
                        {item.part_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{item.description || "—"}</td>
                      <td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-foreground">
                        {formatQty(item.requested_qty)} {item.uom || "PCS"}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium tabular-nums text-foreground">
                        {shouldShowIssueTotals
                          ? `${formatQty(absoluteIssuedQty)} ${item.uom || "PCS"}`
                          : "Pending issue"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          {allocations.length === 0 && draftRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No allocation lines yet.</p>
                          ) : (
                            <>
                              {allocations.map((alloc) => (
                                <div
                                  key={alloc.id}
                                  className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                                >
                                  <p className="font-medium text-foreground">{alloc.do_number || "—"}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {alloc.vendor_name || alloc.supplier_name || "Unknown vendor"} ·{" "}
                                    {formatQty(alloc.issued_qty)} {item.uom || "PCS"}
                                  </p>
                                </div>
                              ))}
                              {draftRows.map((row) => (
                                <div
                                  key={row.id}
                                  className="rounded-lg border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/20"
                                >
                                  <p className="font-medium text-foreground">Draft · {row.do_number || "Pending DO"}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {row.description || "Pending location note"} · {formatQty(row.issued_qty)}{" "}
                                    {item.uom || "PCS"}
                                  </p>
                                </div>
                              ))}
                            </>
                          )}

                          {shouldShowIssueTotals && (
                            <p
                              className={`text-xs font-semibold ${
                                qtyDelta === 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : qtyDelta > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-destructive"
                              }`}
                            >
                              {qtyDelta === 0
                                ? "Match"
                                : qtyDelta > 0
                                  ? `${qtyDelta} over requested`
                                  : `${Math.abs(qtyDelta)} short`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{item.remarks || "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No request items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showIssueOptions && workbench?.issueValidationErrors?.length ? (
          <div className="border-t border-destructive/30 bg-destructive/5 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Issue readiness</p>
            <ul className="mt-2 space-y-1">
              {workbench.issueValidationErrors.map((error, index) => (
                <li key={`${error}-${index}`} className="text-sm text-destructive">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Issued By</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-sm text-foreground">{detail.issued_by_name?.trim() ? detail.issued_by_name : "—"}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {detail.issued_at ? formatDateTime(detail.issued_at) : "Waiting for issue"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Received By</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-sm text-foreground">{detail.received_by_name?.trim() ? detail.received_by_name : "—"}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {detail.received_at ? formatDateTime(detail.received_at) : "Waiting for acknowledgement"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
