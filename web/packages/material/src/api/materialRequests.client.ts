import {
  MaterialRequest,
  MaterialRequestCatalogItem,
  MaterialRequestDetail,
  MaterialRequestIssueOptionsResponse,
  MaterialRequestMeta,
  createSdk,
  getApiBaseUrl,
} from "@traceability/sdk";
import {
  CreateMaterialRequestPayload,
  IssueAllocationPayload,
  MaterialRequestFilters,
  NextNumbersResponse,
} from "../domain/materialRequest.types";
import {
  normalizeDateOnly,
  normalizeIssueOptions,
  normalizeIssuePayload,
  normalizeIsoDateTime,
  normalizeRequestDetail,
} from "./materialRequests.normalizers";

const sdk = createSdk(getApiBaseUrl(import.meta.env.VITE_API_BASE_URL));

export async function getMaterialRequestNextNumbers(): Promise<NextNumbersResponse> {
  const data = await sdk.material.getNextNumbers();
  return {
    ...data,
    request_date: normalizeDateOnly((data as any)?.request_date),
    generated_at: normalizeIsoDateTime((data as any)?.generated_at),
  };
}

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

export async function getMaterialRequestMeta(): Promise<MaterialRequestMeta> {
  const baseUrl = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
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
  return sdk.material.getCatalog();
}

export async function getMaterialRequests(filters?: MaterialRequestFilters): Promise<MaterialRequest[]> {
  return sdk.material.getRequests(filters);
}

export async function getPendingMaterialRequests(): Promise<MaterialRequest[]> {
  return sdk.material.getPendingRequests();
}

export async function getMaterialRequestById(id: string): Promise<MaterialRequestDetail> {
  return normalizeRequestDetail(await sdk.material.getRequestById(id));
}

export async function createMaterialRequest(payload: CreateMaterialRequestPayload): Promise<MaterialRequest> {
  return sdk.material.createRequest(payload);
}

export async function approveMaterialRequest(id: string): Promise<{ id: string; status: string }> {
  return sdk.material.approveRequest(id);
}

export async function rejectMaterialRequest(id: string, reason?: string): Promise<{ id: string; status: string }> {
  return sdk.material.rejectRequest(id, reason);
}

export async function getMaterialIssueOptions(id: string): Promise<MaterialRequestIssueOptionsResponse> {
  return normalizeIssueOptions(await sdk.material.getIssueOptions(id));
}

export async function issueMaterialRequestWithAllocation(
  id: string,
  payload: IssueAllocationPayload
): Promise<{ id: string; status: string }> {
  return sdk.material.issueRequestWithAllocation(id, normalizeIssuePayload(payload) as any);
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
  return sdk.material.confirmReceipt(id, payload);
}

export async function withdrawMaterialRequest(
  id: string,
  reason?: string
): Promise<{ id: string; status: string; alert_status?: string }> {
  return sdk.material.withdrawRequest(id, reason);
}
