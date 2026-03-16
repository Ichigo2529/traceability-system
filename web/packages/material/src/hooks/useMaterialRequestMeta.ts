import { useQuery } from "@tanstack/react-query";
import { MaterialRequestMeta } from "@traceability/sdk";
import { getMaterialRequestMeta } from "../api/materialRequests.client";
import { createMaterialQueryKeys, MaterialScope } from "../domain/queryKeys";

export function useMaterialRequestMeta(scope: MaterialScope, enabled = true) {
  const keys = createMaterialQueryKeys(scope);
  const query = useQuery<MaterialRequestMeta>({
    queryKey: keys.meta(),
    queryFn: getMaterialRequestMeta,
    enabled,
    retry: (failureCount, error: any) => {
      if (error?.error_code === "SECTION_NOT_SET") return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
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
