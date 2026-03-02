import { MaterialRequestIssueOptionsResponse, MaterialRequestItem } from "@traceability/sdk";
import { Dispatch, SetStateAction } from "react";

export type NextNumbersResponse = {
  request_no: string;
  dmi_no: string;
  request_date: string;
  generated_at: string;
};

export type IssueAllocationPayload = {
  dmi_no?: string;
  remarks?: string;
  allocations: Array<{
    item_id: string;
    part_number: string;
    do_number: string;
    vendor_id?: string;
    issued_packs: number;
    issued_qty?: number;
    vendor_pack_size?: number;
    description?: string;
    remarks?: string;
  }>;
};

export type CreateMaterialRequestPayload = {
  request_no?: string;
  dmi_no?: string;
  request_date?: string;
  model_id: string;
  cost_center_id?: string;
  process_name?: string;
  remarks?: string;
  items: MaterialRequestItem[];
};

export type MaterialRequestFilters = {
  status?: string;
  date_from?: string;
  date_to?: string;
};

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

export type MaterialIssueWorkbench = {
  issueItems: MaterialRequestIssueOptionsResponse["items"];
  issueRemarks: string;
  setIssueRemarks: Dispatch<SetStateAction<string>>;
  manualAllocations: ManualAllocationLine[];
  setManualAllocations: Dispatch<SetStateAction<ManualAllocationLine[]>>;
  allocationTotalsByItem: Record<string, number>;
  issueValidationError: string | null;
  addAllocationLine: (itemId: string) => void;
  buildAllocationsPayload: () => IssueAllocationPayload["allocations"];
  reset: () => void;
};
