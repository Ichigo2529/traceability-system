// ─── Admin Set & Material Recovery API ────────────────────
// Thin wrapper around the hardened backend endpoints.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = readAccessToken();
  return token
    ? { authorization: `Bearer ${token}`, "content-type": "application/json" }
    : { "content-type": "application/json" };
}

// ─── Error mapping ────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  CONSUMPTION_EXISTS: "Material already consumed. Reassignment is not allowed.",
  CONCURRENT_MODIFICATION:
    "This container was changed by another user. Please reload.",
  INVALID_INPUT: "Reason must contain at least 5 characters.",
  INVALID_STATE: "Target set is not active.",
  NOT_FOUND: "Data not found or outdated. Please refresh.",
};

export function mapApiError(errorCode: string, fallbackMessage?: string): string {
  return ERROR_MESSAGES[errorCode] ?? fallbackMessage ?? "An unexpected error occurred.";
}

// ─── Types ────────────────────────────────────────────────

export type ReassignMaterialPayload = {
  container_id: string;
  from_set_run_id: string;
  to_set_run_id: string;
  reason: string;
};

export type ReassignMaterialResult = {
  success: boolean;
  data?: {
    container_id: string;
    from_set_run_id: string;
    to_set_run_id: string;
    reason: string;
  };
  error_code?: string;
  message?: string;
};

// ─── API call ─────────────────────────────────────────────

export async function reassignMaterial(
  payload: ReassignMaterialPayload
): Promise<ReassignMaterialResult> {
  const res = await fetch(`${API_BASE}/admin/material/reassign`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok || body.success === false) {
    return {
      success: false,
      error_code: body.error_code ?? "UNKNOWN",
      message: mapApiError(body.error_code, body.message),
    };
  }

  return { success: true, data: body.data };
}
