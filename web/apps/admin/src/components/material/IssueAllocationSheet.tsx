import { MaterialRequestDetail } from "@traceability/sdk";
import { useIssueAllocationWorkbench } from "@traceability/material";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type AllocationWorkbench = ReturnType<typeof useIssueAllocationWorkbench>;

export function IssueAllocationSheet({
  open,
  onOpenChange,
  detail,
  workbench,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MaterialRequestDetail;
  workbench: AllocationWorkbench;
}) {
  const updateRow = (
    rowId: string,
    updater: (row: AllocationWorkbench["manualAllocations"][number]) => AllocationWorkbench["manualAllocations"][number]
  ) => {
    workbench.setManualAllocations((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const allocationSummary = workbench.issueItems.reduce(
    (summary, item) => {
      const allocatedQty = workbench.allocationTotalsByItem[item.item_id] ?? 0;
      const delta = allocatedQty - item.requested_qty;

      summary.totalItems += 1;
      if (delta === 0) summary.matchedItems += 1;
      if (delta < 0) summary.shortItems += 1;
      if (delta > 0) summary.overItems += 1;

      return summary;
    },
    { totalItems: 0, matchedItems: 0, shortItems: 0, overItems: 0 }
  );
  const totalDraftQty = workbench.manualAllocations.reduce((sum, row) => sum + Number(row.issued_qty || 0), 0);
  const readyToIssue = workbench.issueItems.length > 0 && workbench.issueValidationErrors.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(100vw-1rem,60rem)] max-w-[60rem] overflow-y-auto overscroll-contain px-0"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Allocation Workspace</SheetTitle>
          <SheetDescription>
            Match each request item with a DO line, location description, and issued quantity before issuing material.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{detail.request_no ?? "Material Request"}</CardTitle>
              <CardDescription>
                {detail.model_code ?? "No model"} · {detail.section ?? "No section"} · {detail.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <p className="font-medium text-foreground">{detail.items.length}</p>
                <p>Request items</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{workbench.manualAllocations.length}</p>
                <p>Draft allocation lines</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{totalDraftQty}</p>
                <p>Total draft issue qty</p>
              </div>
            </CardContent>
          </Card>

          <div
            className={`rounded-xl border px-4 py-3 ${
              readyToIssue
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {readyToIssue
                    ? "All allocation checks are complete. You can return to the request and issue material."
                    : "Allocation checks are still incomplete. Review the items below before issuing material."}
                </p>
                <p className="text-xs opacity-90">
                  Match every requested line with a DO source, location note, and issued quantity before final issue.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-current/20 bg-background/70 px-2.5 py-1">
                  {allocationSummary.matchedItems}/{allocationSummary.totalItems || 0} items matched
                </span>
                {allocationSummary.shortItems > 0 && (
                  <span className="rounded-full border border-current/20 bg-background/70 px-2.5 py-1">
                    {allocationSummary.shortItems} short
                  </span>
                )}
                {allocationSummary.overItems > 0 && (
                  <span className="rounded-full border border-current/20 bg-background/70 px-2.5 py-1">
                    {allocationSummary.overItems} over
                  </span>
                )}
              </div>
            </div>
          </div>

          {workbench.issueItems.length === 0 ? (
            <Alert>
              <AlertDescription>
                Issue options are not ready yet. Reload the request details and try again.
              </AlertDescription>
            </Alert>
          ) : (
            workbench.issueItems.map((item) => {
              const draftRows = workbench.manualAllocations.filter((row) => row.item_id === item.item_id);
              const allocatedQty = workbench.allocationTotalsByItem[item.item_id] ?? 0;
              const remainingQty = item.requested_qty - allocatedQty;

              return (
                <Card key={item.item_id}>
                  <CardHeader className="gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          Item {item.item_no} · {item.part_number}
                        </CardTitle>
                        <CardDescription>
                          Requested {item.requested_qty} PCS · Already issued {item.already_issued_qty} PCS
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-foreground">
                          Draft {allocatedQty} PCS
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 ${
                            remainingQty === 0
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100"
                              : remainingQty > 0
                                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100"
                                : "border-destructive/30 bg-destructive/5 text-destructive"
                          }`}
                        >
                          {remainingQty === 0
                            ? "Ready to issue"
                            : remainingQty > 0
                              ? `Remaining ${remainingQty} PCS`
                              : `${Math.abs(remainingQty)} PCS over`}
                        </span>
                        <Button type="button" size="sm" onClick={() => workbench.addAllocationLine(item.item_id)}>
                          Add DO Line
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {draftRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        No draft allocation lines yet. Add a DO line to start matching warehouse stock for this item.
                      </div>
                    ) : (
                      draftRows.map((row, index) => {
                        const rowIdPrefix = `${item.item_id}-${row.id}`;
                        const selectedDo = item.issue_options.find((option) => option.do_number === row.do_number);

                        return (
                          <div key={row.id} className="rounded-xl border border-border bg-muted/20 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">Allocation {index + 1}</p>
                                <p className="text-xs text-muted-foreground">
                                  Choose stock source, location note, and issue quantity.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  workbench.setManualAllocations((prev) => prev.filter((entry) => entry.id !== row.id))
                                }
                                aria-label={`Remove allocation ${index + 1} for item ${item.item_no}`}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor={`${rowIdPrefix}-do`}>DO Number</Label>
                                <Select
                                  value={row.do_number || ""}
                                  onValueChange={(value) => {
                                    const selected = item.issue_options.find((option) => option.do_number === value);
                                    if (!selected) {
                                      updateRow(row.id, (current) => ({
                                        ...current,
                                        do_number: "",
                                        vendor_id: "",
                                        gr_number: "",
                                        available_qty: 0,
                                      }));
                                      return;
                                    }

                                    updateRow(row.id, (current) => ({
                                      ...current,
                                      do_number: selected.do_number,
                                      vendor_id: selected.vendor_id ?? selected.supplier_id ?? "",
                                      gr_number: selected.gr_number ?? "",
                                      available_qty: selected.available_qty ?? 0,
                                      issued_qty: selected.pack_size > 0 ? selected.pack_size : current.issued_qty,
                                    }));
                                  }}
                                >
                                  <SelectTrigger id={`${rowIdPrefix}-do`}>
                                    <SelectValue placeholder="Select DO number" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {item.issue_options.map((option) => (
                                        <SelectItem
                                          key={`${item.item_id}-${option.do_number}`}
                                          value={option.do_number}
                                        >
                                          {option.do_number}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${rowIdPrefix}-location`}>Location / Rack Note</Label>
                                <Input
                                  id={`${rowIdPrefix}-location`}
                                  name={`${rowIdPrefix}-location`}
                                  autoComplete="off"
                                  placeholder="e.g. Rack A3 / Bin 12"
                                  value={row.description}
                                  onChange={(event) =>
                                    updateRow(row.id, (current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${rowIdPrefix}-qty`}>Issued Quantity</Label>
                                <Input
                                  id={`${rowIdPrefix}-qty`}
                                  name={`${rowIdPrefix}-qty`}
                                  type="number"
                                  min={1}
                                  inputMode="numeric"
                                  autoComplete="off"
                                  aria-describedby={`${rowIdPrefix}-qty-hint`}
                                  value={row.issued_qty}
                                  onChange={(event) =>
                                    updateRow(row.id, (current) => ({
                                      ...current,
                                      issued_qty: Math.max(1, Number(event.target.value || 1)),
                                    }))
                                  }
                                />
                                <p id={`${rowIdPrefix}-qty-hint`} className="text-xs text-muted-foreground">
                                  Requested {item.requested_qty} PCS. Available from DO: {row.available_qty || 0} PCS.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`${rowIdPrefix}-remarks`}>Remarks</Label>
                                <Input
                                  id={`${rowIdPrefix}-remarks`}
                                  name={`${rowIdPrefix}-remarks`}
                                  autoComplete="off"
                                  placeholder="Optional note"
                                  value={row.remarks}
                                  onChange={(event) =>
                                    updateRow(row.id, (current) => ({
                                      ...current,
                                      remarks: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm md:grid-cols-3">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor</p>
                                <p className="mt-1 text-foreground">
                                  {selectedDo?.vendor_name ?? selectedDo?.supplier_name ?? "Pending DO selection"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">GR Number</p>
                                <p className="mt-1 text-foreground">{row.gr_number || "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Available Qty</p>
                                <p className="mt-1 text-foreground tabular-nums">
                                  {row.available_qty ? row.available_qty : "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Issue Notes</CardTitle>
              <CardDescription>
                Add optional notes for store, forklift, or audit context before issuing this request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                name="issue-remarks"
                autoComplete="off"
                placeholder="Optional issue notes…"
                value={workbench.issueRemarks}
                onChange={(event) => workbench.setIssueRemarks(event.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {workbench.issueValidationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="mb-2 font-medium">Resolve these allocation checks before issuing material:</p>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {workbench.issueValidationErrors.map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
