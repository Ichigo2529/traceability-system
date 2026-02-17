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
    <div className="admin-issue-workbench">
      <div className="admin-issue-workbench-header">
        <p className="admin-issue-workbench-title">DO Allocation Workbench</p>
        <span className="admin-issue-workbench-chip">Store Action</span>
      </div>

      <div className="admin-issue-workbench-field">
        <label className="admin-issue-workbench-label">Issue Remarks</label>
        <input
          value={issueRemarks}
          onChange={(e) => onIssueRemarksChange(e.target.value)}
          className="admin-issue-workbench-input"
          placeholder="Optional"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton label="Loading item vendor profiles..." />
      ) : (
        <div className="admin-issue-workbench-table-shell">
          <table className="admin-issue-workbench-table">
            <thead className="admin-issue-workbench-thead">
              <tr>
                <th className="admin-issue-workbench-th">Item</th>
                <th className="admin-issue-workbench-th">Part Number</th>
                <th className="admin-issue-workbench-th">Type</th>
                <th className="admin-issue-workbench-th">Vendor</th>
                <th className="admin-issue-workbench-th">DO No.</th>
                <th className="admin-issue-workbench-th admin-issue-workbench-th--right">Pack Size</th>
                <th className="admin-issue-workbench-th admin-issue-workbench-th--right">Packs</th>
                <th className="admin-issue-workbench-th admin-issue-workbench-th--right">Qty</th>
                <th className="admin-issue-workbench-th">Remarks</th>
                <th className="admin-issue-workbench-th admin-issue-workbench-th--right">Action</th>
              </tr>
            </thead>
            <tbody>
              {issueItems.map((item) => {
                const rows = manualAllocations.filter((line) => line.item_id === item.item_id);
                const total = allocationTotalsByItem[item.item_id] ?? 0;
                const diff = total - item.requested_qty;
                return (
                  <Fragment key={item.item_id}>
                    <tr className="admin-issue-workbench-row admin-issue-workbench-row--requested">
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--strong">{item.item_no}</td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--medium">{item.part_number}</td>
                      <td className="admin-issue-workbench-td">
                        <span className="admin-issue-workbench-pill admin-issue-workbench-pill--requested">Requested</span>
                      </td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--muted" colSpan={4}>
                        Requested Qty {item.requested_qty}
                      </td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--right admin-issue-workbench-td--strong">
                        {item.requested_qty}
                      </td>
                      <td className="admin-issue-workbench-td">Production request</td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--right">
                        <Button type="button" size="sm" variant="outline" onClick={() => addAllocationLine(item.item_id)}>
                          + Add DO
                        </Button>
                      </td>
                    </tr>
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="admin-issue-workbench-row admin-issue-workbench-row--do">
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--muted">{`${item.item_no}.${idx + 1}`}</td>
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--muted">{row.part_number}</td>
                        <td className="admin-issue-workbench-td">
                          <span className="admin-issue-workbench-pill admin-issue-workbench-pill--do">DO</span>
                        </td>
                        <td className="admin-issue-workbench-td">
                          <select
                            className="admin-issue-workbench-select"
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
                        <td className="admin-issue-workbench-td">
                          <input
                            value={row.do_number}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, do_number: e.target.value } : x))
                              )
                            }
                            className="admin-issue-workbench-input-sm admin-issue-workbench-input-do"
                            placeholder="D0001"
                          />
                        </td>
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--right">
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
                            className="admin-issue-workbench-input-sm admin-issue-workbench-input-num"
                          />
                        </td>
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--right">
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
                            className="admin-issue-workbench-input-sm admin-issue-workbench-input-num"
                          />
                        </td>
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--right admin-issue-workbench-td--strong">
                          {row.vendor_pack_size * row.issued_packs}
                        </td>
                        <td className="admin-issue-workbench-td">
                          <input
                            value={row.remarks}
                            onChange={(e) =>
                              setManualAllocations((prev) =>
                                prev.map((x) => (x.id === row.id ? { ...x, remarks: e.target.value } : x))
                              )
                            }
                            className="admin-issue-workbench-input-sm"
                            placeholder="optional"
                          />
                        </td>
                        <td className="admin-issue-workbench-td admin-issue-workbench-td--right">
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
                    <tr className="admin-issue-workbench-row admin-issue-workbench-row--total">
                      <td className="admin-issue-workbench-td"></td>
                      <td className="admin-issue-workbench-td"></td>
                      <td className="admin-issue-workbench-td">
                        <span className="admin-issue-workbench-pill admin-issue-workbench-pill--total">
                          Total
                        </span>
                      </td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--muted" colSpan={4}>
                        Allocated {total} / Requested {item.requested_qty}
                      </td>
                      <td
                        className={`admin-issue-workbench-td admin-issue-workbench-td--right admin-issue-workbench-td--strong ${
                          diff >= 0 ? "is-ok" : "is-danger"
                        }`}
                      >
                        {total}
                      </td>
                      <td className={`admin-issue-workbench-td admin-issue-workbench-td--strong ${diff >= 0 ? "is-ok" : "is-danger"}`}>
                        {diff >= 0 ? "OK" : `Need +${Math.abs(diff)}`}
                      </td>
                      <td className="admin-issue-workbench-td admin-issue-workbench-td--right"></td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {issueOptions?.items?.length ? (
        <div className="admin-issue-workbench-summary">
          {issueOptions.items.map((item) => {
            const total = allocationTotalsByItem[item.item_id] ?? 0;
            const ok = total >= item.requested_qty;
            return (
              <p key={item.item_id} className={ok ? "admin-issue-workbench-summary-line is-ok" : "admin-issue-workbench-summary-line is-warn"}>
                Item {item.item_no} {item.part_number}: requested {item.requested_qty} / allocated {total}
              </p>
            );
          })}
        </div>
      ) : null}
      {issueValidationError ? <p className="admin-issue-workbench-error">{issueValidationError}</p> : null}
    </div>
  );
}
