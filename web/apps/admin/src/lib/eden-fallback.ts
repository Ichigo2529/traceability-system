type EdenCallResult = {
  data?: unknown;
  error?: unknown;
};

const strictScopesFromEnv = String(import.meta.env.VITE_EDEN_STRICT_SCOPES ?? "")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

const strictPreset = String(import.meta.env.VITE_EDEN_STRICT_PRESET ?? "")
  .trim()
  .toLowerCase();
const criticalScopes = ["material.issue", "material.approve", "material.reject", "admin.workflow"];

const strictScopes = new Set(
  [...strictScopesFromEnv, ...(strictPreset === "critical" ? criticalScopes : [])]
    .map((scope) => scope.trim())
    .filter(Boolean)
);

const strictScopeList = Array.from(strictScopes);
const fallbackDebugEnabled = String(import.meta.env.VITE_EDEN_FALLBACK_DEBUG ?? "") === "true";

const fallbackStats = new Map<string, number>();

function isStrictScope(scope: string) {
  if (!strictScopeList.length) return false;
  if (strictScopes.has("*")) return true;
  return strictScopeList.some((entry) => scope === entry || scope.startsWith(`${entry}.`));
}

function extractPayload(result: EdenCallResult) {
  return (result as any)?.data?.data ?? (result as any)?.data;
}

function recordFallback(scope: string, reason: string) {
  const next = (fallbackStats.get(scope) ?? 0) + 1;
  fallbackStats.set(scope, next);
  if (import.meta.env.DEV && fallbackDebugEnabled) {
    console.warn(`[eden:fallback] scope=${scope} count=${next} reason=${reason}`);
  }
}

export function getEdenFallbackStats() {
  return Array.from(fallbackStats.entries())
    .map(([scope, count]) => ({ scope, count }))
    .sort((a, b) => b.count - a.count);
}

export function getEdenFallbackDebugInfo() {
  return {
    strictScopes: strictScopeList,
    strictPreset,
    debugEnabled: fallbackDebugEnabled,
  };
}

export async function callEdenWithFallback<T>(
  scope: string,
  edenCall: () => Promise<EdenCallResult>,
  fallbackCall: () => Promise<T>
): Promise<T> {
  const strict = isStrictScope(scope);
  try {
    const result = await edenCall();
    const payload = extractPayload(result);
    if (payload !== undefined && payload !== null) return payload as T;

    if ((result as any)?.error) {
      if (strict) throw new Error(`[eden:strict] ${scope} returned error payload`);
      recordFallback(scope, "error-payload");
      return fallbackCall();
    }

    if (strict) throw new Error(`[eden:strict] ${scope} returned empty payload`);
    recordFallback(scope, "empty-payload");
    return fallbackCall();
  } catch (error) {
    if (strict) throw error;
    recordFallback(scope, "throw");
    return fallbackCall();
  }
}

export async function callEdenWithFallbackVoid(
  scope: string,
  edenCall: () => Promise<EdenCallResult>,
  fallbackCall: () => Promise<void>
): Promise<void> {
  const strict = isStrictScope(scope);
  try {
    const result = await edenCall();
    if (!(result as any)?.error) return;
    if (strict) throw new Error(`[eden:strict] ${scope} returned error payload`);
    recordFallback(scope, "error-payload");
    return fallbackCall();
  } catch (error) {
    if (strict) throw error;
    recordFallback(scope, "throw");
    return fallbackCall();
  }
}
