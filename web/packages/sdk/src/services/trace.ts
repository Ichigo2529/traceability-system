import { ApiClient } from '../client';
import { TraceResult } from '../types';

export class TraceService {
  constructor(private client: ApiClient) {}

  async getTray(id: string): Promise<TraceResult> {
    return this.client.get<TraceResult>(`/trace/tray/${id}`);
  }

  // Placeholder for future endpoints
  async getOuter(id: string): Promise<TraceResult> {
    return this.client.get<TraceResult>(`/trace/outer/${id}`);
  }

  async getPallet(id: string): Promise<TraceResult> {
    return this.client.get<TraceResult>(`/trace/pallet/${id}`);
  }
}
