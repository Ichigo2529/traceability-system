/**
 * State-machine definitions per Design Bible §05.
 *
 * Each unit_type has a map of { currentState → Set<allowedNextState> }.
 * The event_type that triggers the transition is documented in comments
 * but the validator only checks state-to-state validity.
 */

// ─── ASSY_120 ───────────────────────────────────────────
// [*] → CREATED
// CREATED → WASH2_DONE (WASH2_END)
// WASH2_DONE → MAG_DONE (MAGNETIZE_DONE)
// MAG_DONE → FLUX_PASS (FLUX_PASS)
// FLUX_PASS → COMPONENTS_BOUND (ASSY_BIND_COMPONENTS)
// COMPONENTS_BOUND → ASSEMBLY_IN_PROGRESS (FIRST_ASSEMBLY_STEP_START)
// ASSEMBLY_IN_PROGRESS → ASSEMBLY_COMPLETED (FVMI_PASS)
// ASSEMBLY_COMPLETED → LABELED (LABELS_GENERATED)

const ASSY_120_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["WASH2_DONE"],
  WASH2_DONE: ["MAG_DONE"],
  MAG_DONE: ["FLUX_PASS"],
  FLUX_PASS: ["COMPONENTS_BOUND"],
  COMPONENTS_BOUND: ["ASSEMBLY_IN_PROGRESS"],
  ASSEMBLY_IN_PROGRESS: ["ASSEMBLY_COMPLETED"],
  ASSEMBLY_COMPLETED: ["LABELED"],
  LABELED: [], // terminal
};

// ─── Component JIG (PIN430_JIG, etc.) ───────────────────
// [*] → LOADED
// LOADED → WASH2_COMPLETED (WASH2_END)
// WASH2_COMPLETED → IN_USE (ASSY_BIND_COMPONENTS)
// IN_USE → WASH2_COMPLETED (JIG_RETURNED — cycles back)

const JIG_TRANSITIONS: Record<string, string[]> = {
  LOADED: ["WASH2_COMPLETED"],
  WASH2_COMPLETED: ["IN_USE"],
  IN_USE: ["WASH2_COMPLETED"], // cycle back
};

// ─── TRAY (FOF_TRAY_20) ────────────────────────────────
// [*] → CREATED
// CREATED → LABELED (LABEL_ATTACHED)
// LABELED → GROUPED (SPLIT_GROUP_ASSIGNED)
// GROUPED → PACKED (OUTER_PACKED)

const TRAY_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["LABELED"],
  LABELED: ["GROUPED"],
  GROUPED: ["PACKED"],
  PACKED: [], // terminal
};

// ─── OUTER ──────────────────────────────────────────────
// [*] → CREATED
// CREATED → PALLETIZED (PALLET_MAP)

const OUTER_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["PALLETIZED"],
  PALLETIZED: [], // terminal
};

// ─── PLATE_120 ──────────────────────────────────────────
// [*] → CREATED (PLATE_LOADED)
// CREATED → WASHED (WASH1_END)
// WASHED → BONDED (BONDING_END — consumed into ASSY_120)

const PLATE_120_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["WASHED"],
  WASHED: ["BONDED"],
  BONDED: [], // terminal — consumed
};

// ─── MAG_PACK ───────────────────────────────────────────
// Magnet packs carry qty_total/qty_remaining.
// [*] → CREATED
// CREATED → IN_USE (first deduction via BONDING_END)

const MAG_PACK_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["IN_USE"],
  IN_USE: [], // stays IN_USE, qty decremented per bonding
};

const SUPPLIER_PACK_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["IN_USE", "ISSUED"],
  ISSUED: ["IN_USE", "RETURNED"],
  IN_USE: ["RETURNED"],
  RETURNED: [],
};

// ─── Registry ───────────────────────────────────────────

const TRANSITION_REGISTRY: Record<string, Record<string, string[]>> = {
  ASSY_120: ASSY_120_TRANSITIONS,
  // Plates
  PLATE_120: PLATE_120_TRANSITIONS,
  // Magnet packs
  MAG_PACK: MAG_PACK_TRANSITIONS,
  SUPPLIER_PACK: SUPPLIER_PACK_TRANSITIONS,
  // JIG variants all use the same state machine
  PIN430_JIG: JIG_TRANSITIONS,
  PIN300_JIG: JIG_TRANSITIONS,
  SHROUD_JIG: JIG_TRANSITIONS,
  CRASH_STOP_JIG: JIG_TRANSITIONS,
  JIG: JIG_TRANSITIONS,
  // TRAY variants
  FOF_TRAY_20: TRAY_TRANSITIONS,
  TRAY: TRAY_TRANSITIONS,
  // OUTER
  OUTER: OUTER_TRANSITIONS,
};

// ─── Transition result ──────────────────────────────────

export interface TransitionResult {
  valid: boolean;
  error?: string;
  currentState: string;
  targetState: string;
}

// ─── Validator ──────────────────────────────────────────

/**
 * Validates whether a unit can transition from its current state
 * to the target state, according to the state machine for its unit_type.
 *
 * @param unitType  - e.g. "ASSY_120", "JIG", "TRAY", "OUTER"
 * @param currentState - the unit's current status (e.g. "CREATED")
 * @param targetState  - the desired next status (e.g. "WASH2_DONE")
 * @returns TransitionResult with `valid: true` or `valid: false` + error message
 */
export function validateTransition(
  unitType: string,
  currentState: string,
  targetState: string
): TransitionResult {
  const result: TransitionResult = {
    valid: false,
    currentState,
    targetState,
  };

  // Look up state machine for this unit_type
  const transitions = TRANSITION_REGISTRY[unitType];
  if (!transitions) {
    result.error = `Unknown unit_type "${unitType}" — no state machine defined`;
    return result;
  }

  // Check if currentState is a known state
  if (!(currentState in transitions)) {
    result.error = `Unknown state "${currentState}" for unit_type "${unitType}"`;
    return result;
  }

  // Check if targetState is reachable from currentState
  const allowed = transitions[currentState];
  if (!allowed.includes(targetState)) {
    if (allowed.length === 0) {
      result.error = `State "${currentState}" is terminal for "${unitType}" — no further transitions allowed`;
    } else {
      result.error = `Invalid transition "${currentState}" → "${targetState}" for "${unitType}". Allowed: ${allowed.join(", ")}`;
    }
    return result;
  }

  // Valid
  result.valid = true;
  return result;
}

/**
 * Returns all valid states for a unit_type.
 */
export function getStatesForType(unitType: string): string[] | null {
  const transitions = TRANSITION_REGISTRY[unitType];
  if (!transitions) return null;
  return Object.keys(transitions);
}

/**
 * Returns the initial state for a unit_type (the first key in the transitions map).
 */
export function getInitialState(unitType: string): string | null {
  const transitions = TRANSITION_REGISTRY[unitType];
  if (!transitions) return null;
  const keys = Object.keys(transitions);
  return keys.length > 0 ? keys[0] : null;
}
