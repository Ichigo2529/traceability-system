import { useMaterialRequestMeta as useSharedMaterialRequestMeta } from "@traceability/material";

/**
 * Backward-compatible wrapper for admin scope.
 */
export function useMaterialRequestMeta(enabled = true) {
  return useSharedMaterialRequestMeta("admin", enabled);
}
