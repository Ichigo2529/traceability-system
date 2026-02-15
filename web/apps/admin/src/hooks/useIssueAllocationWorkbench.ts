import { useCallback, useMemo, useState } from "react";
import { MaterialRequestIssueOptionsResponse } from "@traceability/sdk";

export type ManualAllocationLine = {
  id: string;
  item_id: string;
  item_no: number;
  part_number: string;
  vendor_id: string;
  do_number: string;
  vendor_pack_size: number;
  issued_packs: number;
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
      const qty = Number(row.issued_packs || 0) * Number(row.vendor_pack_size || 0);
      fromKnown[row.item_id] = (fromKnown[row.item_id] ?? 0) + qty;
    }
    return fromKnown;
  }, [manualAllocations]);

  const issueValidationError = useMemo(() => {
    if (!issueOptions) return "Issue options not loaded";
    for (const row of manualAllocations) {
      if (!row.do_number.trim()) return "Manual DO number is required";
      if (!row.vendor_id.trim()) return "Please select vendor for manual DO line";
      if (row.issued_packs <= 0) return "Manual issued packs must be greater than 0";
      if (row.vendor_pack_size <= 0) return "Manual pack size must be greater than 0";
    }
    for (const item of issueOptions.items) {
      const total = allocationTotalsByItem[item.item_id] ?? 0;
      if (item.requested_qty > 0 && total < item.requested_qty) {
        return `Item ${item.item_no} (${item.part_number}) issued qty is below requested`;
      }
    }
    const hasPositiveAllocation = manualAllocations.some((row) => row.issued_packs > 0);
    if (!hasPositiveAllocation) return "Please enter issued packs";
    return null;
  }, [allocationTotalsByItem, issueOptions, manualAllocations]);

  const addAllocationLine = useCallback(
    (itemId: string) => {
      const item = issueItemById.get(itemId);
      if (!item) return;
      const firstVendor = item.vendor_options?.[0] ?? item.supplier_options?.[0];
      setManualAllocations((prev) => [
        ...prev,
        {
          id: uid(),
          item_id: item.item_id,
          item_no: item.item_no,
          part_number: item.part_number,
          vendor_id: firstVendor?.vendor_id ?? firstVendor?.supplier_id ?? "",
          do_number: "",
          vendor_pack_size: firstVendor?.default_pack_qty ?? 1,
          issued_packs: 1,
          remarks: "",
        },
      ]);
    },
    [issueItemById]
  );

  const buildAllocationsPayload = useCallback(() => {
    return manualAllocations
      .filter((row) => row.issued_packs > 0 && row.vendor_pack_size > 0 && row.do_number.trim())
      .map((row) => ({
        item_id: row.item_id,
        part_number: row.part_number,
        do_number: row.do_number.trim().toUpperCase(),
        vendor_id: row.vendor_id,
        issued_packs: row.issued_packs,
        issued_qty: row.issued_packs * row.vendor_pack_size,
        vendor_pack_size: row.vendor_pack_size,
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
