export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error_code: string;
  message: string;
  details?: unknown;
};

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(
  error_code: string,
  message: string,
  details?: unknown
): ApiFailure {
  if (typeof details === "undefined") {
    return { success: false, error_code, message };
  }
  return { success: false, error_code, message, details };
}

