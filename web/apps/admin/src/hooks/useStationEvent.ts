import { useOfflineQueue } from "@traceability/offline-queue";
import { ApiError, type TraceEvent } from "@traceability/sdk";
import { sdk } from "../context/AuthContext";

const ONLINE_ONLY_EVENT_TYPES = new Set<string>([
  "LABEL_GENERATE_REQUEST",
  "LABELS_GENERATED",
]);

function isNetworkLikeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { status?: number; code?: string; message?: string };
  if (maybe.status === 0) return true;
  if (maybe.code === "NETWORK_ERROR" || maybe.code === "ERR_NETWORK") return true;
  const msg = (maybe.message || "").toLowerCase();
  return msg.includes("network") || msg.includes("timeout");
}

export function useStationEvent() {
  const { queue, isOnline } = useOfflineQueue();

  async function publishEvent(event: TraceEvent, options?: { allowOfflineQueue?: boolean }) {
    const allowOfflineQueue = options?.allowOfflineQueue ?? true;
    const onlineOnly = ONLINE_ONLY_EVENT_TYPES.has(event.event_type);

    if (!isOnline) {
      if (!allowOfflineQueue || onlineOnly) {
        throw new ApiError("Online required for this operation", "OFFLINE_SERIAL_NOT_ALLOWED", 409);
      }
      await queue.enqueueEvent(event);
      return { queued: true as const };
    }

    try {
      const data = await sdk.event.postEvent(event);
      return { queued: false as const, data };
    } catch (error) {
      if (!allowOfflineQueue || onlineOnly || !isNetworkLikeError(error)) {
        throw error;
      }
      await queue.enqueueEvent(event);
      return { queued: true as const };
    }
  }

  return { publishEvent, isOnline };
}
