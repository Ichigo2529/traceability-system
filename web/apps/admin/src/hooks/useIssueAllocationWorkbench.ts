import { useCallback, useMemo, useState } from "react";
import { MaterialRequestIssueOptionsResponse } from "@traceability/sdk";

export type ManualAllocationLine = {
  id: string;
  item_id: string;
  item_no: number;
  part_number: string;
  description: string;
  vendor_id: string;
  do_number: string;
  gr_number: string;
  available_qty: number;
  issued_qty: number;
  remarks: string;
};

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
    const fromKnown: Record<string, number> = {};
    for (const row of manualAllocations) {
      const qty = Number(row.issued_qty || 0);
      fromKnown[row.item_id] = (fromKnown[row.item_id] ?? 0) + qty;
    }
    return fromKnown;
  }, [manualAllocations]);

  const issueValidationError = useMemo(() => {
    if (!issueOptions) return "Issue options not loaded";
    for (const row of manualAllocations) {
      if (!row.do_number.trim()) return "Manual DO number is required";
      if (!row.vendor_id.trim()) return "Please select vendor for manual DO line";
      if (row.issued_qty <= 0) return "Issued quantity must be greater than 0";
    }
    for (const item of issueOptions.items) {
      const total = allocationTotalsByItem[item.item_id] ?? 0;
      if (item.requested_qty > 0 && total < item.requested_qty) {
        return `Item ${item.item_no} (${item.part_number}) issued qty is below requested`;
      }
    }
    const hasPositiveAllocation = manualAllocations.some((row) => row.issued_qty > 0);
    if (!hasPositiveAllocation) return "Please enter issued quantity";
    return null;
  }, [allocationTotalsByItem, issueOptions, manualAllocations]);

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
          description: "-",
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
      .filter((row) => row.issued_qty > 0 && row.do_number.trim())
      .map((row) => ({
        item_id: row.item_id,
        part_number: row.part_number,
        do_number: row.do_number.trim().toUpperCase(),
        vendor_id: row.vendor_id,
        issued_packs: 1,
        issued_qty: row.issued_qty,
        vendor_pack_size: row.issued_qty,
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
    issueValidationError,
    addAllocationLine,
    buildAllocationsPayload,
    reset,
  };
}
