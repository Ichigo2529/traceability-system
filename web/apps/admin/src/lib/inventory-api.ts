import { getApiBaseUrl } from "@traceability/sdk";
import { authHeaders } from "./api-client";

const base = () => getApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { ...authHeaders(), "Content-Type": "application/json", ...(init?.headers ?? {}) } as any,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err: any = new Error(json.message ?? "Request failed");
    err.error_code = json.error_code;
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────

export interface InventoryDo {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  do_number: string;
  supplier?: string | null;
  part_number?: string | null;
  description?: string | null;
  lot_number?: string | null;
  gr_number?: string | null;
  material_code?: string | null;
  total_qty?: number | null;
  qty_received: number;
  qty_issued: number;
  reject_qty?: number | null;
  received_date?: string | null;
  received_at?: string | null;
}

export interface InventoryDoFilters {
  do_number?: string;
  part_number?: string;
  supplier_id?: string;
}

export interface DoImportResult {
  batch_id: string;
  inserted: number;
  updated: number;
  failed: number;
  errors: { row_no: number; message: string }[];
}

// ── DO CRUD ────────────────────────────────────────────────

export const getInventoryDos = (filters?: InventoryDoFilters): Promise<InventoryDo[]> => {
  const params = new URLSearchParams();
  if (filters?.do_number) params.set("do_number", filters.do_number);
  if (filters?.part_number) params.set("part_number", filters.part_number);
  if (filters?.supplier_id) params.set("supplier_id", filters.supplier_id);
  const qs = params.toString();
  return api<InventoryDo[]>(`/inventory/do${qs ? `?${qs}` : ""}`);
};

export const createInventoryDo = (body: {
  do_number: string;
  supplier_id?: string;
  supplier?: string;
  part_number?: string;
  description?: string;
  lot_number?: string;
  gr_number?: string;
  material_code?: string;
  total_qty?: number;
  qty_received?: number;
  reject_qty?: number;
  received_date?: string;
}): Promise<InventoryDo> => api<InventoryDo>("/inventory/do", { method: "POST", body: JSON.stringify(body) });

export const updateInventoryDo = (
  id: string,
  body: {
    do_number?: string;
    supplier_id?: string;
    supplier?: string;
    part_number?: string;
    description?: string;
    lot_number?: string;
    gr_number?: string;
    material_code?: string;
    total_qty?: number;
    qty_received?: number;
    reject_qty?: number;
    received_date?: string;
  }
): Promise<InventoryDo> => api<InventoryDo>(`/inventory/do/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteInventoryDo = (id: string): Promise<{ id: string; deleted: boolean }> =>
  api(`/inventory/do/${id}`, { method: "DELETE" });

// ── Vendor Pack Detail ─────────────────────────────────────

export interface VendorPackDetail {
  id: string;
  supplier_id: string;
  supplier_name?: string | null;
  supplier_code?: string | null;
  part_number: string;
  supplier_part_number?: string | null;
  component_name?: string | null;
  parser_key?: string | null;
  default_pack_qty?: number | null;
  vendor_detail?: string | null;
  qr_sample?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getVendorPackDetails = (filters?: {
  part_number?: string;
  supplier_id?: string;
}): Promise<VendorPackDetail[]> => {
  const params = new URLSearchParams();
  if (filters?.part_number) params.set("part_number", filters.part_number);
  if (filters?.supplier_id) params.set("supplier_id", filters.supplier_id);
  const qs = params.toString();
  return api<VendorPackDetail[]>(`/inventory/vendor-pack${qs ? `?${qs}` : ""}`);
};

export const createVendorPackDetail = (body: {
  supplier_id: string;
  part_number: string;
  supplier_part_number?: string;
  component_name?: string;
  parser_key?: string;
  default_pack_qty?: number;
  vendor_detail?: string;
  qr_sample?: string;
}): Promise<VendorPackDetail> =>
  api<VendorPackDetail>("/inventory/vendor-pack", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateVendorPackDetail = (
  id: string,
  body: {
    supplier_id?: string;
    part_number?: string;
    supplier_part_number?: string;
    component_name?: string;
    parser_key?: string;
    default_pack_qty?: number;
    vendor_detail?: string;
    qr_sample?: string;
  }
): Promise<VendorPackDetail> =>
  api<VendorPackDetail>(`/inventory/vendor-pack/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteVendorPackDetail = (id: string): Promise<{ id: string; is_active: boolean }> =>
  api(`/inventory/vendor-pack/${id}`, { method: "DELETE" });

// ── Excel Import ───────────────────────────────────────────

export async function importInventoryDoExcel(file: File): Promise<DoImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${base()}/inventory/do/import-excel`, {
    method: "POST",
    headers: authHeaders() as any,
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err: any = new Error(json.message ?? "Import failed");
    err.error_code = json.error_code;
    err.status = res.status;
    throw err;
  }
  return json.data as DoImportResult;
}

// ── DO Issue History ───────────────────────────────────────

export interface DoIssueHistoryRow {
  id: string;
  request_no: string;
  issued_at: string;
  part_number: string;
  issued_qty: number;
  remarks?: string | null;
}

export const getDoIssueHistory = (doId: string): Promise<DoIssueHistoryRow[]> =>
  api<DoIssueHistoryRow[]>(`/inventory/do/${doId}/issue-history`);
