import { ApiClient } from './client';
import { AuthService } from './services/auth';
import { DeviceService } from './services/device';
import { EventService } from './services/event';
import { TraceService } from './services/trace';
import { AdminService } from './services/admin';
import { MaterialService } from './services/material';

export * from './types';
export * from './errors';
export { ApiClient } from './client';

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
