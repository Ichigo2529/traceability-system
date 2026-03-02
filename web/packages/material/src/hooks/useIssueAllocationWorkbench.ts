import { useCallback, useMemo, useState } from "react";
import { MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { ManualAllocationLine } from "../domain/materialRequest.types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useIssueAllocationWorkbench(issueOptions?: MaterialRequestIssueOptionsResponse) {
  const [issueRemarks, setIssueRemarks] = useState("");
  const [manualAllocations, setManualAllocations] = useState<ManualAllocationLine[]>([]);

  const issueItems = issueOptions?.items ?? [];

  const issueItemById = useMemo(() => {
    return new Map(issueItems.map((item) => [item.item_id, item]));
  }, [issueItems]);

  const allocationTotalsByItem = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of manualAllocations) {
      const qty = Number(row.issued_qty || 0);
      totals[row.item_id] = (totals[row.item_id] ?? 0) + qty;
    }
    return totals;
  }, [manualAllocations]);

  const issueValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!issueOptions) return ["Issue options not loaded"];

    for (const [idx, row] of manualAllocations.entries()) {
      const rowPrefix = `Allocation row ${idx + 1} (Item ${row.item_no} - ${row.part_number})`;
      if (!row.do_number.trim()) errors.push(`${rowPrefix}: please select a DO number.`);
      if (!row.description.trim()) errors.push(`${rowPrefix}: please enter Description (e.g. rack/location).`);
      if (!row.vendor_id.trim()) errors.push(`${rowPrefix}: please select vendor.`);
      if (row.issued_qty <= 0) errors.push(`${rowPrefix}: issued quantity must be greater than 0.`);
    }

    for (const item of issueOptions.items) {
      const total = allocationTotalsByItem[item.item_id] ?? 0;
      if (item.requested_qty > 0 && total < item.requested_qty) {
        errors.push(
          `Item ${item.item_no} (${item.part_number}) issued qty is below requested (${total}/${item.requested_qty}).`
        );
      }
    }

    const hasPositiveAllocation = manualAllocations.some((row) => row.issued_qty > 0);
    if (!hasPositiveAllocation) {
      errors.push("Please add at least one allocation with issued quantity.");
    }
    return errors;
  }, [allocationTotalsByItem, issueOptions, manualAllocations]);

  const issueValidationError = issueValidationErrors.length > 0 ? issueValidationErrors.join(" ") : null;

  const addAllocationLine = useCallback(
    (itemId: string) => {
      const item = issueItemById.get(itemId);
      if (!item) return;
      setManualAllocations((prev) => [
        ...prev,
        {
          id: uid(),
          item_id: item.item_id,
          item_no: item.item_no,
          part_number: item.part_number,
          description: "",
          vendor_id: "",
          do_number: "",
          gr_number: "",
          available_qty: 0,
          issued_qty: 1,
          remarks: "",
        },
      ]);
    },
    [issueItemById]
  );

  const buildAllocationsPayload = useCallback(() => {
    return manualAllocations
      .filter((row) => row.issued_qty > 0 && row.do_number.trim() && row.description.trim())
      .map((row) => ({
        item_id: row.item_id,
        part_number: row.part_number,
        do_number: row.do_number.trim().toUpperCase(),
        vendor_id: row.vendor_id,
        issued_packs: 1,
        issued_qty: row.issued_qty,
        vendor_pack_size: row.issued_qty,
        description: row.description.trim(),
        remarks: row.remarks || undefined,
      }));
  }, [manualAllocations]);

  const reset = useCallback(() => {
    setIssueRemarks("");
    setManualAllocations([]);
  }, []);

  return {
    issueItems,
    issueRemarks,
    setIssueRemarks,
    manualAllocations,
    setManualAllocations,
    allocationTotalsByItem,
    issueValidationErrors,
    issueValidationError,
    addAllocationLine,
    buildAllocationsPayload,
    reset,
  };
}
