import { MaterialRequestDetail } from "@traceability/sdk";
import { useIssueAllocationWorkbench } from "@traceability/material";
import { StatusBadge } from "@traceability/ui";

/** Align with MaterialRequestForm (new request) */
const labelBase = "text-sm font-medium leading-none";
const inputBase =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const selectBase =
  "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const btnBase =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Table body: consistent size, vertical center; codes don’t break mid-token */
const td = "px-3 py-2.5 align-middle text-sm leading-normal text-foreground";
const tdNum = "px-3 py-2.5 align-middle text-right text-sm tabular-nums font-medium text-foreground";
const tdModel =
  "px-3 py-2.5 align-middle text-sm font-mono tabular-nums tracking-tight text-foreground whitespace-nowrap min-w-[10rem]";
const tdPart =
  "px-3 py-2.5 align-middle text-sm font-mono tabular-nums tracking-tight text-foreground whitespace-nowrap min-w-[7rem]";
const tdMuted = `${td} text-muted-foreground`;

function defaultFormatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function defaultFormatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function MaterialRequestVoucherView({
  detail,
  onBack,
  workbench,
  showIssueOptions,
  hideTopBarActions,
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
  formatDate?: (value?: string | null) => string;
  formatDateTime?: (value?: string | null) => string;
  handoverBatchNo?: string | null;
}) {
  const isIssuedCompleted =
    detail.status === "ISSUED" ||
    Boolean(detail.issued_at) ||
    detail.items.some((item) => (item.issue_allocations?.length ?? 0) > 0 || Number(item.issued_qty ?? 0) > 0);
  const shouldShowIssueTotals = !hideIssueTotalsBeforeIssued || isIssuedCompleted;

  return (
    <div className="material-voucher flex w-full max-w-full min-w-0 flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm print:shadow-none">
        <div className="flex flex-col">
          {/* ── Company header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-6">
            <div className="flex flex-wrap items-start gap-6">
              <img src="/logo.png" alt="" className="h-[4.5rem] w-auto object-contain" />
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-medium italic leading-none tracking-tight">
                  MMI Precision Assembly (Thailand) Co., Ltd.
                </h3>
                <p className="text-sm text-muted-foreground">
                  888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand
                </p>
                <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>TEL : (6644) 000188</span>
                  <span>FAX : (6644) 000199</span>
                </div>
              </div>
            </div>
            {hideTopBarActions ? (
              <StatusBadge status={detail.status} />
            ) : (
              <div className="no-print flex flex-wrap items-center gap-2">
                {onBack && (
                  <button type="button" onClick={onBack} className={btnBase}>
                    Back
                  </button>
                )}
                <StatusBadge status={detail.status} />
                {detail.status === "ISSUED" && (
                  <button type="button" onClick={() => window.print()} className={btnBase}>
                    Print
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Voucher title — full-width, edge-to-edge ── */}
          <div className="border-y border-border bg-muted/20 px-6 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Direct Material Issue Voucher
            </h3>
          </div>

          {/* ── Fields grid ── */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">No.</span>
              <span className="text-sm font-semibold text-primary">{detail.request_no ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">DMI No.</span>
              <span className="text-sm font-semibold text-primary">{detail.dmi_no ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</span>
              <span className="text-sm">{formatDate(detail.request_date)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requestor</span>
              <span className="text-sm">{detail.requested_by_name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</span>
              <span className="text-sm">{detail.request_department_name ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Section</span>
              <span className="text-sm">{detail.section ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cost Center</span>
              <span className="text-sm">{detail.cost_center ?? "—"}</span>
            </div>
          </div>

          {(handoverBatchNo || detail.handover_batch_no) && (
            <div className="flex flex-wrap items-center gap-4 border-t border-border bg-muted/15 px-6 py-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(handoverBatchNo || detail.handover_batch_no || "")}&format=svg`}
                alt=""
                className="h-20 w-20 shrink-0 rounded-md border border-border bg-background p-1"
              />
              <div className="min-w-0">
                <span className={labelBase}>Handover batch</span>
                <p className="mt-1 font-mono text-base font-semibold text-primary">
                  {handoverBatchNo || detail.handover_batch_no}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Scan at kiosk to confirm pickup</p>
              </div>
            </div>
          )}

          <div className="border-t border-border">
            <div className="border-b border-border bg-muted/20 px-6 py-3">
              <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Request items</h4>
            </div>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[58rem] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-10 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">#</th>
                    <th className="w-14 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Type</th>
                    <th className="min-w-[10rem] whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Model
                    </th>
                    <th className="min-w-[7rem] whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Part
                    </th>
                    <th className="min-w-[12rem] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="w-28 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">DO</th>
                    <th className="w-24 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                    <th className="w-24 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">GR</th>
                    <th className="w-14 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Net</th>
                    <th className="w-16 px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="w-14 px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">UOM</th>
                    <th className="min-w-[6rem] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Remarks
                    </th>
                    <th className="w-14 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {detail.items.length ? (
                    detail.items.flatMap((item) => {
                      const key = item.id || `${item.item_no}-${item.part_number}`;
                      const allocations = item.issue_allocations ?? [];
                      const requestedQty = Number(item.requested_qty ?? 0);
                      const actualIssuedTotal =
                        allocations.length > 0
                          ? allocations.reduce((sum, alloc) => sum + (Number(alloc.issued_qty) || 0), 0)
                          : Number(item.issued_qty ?? 0);

                      const rows: React.ReactNode[] = [];
                      rows.push(
                        <tr className="border-b border-border/40 hover:bg-muted/15" key={`${key}-requested`}>
                          <td className={`${td} text-center font-medium tabular-nums`}>{item.item_no}</td>
                          <td className={`${td} text-center`}>
                            <span className="text-sm text-muted-foreground">Req</span>
                          </td>
                          <td className={tdModel}>{detail.model_code || "—"}</td>
                          <td className={tdPart}>{item.part_number || "—"}</td>
                          <td className={td}>{item.description || "—"}</td>
                          <td className={td}>
                            {showIssueOptions && workbench && item.id ? (
                              <button
                                type="button"
                                onClick={() => workbench.addAllocationLine(item.id!)}
                                className={btnBase}
                              >
                                + Line
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={tdMuted}>—</td>
                          <td className={tdMuted}>—</td>
                          <td className={tdMuted}>—</td>
                          <td className={tdNum}>{item.requested_qty ?? "—"}</td>
                          <td className={`${td} text-center tabular-nums`}>{item.uom || "PCS"}</td>
                          <td className={`${td} text-muted-foreground`}>Requested</td>
                          <td className={td} />
                        </tr>
                      );

                      allocations.forEach((alloc, idx) => {
                        rows.push(
                          <tr
                            className="border-b border-border/40 bg-muted/10 hover:bg-muted/20"
                            key={`${key}-alloc-${alloc.id || idx}`}
                          >
                            <td
                              className={`${td} text-center tabular-nums text-primary`}
                            >{`${item.item_no}.${idx + 1}`}</td>
                            <td className={`${td} text-center`}>
                              <span className="text-sm text-muted-foreground">DO</span>
                            </td>
                            <td className={tdModel}>{detail.model_code || "—"}</td>
                            <td className={tdPart}>{item.part_number || "—"}</td>
                            <td className={td}>
                              {alloc.vendor_pack_size || alloc.supplier_pack_size
                                ? `Pack ${alloc.vendor_pack_size || alloc.supplier_pack_size} × ${alloc.issued_packs ?? 0}`
                                : "—"}
                            </td>
                            <td className={`${td} font-medium text-primary`}>{alloc.do_number || "—"}</td>
                            <td className={td}>{alloc.vendor_name || alloc.supplier_name || "—"}</td>
                            <td className={td}>{(alloc as { gr_number?: string }).gr_number || "—"}</td>
                            <td className={td}>{(alloc as { available_qty?: number }).available_qty ?? "—"}</td>
                            <td className={tdNum}>{alloc.issued_qty ?? "—"}</td>
                            <td className={`${td} text-center tabular-nums`}>{item.uom || "PCS"}</td>
                            <td className={`${td} text-muted-foreground`}>{alloc.remarks || "—"}</td>
                            <td className={td} />
                          </tr>
                        );
                      });

                      if (showIssueOptions && workbench && item.id) {
                        const manualRows = workbench.manualAllocations.filter((a) => a.item_id === item.id);
                        const issueItem = workbench.issueItems.find((i) => i.item_id === item.id);
                        const availableDos = issueItem?.issue_options ?? [];

                        manualRows.forEach((row, mIdx) => {
                          rows.push(
                            <tr
                              className="border-b border-border/40 bg-amber-500/[0.04] dark:bg-amber-950/20"
                              key={`manual-${row.id}`}
                            >
                              <td className={`${td} text-center tabular-nums text-amber-900 dark:text-amber-200`}>
                                {`${item.item_no}.${allocations.length + mIdx + 1}`}
                              </td>
                              <td className={`${td} text-center`}>
                                <span className="text-sm text-muted-foreground">Store</span>
                              </td>
                              <td className={tdModel}>{detail.model_code || "—"}</td>
                              <td className={tdPart}>{item.part_number || "—"}</td>
                              <td className={td}>
                                <input
                                  value={row.description}
                                  onChange={(e) =>
                                    workbench.setManualAllocations((prev) =>
                                      prev.map((x) => (x.id === row.id ? { ...x, description: e.target.value } : x))
                                    )
                                  }
                                  placeholder="Required — e.g. P.1 J001/1, P2.J002/1 (Rack)"
                                  className={inputBase}
                                  required
                                />
                              </td>
                              <td className={td}>
                                <select
                                  value={row.do_number ? `DO:${row.do_number}` : "NONE"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val || val === "NONE") {
                                      workbench.setManualAllocations((prev) =>
                                        prev.map((x) =>
                                          x.id === row.id
                                            ? { ...x, vendor_id: "", do_number: "", gr_number: "", available_qty: 0 }
                                            : x
                                        )
                                      );
                                      return;
                                    }
                                    if (val.startsWith("DO:")) {
                                      const doId = val.split("DO:")[1];
                                      const selectedDo = availableDos.find((d) => (d.do_id ?? d.do_number) === doId);
                                      if (selectedDo) {
                                        workbench.setManualAllocations((prev) =>
                                          prev.map((x) =>
                                            x.id === row.id
                                              ? {
                                                  ...x,
                                                  vendor_id: selectedDo.vendor_id ?? selectedDo.supplier_id ?? "",
                                                  do_number: selectedDo.do_number,
                                                  gr_number: selectedDo.gr_number ?? "",
                                                  available_qty: selectedDo.available_qty ?? 0,
                                                  issued_qty: selectedDo.pack_size > 0 ? selectedDo.pack_size : 1,
                                                }
                                              : x
                                          )
                                        );
                                      }
                                    }
                                  }}
                                  className={selectBase}
                                >
                                  <option value="NONE">Select DO. No.</option>
                                  {availableDos.map((doOpt) => {
                                    const doKey = doOpt.do_id ?? doOpt.do_number;
                                    return (
                                      <option key={`do-${doKey}`} value={`DO:${doKey}`}>
                                        {doOpt.do_number}
                                      </option>
                                    );
                                  })}
                                </select>
                              </td>
                              <td className={td}>
                                {row.do_number
                                  ? (availableDos.find((d) => d.do_number === row.do_number)?.vendor_name ??
                                    availableDos.find((d) => d.do_number === row.do_number)?.supplier_name ??
                                    "—")
                                  : "—"}
                              </td>
                              <td className={td}>{row.gr_number || "—"}</td>
                              <td className={td}>{row.available_qty ? `${row.available_qty}` : "—"}</td>
                              <td className={td}>
                                <input
                                  type="number"
                                  value={row.issued_qty}
                                  onChange={(e) =>
                                    workbench.setManualAllocations((prev) =>
                                      prev.map((x) =>
                                        x.id === row.id
                                          ? { ...x, issued_qty: Math.max(1, Number(e.target.value || 1)) }
                                          : x
                                      )
                                    )
                                  }
                                  className={inputBase}
                                />
                              </td>
                              <td className={`${td} text-center tabular-nums`}>{item.uom || "PCS"}</td>
                              <td className={td}>
                                <input
                                  value={row.remarks}
                                  onChange={(e) =>
                                    workbench.setManualAllocations((prev) =>
                                      prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x))
                                    )
                                  }
                                  placeholder="Optional remarks"
                                  className={inputBase}
                                />
                              </td>
                              <td className="w-14 px-2 py-2 align-middle">
                                <button
                                  type="button"
                                  title="Remove this DO line"
                                  onClick={() =>
                                    workbench.setManualAllocations((prev) => prev.filter((x) => x.id !== row.id))
                                  }
                                  className={`${btnBase} border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10`}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      }

                      const manualIssuedTotal =
                        workbench && showIssueOptions && item.id ? (workbench.allocationTotalsByItem[item.id] ?? 0) : 0;
                      const absoluteTotal = actualIssuedTotal + manualIssuedTotal;
                      const absoluteDiff = absoluteTotal - requestedQty;
                      const uom = item.uom || "PCS";
                      const summaryExplanation =
                        absoluteDiff === 0
                          ? `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Match`
                          : absoluteDiff > 0
                            ? `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Over by ${absoluteDiff}`
                            : `Requested ${requestedQty} ${uom}, Issued ${absoluteTotal} ${uom} — Short by ${Math.abs(absoluteDiff)}`;

                      if (shouldShowIssueTotals) {
                        const diffCls =
                          absoluteDiff === 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : absoluteDiff > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive";
                        rows.push(
                          <tr className="border-b-2 border-border bg-muted/25" key={`${key}-tot`}>
                            <td className={`${td} text-center font-medium`}>{item.item_no}</td>
                            <td className={`${td} text-center text-muted-foreground`}>Σ</td>
                            <td colSpan={3} className={`${td} text-muted-foreground`}>
                              Issued total
                              {item.remarks ? ` — ${item.remarks}` : ""}
                            </td>
                            <td colSpan={4} className={td} />
                            <td className={`${tdNum} text-sm font-semibold ${absoluteTotal > 0 ? "text-primary" : ""}`}>
                              {absoluteTotal || "—"}
                            </td>
                            <td className={`${td} text-center font-medium tabular-nums`}>{uom}</td>
                            <td colSpan={2} className={td}>
                              <span className={`font-medium ${diffCls}`}>
                                {absoluteDiff === 0
                                  ? "OK"
                                  : absoluteDiff > 0
                                    ? `Over +${absoluteDiff}`
                                    : `Short ${absoluteDiff}`}
                              </span>
                              <span className="text-muted-foreground"> — {summaryExplanation}</span>
                            </td>
                          </tr>
                        );
                      }

                      return rows;
                    })
                  ) : (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No request items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showIssueOptions && workbench?.issueValidationError && (
            <div className="border-t border-destructive/20 bg-destructive/5 px-6 py-3 text-sm text-destructive">
              {workbench.issueValidationErrors?.length ? (
                <div>
                  {workbench.issueValidationErrors.map((error, idx) => (
                    <div key={`issue-validation-${idx}`}>— {error}</div>
                  ))}
                </div>
              ) : (
                workbench.issueValidationError
              )}
            </div>
          )}

          <div className="border-t border-border bg-muted/10 px-6 py-4 print:shadow-none">
            <div className="mb-4 border-b border-border pb-3">
              <h4 className="text-sm font-semibold tracking-tight text-foreground">Issued / Received</h4>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-4 sm:border-r sm:border-border sm:pr-8">
                <p className="text-sm font-medium text-foreground">Issued by</p>
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Name</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {detail.issued_by_name?.trim() ? detail.issued_by_name : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-foreground">
                      {detail.issued_at ? formatDateTime(detail.issued_at) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-foreground">Received by</p>
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Name</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {detail.received_by_name?.trim() ? detail.received_by_name : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-foreground">
                      {detail.received_at ? formatDateTime(detail.received_at) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
