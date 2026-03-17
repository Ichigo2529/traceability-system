import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@traceability/sdk";
import { toast } from "sonner";
import { sdk } from "../context/AuthContext";

function currentRoutePath() {
  if (typeof window === "undefined") return "/";
  const hashPath = window.location.hash.replace(/^#/, "");
  return hashPath || window.location.pathname || "/";
}

function loginUrl() {
  if (typeof window === "undefined") return "/#/login";
  return `${window.location.origin}${window.location.pathname}#/login`;
}

function handleUnauthorized(error: unknown) {
  if (!(error instanceof ApiError)) return;
  if (error.status !== 401) return;
  if (typeof window === "undefined") return;
  if (currentRoutePath().startsWith("/login")) return;

  const requestUrl = (error.requestUrl || "").toLowerCase();
  if (requestUrl.includes("/auth/login") || requestUrl.startsWith("/device")) return;

  // Clear session and redirect on 401 (e.g. token expired after refresh)
  sdk.auth.logout();
  localStorage.removeItem("user_info");
  localStorage.removeItem("auth_tokens");
  localStorage.removeItem("auth_mode");
  toast.info("Session expired. Please sign in again.");
  window.location.replace(loginUrl());
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
  queryCache: new QueryCache({
    onError: handleUnauthorized,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorized,
    onSuccess: async () => {
      if (typeof window === "undefined") return;
      if (!currentRoutePath().startsWith("/admin")) return;
      await queryClient.invalidateQueries({ refetchType: "active" });
    },
  }),
});
