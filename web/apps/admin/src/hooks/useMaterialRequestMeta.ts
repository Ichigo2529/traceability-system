import { useQuery } from "@tanstack/react-query";
import { MaterialRequestMeta } from "@traceability/sdk";
import { getMaterialRequestMeta } from "../lib/material-api";

/**
 * Fetches the current user's section + allowed cost centers.
 * Handles SECTION_NOT_SET gracefully (returns null meta).
 */
export function useMaterialRequestMeta(enabled = true) {
  const query = useQuery<MaterialRequestMeta>({
    queryKey: ["material-request-meta"],
    queryFn: getMaterialRequestMeta,
    enabled,
    retry: (failureCount, error: any) => {
      // Don't retry if user simply has no section assigned
      if (error?.error_code === "SECTION_NOT_SET") return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const errorCode = (query.error as any)?.error_code as string | undefined;
  const sectionNotSet = errorCode === "SECTION_NOT_SET";

  return {
    meta: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    sectionNotSet,
    errorCode,
    error: query.error,
  };
}
