import { db } from './db';
import { SDK, type TraceEvent } from '@traceability/sdk';

const ONLINE_ONLY_EVENT_TYPES = new Set<string>([
  'LABEL_GENERATE_REQUEST',
  'LABELS_GENERATED',
]);

export class OfflineQueueManager {
  private isProcessing = false;

  constructor(private sdk: SDK) {}

  public async enqueueEvent(event: TraceEvent) {
    if (!navigator.onLine && ONLINE_ONLY_EVENT_TYPES.has(event.event_type)) {
      throw new Error('OFFLINE_SERIAL_NOT_ALLOWED');
    }

    const event_id = event.event_id || crypto.randomUUID();
    await db.queued_events.add({
      event_id,
      event_type: event.event_type,
      unit_id: event.unit_id,
      machine_id: event.machine_id,
      payload: event.payload ?? null,
      target_state: event.target_state,
      created_at: event.created_at_device || new Date().toISOString(),
      retry_count: 0
    });

    if (navigator.onLine) {
      await this.process();
    }
  }

  // Backward compatibility
  public async enqueue(eventType: string, payload: any) {
    await this.enqueueEvent({
      event_id: crypto.randomUUID(),
      event_type: eventType,
      payload,
      created_at_device: new Date().toISOString(),
    });
  }

  public async listPending() {
    return db.queued_events.orderBy('id').toArray();
  }

  public async deletePending(id: number) {
    await db.queued_events.delete(id);
  }

  public async clearPending() {
    await db.queued_events.clear();
  }

  public async process() {
    if (this.isProcessing || !navigator.onLine) return;
    this.isProcessing = true;

    try {
      while (navigator.onLine) {
        // Fetch next pending event
        const event = await db.queued_events.orderBy('id').first();
        if (!event) break; // Queue empty

        try {
          await this.sdk.event.postEvent({
            event_id: event.event_id,
            event_type: event.event_type,
            unit_id: event.unit_id,
            machine_id: event.machine_id,
            payload: event.payload,
            created_at_device: event.created_at,
            target_state: event.target_state,
          });

          await db.queued_events.delete(event.id!);

        } catch (err: any) {
          const status = err.status || 500;

          if (status >= 400 && status < 500 && status !== 429) {
            console.error('[OfflineQueue] Hard processing error, stopping queue:', err);
            await db.queued_events.update(event.id!, { 
                last_error: err.message || 'Hard Validation Error' 
            });
            break;
          } else {
             const retryCount = event.retry_count + 1;
             await db.queued_events.update(event.id!, {
                retry_count: retryCount,
                last_error: err.message || 'Network/Server Error'
             });
             
             const delay = Math.min(Math.pow(2, retryCount) * 100, 30000);
             await new Promise(r => setTimeout(r, delay));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
