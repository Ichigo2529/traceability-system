import { MaterialRequestDetail, MaterialRequestIssueOptionsResponse } from "@traceability/sdk";
import { IssueAllocationPayload } from "../domain/materialRequest.types";

export function normalizeDateOnly(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

export function normalizeIsoDateTime(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export function normalizeRequestDetail(detail: MaterialRequestDetail): MaterialRequestDetail {
  return {
    ...detail,
    items: (detail.items ?? []).map((item: any) => ({
      ...item,
      issue_allocations: (item.issue_allocations ?? []).map((alloc: any) => ({
        ...alloc,
        vendor_id: alloc.vendor_id ?? alloc.supplier_id ?? null,
        vendor_name: alloc.vendor_name ?? alloc.supplier_name ?? null,
        vendor_pack_size: alloc.vendor_pack_size ?? alloc.supplier_pack_size ?? null,
      })),
    })),
  } as MaterialRequestDetail;
}

export function normalizeIssueOptions(response: MaterialRequestIssueOptionsResponse): MaterialRequestIssueOptionsResponse {
  return {
    ...response,
    items: (response.items ?? []).map((item: any) => ({
      ...item,
      issue_options: (item.issue_options ?? []).map((opt: any) => ({
        ...opt,
        vendor_id: opt.vendor_id ?? opt.supplier_id ?? null,
        vendor_name: opt.vendor_name ?? opt.supplier_name ?? null,
      })),
      vendor_options: (item.vendor_options ?? item.supplier_options ?? []).map((opt: any) => ({
        ...opt,
        vendor_id: opt.vendor_id ?? opt.supplier_id,
        vendor_name: opt.vendor_name ?? opt.supplier_name ?? null,
        vendor_part_number: opt.vendor_part_number ?? opt.supplier_part_number ?? null,
      })),
      supplier_options: item.supplier_options ?? item.vendor_options ?? [],
    })),
  } as MaterialRequestIssueOptionsResponse;
}

export function normalizeIssuePayload(payload: IssueAllocationPayload) {
  return {
    ...payload,
    allocations: payload.allocations.map((line) => ({
      ...line,
      supplier_id: line.vendor_id,
      supplier_pack_size: line.vendor_pack_size,
    })),
  };
}
