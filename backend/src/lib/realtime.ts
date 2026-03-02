const encoder = new TextEncoder();

type Subscriber = {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};

const channels = new Map<string, Map<string, Subscriber>>();

function ensureChannel(channel: string) {
  let map = channels.get(channel);
  if (!map) {
    map = new Map<string, Subscriber>();
    channels.set(channel, map);
  }
  return map;
}

function removeSubscriber(channel: string, id: string) {
  const map = channels.get(channel);
  if (!map) return;
  map.delete(id);
  if (!map.size) channels.delete(channel);
}

function encodeEvent(event: string, payload: Record<string, unknown>) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function createSseStream(channel: string) {
  const subscriberId = crypto.randomUUID();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const channelMap = ensureChannel(channel);
      channelMap.set(subscriberId, { id: subscriberId, controller });
      controller.enqueue(
        encodeEvent("connected", {
          channel,
          subscriber_id: subscriberId,
          ts: new Date().toISOString(),
        })
      );

      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          removeSubscriber(channel, subscriberId);
        }
      }, 15000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      removeSubscriber(channel, subscriberId);
    },
  });

  return { stream };
}

export function publishRealtime(channel: string, event: string, payload: Record<string, unknown>) {
  const channelMap = channels.get(channel);
  if (!channelMap?.size) return 0;

  let delivered = 0;
  for (const [id, subscriber] of channelMap.entries()) {
    try {
      subscriber.controller.enqueue(encodeEvent(event, payload));
      delivered += 1;
    } catch {
      removeSubscriber(channel, id);
    }
  }
  return delivered;
}

export const REALTIME_CHANNELS = {
  MATERIAL_REQUESTS: "material_requests",
} as const;

export function publishMaterialRequestUpdate(payload: {
  event_type:
    | "CREATED"
    | "APPROVED"
    | "REJECTED"
    | "ISSUED"
    | "WITHDRAWN"
    | "RECEIPT_CONFIRMED"
    | "DISPATCHED_TO_FORKLIFT"
    | "FORKLIFT_ACKNOWLEDGED";
  id: string;
  status: string;
  request_no?: string | null;
  dmi_no?: string | null;
}) {
  return publishRealtime(REALTIME_CHANNELS.MATERIAL_REQUESTS, "material-request-updated", {
    ...payload,
    ts: new Date().toISOString(),
  });
}
