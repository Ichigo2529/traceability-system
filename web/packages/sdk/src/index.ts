import { ApiClient } from "./client";
import { AuthService } from "./services/auth";
import { DeviceService } from "./services/device";
import { EventService } from "./services/event";
import { TraceService } from "./services/trace";
import { AdminService } from "./services/admin";
import { MaterialService } from "./services/material";

export * from "./types";
export * from "./errors";
export { ApiClient } from "./client";

const DEFAULT_API_PORT = 3000;

/**
 * Resolve API base URL: use env if set, else in browser use current host (so LAN clients
 * opening e.g. http://192.168.89.61:5173 use http://192.168.89.61:3000 for API).
 */
export function getApiBaseUrl(envValue?: string): string {
  if (typeof envValue === "string" && envValue.trim()) return envValue.trim().replace(/\/+$/, "");
  if (typeof globalThis !== "undefined" && (globalThis as any).window?.location?.hostname) {
    const host = (globalThis as any).window.location.hostname;
    const protocol = (globalThis as any).window.location.protocol || "http:";
    return `${protocol}//${host}:${DEFAULT_API_PORT}`;
  }
  return `http://localhost:${DEFAULT_API_PORT}`;
}

export class SDK {
  public auth: AuthService;
  public device: DeviceService;
  public event: EventService;
  public trace: TraceService;
  public admin: AdminService;
  public material: MaterialService;

  constructor(client: ApiClient) {
    this.auth = new AuthService(client);
    this.device = new DeviceService(client);
    this.event = new EventService(client);
    this.trace = new TraceService(client);
    this.admin = new AdminService(client);
    this.material = new MaterialService(client);
  }
}

// Default export wrapper for convenience
export function createSdk(baseURL: string): SDK {
  const client = new ApiClient(baseURL);
  // Auto-load tokens
  client.loadTokensFromStorage();
  return new SDK(client);
}
