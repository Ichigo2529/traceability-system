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

export interface HandoverBatch {
  id: string;
  batchNo: string;
  materialRequestId: string;
  issuedByUserId: string;
  assignedForkliftUserId?: string | null;
  status: "PENDING" | "IN_TRANSIT" | "RECEIVED" | "RECEIVED_PARTIAL" | "CANCELLED";
  pickupAt?: string | null;
  receivedAt?: string | null;
  expectedItemCount: number;
  scannedItemCount: number;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HandoverBatchItem {
  id: string;
  handoverBatchId: string;
  materialRequestItemIssueId: string;
  partNumber: string;
  doNumber: string;
  expectedPacks: number;
  expectedQty: number;
  scannedPacks: number;
  scannedQty: number;
  status: string;
}

export interface ScanSession {
  id: string;
  handoverBatchId: string;
  userId: string;
  status: "OPEN" | "COMPLETED" | "ABANDONED";
  totalScans: number;
  matchedScans: number;
  errorScans: number;
  startedAt: string;
  finalizedAt?: string | null;
}

export interface ScanEvent {
  id: string;
  scanSessionId: string;
  barcodeRaw: string;
  result: "MATCHED" | "DUPLICATE" | "NOT_FOUND" | "EXPIRED" | "PARSE_ERROR" | "MISMATCH";
  resultDetail?: string | null;
  parsedPartNumber?: string | null;
  parsedLotNumber?: string | null;
  parsedQty?: number | null;
  createdAt: string;
}

// ── Handover Batch CRUD ────────────────────────────────────

export const getHandoverBatches = (filters?: { status?: string }): Promise<HandoverBatch[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return api<HandoverBatch[]>(`/handover/handover-batches${qs ? `?${qs}` : ""}`);
};

export const pickupBatch = (batchId: string): Promise<HandoverBatch> =>
  api<HandoverBatch>(`/handover/handover-batches/${batchId}/pickup`, { method: "POST" });

export const getBatchItems = (batchId: string): Promise<HandoverBatchItem[]> =>
  api<HandoverBatchItem[]>(`/handover/handover-batches/${batchId}/items`);

// ── Scan Session ───────────────────────────────────────────

export const startScanSession = (handoverBatchId: string): Promise<ScanSession> =>
  api<ScanSession>(`/handover/scan-sessions`, {
    method: "POST",
    body: JSON.stringify({ handoverBatchId }),
  });

export const submitScan = (
  sessionId: string,
  body: { barcodeRaw: string; idempotencyKey: string; scannedAtDevice: string }
): Promise<ScanEvent> =>
  api<ScanEvent>(`/handover/scan-sessions/${sessionId}/scans`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const finalizeSession = (sessionId: string, body?: { remarks?: string }): Promise<ScanSession> =>
  api<ScanSession>(`/handover/scan-sessions/${sessionId}/finalize`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

export const getScanSession = (sessionId: string): Promise<ScanSession> =>
  api<ScanSession>(`/handover/scan-sessions/${sessionId}`);

export const getSessionScans = (sessionId: string): Promise<ScanEvent[]> =>
  api<ScanEvent[]>(`/handover/scan-sessions/${sessionId}/scans`);
