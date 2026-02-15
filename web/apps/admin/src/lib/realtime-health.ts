export type MaterialRealtimeConnectionStatus =
  | "idle"
  | "polling"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type MaterialRealtimeHealth = {
  status: MaterialRealtimeConnectionStatus;
  mode: "polling" | "sse" | "none";
  lastEventAt: string | null;
  lastErrorAt: string | null;
  errorMessage: string | null;
};

const initialState: MaterialRealtimeHealth = {
  status: "idle",
  mode: "none",
  lastEventAt: null,
  lastErrorAt: null,
  errorMessage: null,
};

let materialRealtimeHealth: MaterialRealtimeHealth = initialState;
const listeners = new Set<(state: MaterialRealtimeHealth) => void>();

function emit() {
  for (const listener of listeners) listener(materialRealtimeHealth);
}

export function getMaterialRealtimeHealth() {
  return materialRealtimeHealth;
}

export function subscribeMaterialRealtimeHealth(listener: (state: MaterialRealtimeHealth) => void) {
  listeners.add(listener);
  listener(materialRealtimeHealth);
  return () => listeners.delete(listener);
}

export function updateMaterialRealtimeHealth(patch: Partial<MaterialRealtimeHealth>) {
  materialRealtimeHealth = { ...materialRealtimeHealth, ...patch };
  emit();
}

export function markMaterialRealtimeEvent() {
  updateMaterialRealtimeHealth({
    lastEventAt: new Date().toISOString(),
    errorMessage: null,
  });
}

export function markMaterialRealtimeError(errorMessage: string) {
  updateMaterialRealtimeHealth({
    status: "error",
    lastErrorAt: new Date().toISOString(),
    errorMessage,
  });
}

export function resetMaterialRealtimeHealth() {
  materialRealtimeHealth = initialState;
  emit();
}

