import { ApiError } from "@traceability/sdk";

const FRIENDLY_CODE_MESSAGE: Record<string, string> = {
  NOT_FOUND: "Requested record was not found",
  DUPLICATE_PROCESS_CODE: "Process code already exists",
  INVALID_INPUT: "Invalid input",
  UNKNOWN_ERROR: "Request failed",
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

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }

  return fallback;
}
