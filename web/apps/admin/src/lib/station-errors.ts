import { ApiError } from "@traceability/sdk";

const OPERATOR_GUIDANCE: Record<string, string> = {
  DEVICE_NOT_ASSIGNED: "Ask admin to assign device to machine/station/process.",
  OPERATOR_SESSION_REQUIRED: "Login operator on kiosk first.",
  NO_OPERATOR_SESSION: "Login operator on kiosk first.",
  COMPONENT_NOT_WASHED: "Send component/jig to wash first.",
  MISSING_REQUIRED_COMPONENT: "Scan required jig/component.",
  INSUFFICIENT_QTY_REMAINING: "Replace jig/pack and retry.",
  LINE_NOT_CAPABLE_FOR_VARIANT: "Move to supported line or update machine capability.",
  INVALID_STATE_TRANSITION: "Stop process and call supervisor.",
  OFFLINE_SERIAL_NOT_ALLOWED: "Wait for network recovery before labeling.",
  REVISION_NOT_READY: "Admin must complete config and activate revision.",
  REVISION_LOCKED: "Create new revision for changes.",
};

function extractCode(error: unknown): string | null {
  if (error instanceof ApiError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return null;
}

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? "Request failed");
  }
  return "Request failed";
}

export function formatStationError(error: unknown, fallback = "Operation failed"): string {
  const code = extractCode(error);
  const message = extractMessage(error) || fallback;
  const guidance = code ? OPERATOR_GUIDANCE[code] : undefined;
  if (!code && !guidance) return message || fallback;
  if (!guidance) return `${code}: ${message}`;
  return `${code}: ${message}. ${guidance}`;
}

