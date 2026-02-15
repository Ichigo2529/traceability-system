import { Fragment } from "react";
import { MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { LoadingSkeleton } from "../shared/States";
import { Button } from "../ui/button";
import { ManualAllocationLine } from "../../hooks/useIssueAllocationWorkbench";

export function IssueAllocationWorkbench({
  issueOptions,
  isLoading,
  issueRemarks,
  onIssueRemarksChange,
  manualAllocations,
  setManualAllocations,
  allocationTotalsByItem,
  addAllocationLine,
  issueValidationError,
}: {
  issueOptions?: MaterialRequestIssueOptionsResponse;
  isLoading: boolean;
  issueRemarks: string;
  onIssueRemarksChange: (value: string) => void;
  manualAllocations: ManualAllocationLine[];
  setManualAllocations: React.Dispatch<React.SetStateAction<ManualAllocationLine[]>>;
  allocationTotalsByItem: Record<string, number>;
  addAllocationLine: (itemId: string) => void;
  issueValidationError?: string | null;
}) {
  const issueItems = issueOptions?.items ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">DO Allocation Workbench</p>
        <span className="rounded-md bg-[#1134A6]/10 px-2 py-1 text-xs font-medium text-[#1134A6]">Store Action</span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">Issue Remarks</label>
        <input
          value={issueRemarks}
          onChange={(e) => onIssueRemarksChange(e.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          placeholder="Optional"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton label="Loading item vendor profiles..." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100/80">
              <tr>
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-left">Part Number</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Vendor</th>
                <th className="px-2 py-2 text-left">DO No.</th>
                <th className="px-2 py-2 text-right">Pack Size</th>
                <th className="px-2 py-2 text-right">Packs</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-left">Remarks</th>
                <th className="px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {issueItems.map((item) => {
                const rows = manualAllocations.filter((line) => line.item_id === item.item_id);
                const total = allocationTotalsByItem[item.item_id] ?? 0;
                const diff = total - item.requested_qty;
                return (
                  <Fragment key={item.item_id}>
                    <tr className="border-t border-slate-200 bg-blue-50/40">
                      <td className="px-2 py-2 font-semibold">{item.item_no}</td>
                      <td className="px-2 py-2 font-medium">{item.part_number}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Requested</span>
                      </td>
                      <td className="px-2 py-2 text-slate-500" colSpan={4}>
                        Requested Qty {item.requested_qty}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold">{item.requested_qty}</td>
                      <td className="px-2 py-2">Production request</td>
                      <td className="px-2 py-2 text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => addAllocationLine(item.item_id)}>
                          + Add DO
                        </Button>
                      </td>
                    </tr>
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="border-t border-slate-200 bg-amber-50/40">
                        <td className="px-2 py-2 text-slate-500">{`${item.item_no}.${idx + 1}`}</td>
                        <td className="px-2 py-2 text-slate-500">{row.part_number}</td>
                        <td className="px-2 py-2">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">DO</span>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="h-8 w-full rounded border border-slate-300 px-1 text-sm"
                            value={row.vendor_id || "NONE"}
                            onChange={(e) => {
                              const nextVendorId = e.target.value === "NONE" ? "" : e.target.value;
                              const vendorOptions = item.vendor_options ?? item.supplier_options ?? [];
                              const selectedVendor = vendorOptions.find(
                                (v) => (v.vendor_id ?? v.supplier_id) === nextVendorId
                              );
                              setManualAllocations((prev) =>
                                prev.map((x) =>
                                  x.id === row.id
                                    ? {
                                        ...x,
                                        vendor_id: nextVendorId,
                                        vendor_pack_size:
                                          selectedVendor?.default_pack_qty && selectedVendor.default_pack_qty > 0
                                            ? selectedVendor.default_pack_qty
                                            : x.vendor_pack_size,
                                      }
                                    : x
                                )
                              );
                            }}
                          >
                            <option value="NONE">Select Vendor</option>
                            {(item.vendor_options ?? item.supplier_options ?? []).map((vendor) => (
                              <option
                                key={`${row.id}-${vendor.vendor_id ?? vendor.supplier_id}`}
                                value={vendor.vendor_id ?? vendor.supplier_id}
                              >
                                {vendor.vendor_name || vendor.supplier_name || vendor.vendor_id || vendor.supplier_id}
                                {vendor.default_pack_qty ? ` (Pack ${vendor.default_pack_qty})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.do_number}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, do_number: e.target.value } : x))
                              )
                            }
                            className="h-8 w-28 rounded border border-slate-300 px-2"
                            placeholder="D0001"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={row.vendor_pack_size}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) =>
                                  x.id === row.id
                                    ? { ...x, vendor_pack_size: Math.max(1, Number(e.target.value || 1)) }
                                    : x
                                )
                              )
                            }
                            className="h-8 w-20 rounded border border-slate-300 px-2 text-right"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            value={row.issued_packs}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) =>
                                  x.id === row.id ? { ...x, issued_packs: Math.max(1, Number(e.target.value || 1)) } : x
                                )
                              )
                            }
                            className="h-8 w-20 rounded border border-slate-300 px-2 text-right"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold">{row.vendor_pack_size * row.issued_packs}</td>
                        <td className="px-2 py-2">
                          <input
                            value={row.remarks}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x))
                              )
                            }
                            className="h-8 w-full rounded border border-slate-300 px-2"
                            placeholder="optional"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setManualAllocations((prev) => prev.filter((x) => x.id !== row.id))}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-emerald-50/40">
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Total
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600" colSpan={4}>
                        Allocated {total} / Requested {item.requested_qty}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {total}
                      </td>
                      <td className={`px-2 py-2 font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {diff >= 0 ? "OK" : `Need +${Math.abs(diff)}`}
                      </td>
                      <td className="px-2 py-2 text-right"></td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {issueOptions?.items?.length ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {issueOptions.items.map((item) => {
            const total = allocationTotalsByItem[item.item_id] ?? 0;
            const ok = total >= item.requested_qty;
            return (
              <p key={item.item_id} className={ok ? "text-emerald-700" : "text-amber-700"}>
                Item {item.item_no} {item.part_number}: requested {item.requested_qty} / allocated {total}
              </p>
            );
          })}
        </div>
      ) : null}
      {issueValidationError ? <p className="text-xs font-medium text-red-600">{issueValidationError}</p> : null}
    </div>
  );
}
