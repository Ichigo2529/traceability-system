import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  markMaterialRealtimeError,
  markMaterialRealtimeEvent,
  resetMaterialRealtimeHealth,
  updateMaterialRealtimeHealth,
} from "../lib/realtime-health";

type UseMaterialRequestsRealtimeOptions = {
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

export function useMaterialRequestsRealtime({ enabled, queryKeys }: UseMaterialRequestsRealtimeOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKeyDigest = useMemo(() => JSON.stringify(queryKeys), [queryKeys]);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!enabled || !user) {
      resetMaterialRealtimeHealth();
      return;
    }
    if (typeof window === "undefined") return;

    if (isDev) {
      updateMaterialRealtimeHealth({
        status: "polling",
        mode: "polling",
        errorMessage: null,
      });
      const pollTimer = window.setInterval(() => {
        markMaterialRealtimeEvent();
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
      }, 2500);

      return () => {
        window.clearInterval(pollTimer);
        resetMaterialRealtimeHealth();
      };
    }

    const accessToken = readAccessToken();
    if (!accessToken) {
      updateMaterialRealtimeHealth({
        status: "error",
        mode: "none",
        errorMessage: "Missing access token",
      });
      return;
    }

    const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
    if (!base) {
      updateMaterialRealtimeHealth({
        status: "error",
        mode: "none",
        errorMessage: "Missing API base URL",
      });
      return;
    }

    const url = `${base}/realtime/material-requests?access_token=${encodeURIComponent(accessToken)}`;
    let es: EventSource | null = new EventSource(url);
    let reconnectTimer: number | undefined;
    let invalidateTimer: number | undefined;
    updateMaterialRealtimeHealth({
      status: "connecting",
      mode: "sse",
      errorMessage: null,
    });

    const invalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = window.setTimeout(() => {
        markMaterialRealtimeEvent();
        invalidateTimer = undefined;
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
      }, 120);
    };

    const connect = () => {
      if (!es) return;
      es.onopen = () => {
        updateMaterialRealtimeHealth({
          status: "connected",
          mode: "sse",
          errorMessage: null,
        });
      };
      es.addEventListener("material-request-updated", invalidate);
      es.onerror = () => {
        markMaterialRealtimeError("SSE disconnected");
        es?.close();
        es = null;
        if (reconnectTimer) return;
        updateMaterialRealtimeHealth({
          status: "reconnecting",
          mode: "sse",
        });
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = undefined;
          es = new EventSource(url);
          updateMaterialRealtimeHealth({
            status: "connecting",
            mode: "sse",
          });
          connect();
        }, 2000);
      };
    };
    connect();

    return () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      es?.close();
      resetMaterialRealtimeHealth();
    };
  }, [enabled, isDev, user, queryClient, queryKeyDigest, queryKeys]);
}
