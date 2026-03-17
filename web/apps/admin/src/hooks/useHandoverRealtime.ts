import { getApiBaseUrl } from "@traceability/sdk";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

type UseHandoverRealtimeOptions = {
  enabled: boolean;
  queryKeys: QueryKey[];
};

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export function useHandoverRealtime({ enabled, queryKeys }: UseHandoverRealtimeOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKeyDigest = useMemo(() => JSON.stringify(queryKeys), [queryKeys]);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!enabled || !user) return;
    if (typeof window === "undefined") return;

    // Dev mode: simple polling fallback
    if (isDev) {
      const pollTimer = window.setInterval(() => {
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
      }, 3000);
      return () => window.clearInterval(pollTimer);
    }

    // Production: SSE
    const accessToken = readAccessToken();
    if (!accessToken) return;

    const base = getApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
    if (!base) return;

    const url = `${base}/realtime/handover-batches?access_token=${encodeURIComponent(accessToken)}`;
    let es: EventSource | null = new EventSource(url);
    let reconnectTimer: number | undefined;
    let invalidateTimer: number | undefined;

    const invalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = window.setTimeout(() => {
        invalidateTimer = undefined;
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
      }, 150);
    };

    const connect = () => {
      if (!es) return;
      es.addEventListener("handover-batch-updated", invalidate);
      es.onerror = () => {
        es?.close();
        es = null;
        if (reconnectTimer) return;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = undefined;
          es = new EventSource(url);
          connect();
        }, 3000);
      };
    };
    connect();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      es?.close();
    };
  }, [enabled, isDev, user, queryClient, queryKeyDigest, queryKeys]);
}
