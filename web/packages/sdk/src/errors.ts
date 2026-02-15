export interface ApiErrorResponse {
  success: false;
  error_code: string;
  message: string;
  error?: string; // Legacy fallback
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public data?: any;
  public requestUrl?: string;
  public requestMethod?: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500,
    data?: any,
    requestUrl?: string,
    requestMethod?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.requestUrl = requestUrl;
    this.requestMethod = requestMethod;
  }
}
