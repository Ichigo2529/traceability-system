import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@traceability/sdk";
import { sdk } from "../context/AuthContext";

function handleUnauthorized(error: unknown) {
  if (!(error instanceof ApiError)) return;
  if (error.status !== 401) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;

  const requestUrl = (error.requestUrl || "").toLowerCase();
  if (requestUrl.startsWith("/device")) return;
  if (sdk.auth.isAuthenticated()) return;

  localStorage.removeItem("user_info");
  localStorage.removeItem("auth_tokens");
  localStorage.removeItem("auth_mode");
  window.location.replace("/login");
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 2,
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
      if (!window.location.pathname.startsWith("/admin")) return;
      await queryClient.invalidateQueries({ refetchType: "active" });
    },
  }),
});
