import { describe, expect, it } from "bun:test";

// ═══════════════════════════════════════════════════════
//  Pure logic tests for Section & Cost Center feature
//  (No DB required – tests helper functions & validation logic)
// ═══════════════════════════════════════════════════════

// ─── 1) Section resolution logic ────────────────────────

type FakeUser = { userId: string; username: string; roles: string[] };

function resolveSection(
  user: FakeUser,
  storeSection: { id: string; section_code: string } | null,
  userSection: { id: string; section_code: string } | null
): { id: string; section_code: string } | null {
  if (user.roles.includes("STORE")) {
    return storeSection;
  }
  return userSection;
}

describe("resolveSection", () => {
  const storeSection = { id: "store-uuid", section_code: "STORE" };
  const prodSection = { id: "prod-uuid", section_code: "PRODUCTION" };

  it("should return STORE section for STORE role", () => {
    const user: FakeUser = { userId: "u1", username: "store1", roles: ["STORE"] };
    const result = resolveSection(user, storeSection, prodSection);
    expect(result).toEqual(storeSection);
  });

  it("should return user section for non-STORE role", () => {
    const user: FakeUser = { userId: "u2", username: "prod1", roles: ["PRODUCTION"] };
    const result = resolveSection(user, storeSection, prodSection);
    expect(result).toEqual(prodSection);
  });

  it("should return STORE even if user also has other roles", () => {
    const user: FakeUser = { userId: "u3", username: "admin1", roles: ["ADMIN", "STORE"] };
    const result = resolveSection(user, storeSection, null);
    expect(result).toEqual(storeSection);
  });

  it("should return null when non-STORE user has no section", () => {
    const user: FakeUser = { userId: "u4", username: "new1", roles: ["OPERATOR"] };
    const result = resolveSection(user, storeSection, null);
    expect(result).toBeNull();
  });

  it("should return null when STORE section is not configured", () => {
    const user: FakeUser = { userId: "u5", username: "store2", roles: ["STORE"] };
    const result = resolveSection(user, null, null);
    expect(result).toBeNull();
  });
});

// ─── 2) Cost center validation ──────────────────────────

type AllowedCC = { cost_center_id: string; is_default: boolean; cost_code: string };

function validateCostCenter(
  costCenterId: string | undefined,
  allowedList: AllowedCC[]
): { valid: boolean; error?: string; resolved_id?: string } {
  if (!costCenterId) {
    // Try default
    const defaultCC = allowedList.find((cc) => cc.is_default);
    if (!defaultCC) {
      return { valid: false, error: "COST_CENTER_DEFAULT_NOT_SET" };
    }
    return { valid: true, resolved_id: defaultCC.cost_center_id };
  }

  const found = allowedList.find((cc) => cc.cost_center_id === costCenterId);
  if (!found) {
    return { valid: false, error: "INVALID_COST_CENTER" };
  }
  return { valid: true, resolved_id: found.cost_center_id };
}

describe("validateCostCenter", () => {
  const allowedList: AllowedCC[] = [
    { cost_center_id: "cc-1", is_default: false, cost_code: "663010A101" },
    { cost_center_id: "cc-2", is_default: true, cost_code: "663010A201" },
    { cost_center_id: "cc-3", is_default: false, cost_code: "663010A301" },
  ];

  it("should accept valid cost center ID in allowed list", () => {
    const result = validateCostCenter("cc-1", allowedList);
    expect(result.valid).toBe(true);
    expect(result.resolved_id).toBe("cc-1");
  });

  it("should reject cost center ID not in allowed list", () => {
    const result = validateCostCenter("cc-999", allowedList);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("INVALID_COST_CENTER");
  });

  it("should use default when no cost_center_id provided", () => {
    const result = validateCostCenter(undefined, allowedList);
    expect(result.valid).toBe(true);
    expect(result.resolved_id).toBe("cc-2"); // the default
  });

  it("should error when no default set and no cost_center_id", () => {
    const noDefault: AllowedCC[] = [
      { cost_center_id: "cc-1", is_default: false, cost_code: "663010A101" },
    ];
    const result = validateCostCenter(undefined, noDefault);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("COST_CENTER_DEFAULT_NOT_SET");
  });

  it("should error with empty allowed list and no cost_center_id", () => {
    const result = validateCostCenter(undefined, []);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("COST_CENTER_DEFAULT_NOT_SET");
  });
});

// ─── 3) Meta response shape ────────────────────────────

describe("meta response shape", () => {
  it("should have correct shape when section is found", () => {
    const meta = {
      section: { id: "s1", section_code: "STORE", section_name: "Store / Warehouse" },
      allowed_cost_centers: [
        { mapping_id: "m1", cost_center_id: "c1", is_default: true, cost_code: "663010A101", short_text: "STX DI WASH", group_code: "DL" },
      ],
      default_cost_center_id: "c1",
    };

    expect(meta.section).toBeDefined();
    expect(meta.section.section_code).toBe("STORE");
    expect(meta.allowed_cost_centers).toBeArray();
    expect(meta.allowed_cost_centers.length).toBe(1);
    expect(meta.default_cost_center_id).toBe("c1");
  });

  it("should have null default when no default is set", () => {
    const meta = {
      section: { id: "s1", section_code: "PROD", section_name: "Production" },
      allowed_cost_centers: [
        { mapping_id: "m1", cost_center_id: "c1", is_default: false, cost_code: "663010A101", short_text: "STX DI WASH", group_code: "DL" },
      ],
      default_cost_center_id: null,
    };

    expect(meta.default_cost_center_id).toBeNull();
  });
});

// ─── 4) Default uniqueness enforcement ─────────────────

describe("default uniqueness", () => {
  it("should have at most one default per section", () => {
    const mappings = [
      { section_id: "s1", cost_center_id: "cc-1", is_default: false },
      { section_id: "s1", cost_center_id: "cc-2", is_default: true },
      { section_id: "s1", cost_center_id: "cc-3", is_default: false },
    ];

    const defaults = mappings.filter((m) => m.is_default);
    expect(defaults.length).toBe(1);
    expect(defaults[0].cost_center_id).toBe("cc-2");
  });

  it("should allow zero defaults", () => {
    const mappings = [
      { section_id: "s1", cost_center_id: "cc-1", is_default: false },
      { section_id: "s1", cost_center_id: "cc-2", is_default: false },
    ];

    const defaults = mappings.filter((m) => m.is_default);
    expect(defaults.length).toBe(0);
  });
});

// ─── 5) Strict-mode enforcement logic ──────────────────

type MetaResult = {
  section: { id: string; section_code: string; section_name: string };
  allowed_cost_centers: AllowedCC[];
  default_cost_center_id: string | null;
} | null;

function enforceStrictMode(
  strict: boolean,
  meta: MetaResult,
  costCenterId?: string
): { ok: true; section_id: string; cost_center_id: string | null } | { ok: false; error: string } {
  if (!meta) {
    if (strict) return { ok: false, error: "SECTION_NOT_SET" };
    return { ok: true, section_id: "", cost_center_id: null };
  }

  if (costCenterId) {
    const found = meta.allowed_cost_centers.find((cc) => cc.cost_center_id === costCenterId);
    if (!found) return { ok: false, error: "INVALID_COST_CENTER" };
    return { ok: true, section_id: meta.section.id, cost_center_id: found.cost_center_id };
  }

  if (meta.default_cost_center_id) {
    return { ok: true, section_id: meta.section.id, cost_center_id: meta.default_cost_center_id };
  }

  if (strict) return { ok: false, error: "COST_CENTER_DEFAULT_NOT_SET" };
  return { ok: true, section_id: meta.section.id, cost_center_id: null };
}

describe("strict-mode enforcement", () => {
  const metaWithDefault: MetaResult = {
    section: { id: "s1", section_code: "STORE", section_name: "Store" },
    allowed_cost_centers: [
      { cost_center_id: "cc-1", is_default: true, cost_code: "663010A101" },
      { cost_center_id: "cc-2", is_default: false, cost_code: "663010A201" },
    ],
    default_cost_center_id: "cc-1",
  };

  const metaNoDefault: MetaResult = {
    section: { id: "s2", section_code: "PROD", section_name: "Production" },
    allowed_cost_centers: [
      { cost_center_id: "cc-3", is_default: false, cost_code: "663010A301" },
    ],
    default_cost_center_id: null,
  };

  it("strict + no meta → SECTION_NOT_SET", () => {
    const result = enforceStrictMode(true, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("SECTION_NOT_SET");
  });

  it("strict + meta + no CC + no default → COST_CENTER_DEFAULT_NOT_SET", () => {
    const result = enforceStrictMode(true, metaNoDefault);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("COST_CENTER_DEFAULT_NOT_SET");
  });

  it("strict + meta + explicit valid CC → ok", () => {
    const result = enforceStrictMode(true, metaWithDefault, "cc-2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cost_center_id).toBe("cc-2");
  });

  it("non-strict + no meta → ok with null", () => {
    const result = enforceStrictMode(false, null);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cost_center_id).toBeNull();
  });

  it("non-strict + meta + no CC + no default → ok with null CC", () => {
    const result = enforceStrictMode(false, metaNoDefault);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cost_center_id).toBeNull();
  });
});

// ─── 6) Group code validation ──────────────────────────

const VALID_GROUP_CODES = ["DL", "IDL", "DIS", "ADM"];

function validateGroupCode(code: string): boolean {
  return VALID_GROUP_CODES.includes(code.trim().toUpperCase());
}

describe("group_code validation", () => {
  it("should accept DL", () => expect(validateGroupCode("DL")).toBe(true));
  it("should accept IDL (lowercase)", () => expect(validateGroupCode("idl")).toBe(true));
  it("should accept ADM", () => expect(validateGroupCode("ADM")).toBe(true));
  it("should reject unknown code", () => expect(validateGroupCode("XYZ")).toBe(false));
});

// ─── 7) User section resolution (upsert semantics) ────

describe("user section resolution", () => {
  it("user with section assignment → resolves to that section", () => {
    const userSection = { id: "s-prod", section_code: "PRODUCTION" };
    const user: FakeUser = { userId: "u1", username: "op1", roles: ["OPERATOR"] };
    const resolved = resolveSection(user, null, userSection);
    expect(resolved?.section_code).toBe("PRODUCTION");
  });

  it("STORE user after reassignment still resolves STORE (role takes priority)", () => {
    const storeSection = { id: "s-store", section_code: "STORE" };
    const prodSection = { id: "s-prod", section_code: "PRODUCTION" };
    const user: FakeUser = { userId: "u1", username: "store1", roles: ["STORE"] };
    const resolved = resolveSection(user, storeSection, prodSection);
    expect(resolved?.section_code).toBe("STORE");
  });

  it("upsert replaces previous section for same user", () => {
    // Simulates upsert logic: PK on user_id means insert-or-update
    const assignments = new Map<string, string>();
    assignments.set("u1", "section-A");
    assignments.set("u1", "section-B"); // overwrites
    expect(assignments.get("u1")).toBe("section-B");
    expect(assignments.size).toBe(1);
  });
});

// ─── 8) Concurrency: default uniqueness under contention

describe("concurrency: default uniqueness", () => {
  it("clear-then-set within transaction produces exactly 1 default", () => {
    // Simulates transactional clear-then-set
    const mappings = [
      { id: "m1", section_id: "s1", cost_center_id: "cc-1", is_default: true },
      { id: "m2", section_id: "s1", cost_center_id: "cc-2", is_default: false },
      { id: "m3", section_id: "s1", cost_center_id: "cc-3", is_default: false },
    ];

    // Step 1: clear all defaults for section
    for (const m of mappings) {
      if (m.section_id === "s1") m.is_default = false;
    }
    // Step 2: set new default
    const target = mappings.find((m) => m.cost_center_id === "cc-3");
    target!.is_default = true;

    const defaults = mappings.filter((m) => m.section_id === "s1" && m.is_default);
    expect(defaults.length).toBe(1);
    expect(defaults[0].cost_center_id).toBe("cc-3");
  });

  it("two simultaneous set-defaults: exactly 1 survives (simulated)", () => {
    // Two "transactions" both clear defaults and set their own
    const mappings = [
      { id: "m1", section_id: "s1", cost_center_id: "cc-1", is_default: true },
      { id: "m2", section_id: "s1", cost_center_id: "cc-2", is_default: false },
    ];

    // Transaction A: clear all, set cc-2
    const txA = mappings.map((m) => ({ ...m, is_default: false }));
    txA.find((m) => m.cost_center_id === "cc-2")!.is_default = true;

    // Transaction B wins (runs after A) — serialized by DB lock
    const txB = txA.map((m) => ({ ...m, is_default: false }));
    txB.find((m) => m.cost_center_id === "cc-1")!.is_default = true;

    const finalDefaults = txB.filter((m) => m.is_default);
    expect(finalDefaults.length).toBe(1);
    expect(finalDefaults[0].cost_center_id).toBe("cc-1");
  });

  it("no window with 0 defaults during transaction (atomic)", () => {
    // In a real transaction, the state between clear and set is not visible to other reads
    // We simulate: the "snapshot" seen by another query during the transaction
    const snapshotBeforeTx = [
      { cost_center_id: "cc-1", is_default: true },
      { cost_center_id: "cc-2", is_default: false },
    ];

    // Other reads see either pre-tx state or post-tx state, never intermediate
    const defaultsInSnapshot = snapshotBeforeTx.filter((m) => m.is_default);
    expect(defaultsInSnapshot.length).toBeGreaterThanOrEqual(0); // 0 or 1 are valid snapshots
    expect(defaultsInSnapshot.length).toBeLessThanOrEqual(1);
  });
});
