import { ApiError } from "@traceability/sdk";

const FRIENDLY_CODE_MESSAGE: Record<string, string> = {
  NOT_FOUND: "Requested record was not found",
  DUPLICATE_PROCESS_CODE: "Process code already exists",
  INVALID_INPUT: "Invalid input",
  UNKNOWN_ERROR: "Request failed",
  FORBIDDEN: "You do not have permission to perform this action",
  UNAUTHORIZED: "Authentication required",
  SECTION_NOT_SET: "Section not assigned — contact your administrator",
  COST_CENTER_DEFAULT_NOT_SET: "No default cost center set for your section — contact your administrator",
  INVALID_COST_CENTER: "Selected cost center is not allowed for your section",
  INVALID_GROUP_CODE: "Invalid group code",
  INVALID_SECTION: "Invalid section",
  USERNAME_TAKEN: "Username already exists",
  LOCKED_USER: "User is currently logged in and cannot be deleted",
  VALIDATION_ERROR: "Invalid request. Check the form and try again.",
};

export function formatApiError(error: unknown, fallback = "Request failed") {
  if (error instanceof ApiError) {
    const code = String(error.code || "UNKNOWN_ERROR");
    const message = String(error.message || "").trim();

    if (!message || message.toUpperCase() === code.toUpperCase()) {
      return FRIENDLY_CODE_MESSAGE[code] ?? code;
    }

    if (code === "UNKNOWN_ERROR") {
      return message;
    }

    return `${code}: ${message}`;
  }

  // Plain-object errors thrown by section-api / material-api raw fetch helpers
  if (error && typeof error === "object" && "error_code" in error) {
    const code = String((error as any).error_code || "");
    const message = String((error as any).message || "").trim();
    if (code && FRIENDLY_CODE_MESSAGE[code]) return FRIENDLY_CODE_MESSAGE[code];
    if (code && message) return `${code}: ${message}`;
    if (message) return message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return fallback;
}
