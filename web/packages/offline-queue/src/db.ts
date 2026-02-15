import Dexie, { Table } from 'dexie';

export interface QueuedEvent {
  id?: number;
  event_id: string; // UUID for idempotency
  event_type: string;
  unit_id?: string;
  machine_id?: string;
  payload: any;
  target_state?: string;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export class OfflineDatabase extends Dexie {
  queued_events!: Table<QueuedEvent>;

  constructor() {
    super('TraceabilityOfflineDB');
    this.version(1).stores({
      queued_events: '++id, event_id, event_type, retry_count'
    });
  }
}

export const db = new OfflineDatabase();
