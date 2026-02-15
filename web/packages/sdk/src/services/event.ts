import { ApiClient } from '../client';
import { EventSubmissionResponse, LabelGenerationResponse, TraceEvent } from '../types';

export class EventService {
  constructor(private client: ApiClient) {}

  async postEvent(event: TraceEvent): Promise<EventSubmissionResponse> {
    return this.client.post<EventSubmissionResponse>('/events', event);
  }

  async validateTransition(unitType: string, currentState: string, targetState: string) {
    return this.client.post('/events/validate-transition', {
      unit_type: unitType,
      current_state: currentState,
      target_state: targetState
    });
  }

  async generateLabels(assyId: string): Promise<LabelGenerationResponse> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("OFFLINE_SERIAL_NOT_ALLOWED");
    }
    return this.client.post<LabelGenerationResponse>('/labels/generate', { assy_id: assyId });
  }
}
