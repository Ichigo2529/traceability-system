import {
  MaterialRequest,
  MaterialRequestCatalogItem,
  MaterialRequestDetail,
  MaterialRequestIssueOptionsResponse,
  MaterialRequestItem,
  MaterialRequestMeta,
} from "@traceability/sdk";
import { eden, sdk } from "./api-client";
import { callEdenWithFallback } from "./eden-fallback";

type NextNumbersResponse = {
  request_no: string;
  dmi_no: string;
  request_date: string;
  generated_at: string;
};

type IssueAllocationPayload = {
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

function readAccessToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = readAccessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

function materialById(id: string) {
  return (eden as any)["material-requests"]({ id });
}

function normalizeDateOnly(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function normalizeIsoDateTime(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

async function preferEden<T>(call: () => Promise<any>, fallback: () => Promise<T>, scope = "material"): Promise<T> {
  return callEdenWithFallback<T>(scope, call, fallback);
}

export async function getMaterialRequestNextNumbers(): Promise<NextNumbersResponse> {
  const data = await preferEden<NextNumbersResponse>(
    () =>
      (eden as any)["material-requests"]["next-numbers"].get({
        headers: authHeaders(),
      }),
    () => sdk.material.getNextNumbers(),
    "material.next-numbers"
  );
  return {
    ...data,
    request_date: normalizeDateOnly((data as any)?.request_date),
    generated_at: normalizeIsoDateTime((data as any)?.generated_at),
  };
}

export async function getMaterialRequestMeta(): Promise<MaterialRequestMeta> {
  const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/material-requests/meta`, {
    headers: { ...authHeaders(), "Content-Type": "application/json" } as any,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err: any = new Error(json.message ?? "Failed to load meta");
    err.error_code = json.error_code;
    err.status = res.status;
    throw err;
  }
  return json.data as MaterialRequestMeta;
}

export async function getMaterialRequestCatalog(): Promise<MaterialRequestCatalogItem[]> {
  return preferEden<MaterialRequestCatalogItem[]>(
    () =>
      (eden as any)["material-requests"].catalog.get({
        headers: authHeaders(),
      }),
    () => sdk.material.getCatalog(),
    "material.catalog"
  );
}

export async function getMaterialRequests(filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<MaterialRequest[]> {
  return preferEden<MaterialRequest[]>(
    () =>
      (eden as any)["material-requests"].get({
        headers: authHeaders(),
        query: filters || undefined,
      }),
    () => sdk.material.getRequests(filters),
    "material.list"
  );
}

export async function getPendingMaterialRequests(): Promise<MaterialRequest[]> {
  return preferEden<MaterialRequest[]>(
    () =>
      (eden as any)["material-requests"].pending.get({
        headers: authHeaders(),
      }),
    () => sdk.material.getPendingRequests(),
    "material.pending"
  );
}

export async function getMaterialRequestById(id: string): Promise<MaterialRequestDetail> {
  const detail = await preferEden<MaterialRequestDetail>(
    () =>
      materialById(id).get({
        headers: authHeaders(),
      }),
    () => sdk.material.getRequestById(id),
    "material.detail"
  );
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

export async function createMaterialRequest(payload: {
  request_no?: string;
  dmi_no?: string;
  request_date?: string;
  model_id: string;
  cost_center_id?: string;
  process_name?: string;
  remarks?: string;
  items: MaterialRequestItem[];
}): Promise<MaterialRequest> {
  return preferEden<MaterialRequest>(
    () =>
      (eden as any)["material-requests"].post(payload, {
        headers: authHeaders(),
      }),
    () => sdk.material.createRequest(payload),
    "material.create"
  );
}

export async function approveMaterialRequest(id: string): Promise<{ id: string; status: string }> {
  return preferEden<{ id: string; status: string }>(
    () =>
      materialById(id).approve.post(
        {},
        {
          headers: authHeaders(),
        }
      ),
    () => sdk.material.approveRequest(id),
    "material.approve"
  );
}

export async function rejectMaterialRequest(id: string, reason?: string): Promise<{ id: string; status: string }> {
  return preferEden<{ id: string; status: string }>(
    () =>
      materialById(id).reject.post(
        { reason },
        {
          headers: authHeaders(),
        }
      ),
    () => sdk.material.rejectRequest(id, reason),
    "material.reject"
  );
}

export async function getMaterialIssueOptions(id: string): Promise<MaterialRequestIssueOptionsResponse> {
  const response = await preferEden<MaterialRequestIssueOptionsResponse>(
    () =>
      materialById(id)["issue-options"].get({
        headers: authHeaders(),
      }),
    () => sdk.material.getIssueOptions(id),
    "material.issue-options"
  );
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

export async function issueMaterialRequestWithAllocation(
  id: string,
  payload: IssueAllocationPayload
): Promise<{ id: string; status: string }> {
  const normalizedPayload = {
    ...payload,
    allocations: payload.allocations.map((line) => ({
      ...line,
      supplier_id: line.vendor_id,
      supplier_pack_size: line.vendor_pack_size,
    })),
  };
  return preferEden<{ id: string; status: string }>(
    () =>
      materialById(id)["issue-with-allocation"].post(normalizedPayload, {
        headers: authHeaders(),
      }),
    () => sdk.material.issueRequestWithAllocation(id, normalizedPayload as any),
    "material.issue"
  );
}

export async function confirmMaterialReceipt(
  id: string,
  payload: {
    scans: Array<{
      part_number: string;
      do_number: string;
      scan_data: string;
    }>;
    remarks?: string;
  }
): Promise<{ id: string; status: string; received_by_user_id?: string; received_at?: string; scans_saved?: number }> {
  return preferEden<{ id: string; status: string; received_by_user_id?: string; received_at?: string; scans_saved?: number }>(
    () =>
      materialById(id)["confirm-receipt"].post(payload, {
        headers: authHeaders(),
      }),
    () => sdk.material.confirmReceipt(id, payload),
    "material.confirm-receipt"
  );
}
