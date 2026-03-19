import { getApiBaseUrl } from "@traceability/sdk";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

type UseMaterialRequestsRealtimeOptions = {
  enabled: boolean;
  queryKeys: QueryKey[];
  authenticated?: boolean;
};

function readEnvString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

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

export function useMaterialRequestsRealtime({
  enabled,
  queryKeys,
  authenticated = true,
}: UseMaterialRequestsRealtimeOptions) {
  const queryClient = useQueryClient();
  const queryKeyDigest = useMemo(() => JSON.stringify(queryKeys), [queryKeys]);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!enabled || !authenticated) return;
    if (typeof window === "undefined") return;

    if (isDev) {
      const pollTimer = window.setInterval(() => {
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
      }, 2500);

      return () => {
        window.clearInterval(pollTimer);
      };
    }

    const accessToken = readAccessToken();
    if (!accessToken) return;

    const base = getApiBaseUrl(readEnvString(import.meta.env.VITE_API_BASE_URL));
    if (!base) return;

    const url = `${base}/realtime/material-requests?access_token=${encodeURIComponent(accessToken)}`;
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
      }, 120);
    };

    const connect = () => {
      if (!es) return;
      es.addEventListener("material-request-updated", invalidate);
      es.onerror = () => {
        es?.close();
        es = null;
        if (reconnectTimer) return;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = undefined;
          es = new EventSource(url);
          connect();
        }, 2000);
      };
    };
    connect();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      es?.close();
    };
  }, [enabled, authenticated, isDev, queryClient, queryKeyDigest, queryKeys]);
}
