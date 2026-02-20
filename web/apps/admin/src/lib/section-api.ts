import { authHeaders } from "./api-client";

const base = () => String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

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

// ── Cost Centers ──────────────────────────────────────────

export interface AdminCostCenter {
  id: string;
  group_code: string;
  cost_code: string;
  short_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getCostCenters = () => api<AdminCostCenter[]>("/admin/cost-centers");

export const createCostCenter = (body: { group_code: string; cost_code: string; short_text: string; is_active?: boolean }) =>
  api<AdminCostCenter>("/admin/cost-centers", { method: "POST", body: JSON.stringify(body) });

export const updateCostCenter = (id: string, body: { group_code?: string; cost_code?: string; short_text?: string; is_active?: boolean }) =>
  api<AdminCostCenter>(`/admin/cost-centers/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteCostCenter = (id: string) =>
  api<null>(`/admin/cost-centers/${id}`, { method: "DELETE" });

// ── Sections ──────────────────────────────────────────────

export interface SectionCostCenterMapping {
  id: string;
  cost_center_id: string;
  is_default: boolean;
  cost_code: string;
  short_text: string;
  group_code: string;
  cc_is_active: boolean;
}

export interface AdminSection {
  id: string;
  section_code: string;
  section_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cost_centers: SectionCostCenterMapping[];
}

export const getSections = () => api<AdminSection[]>("/admin/sections");

export const createSection = (body: { section_code: string; section_name: string; is_active?: boolean }) =>
  api<AdminSection>("/admin/sections", { method: "POST", body: JSON.stringify(body) });

export const updateSection = (id: string, body: { section_code?: string; section_name?: string; is_active?: boolean }) =>
  api<AdminSection>(`/admin/sections/${id}`, { method: "PUT", body: JSON.stringify(body) });

export const deleteSection = (id: string) =>
  api<null>(`/admin/sections/${id}`, { method: "DELETE" });

export const addSectionCostCenter = (sectionId: string, body: { cost_center_id: string; is_default?: boolean }) =>
  api<any>(`/admin/sections/${sectionId}/cost-centers`, { method: "POST", body: JSON.stringify(body) });

export const removeSectionCostCenter = (sectionId: string, costCenterId: string) =>
  api<null>(`/admin/sections/${sectionId}/cost-centers/${costCenterId}`, { method: "DELETE" });

export const setSectionDefaultCC = (sectionId: string, costCenterId: string) =>
  api<any>(`/admin/sections/${sectionId}/default-cost-center`, { method: "PATCH", body: JSON.stringify({ cost_center_id: costCenterId }) });

// ── User Sections ─────────────────────────────────────────

export interface UserSectionRow {
  user_id: string;
  username: string;
  display_name: string;
  employee_code: string | null;
  email: string | null;
  department: string | null;
  is_active: boolean;
  section_id: string | null;
  section_code: string | null;
  section_name: string | null;
}

export const getUserSections = (search?: string) =>
  api<UserSectionRow[]>(`/admin/user-sections${search ? `?q=${encodeURIComponent(search)}` : ""}`);

export const assignUserSection = (userId: string, sectionId: string) =>
  api<any>(`/admin/user-sections/${userId}`, { method: "PUT", body: JSON.stringify({ section_id: sectionId }) });

export const unassignUserSection = (userId: string) =>
  api<null>(`/admin/user-sections/${userId}`, { method: "DELETE" });
