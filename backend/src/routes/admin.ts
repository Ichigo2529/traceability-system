import Elysia, { t } from "elysia";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/connection";
import { ok, fail } from "../lib/http";
import { type AccessTokenPayload } from "../lib/jwt";
import { hashPassword } from "../lib/password";
import { authDerive } from "../middleware/auth";
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  refreshTokens,
  devices,
  machines,
  processes,
  stations,
  workflowApprovalConfigs,
  appSettings,
  models,
  modelRevisions,
  variants,
  componentTypes,
  partNumbers,
  bom,
  routing,
  routingSteps,
  masterRoutingSteps,
  labelTemplates,
  labelBindings,
  configAuditLogs,
  suppliers,
  supplierPartProfiles,
  departments,
  sections,
  costCenters,
  userDepartments,
  userSections,
  sectionCostCenters,
  inventoryDo,
  supplierPacks,
  component2dScans,
  materialRequests,
  materialRequestItems,
  units,
  unitLinks,
  holds,
  events,
  setRuns,
  containers,
  consumption,
} from "../db/schema";
import { randomBytes } from "crypto";
import {
  type BarcodeTemplateDefinition,
  getVendorIdByVendorCode,
  listSupplierPackParsers,
  normalizeVendorIdToken,
  parseSupplierPackBarcode,
  parseSupplierPackBarcodeWithTemplate,
} from "../lib/supplier-pack-parser";
import { publishMaterialRequestUpdate } from "../lib/realtime";

type ReadinessIssue = {
  code: string;
  message: string;
  scope?: string;
  path?: string;
};

function parseErrorCode(error: unknown): string {
  const maybe = error as { code?: string };
  if (maybe?.code === "23505") return "DUPLICATE_KEY";
  if (maybe?.code === "23503") return "FOREIGN_KEY_ERROR";
  return "INTERNAL_ERROR";
}

async function auditConfigChange(
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  beforeData?: Record<string, unknown> | null,
  afterData?: Record<string, unknown> | null
) {
  await db.insert(configAuditLogs).values({
    userId,
    entityType,
    entityId,
    action,
    beforeData: beforeData ?? null,
    afterData: afterData ?? null,
  });
}

function maskSecret(secret: string | null | undefined) {
  if (!secret) return null;
  const keep = secret.slice(-4);
  return `****${keep}`;
}

type WorkflowApproverUserInput = {
  user_id: string;
  email?: string | null;
  is_default?: boolean;
};

function parseWorkflowApproverUsers(metadata: unknown): WorkflowApproverUserInput[] {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>).approver_users;
  if (!Array.isArray(value)) return [];

  const rows = value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const input = row as Record<string, unknown>;
      const userId = String(input.user_id ?? "").trim();
      if (!userId) return null;
      const emailRaw = input.email == null ? "" : String(input.email).trim();
      return {
        user_id: userId,
        email: emailRaw || null,
        is_default: Boolean(input.is_default),
      } as WorkflowApproverUserInput;
    })
    .filter((row): row is WorkflowApproverUserInput => Boolean(row));

  const dedup = new Map<string, WorkflowApproverUserInput>();
  for (const row of rows) {
    if (!dedup.has(row.user_id)) dedup.set(row.user_id, row);
  }
  const unique = Array.from(dedup.values());
  const defaultIndex = unique.findIndex((row) => row.is_default);
  if (defaultIndex > 0) {
    const selected = unique[defaultIndex];
    unique.forEach((row) => {
      row.is_default = false;
    });
    selected.is_default = true;
  }
  return unique;
}

function buildWorkflowMetadata(body: any, existingMetadata?: Record<string, unknown> | null) {
  const merged: Record<string, unknown> = {
    ...((existingMetadata ?? {}) as Record<string, unknown>),
    ...((body.metadata ?? {}) as Record<string, unknown>),
  };
  const approverUsers = parseWorkflowApproverUsers(merged);
  merged.approver_users = approverUsers;
  merged.default_approver_user_id = approverUsers.find((row) => row.is_default)?.user_id ?? null;
  merged.default_approver_email = approverUsers.find((row) => row.is_default)?.email ?? null;
  return merged;
}

const BARCODE_TEMPLATES_SETTING_KEY = "barcode_templates";

type BarcodeTemplateMasterRecord = {
  id: string;
  key: string;
  name: string;
  format: "ASTERISK_DFI";
  identifiers: string[];
  lot_identifiers: string[];
  quantity_identifiers: string[];
  part_identifiers: string[];
  vendor_identifiers: string[];
  production_date_identifiers: string[];
  is_active: boolean;
  version: number;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  source?: "SYSTEM" | "CUSTOM";
  is_system?: boolean;
};

function normalizeTemplateRecord(input: any): BarcodeTemplateMasterRecord | null {
  if (!input || typeof input !== "object") return null;
  const key = String(input.key ?? "")
    .trim()
    .toUpperCase();
  if (!key) return null;
  const nowIso = new Date().toISOString();
  const normalizeIdList = (value: unknown, fallback: string[]) =>
    Array.isArray(value)
      ? value
          .map((x) =>
            String(x ?? "")
              .trim()
              .toUpperCase()
          )
          .filter((x) => x.length > 0)
      : fallback;

  return {
    id: String(input.id ?? crypto.randomUUID()),
    key,
    name: String(input.name ?? key).trim(),
    format: "ASTERISK_DFI",
    identifiers: normalizeIdList(input.identifiers, ["P", "Q", "V"]),
    lot_identifiers: normalizeIdList(input.lot_identifiers, ["LOT", "PT", "PL"]),
    quantity_identifiers: normalizeIdList(input.quantity_identifiers, ["Q"]),
    part_identifiers: normalizeIdList(input.part_identifiers, ["P"]),
    vendor_identifiers: normalizeIdList(input.vendor_identifiers, ["V"]),
    production_date_identifiers: normalizeIdList(input.production_date_identifiers, ["PD", "D", "TD", "MD"]),
    is_active: input.is_active !== false,
    version: Number.isFinite(Number(input.version)) ? Number(input.version) : 1,
    effective_from: input.effective_from ? String(input.effective_from) : null,
    effective_to: input.effective_to ? String(input.effective_to) : null,
    notes: input.notes ? String(input.notes) : null,
    created_at: input.created_at ? String(input.created_at) : nowIso,
    updated_at: input.updated_at ? String(input.updated_at) : nowIso,
    source: input.source === "SYSTEM" ? "SYSTEM" : "CUSTOM",
    is_system: input.is_system === true || input.source === "SYSTEM",
  };
}

const SYSTEM_BARCODE_TEMPLATE_ROWS: Array<Partial<BarcodeTemplateMasterRecord>> = [
  {
    id: "sys-marlin-magnet-v1",
    key: "MARLIN_MAGNET_V1",
    name: "Marlin Magnet v1",
    format: "ASTERISK_DFI",
    identifiers: ["3S", "PD", "PL", "PT", "K", "P", "E", "Q", "V", "D", "R"],
    lot_identifiers: ["PT"],
    quantity_identifiers: ["Q"],
    part_identifiers: ["P"],
    vendor_identifiers: ["V"],
    production_date_identifiers: ["PD", "D"],
    is_active: true,
    version: 1,
    notes: "Built-in parser template. Read-only.",
    source: "SYSTEM",
    is_system: true,
  },
  {
    id: "sys-marlin-plate-v1",
    key: "MARLIN_PLATE_V1",
    name: "Marlin Plate v1",
    format: "ASTERISK_DFI",
    identifiers: ["PD", "PL", "PT", "SW", "P", "E", "Q", "V", "R"],
    lot_identifiers: ["PT"],
    quantity_identifiers: ["Q"],
    part_identifiers: ["P"],
    vendor_identifiers: ["V"],
    production_date_identifiers: ["PD"],
    is_active: true,
    version: 1,
    notes: "Built-in parser template. Read-only.",
    source: "SYSTEM",
    is_system: true,
  },
  {
    id: "sys-marlin-pin-v1",
    key: "MARLIN_PIN_V1",
    name: "Marlin Pin v1",
    format: "ASTERISK_DFI",
    identifiers: ["TD", "AD", "PS", "PL", "P", "E", "Q", "V", "R"],
    lot_identifiers: ["PL"],
    quantity_identifiers: ["Q"],
    part_identifiers: ["P"],
    vendor_identifiers: ["V"],
    production_date_identifiers: ["TD"],
    is_active: true,
    version: 1,
    notes: "Built-in parser template. Read-only.",
    source: "SYSTEM",
    is_system: true,
  },
  {
    id: "sys-marlin-crash-stop-v1",
    key: "MARLIN_CRASH_STOP_V1",
    name: "Marlin Crash Stop v1",
    format: "ASTERISK_DFI",
    identifiers: ["MD", "SC", "SD", "OD", "OL", "WO", "P", "E", "Q", "V", "R"],
    lot_identifiers: ["OL"],
    quantity_identifiers: ["Q"],
    part_identifiers: ["P"],
    vendor_identifiers: ["V"],
    production_date_identifiers: ["MD", "OD"],
    is_active: true,
    version: 1,
    notes: "Built-in parser template. Read-only.",
    source: "SYSTEM",
    is_system: true,
  },
];

function getSystemBarcodeTemplateRecords() {
  return SYSTEM_BARCODE_TEMPLATE_ROWS.map((entry) => normalizeTemplateRecord(entry))
    .filter((entry): entry is BarcodeTemplateMasterRecord => Boolean(entry))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function toParserTemplate(record: BarcodeTemplateMasterRecord): BarcodeTemplateDefinition {
  return {
    key: record.key,
    format: "ASTERISK_DFI",
    identifiers: record.identifiers,
    lot_identifiers: record.lot_identifiers,
    quantity_identifiers: record.quantity_identifiers,
    part_identifiers: record.part_identifiers,
    vendor_identifiers: record.vendor_identifiers,
    production_date_identifiers: record.production_date_identifiers,
  };
}

async function getBarcodeTemplateMasterRecords() {
  const [row] = await db
    .select({
      key: appSettings.key,
      value: appSettings.value,
      updated_at: appSettings.updatedAt,
    })
    .from(appSettings)
    .where(eq(appSettings.key, BARCODE_TEMPLATES_SETTING_KEY))
    .limit(1);

  const rawRows = Array.isArray(row?.value?.templates) ? (row?.value?.templates as any[]) : [];
  const normalized = rawRows
    .map((entry) => normalizeTemplateRecord(entry))
    .filter((entry): entry is BarcodeTemplateMasterRecord => Boolean(entry));

  return normalized.sort((a, b) => a.key.localeCompare(b.key));
}

async function getMergedBarcodeTemplateRecords() {
  const systemRows = getSystemBarcodeTemplateRecords();
  const customRows = await getBarcodeTemplateMasterRecords();
  const merged = new Map<string, BarcodeTemplateMasterRecord>();
  for (const row of systemRows) merged.set(row.key, row);
  for (const row of customRows) merged.set(row.key, { ...row, source: "CUSTOM", is_system: false });
  return Array.from(merged.values()).sort((a, b) => a.key.localeCompare(b.key));
}

async function saveBarcodeTemplateMasterRecords(records: BarcodeTemplateMasterRecord[]) {
  await db
    .insert(appSettings)
    .values({
      key: BARCODE_TEMPLATES_SETTING_KEY,
      value: {
        templates: records,
      },
      description: "Barcode template master for vendor/component 2D parsing",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: {
          templates: records,
        },
        updatedAt: new Date(),
      },
    });
}

function getActiveTemplateMap(records: BarcodeTemplateMasterRecord[]) {
  return new Map(records.filter((record) => record.is_active).map((record) => [record.key.toUpperCase(), record]));
}

function parsePackBarcodeByKey(
  raw: string,
  parserKey: string | undefined,
  templateMap: Map<string, BarcodeTemplateMasterRecord>
) {
  const selected = String(parserKey ?? "GENERIC")
    .trim()
    .toUpperCase();
  const template = templateMap.get(selected);
  if (template) {
    return {
      parsed: parseSupplierPackBarcodeWithTemplate(raw, toParserTemplate(template)),
      parserKey: selected,
      parserSource: "TEMPLATE_MASTER" as const,
    };
  }

  return {
    parsed: parseSupplierPackBarcode(raw, selected),
    parserKey: selected,
    parserSource: "STATIC_PARSER" as const,
  };
}

async function normalizeDepartmentFromMaster(input: unknown) {
  if (input == null) return null;
  const value = String(input).trim();
  if (!value) return null;

  const [department] = await db
    .select({ name: departments.name })
    .from(departments)
    .where(and(sql`lower(${departments.name}) = lower(${value})`, eq(departments.isActive, true)))
    .limit(1);

  return department?.name ?? null;
}

function ensureDraftRevisionOrThrow(revisionStatus: string) {
  if (revisionStatus === "ACTIVE") {
    const err = new Error("Active revisions are read-only");
    (err as Error & { error_code?: string }).error_code = "REVISION_LOCKED";
    throw err;
  }
}

async function validateBomReferenceOrThrow(input: { componentUnitType?: string; componentPartNumber?: string | null }) {
  const componentUnitType = input.componentUnitType?.trim();
  const componentPartNumber = input.componentPartNumber?.trim();

  if (!componentUnitType) return;

  const [componentTypeRow] = await db
    .select({ id: componentTypes.id })
    .from(componentTypes)
    .where(eq(componentTypes.code, componentUnitType))
    .limit(1);
  if (!componentTypeRow) {
    const err = new Error("Component type not found");
    (err as Error & { error_code?: string }).error_code = "NOT_FOUND";
    throw err;
  }

  if (!componentPartNumber) return;

  const [partRow] = await db
    .select({
      id: partNumbers.id,
      component_type_id: partNumbers.componentTypeId,
    })
    .from(partNumbers)
    .where(eq(partNumbers.partNumber, componentPartNumber.toUpperCase()))
    .limit(1);
  if (!partRow) {
    const err = new Error("Part number not found");
    (err as Error & { error_code?: string }).error_code = "NOT_FOUND";
    throw err;
  }

  if (partRow.component_type_id && partRow.component_type_id !== componentTypeRow.id) {
    const err = new Error("Part number does not belong to selected component type");
    (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
    throw err;
  }
}

async function runReadinessValidation(modelId: string, targetRevisionId?: string) {
  const issues: ReadinessIssue[] = [];

  let targetRevision: { id: string; revisionCode: string } | undefined;
  if (targetRevisionId) {
    const [requestedRevision] = await db
      .select({ id: modelRevisions.id, revisionCode: modelRevisions.revisionCode })
      .from(modelRevisions)
      .where(and(eq(modelRevisions.modelId, modelId), eq(modelRevisions.id, targetRevisionId)))
      .limit(1);
    targetRevision = requestedRevision;
  } else {
    const [activeRevision] = await db
      .select({ id: modelRevisions.id, revisionCode: modelRevisions.revisionCode })
      .from(modelRevisions)
      .where(and(eq(modelRevisions.modelId, modelId), eq(modelRevisions.status, "ACTIVE")))
      .limit(1);

    const [latestRevision] = await db
      .select({ id: modelRevisions.id, revisionCode: modelRevisions.revisionCode })
      .from(modelRevisions)
      .where(eq(modelRevisions.modelId, modelId))
      .orderBy(desc(modelRevisions.createdAt))
      .limit(1);

    targetRevision = activeRevision ?? latestRevision;
  }

  if (!targetRevision) {
    issues.push({
      code: "MISSING_REVISION",
      message: targetRevisionId ? "Requested revision not found in model" : "Model has no revision",
      scope: "REVISION",
      path: "model.revisions",
    });
    return { status: "FAIL" as const, issues };
  }

  const revisionId = targetRevision.id;
  const variantRows = await db.select({ id: variants.id }).from(variants).where(eq(variants.revisionId, revisionId));
  const bomRows = await db.select({ id: bom.id }).from(bom).where(eq(bom.revisionId, revisionId));
  const [routingRow] = await db
    .select({ id: routing.id })
    .from(routing)
    .where(eq(routing.revisionId, revisionId))
    .limit(1);
  const stepRows = routingRow
    ? await db.select({ id: routingSteps.id }).from(routingSteps).where(eq(routingSteps.routingId, routingRow.id))
    : [];
  const bindingRows = await db
    .select({ id: labelBindings.id })
    .from(labelBindings)
    .where(eq(labelBindings.modelRevisionId, revisionId));

  if (!variantRows.length)
    issues.push({ code: "MISSING_VARIANTS", message: "Revision has no variants", scope: "VARIANTS", path: "variants" });
  if (!bomRows.length)
    issues.push({ code: "MISSING_BOM", message: "Revision has no BOM entries", scope: "BOM", path: "bom" });
  if (!routingRow)
    issues.push({
      code: "MISSING_ROUTING",
      message: "Revision has no routing definition",
      scope: "ROUTING",
      path: "routing",
    });
  else if (!stepRows.length)
    issues.push({
      code: "MISSING_ROUTING_STEPS",
      message: "Routing has no steps",
      scope: "ROUTING",
      path: "routing.steps",
    });
  if (!bindingRows.length)
    issues.push({
      code: "MISSING_LABEL_BINDINGS",
      message: "Revision has no label bindings",
      scope: "LABEL_BINDING",
      path: "label_bindings",
    });

  return {
    status: issues.length ? ("FAIL" as const) : ("PASS" as const),
    issues,
    revision_id: revisionId,
    revision_code: targetRevision.revisionCode,
  };
}

export const adminRoutes = new Elysia({ prefix: "/admin" }).use(authDerive).onBeforeHandle((ctx) => {
  const { user, set } = ctx as any;
  if (!user) {
    set.status = 401;
    return fail("UNAUTHORIZED", "Authentication required");
  }
  if (!(user as AccessTokenPayload).roles?.includes("ADMIN")) {
    set.status = 403;
    return fail("FORBIDDEN", "Requires ADMIN role");
  }
});
adminRoutes.get("/users", async () => {
  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      display_name: users.displayName,
      employee_code: users.employeeCode,
      email: users.email,
      department: users.department,
      is_active: users.isActive,
      auth_source: users.authSource,
      created_at: users.createdAt,
    })
    .from(users);

  const enriched = await Promise.all(
    allUsers.map(async (u) => {
      const rows = await db
        .select({ role_name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, u.id));
      const [sectionRow] = await db
        .select({ section_id: sections.id })
        .from(userSections)
        .innerJoin(sections, eq(sections.id, userSections.sectionId))
        .where(eq(userSections.userId, u.id))
        .limit(1);

      const [departmentRow] = await db
        .select({ department_id: departments.id })
        .from(userDepartments)
        .innerJoin(departments, eq(departments.id, userDepartments.departmentId))
        .where(eq(userDepartments.userId, u.id))
        .limit(1);

      return {
        ...u,
        roles: rows.map((r) => r.role_name),
        section_id: sectionRow?.section_id ?? null,
        department_id: departmentRow?.department_id ?? null,
      };
    })
  );

  return ok(enriched);
});

adminRoutes.get("/departments", async () => {
  const rows = await db
    .select({
      id: departments.id,
      code: departments.code,
      name: departments.name,
      sort_order: departments.sortOrder,
      is_active: departments.isActive,
      section_id: departments.sectionId,
      created_at: departments.createdAt,
      updated_at: departments.updatedAt,
    })
    .from(departments)
    .orderBy(asc(departments.sortOrder), asc(departments.name));

  return ok(rows);
});

adminRoutes.post(
  "/departments",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(departments)
        .values({
          code: String(body.code ?? "")
            .trim()
            .toUpperCase(),
          name: String(body.name ?? "")
            .trim()
            .toLowerCase(),
          sortOrder: body.sort_order ?? 100,
          isActive: body.is_active ?? true,
          sectionId: body.section_id ?? null,
        })
        .returning({
          id: departments.id,
          code: departments.code,
          name: departments.name,
          sort_order: departments.sortOrder,
          is_active: departments.isActive,
          section_id: departments.sectionId,
          created_at: departments.createdAt,
          updated_at: departments.updatedAt,
        });

      await auditConfigChange(
        user.userId,
        "DEPARTMENT",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create department");
    }
  },
  {
    body: t.Object({
      code: t.String(),
      name: t.String(),
      sort_order: t.Optional(t.Number()),
      section_id: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/departments/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(departments).where(eq(departments.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Department not found");
    }

    try {
      const [updated] = await db
        .update(departments)
        .set({
          code: body.code !== undefined ? String(body.code).trim().toUpperCase() : existing.code,
          name: body.name !== undefined ? String(body.name).trim().toLowerCase() : existing.name,
          sortOrder: body.sort_order ?? existing.sortOrder,
          isActive: body.is_active ?? existing.isActive,
          sectionId: body.section_id !== undefined ? body.section_id || null : existing.sectionId,
          updatedAt: new Date(),
        })
        .where(eq(departments.id, params.id))
        .returning({
          id: departments.id,
          code: departments.code,
          name: departments.name,
          sort_order: departments.sortOrder,
          is_active: departments.isActive,
          section_id: departments.sectionId,
          created_at: departments.createdAt,
          updated_at: departments.updatedAt,
        });

      await auditConfigChange(user.userId, "DEPARTMENT", params.id, "UPDATE", existing as any, updated as any);
      return ok(updated);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to update department");
    }
  },
  {
    body: t.Object({
      code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      sort_order: t.Optional(t.Number()),
      section_id: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/departments/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(departments).where(eq(departments.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Department not found");
    }

    await db.update(departments).set({ isActive: false, updatedAt: new Date() }).where(eq(departments.id, params.id));
    await auditConfigChange(user.userId, "DEPARTMENT", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
    });
    return ok(null);
  }
);

adminRoutes.post(
  "/users",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, body.username))
        .limit(1);
      if (existing) {
        set.status = 409;
        return fail("USERNAME_TAKEN", "Username already exists");
      }

      const normalizedDepartment = await normalizeDepartmentFromMaster(body.department);
      if (
        body.department !== undefined &&
        body.department !== null &&
        String(body.department).trim() &&
        !normalizedDepartment
      ) {
        set.status = 400;
        return fail("INVALID_INPUT", "Invalid department value");
      }

      const [created] = await db
        .insert(users)
        .values({
          username: body.username,
          displayName: body.display_name,
          passwordHash: await hashPassword(body.password),
          employeeCode: body.employee_code ?? null,
          email: body.email ?? null,
          department: normalizedDepartment,
        })
        .returning({
          id: users.id,
          username: users.username,
          display_name: users.displayName,
          employee_code: users.employeeCode,
          email: users.email,
          department: users.department,
          is_active: users.isActive,
          auth_source: users.authSource,
          created_at: users.createdAt,
        });

      if (body.roles?.length) {
        const dbRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, body.roles));
        if (dbRoles.length)
          await db.insert(userRoles).values(dbRoles.map((r) => ({ userId: created.id, roleId: r.id })));
      }

      if (body.section_id) {
        await db.insert(userSections).values({ userId: created.id, sectionId: body.section_id });
      }

      if (body.department_id) {
        await db.insert(userDepartments).values({ userId: created.id, departmentId: body.department_id });
      }

      await auditConfigChange(
        user.userId,
        "USER",
        created.id,
        "CREATE",
        null,
        created as unknown as Record<string, unknown>
      );
      return ok({ ...created, roles: body.roles ?? [] });
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create user");
    }
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      display_name: t.String(),
      employee_code: t.Optional(t.String()),
      email: t.Optional(t.String()),
      department: t.Optional(t.String()),
      section_id: t.Optional(t.String()),
      department_id: t.Optional(t.String()),
      roles: t.Optional(t.Array(t.String())),
    }),
  }
);

adminRoutes.put(
  "/users/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "User not found");
    }

    const updateValues: Partial<typeof users.$inferInsert> = {};
    if (body.display_name !== undefined) updateValues.displayName = body.display_name;
    if (body.employee_code !== undefined) updateValues.employeeCode = body.employee_code;
    if (body.email !== undefined) updateValues.email = body.email;
    if (body.department !== undefined) {
      const normalizedDepartment = await normalizeDepartmentFromMaster(body.department);
      if (body.department !== null && String(body.department).trim() && !normalizedDepartment) {
        set.status = 400;
        return fail("INVALID_INPUT", "Invalid department value");
      }
      updateValues.department = normalizedDepartment;
    }
    if (typeof body.is_active === "boolean") updateValues.isActive = body.is_active;
    if (body.password) updateValues.passwordHash = await hashPassword(body.password);
    if (Object.keys(updateValues).length) await db.update(users).set(updateValues).where(eq(users.id, params.id));

    if (body.roles) {
      await db.delete(userRoles).where(eq(userRoles.userId, params.id));
      if (body.roles.length) {
        const dbRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, body.roles));
        if (dbRoles.length)
          await db.insert(userRoles).values(dbRoles.map((r) => ({ userId: params.id, roleId: r.id })));
      }
    }

    if (body.section_id !== undefined) {
      await db.delete(userSections).where(eq(userSections.userId, params.id));
      if (body.section_id) {
        await db.insert(userSections).values({ userId: params.id, sectionId: body.section_id });
      }
    }

    if (body.department_id !== undefined) {
      await db.delete(userDepartments).where(eq(userDepartments.userId, params.id));
      if (body.department_id) {
        await db.insert(userDepartments).values({ userId: params.id, departmentId: body.department_id });
      }
    }

    const [updated] = await db
      .select({
        id: users.id,
        username: users.username,
        display_name: users.displayName,
        employee_code: users.employeeCode,
        email: users.email,
        department: users.department,
        is_active: users.isActive,
        auth_source: users.authSource,
        created_at: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    const rows = await db
      .select({ role_name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, params.id));

    await auditConfigChange(user.userId, "USER", params.id, "UPDATE", existing as any, updated as any);
    return ok({ ...updated, roles: rows.map((r) => r.role_name) });
  },
  {
    body: t.Object({
      display_name: t.Optional(t.String()),
      employee_code: t.Optional(t.String()),
      email: t.Optional(t.String()),
      department: t.Optional(t.String()),
      section_id: t.Optional(t.String()),
      department_id: t.Optional(t.String()),
      password: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
      roles: t.Optional(t.Array(t.String())),
    }),
  }
);

adminRoutes.delete(
  "/users/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "User not found");
    }

    const [activeSession] = await db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, params.id),
          eq(refreshTokens.revoked, false),
          gte(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (activeSession) {
      set.status = 409;
      return fail("LOCKED_USER", "User is currently logged in and cannot be deleted");
    }

    await db.update(configAuditLogs).set({ userId: null }).where(eq(configAuditLogs.userId, params.id));
    await db.update(holds).set({ createdBy: null }).where(eq(holds.createdBy, params.id));
    await db.update(holds).set({ resolvedBy: null }).where(eq(holds.resolvedBy, params.id));
    await db.update(events).set({ operatorUserId: null }).where(eq(events.operatorUserId, params.id));
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, params.id));
    await db.delete(users).where(eq(users.id, params.id));
    await auditConfigChange(user.userId, "USER", params.id, "DELETE", existing as Record<string, unknown>, null);
    return ok(null);
  }
);

adminRoutes.get("/permissions", async () => {
  const rows = await db
    .select({
      id: permissions.id,
      code: permissions.code,
      name: permissions.name,
      module: permissions.module,
      description: permissions.description,
    })
    .from(permissions)
    .orderBy(asc(permissions.module), asc(permissions.code));

  return ok(rows);
});

adminRoutes.get("/roles", async () => {
  const roleRows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
    })
    .from(roles)
    .orderBy(asc(roles.name));

  const data = await Promise.all(
    roleRows.map(async (roleRow) => {
      const permRows = await db
        .select({
          code: permissions.code,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, roleRow.id));
      return { ...roleRow, permissions: permRows.map((p) => p.code) };
    })
  );

  return ok(data);
});

adminRoutes.post(
  "/roles",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(roles)
        .values({
          name: body.name,
          description: body.description ?? null,
        })
        .returning({
          id: roles.id,
          name: roles.name,
          description: roles.description,
        });

      if (body.permissions?.length) {
        const permissionRows = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.code, body.permissions));
        if (permissionRows.length) {
          await db
            .insert(rolePermissions)
            .values(permissionRows.map((p) => ({ roleId: created.id, permissionId: p.id })));
        }
      }

      await auditConfigChange(user.userId, "ROLE", created.id, "CREATE", null, created as Record<string, unknown>);
      return ok({ ...created, permissions: body.permissions ?? [] });
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create role");
    }
  },
  {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      permissions: t.Optional(t.Array(t.String())),
    }),
  }
);

adminRoutes.put(
  "/roles/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(roles).where(eq(roles.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Role not found");
    }

    const [updated] = await db
      .update(roles)
      .set({
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
      })
      .where(eq(roles.id, params.id))
      .returning({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      });

    if (body.permissions) {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, params.id));
      if (body.permissions.length) {
        const permissionRows = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.code, body.permissions));
        if (permissionRows.length) {
          await db
            .insert(rolePermissions)
            .values(permissionRows.map((p) => ({ roleId: params.id, permissionId: p.id })));
        }
      }
    }

    await auditConfigChange(
      user.userId,
      "ROLE",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok({ ...updated, permissions: body.permissions ?? [] });
  },
  {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      permissions: t.Optional(t.Array(t.String())),
    }),
  }
);

adminRoutes.delete(
  "/roles/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(roles).where(eq(roles.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Role not found");
    }
    if (existing.name === "ADMIN") {
      set.status = 409;
      return fail("INVALID_OPERATION", "ADMIN role cannot be deleted");
    }

    await db.delete(roles).where(eq(roles.id, params.id));
    await auditConfigChange(user.userId, "ROLE", params.id, "DELETE", existing as Record<string, unknown>, null);
    return ok(null);
  }
);

adminRoutes.get("/devices", async () => {
  const rows = await db
    .select({
      id: devices.id,
      device_code: devices.deviceCode,
      name: devices.name,
      device_type: devices.deviceType,
      fingerprint: devices.fingerprint,
      hostname: devices.hostname,
      ip_address: devices.ipAddress,
      machine_id: devices.machineId,
      station_id: devices.stationId,
      process_id: devices.processId,
      status: devices.deviceStatus,
      is_active: devices.isActive,
      last_seen: devices.lastSeen,
      last_heartbeat_at: devices.lastHeartbeatAt,
      secret_key: devices.secretKey,
      created_at: devices.createdAt,
      machine_name: machines.name,
      station_name: stations.name,
      process_name: processes.name,
    })
    .from(devices)
    .leftJoin(machines, eq(machines.id, devices.machineId))
    .leftJoin(stations, eq(stations.id, devices.stationId))
    .leftJoin(processes, eq(processes.id, devices.processId));

  return {
    success: true,
    data: rows.map((d) => ({
      ...d,
      secret_key_masked: maskSecret(d.secret_key),
      assigned_machine: d.machine_id ? { id: d.machine_id, name: d.machine_name } : null,
      assigned_station: d.station_id ? { id: d.station_id, name: d.station_name } : null,
      assigned_process: d.process_id ? { id: d.process_id, name: d.process_name } : null,
    })),
  };
});

adminRoutes.post(
  "/devices",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const secret = body.secret_key ?? randomBytes(24).toString("hex");
      const [created] = await db
        .insert(devices)
        .values({
          deviceCode: body.device_code ?? null,
          name: body.name ?? null,
          fingerprint: body.fingerprint ?? `dev-${randomBytes(8).toString("hex")}`,
          hostname: body.hostname ?? null,
          ipAddress: body.ip_address ?? null,
          machineId: body.machine_id ?? null,
          stationId: body.station_id ?? null,
          processId: body.process_id ?? null,
          deviceType: body.device_type ?? "pi",
          deviceStatus: body.status ?? "active",
          activationPin: body.activation_pin ?? null,
          secretKey: secret,
          secretRotatedAt: new Date(),
        })
        .returning({
          id: devices.id,
          device_code: devices.deviceCode,
          name: devices.name,
          device_type: devices.deviceType,
          fingerprint: devices.fingerprint,
          ip_address: devices.ipAddress,
          status: devices.deviceStatus,
          station_id: devices.stationId,
          process_id: devices.processId,
          machine_id: devices.machineId,
          last_heartbeat_at: devices.lastHeartbeatAt,
          is_active: devices.isActive,
        });

      await auditConfigChange(user.userId, "DEVICE", created.id, "CREATE", null, created as Record<string, unknown>);
      return {
        success: true,
        data: {
          ...created,
          secret_key: secret,
          secret_key_masked: maskSecret(secret),
        },
      };
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create device");
    }
  },
  {
    body: t.Object({
      device_code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      fingerprint: t.Optional(t.String()),
      hostname: t.Optional(t.String()),
      ip_address: t.Optional(t.String()),
      device_type: t.Optional(t.String()),
      machine_id: t.Optional(t.String()),
      station_id: t.Optional(t.String()),
      process_id: t.Optional(t.String()),
      status: t.Optional(t.String()),
      activation_pin: t.Optional(t.String()),
      secret_key: t.Optional(t.String()),
    }),
  }
);

adminRoutes.put(
  "/devices/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(devices).where(eq(devices.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Device not found");
    }

    const [updated] = await db
      .update(devices)
      .set({
        deviceCode: body.device_code ?? existing.deviceCode,
        name: body.name ?? existing.name,
        hostname: body.hostname ?? existing.hostname,
        ipAddress: body.ip_address ?? existing.ipAddress,
        machineId: body.machine_id ?? existing.machineId,
        stationId: body.station_id ?? existing.stationId,
        processId: body.process_id ?? existing.processId,
        deviceType: body.device_type ?? existing.deviceType,
        deviceStatus: body.status ?? existing.deviceStatus,
        isActive: body.is_active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, params.id))
      .returning({
        id: devices.id,
        device_code: devices.deviceCode,
        name: devices.name,
        hostname: devices.hostname,
        ip_address: devices.ipAddress,
        machine_id: devices.machineId,
        station_id: devices.stationId,
        process_id: devices.processId,
        device_type: devices.deviceType,
        status: devices.deviceStatus,
        is_active: devices.isActive,
      });

    await auditConfigChange(
      user.userId,
      "DEVICE",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      device_code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      hostname: t.Optional(t.String()),
      ip_address: t.Optional(t.String()),
      device_type: t.Optional(t.String()),
      machine_id: t.Optional(t.String()),
      station_id: t.Optional(t.String()),
      process_id: t.Optional(t.String()),
      status: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/devices/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(devices).where(eq(devices.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Device not found");
    }

    await db
      .update(devices)
      .set({
        isActive: false,
        deviceStatus: "disabled",
        updatedAt: new Date(),
      })
      .where(eq(devices.id, params.id));

    await auditConfigChange(user.userId, "DEVICE", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
      status: "disabled",
    });
    return ok(null);
  }
);

adminRoutes.post(
  "/devices/:id/status",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { status: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [existing] = await db.select().from(devices).where(eq(devices.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Device not found");
    }

    const nextStatus = body.status;
    if (!["active", "disabled", "maintenance"].includes(nextStatus)) {
      set.status = 400;
      return fail("INVALID_STATUS", "Invalid device status");
    }

    await db
      .update(devices)
      .set({
        deviceStatus: nextStatus as "active" | "disabled" | "maintenance",
        isActive: nextStatus !== "disabled",
        updatedAt: new Date(),
      })
      .where(eq(devices.id, params.id));

    await auditConfigChange(
      user.userId,
      "DEVICE",
      params.id,
      "STATUS_CHANGE",
      { status: existing.deviceStatus },
      { status: nextStatus }
    );
    return ok({ id: params.id, status: nextStatus });
  },
  { body: t.Object({ status: t.String() }) }
);

adminRoutes.post(
  "/devices/:id/regenerate-secret",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(devices).where(eq(devices.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Device not found");
    }

    const newSecret = randomBytes(24).toString("hex");
    await db
      .update(devices)
      .set({
        secretKey: newSecret,
        secretRotatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.id, params.id));

    await auditConfigChange(user.userId, "DEVICE", params.id, "REGENERATE_SECRET", null, {
      secret_rotated_at: new Date().toISOString(),
    });
    return {
      success: true,
      data: {
        id: params.id,
        secret_key: newSecret,
        secret_key_masked: maskSecret(newSecret),
      },
    };
  }
);

adminRoutes.put(
  "/devices/:id/assign-machine",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { machine_id: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [dev] = await db.select({ id: devices.id }).from(devices).where(eq(devices.id, params.id)).limit(1);
    if (!dev) {
      set.status = 404;
      return fail("NOT_FOUND", "Device not found");
    }

    const [machine] = await db
      .select({ id: machines.id, name: machines.name })
      .from(machines)
      .where(eq(machines.id, body.machine_id))
      .limit(1);
    if (!machine) {
      set.status = 404;
      return fail("NOT_FOUND", "Machine not found");
    }

    await db
      .update(devices)
      .set({ machineId: body.machine_id, updatedAt: new Date() })
      .where(eq(devices.id, params.id));
    await auditConfigChange(user.userId, "DEVICE", params.id, "ASSIGN_MACHINE", null, { machine_id: body.machine_id });
    return ok({ device_id: params.id, machine_id: body.machine_id, machine_name: machine.name });
  },
  { body: t.Object({ machine_id: t.String() }) }
);

adminRoutes.get("/machines", async () => {
  const rows = await db
    .select({
      id: machines.id,
      name: machines.name,
      station_type: machines.machineType,
      line_code: machines.lineCode,
      capabilities: machines.capabilities,
      is_active: machines.isActive,
    })
    .from(machines)
    .orderBy(asc(machines.name));

  return {
    success: true,
    data: rows.map((m) => ({
      ...m,
      supported_variants:
        ((m.capabilities as Record<string, unknown> | null)?.supported_variants as string[] | undefined) ?? [],
    })),
  };
});

adminRoutes.post(
  "/machines",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(machines)
        .values({
          name: body.name,
          machineType: body.station_type,
          lineCode: body.line_code ?? null,
          capabilities: { supported_variants: body.supported_variants ?? [] },
        })
        .returning({
          id: machines.id,
          name: machines.name,
          station_type: machines.machineType,
          line_code: machines.lineCode,
          capabilities: machines.capabilities,
          is_active: machines.isActive,
        });

      await auditConfigChange(user.userId, "MACHINE", created.id, "CREATE", null, created as any);
      return {
        success: true,
        data: {
          ...created,
          supported_variants:
            ((created.capabilities as Record<string, unknown> | null)?.supported_variants as string[] | undefined) ??
            [],
        },
      };
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create machine");
    }
  },
  {
    body: t.Object({
      name: t.String(),
      station_type: t.String(),
      line_code: t.Optional(t.String()),
      supported_variants: t.Optional(t.Array(t.String())),
    }),
  }
);

adminRoutes.put(
  "/machines/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(machines).where(eq(machines.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Machine not found");
    }

    const [updated] = await db
      .update(machines)
      .set({
        name: body.name ?? existing.name,
        machineType: body.station_type ?? existing.machineType,
        lineCode: body.line_code ?? existing.lineCode,
        capabilities: {
          ...(existing.capabilities as Record<string, unknown> | null),
          supported_variants:
            body.supported_variants ??
            ((existing.capabilities as Record<string, unknown> | null)?.supported_variants as string[]) ??
            [],
        },
        isActive: typeof body.is_active === "boolean" ? body.is_active : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(machines.id, params.id))
      .returning({
        id: machines.id,
        name: machines.name,
        station_type: machines.machineType,
        line_code: machines.lineCode,
        capabilities: machines.capabilities,
        is_active: machines.isActive,
      });

    await auditConfigChange(user.userId, "MACHINE", params.id, "UPDATE", existing as any, updated as any);

    return {
      success: true,
      data: {
        ...updated,
        supported_variants:
          ((updated.capabilities as Record<string, unknown> | null)?.supported_variants as string[] | undefined) ?? [],
      },
    };
  },
  {
    body: t.Object({
      name: t.Optional(t.String()),
      station_type: t.Optional(t.String()),
      line_code: t.Optional(t.String()),
      supported_variants: t.Optional(t.Array(t.String())),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/machines/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select({ id: machines.id }).from(machines).where(eq(machines.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Machine not found");
    }

    await db.update(machines).set({ isActive: false, updatedAt: new Date() }).where(eq(machines.id, params.id));
    await auditConfigChange(user.userId, "MACHINE", params.id, "DEACTIVATE", null, { is_active: false });
    return ok(null);
  }
);

adminRoutes.get("/component-types", async () => {
  const rows = await db
    .select({
      id: componentTypes.id,
      code: componentTypes.code,
      name: componentTypes.name,
      description: componentTypes.description,
      is_active: componentTypes.isActive,
      created_at: componentTypes.createdAt,
      updated_at: componentTypes.updatedAt,
    })
    .from(componentTypes)
    .orderBy(asc(componentTypes.code));
  return ok(rows);
});

adminRoutes.post(
  "/component-types",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const normalizedCode = String(body.code ?? "")
        .trim()
        .toUpperCase();
      const normalizedName = String(body.name ?? "").trim();
      if (!normalizedCode || !normalizedName) {
        set.status = 400;
        return fail("INVALID_INPUT", "code and name are required");
      }

      const [created] = await db
        .insert(componentTypes)
        .values({
          code: normalizedCode,
          name: normalizedName,
          description: body.description ?? null,
          isActive: body.is_active ?? true,
        })
        .returning({
          id: componentTypes.id,
          code: componentTypes.code,
          name: componentTypes.name,
          description: componentTypes.description,
          is_active: componentTypes.isActive,
          created_at: componentTypes.createdAt,
          updated_at: componentTypes.updatedAt,
        });

      await auditConfigChange(
        user.userId,
        "COMPONENT_TYPE",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create component type");
    }
  },
  {
    body: t.Object({
      code: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/component-types/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(componentTypes).where(eq(componentTypes.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Component type not found");
    }

    const [updated] = await db
      .update(componentTypes)
      .set({
        code: body.code ? String(body.code).trim().toUpperCase() : existing.code,
        name: body.name ? String(body.name).trim() : existing.name,
        description: body.description ?? existing.description,
        isActive: body.is_active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(componentTypes.id, params.id))
      .returning({
        id: componentTypes.id,
        code: componentTypes.code,
        name: componentTypes.name,
        description: componentTypes.description,
        is_active: componentTypes.isActive,
        created_at: componentTypes.createdAt,
        updated_at: componentTypes.updatedAt,
      });

    await auditConfigChange(
      user.userId,
      "COMPONENT_TYPE",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/component-types/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(componentTypes).where(eq(componentTypes.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Component type not found");
    }

    await db
      .update(componentTypes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(componentTypes.id, params.id));
    await auditConfigChange(
      user.userId,
      "COMPONENT_TYPE",
      params.id,
      "DEACTIVATE",
      existing as Record<string, unknown>,
      { is_active: false }
    );
    return ok(null);
  }
);

// ── Master Routing Steps ───────────────────────────────────────────────────

adminRoutes.get("/master-routing-steps", async () => {
  const rows = await db
    .select({
      id: masterRoutingSteps.id,
      step_code: masterRoutingSteps.stepCode,
      description: masterRoutingSteps.description,
      is_active: masterRoutingSteps.isActive,
      created_at: masterRoutingSteps.createdAt,
      updated_at: masterRoutingSteps.updatedAt,
    })
    .from(masterRoutingSteps)
    .orderBy(asc(masterRoutingSteps.stepCode));
  return ok(rows);
});

adminRoutes.post(
  "/master-routing-steps",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const normalizedCode = String(body.step_code ?? "")
        .trim()
        .toUpperCase();
      if (!normalizedCode) {
        set.status = 400;
        return fail("INVALID_INPUT", "step_code is required");
      }

      const [existing] = await db
        .select({ id: masterRoutingSteps.id })
        .from(masterRoutingSteps)
        .where(eq(masterRoutingSteps.stepCode, normalizedCode))
        .limit(1);
      if (existing) {
        set.status = 400;
        return fail("ALREADY_EXISTS", "Master routing step code already exists");
      }

      const [created] = await db
        .insert(masterRoutingSteps)
        .values({
          stepCode: normalizedCode,
          description: body.description ?? null,
          isActive: body.is_active ?? true,
        })
        .returning({
          id: masterRoutingSteps.id,
          step_code: masterRoutingSteps.stepCode,
          description: masterRoutingSteps.description,
          is_active: masterRoutingSteps.isActive,
          created_at: masterRoutingSteps.createdAt,
          updated_at: masterRoutingSteps.updatedAt,
        });

      await auditConfigChange(
        user.userId,
        "MASTER_ROUTING_STEP",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create master routing step");
    }
  },
  {
    body: t.Object({
      step_code: t.String(),
      description: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/master-routing-steps/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(masterRoutingSteps).where(eq(masterRoutingSteps.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Master routing step not found");
    }

    const [updated] = await db
      .update(masterRoutingSteps)
      .set({
        stepCode: body.step_code ? String(body.step_code).trim().toUpperCase() : existing.stepCode,
        description: body.description ?? existing.description,
        isActive: body.is_active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(masterRoutingSteps.id, params.id))
      .returning({
        id: masterRoutingSteps.id,
        step_code: masterRoutingSteps.stepCode,
        description: masterRoutingSteps.description,
        is_active: masterRoutingSteps.isActive,
        created_at: masterRoutingSteps.createdAt,
        updated_at: masterRoutingSteps.updatedAt,
      });

    await auditConfigChange(
      user.userId,
      "MASTER_ROUTING_STEP",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      step_code: t.Optional(t.String()),
      description: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/master-routing-steps/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(masterRoutingSteps).where(eq(masterRoutingSteps.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Master routing step not found");
    }

    await db
      .update(masterRoutingSteps)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(masterRoutingSteps.id, params.id));
    await auditConfigChange(
      user.userId,
      "MASTER_ROUTING_STEP",
      params.id,
      "DEACTIVATE",
      existing as Record<string, unknown>,
      { is_active: false }
    );
    return ok(null);
  }
);

adminRoutes.get("/part-numbers", async () => {
  const rows = await db
    .select({
      id: partNumbers.id,
      part_number: partNumbers.partNumber,
      component_type_id: partNumbers.componentTypeId,
      component_type_code: componentTypes.code,
      component_type_name: componentTypes.name,
      description: partNumbers.description,
      default_pack_size: partNumbers.defaultPackSize,
      rm_location: partNumbers.rmLocation,
      is_active: partNumbers.isActive,
      created_at: partNumbers.createdAt,
      updated_at: partNumbers.updatedAt,
    })
    .from(partNumbers)
    .leftJoin(componentTypes, eq(componentTypes.id, partNumbers.componentTypeId))
    .orderBy(asc(partNumbers.partNumber));
  return ok(rows);
});

adminRoutes.post(
  "/part-numbers",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const normalizedPartNumber = String(body.part_number ?? "")
        .trim()
        .toUpperCase();
      if (!normalizedPartNumber) {
        set.status = 400;
        return fail("INVALID_INPUT", "part_number is required");
      }

      if (body.component_type_id) {
        const [componentType] = await db
          .select({ id: componentTypes.id })
          .from(componentTypes)
          .where(eq(componentTypes.id, body.component_type_id))
          .limit(1);
        if (!componentType) {
          set.status = 404;
          return fail("NOT_FOUND", "Component type not found");
        }
      }

      const [created] = await db
        .insert(partNumbers)
        .values({
          partNumber: normalizedPartNumber,
          componentTypeId: body.component_type_id || null,
          description: body.description ?? null,
          defaultPackSize: body.default_pack_size ?? null,
          rmLocation: body.rm_location ?? null,
          isActive: body.is_active ?? true,
        })
        .returning({
          id: partNumbers.id,
          part_number: partNumbers.partNumber,
          component_type_id: partNumbers.componentTypeId,
          description: partNumbers.description,
          default_pack_size: partNumbers.defaultPackSize,
          rm_location: partNumbers.rmLocation,
          is_active: partNumbers.isActive,
          created_at: partNumbers.createdAt,
          updated_at: partNumbers.updatedAt,
        });

      await auditConfigChange(
        user.userId,
        "PART_NUMBER",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create part number");
    }
  },
  {
    body: t.Object({
      part_number: t.String(),
      component_type_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
      default_pack_size: t.Optional(t.Number()),
      rm_location: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/part-numbers/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(partNumbers).where(eq(partNumbers.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Part number not found");
    }

    if (body.component_type_id) {
      const [componentType] = await db
        .select({ id: componentTypes.id })
        .from(componentTypes)
        .where(eq(componentTypes.id, body.component_type_id))
        .limit(1);
      if (!componentType) {
        set.status = 404;
        return fail("NOT_FOUND", "Component type not found");
      }
    }

    const [updated] = await db
      .update(partNumbers)
      .set({
        partNumber: body.part_number ? String(body.part_number).trim().toUpperCase() : existing.partNumber,
        componentTypeId:
          body.component_type_id === undefined ? existing.componentTypeId : body.component_type_id || null,
        description: body.description ?? existing.description,
        defaultPackSize: body.default_pack_size ?? existing.defaultPackSize,
        rmLocation: body.rm_location ?? existing.rmLocation,
        isActive: body.is_active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(partNumbers.id, params.id))
      .returning({
        id: partNumbers.id,
        part_number: partNumbers.partNumber,
        component_type_id: partNumbers.componentTypeId,
        description: partNumbers.description,
        default_pack_size: partNumbers.defaultPackSize,
        rm_location: partNumbers.rmLocation,
        is_active: partNumbers.isActive,
        created_at: partNumbers.createdAt,
        updated_at: partNumbers.updatedAt,
      });

    await auditConfigChange(
      user.userId,
      "PART_NUMBER",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      part_number: t.Optional(t.String()),
      component_type_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
      default_pack_size: t.Optional(t.Number()),
      rm_location: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/part-numbers/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(partNumbers).where(eq(partNumbers.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Part number not found");
    }

    await db.update(partNumbers).set({ isActive: false, updatedAt: new Date() }).where(eq(partNumbers.id, params.id));
    await auditConfigChange(user.userId, "PART_NUMBER", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
    });
    return ok(null);
  }
);

adminRoutes.get(
  "/material-requests",
  async ({ query }: { query: { status?: string; date_from?: string; date_to?: string } }) => {
    const conditions = [];
    if (query.status) conditions.push(eq(materialRequests.status, query.status as any));
    if (query.date_from) conditions.push(gte(materialRequests.requestDate, query.date_from));
    if (query.date_to) conditions.push(lte(materialRequests.requestDate, query.date_to));

    const rows = await db
      .select({
        id: materialRequests.id,
        request_no: materialRequests.requestNo,
        dmi_no: materialRequests.dmiNo,
        request_date: materialRequests.requestDate,
        model_id: materialRequests.modelId,
        model_code: models.code,
        model_name: models.name,
        section: materialRequests.section,
        cost_center: materialRequests.costCenter,
        process_name: materialRequests.processName,
        status: materialRequests.status,
        remarks: materialRequests.remarks,
        requested_by_user_id: materialRequests.requestedByUserId,
        created_at: materialRequests.createdAt,
        updated_at: materialRequests.updatedAt,
      })
      .from(materialRequests)
      .leftJoin(models, eq(models.id, materialRequests.modelId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(materialRequests.createdAt));

    const withCounts = await Promise.all(
      rows.map(async (row) => {
        const [cnt] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(materialRequestItems)
          .where(eq(materialRequestItems.materialRequestId, row.id));
        return { ...row, item_count: cnt?.count ?? 0 };
      })
    );

    return ok(withCounts);
  }
);

adminRoutes.get("/material-requests/:id", async ({ params, set }: { params: { id: string }; set: any }) => {
  const [header] = await db
    .select({
      id: materialRequests.id,
      request_no: materialRequests.requestNo,
      dmi_no: materialRequests.dmiNo,
      request_date: materialRequests.requestDate,
      model_id: materialRequests.modelId,
      model_code: models.code,
      model_name: models.name,
      section: materialRequests.section,
      cost_center: materialRequests.costCenter,
      process_name: materialRequests.processName,
      status: materialRequests.status,
      remarks: materialRequests.remarks,
      requested_by_user_id: materialRequests.requestedByUserId,
      approved_by_user_id: materialRequests.approvedByUserId,
      issued_by_user_id: materialRequests.issuedByUserId,
      received_by_user_id: materialRequests.receivedByUserId,
      created_at: materialRequests.createdAt,
      updated_at: materialRequests.updatedAt,
    })
    .from(materialRequests)
    .leftJoin(models, eq(models.id, materialRequests.modelId))
    .where(eq(materialRequests.id, params.id))
    .limit(1);
  if (!header) {
    set.status = 404;
    return fail("NOT_FOUND", "Material request not found");
  }

  const items = await db
    .select({
      id: materialRequestItems.id,
      item_no: materialRequestItems.itemNo,
      part_number: materialRequestItems.partNumber,
      description: materialRequestItems.description,
      requested_qty: materialRequestItems.requestedQty,
      issued_qty: materialRequestItems.issuedQty,
      uom: materialRequestItems.uom,
      do_number: materialRequestItems.doNumber,
      lot_number: materialRequestItems.lotNumber,
      remarks: materialRequestItems.remarks,
    })
    .from(materialRequestItems)
    .where(eq(materialRequestItems.materialRequestId, params.id))
    .orderBy(asc(materialRequestItems.itemNo));

  return ok({ ...header, items });
});

adminRoutes.post(
  "/material-requests",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const requestDate = body.request_date ?? new Date().toISOString().slice(0, 10);
    const requestNo = String(body.request_no ?? "").trim() || `MR-${Date.now()}`;
    const items: any[] = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      set.status = 400;
      return fail("INVALID_INPUT", "At least one line item is required");
    }

    const normalizedItems = items
      .map((item, idx) => ({
        item_no: Number(item.item_no ?? idx + 1),
        part_number: String(item.part_number ?? "")
          .trim()
          .toUpperCase(),
        description: item.description ? String(item.description) : null,
        requested_qty: item.requested_qty ?? null,
        issued_qty: item.issued_qty ?? null,
        uom: item.uom ? String(item.uom) : null,
        do_number: item.do_number ? String(item.do_number).trim().toUpperCase() : null,
        lot_number: item.lot_number ? String(item.lot_number).trim().toUpperCase() : null,
        remarks: item.remarks ? String(item.remarks) : null,
      }))
      .filter((item) => Boolean(item.part_number));

    if (!normalizedItems.length) {
      set.status = 400;
      return fail("INVALID_INPUT", "Line items must include part_number");
    }
    const invalidQtyLine = normalizedItems.find((item) => {
      const qty = Number(item.requested_qty);
      return !Number.isFinite(qty) || qty <= 0;
    });
    if (invalidQtyLine) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_INPUT",
        message: `requested_qty must be greater than 0 for part ${invalidQtyLine.part_number}`,
      };
    }

    const selectedModelId = body.model_id ? String(body.model_id).trim() : null;
    if (!selectedModelId) {
      set.status = 400;
      return fail("INVALID_INPUT", "model_id is required");
    }
    const partNos = normalizedItems.map((item) => item.part_number);

    const catalogRows = await db
      .select({
        model_id: models.id,
        part_number: bom.componentPartNumber,
        component_name: bom.componentName,
      })
      .from(bom)
      .innerJoin(modelRevisions, eq(bom.revisionId, modelRevisions.id))
      .innerJoin(models, eq(modelRevisions.modelId, models.id))
      .where(
        and(eq(modelRevisions.status, "ACTIVE"), eq(models.isActive, true), sql`${bom.componentPartNumber} is not null`)
      );

    const scopedCatalog = catalogRows.filter((row) => row.model_id === selectedModelId);
    if (!scopedCatalog.length) {
      set.status = 404;
      return fail("NOT_FOUND", "Model has no ACTIVE revision/BOM catalog");
    }

    const catalogByPart = new Map<string, (typeof scopedCatalog)[number]>();
    for (const row of scopedCatalog) {
      const key = String(row.part_number ?? "")
        .trim()
        .toUpperCase();
      if (!key) continue;
      if (!catalogByPart.has(key)) catalogByPart.set(key, row);
    }

    const missing = partNos.filter((pn) => !catalogByPart.has(pn));
    if (missing.length) {
      set.status = 404;
      return {
        success: false,
        error_code: "NOT_FOUND",
        message: `Component part number not found in BOM: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`,
      };
    }

    try {
      const created = await db.transaction(async (tx) => {
        const [header] = await tx
          .insert(materialRequests)
          .values({
            requestNo,
            dmiNo: body.dmi_no ?? null,
            requestDate,
            modelId: selectedModelId,
            section: body.section ?? null,
            costCenter: body.cost_center ?? null,
            processName: body.process_name ?? null,
            requestedByUserId: user.userId,
            receivedByUserId: body.received_by_user_id ?? null,
            remarks: body.remarks ?? null,
            status: "REQUESTED",
          })
          .returning({
            id: materialRequests.id,
            request_no: materialRequests.requestNo,
            dmi_no: materialRequests.dmiNo,
            request_date: materialRequests.requestDate,
            model_id: materialRequests.modelId,
            section: materialRequests.section,
            cost_center: materialRequests.costCenter,
            process_name: materialRequests.processName,
            status: materialRequests.status,
            remarks: materialRequests.remarks,
          });

        await tx.insert(materialRequestItems).values(
          normalizedItems.map((item) => ({
            materialRequestId: header.id,
            itemNo: item.item_no,
            partNumber: item.part_number,
            description: item.description ?? catalogByPart.get(item.part_number)?.component_name ?? null,
            requestedQty: item.requested_qty,
            issuedQty: item.issued_qty,
            uom: item.uom,
            doNumber: item.do_number,
            lotNumber: item.lot_number,
            remarks: item.remarks,
          }))
        );

        return header;
      });

      await auditConfigChange(
        user.userId,
        "MATERIAL_REQUEST",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      publishMaterialRequestUpdate({
        event_type: "CREATED",
        id: created.id,
        status: created.status,
        request_no: created.request_no,
        dmi_no: created.dmi_no,
      });
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create material request");
    }
  },
  {
    body: t.Object({
      request_no: t.Optional(t.String()),
      dmi_no: t.Optional(t.String()),
      request_date: t.Optional(t.String()),
      model_id: t.String(),
      section: t.Optional(t.String()),
      cost_center: t.Optional(t.String()),
      process_name: t.Optional(t.String()),
      received_by_user_id: t.Optional(t.String()),
      remarks: t.Optional(t.String()),
      items: t.Array(
        t.Object({
          item_no: t.Optional(t.Number()),
          part_number: t.String(),
          description: t.Optional(t.String()),
          requested_qty: t.Optional(t.Number()),
          issued_qty: t.Optional(t.Number()),
          uom: t.Optional(t.String()),
          do_number: t.Optional(t.String()),
          lot_number: t.Optional(t.String()),
          remarks: t.Optional(t.String()),
        })
      ),
    }),
  }
);

adminRoutes.post(
  "/material-requests/:id/approve",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Material request not found");
    }
    if (existing.status !== "REQUESTED") {
      set.status = 409;
      return fail("INVALID_STATE_TRANSITION", "Only REQUESTED can be approved");
    }

    await db
      .update(materialRequests)
      .set({
        status: "APPROVED",
        approvedByUserId: user.userId,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      user.userId,
      "MATERIAL_REQUEST",
      params.id,
      "APPROVE",
      { status: existing.status },
      { status: "APPROVED" }
    );
    publishMaterialRequestUpdate({
      event_type: "APPROVED",
      id: params.id,
      status: "APPROVED",
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });
    return ok({ id: params.id, status: "APPROVED" });
  }
);

adminRoutes.post(
  "/material-requests/:id/reject",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { reason?: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Material request not found");
    }
    if (existing.status !== "REQUESTED") {
      set.status = 409;
      return fail("INVALID_STATE_TRANSITION", "Only REQUESTED can be rejected");
    }

    await db
      .update(materialRequests)
      .set({
        status: "REJECTED",
        remarks: body.reason
          ? [existing.remarks, `REJECTED: ${body.reason}`].filter(Boolean).join("\n")
          : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      user.userId,
      "MATERIAL_REQUEST",
      params.id,
      "REJECT",
      { status: existing.status },
      { status: "REJECTED" }
    );
    publishMaterialRequestUpdate({
      event_type: "REJECTED",
      id: params.id,
      status: "REJECTED",
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });
    return ok({ id: params.id, status: "REJECTED" });
  },
  {
    body: t.Object({
      reason: t.Optional(t.String()),
    }),
  }
);

adminRoutes.post(
  "/material-requests/:id/issue",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { dmi_no?: string; remarks?: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Material request not found");
    }
    if (existing.status !== "APPROVED") {
      set.status = 409;
      return fail("INVALID_STATE_TRANSITION", "Only APPROVED can be issued");
    }

    await db
      .update(materialRequests)
      .set({
        status: "ISSUED",
        dmiNo: body.dmi_no ?? existing.dmiNo,
        issuedByUserId: user.userId,
        remarks: body.remarks ? [existing.remarks, body.remarks].filter(Boolean).join("\n") : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      user.userId,
      "MATERIAL_REQUEST",
      params.id,
      "ISSUE",
      { status: existing.status },
      { status: "ISSUED" }
    );
    publishMaterialRequestUpdate({
      event_type: "ISSUED",
      id: params.id,
      status: "ISSUED",
      request_no: existing.requestNo,
      dmi_no: body.dmi_no ?? existing.dmiNo,
    });
    return ok({ id: params.id, status: "ISSUED" });
  },
  {
    body: t.Object({
      dmi_no: t.Optional(t.String()),
      remarks: t.Optional(t.String()),
    }),
  }
);

adminRoutes.get("/models", async () => {
  const allModels = await db
    .select({
      id: models.id,
      name: models.name,
      code: models.code,
      part_number: models.partNumber,
      description: models.description,
      pack_size: models.packSize,
      active: models.isActive,
      updated_at: models.updatedAt,
    })
    .from(models)
    .orderBy(asc(models.code));

  const result = await Promise.all(
    allModels.map(async (model) => {
      const [active] = await db
        .select({ id: modelRevisions.id, revision_code: modelRevisions.revisionCode })
        .from(modelRevisions)
        .where(and(eq(modelRevisions.modelId, model.id), eq(modelRevisions.status, "ACTIVE")))
        .limit(1);
      return { ...model, active_revision_id: active?.id ?? null, active_revision_code: active?.revision_code ?? null };
    })
  );

  return ok(result);
});

adminRoutes.post(
  "/models",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const partNumber = String(body.part_number ?? "").trim();
      if (!partNumber) {
        set.status = 400;
        return fail("INVALID_INPUT", "part_number is required");
      }

      const [created] = await db
        .insert(models)
        .values({
          name: body.name,
          code: body.code,
          partNumber,
          description: body.description ?? null,
          packSize: body.pack_size ?? 1,
          isActive: body.active ?? true,
        })
        .returning({
          id: models.id,
          name: models.name,
          code: models.code,
          part_number: models.partNumber,
          description: models.description,
          pack_size: models.packSize,
          active: models.isActive,
          updated_at: models.updatedAt,
        });

      await auditConfigChange(user.userId, "MODEL", created.id, "CREATE", null, created as any);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create model");
    }
  },
  {
    body: t.Object({
      name: t.String(),
      code: t.String(),
      part_number: t.String(),
      description: t.Optional(t.String()),
      pack_size: t.Optional(t.Number()),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/models/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(models).where(eq(models.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Model not found");
    }

    try {
      const [updated] = await db
        .update(models)
        .set({
          name: body.name ?? existing.name,
          code: body.code ?? existing.code,
          partNumber: body.part_number ?? existing.partNumber,
          description: body.description ?? existing.description,
          packSize: body.pack_size ?? existing.packSize,
          isActive: body.active ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(models.id, params.id))
        .returning({
          id: models.id,
          name: models.name,
          code: models.code,
          part_number: models.partNumber,
          description: models.description,
          pack_size: models.packSize,
          active: models.isActive,
          updated_at: models.updatedAt,
        });

      await auditConfigChange(user.userId, "MODEL", params.id, "UPDATE", existing as any, updated as any);
      return ok(updated);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to update model");
    }
  },
  {
    body: t.Object({
      name: t.Optional(t.String()),
      code: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      description: t.Optional(t.String()),
      pack_size: t.Optional(t.Number()),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/models/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select({ id: models.id }).from(models).where(eq(models.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Model not found");
    }

    await db.delete(models).where(eq(models.id, params.id));
    await auditConfigChange(user.userId, "MODEL", params.id, "DELETE", { id: params.id }, null);
    return ok(null);
  }
);

adminRoutes.get("/models/:id/revisions", async ({ params, set }) => {
  const [exists] = await db.select({ id: models.id }).from(models).where(eq(models.id, params.id)).limit(1);
  if (!exists) {
    set.status = 404;
    return fail("NOT_FOUND", "Model not found");
  }

  const rows = await db
    .select({
      id: modelRevisions.id,
      model_id: modelRevisions.modelId,
      revision_code: modelRevisions.revisionCode,
      status: modelRevisions.status,
      description: modelRevisions.description,
      created_at: modelRevisions.createdAt,
      updated_at: modelRevisions.updatedAt,
    })
    .from(modelRevisions)
    .where(eq(modelRevisions.modelId, params.id))
    .orderBy(desc(modelRevisions.createdAt));

  return ok(rows);
});

adminRoutes.post(
  "/models/:id/revisions",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [model] = await db.select({ id: models.id }).from(models).where(eq(models.id, params.id)).limit(1);
    if (!model) {
      set.status = 404;
      return fail("NOT_FOUND", "Model not found");
    }

    try {
      const created = await db.transaction(async (tx) => {
        const [revision] = await tx
          .insert(modelRevisions)
          .values({
            modelId: params.id,
            revisionCode: body.revision_code,
            status: "DRAFT",
            description: body.description ?? null,
            basePartNumber: body.base_part_number ?? null,
          })
          .returning({
            id: modelRevisions.id,
            model_id: modelRevisions.modelId,
            revision_code: modelRevisions.revisionCode,
            status: modelRevisions.status,
            description: modelRevisions.description,
            base_part_number: modelRevisions.basePartNumber,
            created_at: modelRevisions.createdAt,
            updated_at: modelRevisions.updatedAt,
          });

        if (body.clone_from_revision_id) {
          const srcVariants = await tx
            .select()
            .from(variants)
            .where(eq(variants.revisionId, body.clone_from_revision_id));
          const variantIdMap = new Map<string, string>();
          for (const v of srcVariants) {
            const [newVariant] = await tx
              .insert(variants)
              .values({ revisionId: revision.id, code: v.code, description: v.description, mappedCodes: v.mappedCodes })
              .returning({ id: variants.id });
            variantIdMap.set(v.id, newVariant.id);
          }

          const srcBom = await tx.select().from(bom).where(eq(bom.revisionId, body.clone_from_revision_id));
          if (srcBom.length) {
            await tx.insert(bom).values(
              srcBom.map((b) => ({
                revisionId: revision.id,
                componentName: b.componentName,
                componentType: b.componentType,
                componentPartNumber: b.componentPartNumber,
                rm_location: null,
                supplierName: b.supplierName,
                supplierPartNumber: b.supplierPartNumber,
                supplierPackSize: b.supplierPackSize,
                pack2dFormat: b.pack2dFormat,
                qtyPerBatch: b.qtyPerBatch,
                unitType: b.unitType,
                isOptional: b.isOptional,
                variantId: b.variantId ? (variantIdMap.get(b.variantId) ?? null) : null,
              }))
            );
          }

          const srcRouting = await tx.select().from(routing).where(eq(routing.revisionId, body.clone_from_revision_id));
          const routingIdMap = new Map<string, string>();
          for (const r of srcRouting) {
            const [newRouting] = await tx
              .insert(routing)
              .values({ revisionId: revision.id, name: r.name })
              .returning({ id: routing.id });
            routingIdMap.set(r.id, newRouting.id);
          }

          const srcSteps = srcRouting.length
            ? await tx
                .select()
                .from(routingSteps)
                .where(
                  inArray(
                    routingSteps.routingId,
                    srcRouting.map((r) => r.id)
                  )
                )
            : [];

          if (srcSteps.length) {
            await tx.insert(routingSteps).values(
              srcSteps.map((s) => ({
                routingId: routingIdMap.get(s.routingId)!,
                stepCode: s.stepCode,
                sequence: s.sequence,
                componentType: s.componentType,
                consumesQty: s.consumesQty,
                variantOnly: s.variantOnly ? (variantIdMap.get(s.variantOnly) ?? null) : null,
                description: s.description,
              }))
            );
          }

          const srcBindings = await tx
            .select()
            .from(labelBindings)
            .where(eq(labelBindings.modelRevisionId, body.clone_from_revision_id));
          if (srcBindings.length) {
            await tx.insert(labelBindings).values(
              srcBindings.map((b) => ({
                modelRevisionId: revision.id,
                variantId: b.variantId ? (variantIdMap.get(b.variantId) ?? null) : null,
                unitType: b.unitType,
                processPoint: b.processPoint,
                labelTemplateId: b.labelTemplateId,
              }))
            );
          }
        }

        return revision;
      });

      await auditConfigChange(
        user.userId,
        "REVISION",
        created.id,
        body.clone_from_revision_id ? "CLONE" : "CREATE",
        null,
        created as any
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create revision");
    }
  },
  {
    body: t.Object({
      revision_code: t.String(),
      description: t.Optional(t.String()),
      base_part_number: t.Optional(t.String()),
      clone_from_revision_id: t.Optional(t.String()),
    }),
  }
);

adminRoutes.get("/models/:id/revisions/:revisionId", async ({ params, set }) => {
  const [revision] = await db
    .select({
      id: modelRevisions.id,
      model_id: modelRevisions.modelId,
      revision_code: modelRevisions.revisionCode,
      status: modelRevisions.status,
      description: modelRevisions.description,
      base_part_number: modelRevisions.basePartNumber,
      created_at: modelRevisions.createdAt,
      updated_at: modelRevisions.updatedAt,
    })
    .from(modelRevisions)
    .where(and(eq(modelRevisions.id, params.revisionId), eq(modelRevisions.modelId, params.id)))
    .limit(1);

  if (!revision) {
    set.status = 404;
    return fail("NOT_FOUND", "Revision not found");
  }

  return ok(revision);
});

adminRoutes.put(
  "/models/:id/revisions/:revisionId",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string; revisionId: string };
    body: any;
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [existing] = await db
      .select()
      .from(modelRevisions)
      .where(and(eq(modelRevisions.id, params.revisionId), eq(modelRevisions.modelId, params.id)))
      .limit(1);

    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Revision not found");
    }

    try {
      ensureDraftRevisionOrThrow(existing.status);
    } catch (error) {
      set.status = 409;
      return fail("REVISION_LOCKED", (error as Error).message);
    }

    const [updated] = await db
      .update(modelRevisions)
      .set({
        revisionCode: body.revision_code ?? existing.revisionCode,
        description: body.description ?? existing.description,
        basePartNumber: body.base_part_number ?? existing.basePartNumber,
        updatedAt: new Date(),
      })
      .where(eq(modelRevisions.id, params.revisionId))
      .returning({
        id: modelRevisions.id,
        model_id: modelRevisions.modelId,
        revision_code: modelRevisions.revisionCode,
        status: modelRevisions.status,
        description: modelRevisions.description,
        base_part_number: modelRevisions.basePartNumber,
        created_at: modelRevisions.createdAt,
        updated_at: modelRevisions.updatedAt,
      });

    await auditConfigChange(user.userId, "REVISION", params.revisionId, "UPDATE", existing as any, updated as any);
    return ok(updated);
  },
  {
    body: t.Object({
      revision_code: t.Optional(t.String()),
      description: t.Optional(t.String()),
      base_part_number: t.Optional(t.String()),
    }),
  }
);

adminRoutes.post(
  "/models/:id/revisions/:revisionId/activate",
  async ({ params, set, user }: { params: { id: string; revisionId: string }; set: any; user: AccessTokenPayload }) => {
    const [revision] = await db
      .select({ id: modelRevisions.id, modelId: modelRevisions.modelId, status: modelRevisions.status })
      .from(modelRevisions)
      .where(and(eq(modelRevisions.id, params.revisionId), eq(modelRevisions.modelId, params.id)))
      .limit(1);

    if (!revision) {
      set.status = 404;
      return fail("NOT_FOUND", "Revision not found");
    }

    const readiness = await runReadinessValidation(params.id, params.revisionId);
    if (readiness.status === "FAIL" || readiness.revision_id !== params.revisionId) {
      set.status = 409;
      return fail("REVISION_NOT_READY", "Revision is not ready to activate", readiness);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(modelRevisions)
        .set({ status: "INACTIVE", updatedAt: new Date() })
        .where(and(eq(modelRevisions.modelId, params.id), eq(modelRevisions.status, "ACTIVE")));

      await tx
        .update(modelRevisions)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(modelRevisions.id, params.revisionId));
    });

    await auditConfigChange(
      user.userId,
      "REVISION",
      params.revisionId,
      "ACTIVATE",
      { previous_status: revision.status },
      { status: "ACTIVE" }
    );
    return ok({ id: params.revisionId, status: "ACTIVE" });
  }
);
adminRoutes.get("/models/:id/revisions/:revisionId/variants", async ({ params, set }) => {
  const [revision] = await db
    .select({ id: modelRevisions.id })
    .from(modelRevisions)
    .where(eq(modelRevisions.id, params.revisionId))
    .limit(1);
  if (!revision) {
    set.status = 404;
    return fail("NOT_FOUND", "Revision not found");
  }

  const rows = await db
    .select({
      id: variants.id,
      revision_id: variants.revisionId,
      code: variants.code,
      description: variants.description,
      mapped_codes: variants.mappedCodes,
      created_at: variants.createdAt,
    })
    .from(variants)
    .where(eq(variants.revisionId, params.revisionId))
    .orderBy(asc(variants.code));

  return ok(rows.map((r) => ({ ...r, is_default: Boolean((r.mapped_codes as any)?.default) })));
});

adminRoutes.post(
  "/models/:id/revisions/:revisionId/variants",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { revisionId: string };
    body: any;
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (!revision) {
      set.status = 404;
      return fail("NOT_FOUND", "Revision not found");
    }

    try {
      ensureDraftRevisionOrThrow(revision.status);
    } catch (error) {
      set.status = 409;
      return fail("REVISION_LOCKED", (error as Error).message);
    }

    if (body.is_default) {
      const existing = await db.select().from(variants).where(eq(variants.revisionId, params.revisionId));
      for (const v of existing) {
        await db
          .update(variants)
          .set({ mappedCodes: { ...(v.mappedCodes as any), default: false } })
          .where(eq(variants.id, v.id));
      }
    }

    const [created] = await db
      .insert(variants)
      .values({
        revisionId: params.revisionId,
        code: body.code,
        description: body.description ?? null,
        mappedCodes: { ...(body.mapped_codes ?? {}), default: Boolean(body.is_default) },
      })
      .returning({
        id: variants.id,
        revision_id: variants.revisionId,
        code: variants.code,
        description: variants.description,
        mapped_codes: variants.mappedCodes,
        created_at: variants.createdAt,
      });

    await auditConfigChange(user.userId, "VARIANT", created.id, "CREATE", null, created as any);
    return ok({ ...created, is_default: Boolean((created.mapped_codes as any)?.default) });
  },
  {
    body: t.Object({
      code: t.String(),
      description: t.Optional(t.String()),
      is_default: t.Optional(t.Boolean()),
      mapped_codes: t.Optional(t.Record(t.String(), t.String())),
    }),
  }
);

adminRoutes.put(
  "/models/:id/revisions/:revisionId/variants/:variantId",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { revisionId: string; variantId: string };
    body: any;
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (!revision) {
      set.status = 404;
      return fail("NOT_FOUND", "Revision not found");
    }
    try {
      ensureDraftRevisionOrThrow(revision.status);
    } catch (error) {
      set.status = 409;
      return fail("REVISION_LOCKED", (error as Error).message);
    }

    const [existing] = await db.select().from(variants).where(eq(variants.id, params.variantId)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Variant not found");
    }

    const [updated] = await db
      .update(variants)
      .set({
        code: body.code ?? existing.code,
        description: body.description ?? existing.description,
        mappedCodes: {
          ...(existing.mappedCodes as any),
          ...(body.mapped_codes ?? {}),
          default: body.is_default ?? Boolean((existing.mappedCodes as any)?.default),
        },
      })
      .where(eq(variants.id, params.variantId))
      .returning({
        id: variants.id,
        revision_id: variants.revisionId,
        code: variants.code,
        description: variants.description,
        mapped_codes: variants.mappedCodes,
        created_at: variants.createdAt,
      });

    await auditConfigChange(user.userId, "VARIANT", params.variantId, "UPDATE", existing as any, updated as any);
    return ok({ ...updated, is_default: Boolean((updated.mapped_codes as any)?.default) });
  },
  {
    body: t.Object({
      code: t.Optional(t.String()),
      description: t.Optional(t.String()),
      is_default: t.Optional(t.Boolean()),
      mapped_codes: t.Optional(t.Record(t.String(), t.String())),
    }),
  }
);

adminRoutes.delete(
  "/models/:id/revisions/:revisionId/variants/:variantId",
  async ({ params, user }: { params: { revisionId: string; variantId: string }; user: AccessTokenPayload }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    await db.delete(variants).where(eq(variants.id, params.variantId));
    await auditConfigChange(user.userId, "VARIANT", params.variantId, "DELETE", { id: params.variantId }, null);
    return ok(null);
  }
);

adminRoutes.post(
  "/models/:id/revisions/:revisionId/variants/:variantId/set-default",
  async ({ params, user }: { params: { revisionId: string; variantId: string }; user: AccessTokenPayload }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    const all = await db.select().from(variants).where(eq(variants.revisionId, params.revisionId));
    for (const v of all) {
      await db
        .update(variants)
        .set({ mappedCodes: { ...(v.mappedCodes as any), default: v.id === params.variantId } })
        .where(eq(variants.id, v.id));
    }
    await auditConfigChange(user.userId, "VARIANT", params.variantId, "SET_DEFAULT", null, { is_default: true });
    return ok({ variant_id: params.variantId, is_default: true });
  }
);

adminRoutes.get("/models/:id/revisions/:revisionId/bom", async ({ params }) => {
  const rows = await db
    .select({
      id: bom.id,
      revision_id: bom.revisionId,
      component_name: bom.componentName,
      component_unit_type: bom.componentType,
      component_part_number: bom.componentPartNumber,
      rm_location: partNumbers.rmLocation,
      supplier_name: bom.supplierName,
      supplier_part_number: bom.supplierPartNumber,
      supplier_pack_size: bom.supplierPackSize,
      pack_2d_format: bom.pack2dFormat,
      qty_per_assy: bom.qtyPerBatch,
      required: bom.isOptional,
      variant_id: bom.variantId,
      unit_type: bom.unitType,
      created_at: bom.createdAt,
    })
    .from(bom)
    .leftJoin(partNumbers, eq(bom.componentPartNumber, partNumbers.partNumber))
    .where(eq(bom.revisionId, params.revisionId))
    .orderBy(asc(bom.componentType));

  return ok(rows.map((r) => ({ ...r, required: !r.required, variant_rule: r.variant_id })));
});

adminRoutes.post(
  "/models/:id/revisions/:revisionId/bom",
  async ({
    params,
    body,
    user,
    set,
  }: {
    params: { revisionId: string };
    body: any;
    user: AccessTokenPayload;
    set: any;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    try {
      await validateBomReferenceOrThrow({
        componentUnitType: body.component_unit_type,
        componentPartNumber: body.component_part_number ?? null,
      });
    } catch (error) {
      set.status = (error as Error & { error_code?: string }).error_code === "NOT_FOUND" ? 404 : 400;
      return {
        success: false,
        error_code: (error as Error & { error_code?: string }).error_code ?? "INVALID_INPUT",
        message: (error as Error).message,
      };
    }
    const [created] = await db
      .insert(bom)
      .values({
        revisionId: params.revisionId,
        componentName: body.component_name ?? body.component_unit_type,
        componentType: body.component_unit_type,
        componentPartNumber: body.component_part_number
          ? String(body.component_part_number).trim().toUpperCase()
          : null,
        supplierName: body.supplier_name ?? null,
        supplierPartNumber: body.supplier_part_number ?? null,
        supplierPackSize: body.supplier_pack_size ?? null,
        pack2dFormat: body.pack_2d_format ?? null,
        qtyPerBatch: body.qty_per_assy,
        unitType: body.unit_type ?? "ASSY_120",
        isOptional: !body.required,
        variantId: body.variant_id ?? null,
      })
      .returning({
        id: bom.id,
        revision_id: bom.revisionId,
        component_name: bom.componentName,
        component_unit_type: bom.componentType,
        component_part_number: bom.componentPartNumber,
        supplier_name: bom.supplierName,
        supplier_part_number: bom.supplierPartNumber,
        supplier_pack_size: bom.supplierPackSize,
        pack_2d_format: bom.pack2dFormat,
        qty_per_assy: bom.qtyPerBatch,
        required: bom.isOptional,
        variant_id: bom.variantId,
        unit_type: bom.unitType,
        created_at: bom.createdAt,
      });

    await auditConfigChange(user.userId, "BOM", created.id, "CREATE", null, created as any);
    return ok({ ...created, required: !created.required, variant_rule: created.variant_id });
  },
  {
    body: t.Object({
      component_name: t.Optional(t.String()),
      component_unit_type: t.String(),
      component_part_number: t.Optional(t.String()),
      supplier_name: t.Optional(t.String()),
      supplier_part_number: t.Optional(t.String()),
      supplier_pack_size: t.Optional(t.Number()),
      pack_2d_format: t.Optional(t.String()),
      qty_per_assy: t.Number(),
      required: t.Boolean(),
      variant_id: t.Optional(t.String()),
      unit_type: t.Optional(t.String()),
    }),
  }
);

adminRoutes.put(
  "/models/:id/revisions/:revisionId/bom/:bomId",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { revisionId: string; bomId: string };
    body: any;
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    const [existing] = await db.select().from(bom).where(eq(bom.id, params.bomId)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "BOM row not found");
    }
    const nextComponentType = body.component_unit_type ?? existing.componentType;
    const nextComponentPartNumber =
      body.component_part_number === undefined ? existing.componentPartNumber : body.component_part_number;
    try {
      await validateBomReferenceOrThrow({
        componentUnitType: nextComponentType,
        componentPartNumber: nextComponentPartNumber ?? null,
      });
    } catch (error) {
      set.status = (error as Error & { error_code?: string }).error_code === "NOT_FOUND" ? 404 : 400;
      return {
        success: false,
        error_code: (error as Error & { error_code?: string }).error_code ?? "INVALID_INPUT",
        message: (error as Error).message,
      };
    }

    const [updated] = await db
      .update(bom)
      .set({
        componentName: body.component_name ?? existing.componentName,
        componentType: body.component_unit_type ?? existing.componentType,
        componentPartNumber:
          body.component_part_number === undefined
            ? existing.componentPartNumber
            : body.component_part_number
              ? String(body.component_part_number).trim().toUpperCase()
              : null,
        supplierName: body.supplier_name ?? existing.supplierName,
        supplierPartNumber: body.supplier_part_number ?? existing.supplierPartNumber,
        supplierPackSize: body.supplier_pack_size ?? existing.supplierPackSize,
        pack2dFormat: body.pack_2d_format ?? existing.pack2dFormat,
        qtyPerBatch: body.qty_per_assy ?? existing.qtyPerBatch,
        unitType: body.unit_type ?? existing.unitType,
        isOptional: body.required !== undefined ? !body.required : existing.isOptional,
        variantId: body.variant_id === undefined ? existing.variantId : body.variant_id,
      })
      .where(eq(bom.id, params.bomId))
      .returning({
        id: bom.id,
        revision_id: bom.revisionId,
        component_name: bom.componentName,
        component_unit_type: bom.componentType,
        component_part_number: bom.componentPartNumber,
        supplier_name: bom.supplierName,
        supplier_part_number: bom.supplierPartNumber,
        supplier_pack_size: bom.supplierPackSize,
        pack_2d_format: bom.pack2dFormat,
        qty_per_assy: bom.qtyPerBatch,
        required: bom.isOptional,
        variant_id: bom.variantId,
        unit_type: bom.unitType,
        created_at: bom.createdAt,
      });

    await auditConfigChange(user.userId, "BOM", params.bomId, "UPDATE", existing as any, updated as any);
    return ok({ ...updated, required: !updated.required, variant_rule: updated.variant_id });
  },
  {
    body: t.Object({
      component_name: t.Optional(t.String()),
      component_unit_type: t.Optional(t.String()),
      component_part_number: t.Optional(t.String()),
      supplier_name: t.Optional(t.String()),
      supplier_part_number: t.Optional(t.String()),
      supplier_pack_size: t.Optional(t.Number()),
      pack_2d_format: t.Optional(t.String()),
      qty_per_assy: t.Optional(t.Number()),
      required: t.Optional(t.Boolean()),
      variant_id: t.Optional(t.String()),
      unit_type: t.Optional(t.String()),
    }),
  }
);

adminRoutes.delete(
  "/models/:id/revisions/:revisionId/bom/:bomId",
  async ({
    params,
    user,
    set,
  }: {
    params: { bomId: string; revisionId: string };
    user: AccessTokenPayload;
    set: any;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    await db.delete(bom).where(eq(bom.id, params.bomId));
    await auditConfigChange(user.userId, "BOM", params.bomId, "DELETE", { id: params.bomId }, null);
    return ok(null);
  }
);
adminRoutes.get("/models/:id/revisions/:revisionId/routing", async ({ params }) => {
  const rows = await db
    .select({
      id: routingSteps.id,
      routing_id: routing.id,
      step_code: routingSteps.stepCode,
      sequence: routingSteps.sequence,
      mandatory_raw: routingSteps.consumesQty,
      variant_id: routingSteps.variantOnly,
      description: routingSteps.description,
    })
    .from(routing)
    .leftJoin(routingSteps, eq(routingSteps.routingId, routing.id))
    .where(eq(routing.revisionId, params.revisionId))
    .orderBy(asc(routingSteps.sequence));

  return {
    success: true,
    data: rows
      .filter((r) => !!r.id)
      .map((r) => ({
        id: r.id,
        routing_id: r.routing_id,
        step_code: r.step_code,
        sequence: r.sequence,
        mandatory: (r.mandatory_raw ?? 1) > 0,
        variant_id: r.variant_id,
        variant_rule: r.variant_id,
        description: r.description,
      })),
  };
});

adminRoutes.post(
  "/models/:id/revisions/:revisionId/routing",
  async ({
    params,
    body,
    user,
    set,
  }: {
    params: { revisionId: string };
    body: any;
    user: AccessTokenPayload;
    set: any;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    const [existingRouting] = await db
      .select({ id: routing.id })
      .from(routing)
      .where(eq(routing.revisionId, params.revisionId))
      .limit(1);
    const routingId = existingRouting
      ? existingRouting.id
      : (
          await db
            .insert(routing)
            .values({ revisionId: params.revisionId, name: body.routing_name ?? "Default Routing" })
            .returning({ id: routing.id })
        )[0].id;

    const [created] = await db
      .insert(routingSteps)
      .values({
        routingId,
        stepCode: body.step_code,
        sequence: body.sequence,
        consumesQty: body.mandatory ? 1 : 0,
        variantOnly: body.variant_id ?? null,
        description: body.description ?? null,
        componentType: body.component_type ?? null,
      })
      .returning({
        id: routingSteps.id,
        routing_id: routingSteps.routingId,
        step_code: routingSteps.stepCode,
        sequence: routingSteps.sequence,
        mandatory_raw: routingSteps.consumesQty,
        variant_id: routingSteps.variantOnly,
        description: routingSteps.description,
      });

    await auditConfigChange(user.userId, "ROUTING_STEP", created.id, "CREATE", null, created as any);
    return ok({ ...created, mandatory: (created.mandatory_raw ?? 1) > 0, variant_rule: created.variant_id });
  },
  {
    body: t.Object({
      step_code: t.String(),
      sequence: t.Number(),
      mandatory: t.Boolean(),
      variant_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
      component_type: t.Optional(t.String()),
      routing_name: t.Optional(t.String()),
    }),
  }
);

adminRoutes.put(
  "/models/:id/revisions/:revisionId/routing/:stepId",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { revisionId: string; stepId: string };
    body: any;
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    const [existing] = await db.select().from(routingSteps).where(eq(routingSteps.id, params.stepId)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Routing step not found");
    }

    const [updated] = await db
      .update(routingSteps)
      .set({
        stepCode: body.step_code ?? existing.stepCode,
        sequence: body.sequence ?? existing.sequence,
        consumesQty: body.mandatory !== undefined ? (body.mandatory ? 1 : 0) : existing.consumesQty,
        variantOnly: body.variant_id === undefined ? existing.variantOnly : body.variant_id,
        description: body.description ?? existing.description,
        componentType: body.component_type ?? existing.componentType,
      })
      .where(eq(routingSteps.id, params.stepId))
      .returning({
        id: routingSteps.id,
        routing_id: routingSteps.routingId,
        step_code: routingSteps.stepCode,
        sequence: routingSteps.sequence,
        mandatory_raw: routingSteps.consumesQty,
        variant_id: routingSteps.variantOnly,
        description: routingSteps.description,
      });

    await auditConfigChange(user.userId, "ROUTING_STEP", params.stepId, "UPDATE", existing as any, updated as any);
    return ok({ ...updated, mandatory: (updated.mandatory_raw ?? 1) > 0, variant_rule: updated.variant_id });
  },
  {
    body: t.Object({
      step_code: t.Optional(t.String()),
      sequence: t.Optional(t.Number()),
      mandatory: t.Optional(t.Boolean()),
      variant_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
      component_type: t.Optional(t.String()),
    }),
  }
);

adminRoutes.delete(
  "/models/:id/revisions/:revisionId/routing/:stepId",
  async ({
    params,
    user,
    set,
  }: {
    params: { stepId: string; revisionId: string };
    user: AccessTokenPayload;
    set: any;
  }) => {
    const [revision] = await db.select().from(modelRevisions).where(eq(modelRevisions.id, params.revisionId)).limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    await db.delete(routingSteps).where(eq(routingSteps.id, params.stepId));
    await auditConfigChange(user.userId, "ROUTING_STEP", params.stepId, "DELETE", { id: params.stepId }, null);
    return ok(null);
  }
);

adminRoutes.get("/templates", async () => {
  const rows = await db
    .select({
      id: labelTemplates.id,
      name: labelTemplates.name,
      revision_id: labelTemplates.revisionId,
      template_body: labelTemplates.templateBody,
      description: labelTemplates.description,
      created_at: labelTemplates.createdAt,
      updated_at: labelTemplates.updatedAt,
    })
    .from(labelTemplates)
    .orderBy(desc(labelTemplates.updatedAt));
  return ok(rows);
});

adminRoutes.post(
  "/templates",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      JSON.parse(body.template_body);
    } catch {
      set.status = 400;
      return fail("INVALID_TEMPLATE_JSON", "template_body must be valid JSON");
    }

    const [created] = await db
      .insert(labelTemplates)
      .values({
        name: body.name,
        templateBody: body.template_body,
        revisionId: body.revision_id ?? null,
        description: body.description ?? null,
      })
      .returning({
        id: labelTemplates.id,
        name: labelTemplates.name,
        revision_id: labelTemplates.revisionId,
        template_body: labelTemplates.templateBody,
        description: labelTemplates.description,
        created_at: labelTemplates.createdAt,
        updated_at: labelTemplates.updatedAt,
      });

    await auditConfigChange(user.userId, "LABEL_TEMPLATE", created.id, "CREATE", null, created as any);
    return ok(created);
  },
  {
    body: t.Object({
      name: t.String(),
      template_body: t.String(),
      revision_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
    }),
  }
);

adminRoutes.put(
  "/templates/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(labelTemplates).where(eq(labelTemplates.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Template not found");
    }

    if (body.template_body) {
      try {
        JSON.parse(body.template_body);
      } catch {
        set.status = 400;
        return fail("INVALID_TEMPLATE_JSON", "template_body must be valid JSON");
      }
    }

    const [updated] = await db
      .update(labelTemplates)
      .set({
        name: body.name ?? existing.name,
        templateBody: body.template_body ?? existing.templateBody,
        revisionId: body.revision_id === undefined ? existing.revisionId : body.revision_id,
        description: body.description ?? existing.description,
        updatedAt: new Date(),
      })
      .where(eq(labelTemplates.id, params.id))
      .returning({
        id: labelTemplates.id,
        name: labelTemplates.name,
        revision_id: labelTemplates.revisionId,
        template_body: labelTemplates.templateBody,
        description: labelTemplates.description,
        created_at: labelTemplates.createdAt,
        updated_at: labelTemplates.updatedAt,
      });

    await auditConfigChange(user.userId, "LABEL_TEMPLATE", params.id, "UPDATE", existing as any, updated as any);
    return ok(updated);
  },
  {
    body: t.Object({
      name: t.Optional(t.String()),
      template_body: t.Optional(t.String()),
      revision_id: t.Optional(t.String()),
      description: t.Optional(t.String()),
    }),
  }
);

adminRoutes.delete("/templates/:id", async ({ params, user }: { params: { id: string }; user: AccessTokenPayload }) => {
  await db.delete(labelTemplates).where(eq(labelTemplates.id, params.id));
  await auditConfigChange(user.userId, "LABEL_TEMPLATE", params.id, "DELETE", { id: params.id }, null);
  return ok(null);
});

adminRoutes.get("/bindings", async ({ query }: { query: { revision_id?: string } }) => {
  const conditions = [];
  if (query.revision_id) conditions.push(eq(labelBindings.modelRevisionId, query.revision_id));

  const rows = await db
    .select({
      id: labelBindings.id,
      model_revision_id: labelBindings.modelRevisionId,
      variant_id: labelBindings.variantId,
      unit_type: labelBindings.unitType,
      process_point: labelBindings.processPoint,
      label_template_id: labelBindings.labelTemplateId,
      created_at: labelBindings.createdAt,
    })
    .from(labelBindings)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(labelBindings.createdAt));

  return ok(rows);
});

adminRoutes.post(
  "/bindings",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const [revision] = await db
      .select()
      .from(modelRevisions)
      .where(eq(modelRevisions.id, body.model_revision_id))
      .limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }
    try {
      const [created] = await db
        .insert(labelBindings)
        .values({
          modelRevisionId: body.model_revision_id,
          variantId: body.variant_id ?? null,
          unitType: body.unit_type,
          processPoint: body.process_point,
          labelTemplateId: body.label_template_id,
        })
        .returning({
          id: labelBindings.id,
          model_revision_id: labelBindings.modelRevisionId,
          variant_id: labelBindings.variantId,
          unit_type: labelBindings.unitType,
          process_point: labelBindings.processPoint,
          label_template_id: labelBindings.labelTemplateId,
          created_at: labelBindings.createdAt,
        });

      await auditConfigChange(user.userId, "LABEL_BINDING", created.id, "CREATE", null, created as any);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create binding");
    }
  },
  {
    body: t.Object({
      model_revision_id: t.String(),
      variant_id: t.Optional(t.String()),
      unit_type: t.String(),
      process_point: t.String(),
      label_template_id: t.String(),
    }),
  }
);

adminRoutes.put(
  "/bindings/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(labelBindings).where(eq(labelBindings.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Binding not found");
    }

    const [revision] = await db
      .select()
      .from(modelRevisions)
      .where(eq(modelRevisions.id, existing.modelRevisionId))
      .limit(1);
    if (revision && revision.status === "ACTIVE") {
      set.status = 409;
      return fail("REVISION_LOCKED", "Active revisions are read-only");
    }

    try {
      const [updated] = await db
        .update(labelBindings)
        .set({
          modelRevisionId: body.model_revision_id ?? existing.modelRevisionId,
          variantId: body.variant_id === undefined ? existing.variantId : body.variant_id,
          unitType: body.unit_type ?? existing.unitType,
          processPoint: body.process_point ?? existing.processPoint,
          labelTemplateId: body.label_template_id ?? existing.labelTemplateId,
        })
        .where(eq(labelBindings.id, params.id))
        .returning({
          id: labelBindings.id,
          model_revision_id: labelBindings.modelRevisionId,
          variant_id: labelBindings.variantId,
          unit_type: labelBindings.unitType,
          process_point: labelBindings.processPoint,
          label_template_id: labelBindings.labelTemplateId,
          created_at: labelBindings.createdAt,
        });

      await auditConfigChange(user.userId, "LABEL_BINDING", params.id, "UPDATE", existing as any, updated as any);
      return ok(updated);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to update binding");
    }
  },
  {
    body: t.Object({
      model_revision_id: t.Optional(t.String()),
      variant_id: t.Optional(t.String()),
      unit_type: t.Optional(t.String()),
      process_point: t.Optional(t.String()),
      label_template_id: t.Optional(t.String()),
    }),
  }
);

adminRoutes.delete(
  "/bindings/:id",
  async ({ params, user, set }: { params: { id: string }; user: AccessTokenPayload; set: any }) => {
    const [existing] = await db.select().from(labelBindings).where(eq(labelBindings.id, params.id)).limit(1);
    if (existing) {
      const [revision] = await db
        .select()
        .from(modelRevisions)
        .where(eq(modelRevisions.id, existing.modelRevisionId))
        .limit(1);
      if (revision && revision.status === "ACTIVE") {
        set.status = 409;
        return fail("REVISION_LOCKED", "Active revisions are read-only");
      }
    }
    await db.delete(labelBindings).where(eq(labelBindings.id, params.id));
    await auditConfigChange(user.userId, "LABEL_BINDING", params.id, "DELETE", { id: params.id }, null);
    return ok(null);
  }
);

adminRoutes.get(
  "/validate-model/:id",
  async ({ params, query, set }: { params: { id: string }; query: { revision_id?: string }; set: any }) => {
    const [model] = await db.select({ id: models.id }).from(models).where(eq(models.id, params.id)).limit(1);
    if (!model) {
      set.status = 404;
      return fail("NOT_FOUND", "Model not found");
    }
    return ok(await runReadinessValidation(params.id, query.revision_id));
  }
);

adminRoutes.get("/processes", async () => {
  const rows = await db
    .select({
      id: processes.id,
      process_code: processes.processCode,
      name: processes.name,
      sequence_order: processes.sequenceOrder,
      active: processes.isActive,
    })
    .from(processes)
    .orderBy(asc(processes.sequenceOrder), asc(processes.processCode));
  return ok(rows);
});

adminRoutes.post(
  "/processes",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const normalizedCode = String(body.process_code ?? "").trim();
      const normalizedName = String(body.name ?? "").trim();
      const normalizedSequence = Number(body.sequence_order ?? 1);

      if (!normalizedCode || !normalizedName || !Number.isFinite(normalizedSequence)) {
        set.status = 400;
        return fail("INVALID_INPUT", "Invalid process payload");
      }

      const [existing] = await db.select().from(processes).where(eq(processes.processCode, normalizedCode)).limit(1);

      if (existing) {
        if (existing.isActive) {
          set.status = 409;
          return fail("DUPLICATE_PROCESS_CODE", "Process code already exists");
        }

        const [reactivated] = await db
          .update(processes)
          .set({
            name: normalizedName,
            sequenceOrder: normalizedSequence,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(processes.id, existing.id))
          .returning({
            id: processes.id,
            process_code: processes.processCode,
            name: processes.name,
            sequence_order: processes.sequenceOrder,
            active: processes.isActive,
          });

        await auditConfigChange(
          user.userId,
          "PROCESS",
          reactivated.id,
          "REACTIVATE",
          existing as Record<string, unknown>,
          reactivated as Record<string, unknown>
        );

        return ok(reactivated);
      }

      const [created] = await db
        .insert(processes)
        .values({
          processCode: normalizedCode,
          name: normalizedName,
          sequenceOrder: normalizedSequence,
          isActive: body.active ?? true,
        })
        .returning({
          id: processes.id,
          process_code: processes.processCode,
          name: processes.name,
          sequence_order: processes.sequenceOrder,
          active: processes.isActive,
        });
      await auditConfigChange(user.userId, "PROCESS", created.id, "CREATE", null, created as Record<string, unknown>);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create process");
    }
  },
  {
    body: t.Object({
      process_code: t.String(),
      name: t.String(),
      sequence_order: t.Number(),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/processes/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(processes).where(eq(processes.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Process not found");
    }
    const [updated] = await db
      .update(processes)
      .set({
        processCode: body.process_code ?? existing.processCode,
        name: body.name ?? existing.name,
        sequenceOrder: body.sequence_order ?? existing.sequenceOrder,
        isActive: body.active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(processes.id, params.id))
      .returning({
        id: processes.id,
        process_code: processes.processCode,
        name: processes.name,
        sequence_order: processes.sequenceOrder,
        active: processes.isActive,
      });
    await auditConfigChange(
      user.userId,
      "PROCESS",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      process_code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      sequence_order: t.Optional(t.Number()),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/processes/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(processes).where(eq(processes.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Process not found");
    }
    await db.update(processes).set({ isActive: false, updatedAt: new Date() }).where(eq(processes.id, params.id));
    await auditConfigChange(user.userId, "PROCESS", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      active: false,
    });
    return ok(null);
  }
);

adminRoutes.get("/suppliers", async () => {
  const rows = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      code: suppliers.code,
      vendor_id: suppliers.vendorId,
      is_active: suppliers.isActive,
      created_at: suppliers.createdAt,
      updated_at: suppliers.updatedAt,
    })
    .from(suppliers)
    .orderBy(asc(suppliers.code));
  return ok(rows);
});

adminRoutes.post(
  "/suppliers",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(suppliers)
        .values({
          name: String(body.name ?? "").trim(),
          code: String(body.code ?? "")
            .trim()
            .toUpperCase(),
          vendorId: body.vendor_id ? String(body.vendor_id).trim().toUpperCase() : null,
          isActive: body.is_active ?? true,
        })
        .returning({
          id: suppliers.id,
          name: suppliers.name,
          code: suppliers.code,
          vendor_id: suppliers.vendorId,
          is_active: suppliers.isActive,
          created_at: suppliers.createdAt,
          updated_at: suppliers.updatedAt,
        });
      await auditConfigChange(user.userId, "SUPPLIER", created.id, "CREATE", null, created as Record<string, unknown>);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create vendor");
    }
  },
  {
    body: t.Object({
      name: t.String(),
      code: t.String(),
      vendor_id: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/suppliers/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor not found");
    }

    const [updated] = await db
      .update(suppliers)
      .set({
        name: body.name ?? existing.name,
        code: body.code ? String(body.code).trim().toUpperCase() : existing.code,
        vendorId:
          body.vendor_id === undefined
            ? existing.vendorId
            : String(body.vendor_id ?? "")
                .trim()
                .toUpperCase() || null,
        isActive: typeof body.is_active === "boolean" ? body.is_active : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, params.id))
      .returning({
        id: suppliers.id,
        name: suppliers.name,
        code: suppliers.code,
        vendor_id: suppliers.vendorId,
        is_active: suppliers.isActive,
        created_at: suppliers.createdAt,
        updated_at: suppliers.updatedAt,
      });
    await auditConfigChange(
      user.userId,
      "SUPPLIER",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      name: t.Optional(t.String()),
      code: t.Optional(t.String()),
      vendor_id: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/suppliers/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(suppliers).where(eq(suppliers.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor not found");
    }

    await db.update(suppliers).set({ isActive: false, updatedAt: new Date() }).where(eq(suppliers.id, params.id));
    await auditConfigChange(user.userId, "SUPPLIER", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
    });
    return ok(null);
  }
);

adminRoutes.get("/supplier-part-profiles", async () => {
  const rows = await db
    .select({
      id: supplierPartProfiles.id,
      supplier_id: supplierPartProfiles.supplierId,
      vendor_id: supplierPartProfiles.supplierId,
      supplier_code: suppliers.code,
      vendor_code: suppliers.code,
      supplier_name: suppliers.name,
      vendor_name: suppliers.name,
      vendor_master_id: suppliers.vendorId,
      part_number: supplierPartProfiles.partNumber,
      supplier_part_number: supplierPartProfiles.supplierPartNumber,
      vendor_part_number: supplierPartProfiles.supplierPartNumber,
      parser_key: supplierPartProfiles.parserKey,
      default_pack_qty: supplierPartProfiles.defaultPackQty,
      is_active: supplierPartProfiles.isActive,
      created_at: supplierPartProfiles.createdAt,
      updated_at: supplierPartProfiles.updatedAt,
    })
    .from(supplierPartProfiles)
    .innerJoin(suppliers, eq(suppliers.id, supplierPartProfiles.supplierId))
    .orderBy(asc(suppliers.code), asc(supplierPartProfiles.partNumber), asc(supplierPartProfiles.supplierPartNumber));

  return ok(rows);
});

adminRoutes.get("/supplier-pack-parsers", async () => {
  const templates = await getMergedBarcodeTemplateRecords();
  const templateKeys = templates.filter((item) => item.is_active).map((item) => item.key);
  const keys = Array.from(new Set([...listSupplierPackParsers(), ...templateKeys])).sort();
  return {
    success: true,
    data: keys.map((key) => ({ key })),
  };
});

adminRoutes.get("/barcode-templates", async () => {
  const rows = await getMergedBarcodeTemplateRecords();
  return ok(rows);
});

adminRoutes.post(
  "/barcode-templates",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const existing = await getBarcodeTemplateMasterRecords();
    const allTemplates = await getMergedBarcodeTemplateRecords();
    const normalized = normalizeTemplateRecord(body);
    if (!normalized) {
      set.status = 400;
      return fail("INVALID_INPUT", "Invalid barcode template payload");
    }
    if (allTemplates.some((item) => item.key === normalized.key)) {
      set.status = 409;
      return fail("DUPLICATE_KEY", "Template key already exists");
    }

    const nowIso = new Date().toISOString();
    const created = {
      ...normalized,
      created_at: nowIso,
      updated_at: nowIso,
      version: Math.max(1, Number(normalized.version || 1)),
    };
    const next = [...existing, created].sort((a, b) => a.key.localeCompare(b.key));
    await saveBarcodeTemplateMasterRecords(next);
    await auditConfigChange(
      user.userId,
      "BARCODE_TEMPLATE",
      created.id,
      "CREATE",
      null,
      created as Record<string, unknown>
    );
    return ok(created);
  },
  {
    body: t.Object({
      key: t.String(),
      name: t.String(),
      format: t.Optional(t.String()),
      identifiers: t.Array(t.String()),
      lot_identifiers: t.Optional(t.Array(t.String())),
      quantity_identifiers: t.Optional(t.Array(t.String())),
      part_identifiers: t.Optional(t.Array(t.String())),
      vendor_identifiers: t.Optional(t.Array(t.String())),
      production_date_identifiers: t.Optional(t.Array(t.String())),
      is_active: t.Optional(t.Boolean()),
      version: t.Optional(t.Number()),
      effective_from: t.Optional(t.String()),
      effective_to: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    }),
  }
);

adminRoutes.put(
  "/barcode-templates/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const systemRows = getSystemBarcodeTemplateRecords();
    if (systemRows.some((row) => row.id === params.id)) {
      set.status = 400;
      return fail("READONLY_TEMPLATE", "System template is read-only. Please clone it.");
    }
    const rows = await getBarcodeTemplateMasterRecords();
    const index = rows.findIndex((row) => row.id === params.id);
    if (index < 0) {
      set.status = 404;
      return fail("NOT_FOUND", "Barcode template not found");
    }

    const existing = rows[index];
    const merged = normalizeTemplateRecord({
      ...existing,
      ...body,
      id: existing.id,
      key: body.key ?? existing.key,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
      version: body.version ?? existing.version + 1,
    });
    if (!merged) {
      set.status = 400;
      return fail("INVALID_INPUT", "Invalid barcode template payload");
    }
    const allTemplates = await getMergedBarcodeTemplateRecords();
    const keyConflict = allTemplates.some((row) => row.id !== params.id && row.key === merged.key);
    if (keyConflict) {
      set.status = 409;
      return fail("DUPLICATE_KEY", "Template key already exists");
    }
    rows[index] = merged;
    await saveBarcodeTemplateMasterRecords(rows.sort((a, b) => a.key.localeCompare(b.key)));
    await auditConfigChange(
      user.userId,
      "BARCODE_TEMPLATE",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      merged as Record<string, unknown>
    );
    return ok(merged);
  },
  {
    body: t.Object({
      key: t.Optional(t.String()),
      name: t.Optional(t.String()),
      format: t.Optional(t.String()),
      identifiers: t.Optional(t.Array(t.String())),
      lot_identifiers: t.Optional(t.Array(t.String())),
      quantity_identifiers: t.Optional(t.Array(t.String())),
      part_identifiers: t.Optional(t.Array(t.String())),
      vendor_identifiers: t.Optional(t.Array(t.String())),
      production_date_identifiers: t.Optional(t.Array(t.String())),
      is_active: t.Optional(t.Boolean()),
      version: t.Optional(t.Number()),
      effective_from: t.Optional(t.String()),
      effective_to: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    }),
  }
);

adminRoutes.delete(
  "/barcode-templates/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const systemRows = getSystemBarcodeTemplateRecords();
    if (systemRows.some((row) => row.id === params.id)) {
      set.status = 400;
      return fail("READONLY_TEMPLATE", "System template is read-only. Please clone it.");
    }
    const rows = await getBarcodeTemplateMasterRecords();
    const existing = rows.find((row) => row.id === params.id);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Barcode template not found");
    }
    const next = rows.filter((row) => row.id !== params.id);
    await saveBarcodeTemplateMasterRecords(next);
    await auditConfigChange(
      user.userId,
      "BARCODE_TEMPLATE",
      params.id,
      "DELETE",
      existing as Record<string, unknown>,
      null
    );
    return ok(null);
  }
);

adminRoutes.post(
  "/barcode-templates/test-parse",
  async ({ body, set }: { body: any; set: any }) => {
    try {
      const templates = await getMergedBarcodeTemplateRecords();
      const templateMap = getActiveTemplateMap(templates);
      const raw = String(body.pack_barcode_raw ?? "").trim();
      if (!raw) {
        set.status = 400;
        return fail("INVALID_INPUT", "pack_barcode_raw is required");
      }

      if (body.template) {
        const normalized = normalizeTemplateRecord({
          ...body.template,
          key: body.template.key ?? "ADHOC_TEMPLATE",
        });
        if (!normalized) {
          set.status = 400;
          return fail("INVALID_INPUT", "Invalid ad-hoc template payload");
        }
        const parsed = parseSupplierPackBarcodeWithTemplate(raw, toParserTemplate(normalized));
        return ok({ parser_key: normalized.key, parser_source: "ADHOC_TEMPLATE", parsed });
      }

      if (body.template_id) {
        const selected = templates.find((template) => template.id === body.template_id);
        if (!selected) {
          set.status = 404;
          return fail("NOT_FOUND", "Barcode template not found");
        }
        const parsed = parseSupplierPackBarcodeWithTemplate(raw, toParserTemplate(selected));
        return ok({ parser_key: selected.key, parser_source: "TEMPLATE_MASTER", parsed });
      }

      const parsed = parsePackBarcodeByKey(raw, body.parser_key, templateMap);
      return {
        success: true,
        data: {
          parser_key: parsed.parserKey,
          parser_source: parsed.parserSource,
          parsed: parsed.parsed,
        },
      };
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to parse barcode");
    }
  },
  {
    body: t.Object({
      pack_barcode_raw: t.String(),
      parser_key: t.Optional(t.String()),
      template_id: t.Optional(t.String()),
      template: t.Optional(
        t.Object({
          key: t.String(),
          name: t.String(),
          format: t.Optional(t.String()),
          identifiers: t.Array(t.String()),
          lot_identifiers: t.Optional(t.Array(t.String())),
          quantity_identifiers: t.Optional(t.Array(t.String())),
          part_identifiers: t.Optional(t.Array(t.String())),
          vendor_identifiers: t.Optional(t.Array(t.String())),
          production_date_identifiers: t.Optional(t.Array(t.String())),
          is_active: t.Optional(t.Boolean()),
          version: t.Optional(t.Number()),
          effective_from: t.Optional(t.String()),
          effective_to: t.Optional(t.String()),
          notes: t.Optional(t.String()),
        })
      ),
    }),
  }
);

adminRoutes.post(
  "/supplier-part-profiles",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const supplierId = String(body.supplier_id ?? "").trim();
    const partNumber = String(body.part_number ?? "")
      .trim()
      .toUpperCase();
    const supplierPartNumber = String(body.supplier_part_number ?? body.vendor_part_number ?? "")
      .trim()
      .toUpperCase();
    if (!supplierId || !partNumber) {
      set.status = 400;
      return fail("INVALID_INPUT", "vendor_id and part_number are required");
    }

    const [supplierRow] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    if (!supplierRow) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor not found");
    }

    const [partRow] = await db
      .select({ id: partNumbers.id })
      .from(partNumbers)
      .where(eq(partNumbers.partNumber, partNumber))
      .limit(1);
    if (!partRow) {
      set.status = 404;
      return fail("NOT_FOUND", "Part number not found");
    }

    try {
      const [created] = await db
        .insert(supplierPartProfiles)
        .values({
          supplierId,
          partNumber,
          supplierPartNumber,
          parserKey: String(body.parser_key ?? "GENERIC")
            .trim()
            .toUpperCase(),
          defaultPackQty: body.default_pack_qty ?? null,
          isActive: body.is_active ?? true,
        })
        .returning({
          id: supplierPartProfiles.id,
          supplier_id: supplierPartProfiles.supplierId,
          vendor_id: supplierPartProfiles.supplierId,
          part_number: supplierPartProfiles.partNumber,
          supplier_part_number: supplierPartProfiles.supplierPartNumber,
          vendor_part_number: supplierPartProfiles.supplierPartNumber,
          parser_key: supplierPartProfiles.parserKey,
          default_pack_qty: supplierPartProfiles.defaultPackQty,
          is_active: supplierPartProfiles.isActive,
          created_at: supplierPartProfiles.createdAt,
          updated_at: supplierPartProfiles.updatedAt,
        });
      await auditConfigChange(
        user.userId,
        "SUPPLIER_PART_PROFILE",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create vendor part profile");
    }
  },
  {
    body: t.Object({
      supplier_id: t.String(),
      part_number: t.String(),
      supplier_part_number: t.Optional(t.String()),
      vendor_part_number: t.Optional(t.String()),
      parser_key: t.Optional(t.String()),
      default_pack_qty: t.Optional(t.Number()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/supplier-part-profiles/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db
      .select()
      .from(supplierPartProfiles)
      .where(eq(supplierPartProfiles.id, params.id))
      .limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor part profile not found");
    }

    const nextPartNumber = body.part_number ? String(body.part_number).trim().toUpperCase() : existing.partNumber;
    const nextSupplierId = body.supplier_id ?? existing.supplierId;
    const [supplierRow] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, nextSupplierId))
      .limit(1);
    if (!supplierRow) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor not found");
    }
    const [partRow] = await db
      .select({ id: partNumbers.id })
      .from(partNumbers)
      .where(eq(partNumbers.partNumber, nextPartNumber))
      .limit(1);
    if (!partRow) {
      set.status = 404;
      return fail("NOT_FOUND", "Part number not found");
    }

    const [updated] = await db
      .update(supplierPartProfiles)
      .set({
        supplierId: nextSupplierId,
        partNumber: nextPartNumber,
        supplierPartNumber:
          body.supplier_part_number === undefined && body.vendor_part_number === undefined
            ? existing.supplierPartNumber
            : String(body.supplier_part_number ?? body.vendor_part_number ?? "")
                .trim()
                .toUpperCase(),
        parserKey: body.parser_key ? String(body.parser_key).trim().toUpperCase() : existing.parserKey,
        defaultPackQty: body.default_pack_qty ?? existing.defaultPackQty,
        isActive: typeof body.is_active === "boolean" ? body.is_active : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(supplierPartProfiles.id, params.id))
      .returning({
        id: supplierPartProfiles.id,
        supplier_id: supplierPartProfiles.supplierId,
        vendor_id: supplierPartProfiles.supplierId,
        part_number: supplierPartProfiles.partNumber,
        supplier_part_number: supplierPartProfiles.supplierPartNumber,
        vendor_part_number: supplierPartProfiles.supplierPartNumber,
        parser_key: supplierPartProfiles.parserKey,
        default_pack_qty: supplierPartProfiles.defaultPackQty,
        is_active: supplierPartProfiles.isActive,
        created_at: supplierPartProfiles.createdAt,
        updated_at: supplierPartProfiles.updatedAt,
      });

    await auditConfigChange(
      user.userId,
      "SUPPLIER_PART_PROFILE",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      supplier_id: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      supplier_part_number: t.Optional(t.String()),
      vendor_part_number: t.Optional(t.String()),
      parser_key: t.Optional(t.String()),
      default_pack_qty: t.Optional(t.Number()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/supplier-part-profiles/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db
      .select()
      .from(supplierPartProfiles)
      .where(eq(supplierPartProfiles.id, params.id))
      .limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Vendor part profile not found");
    }

    await db
      .update(supplierPartProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(supplierPartProfiles.id, params.id));
    await auditConfigChange(
      user.userId,
      "SUPPLIER_PART_PROFILE",
      params.id,
      "DEACTIVATE",
      existing as Record<string, unknown>,
      { is_active: false }
    );
    return ok(null);
  }
);

adminRoutes.get("/inventory-do", async () => {
  const rows = await db
    .select({
      id: inventoryDo.id,
      supplier_id: inventoryDo.supplierId,
      vendor_id: inventoryDo.supplierId,
      supplier_code: suppliers.code,
      vendor_code: suppliers.code,
      supplier_name: suppliers.name,
      vendor_name: suppliers.name,
      vendor_master_id: suppliers.vendorId,
      do_number: inventoryDo.doNumber,
      part_number: inventoryDo.partNumber,
      material_code: inventoryDo.materialCode,
      total_qty: inventoryDo.totalQty,
      qty_received: inventoryDo.qtyReceived,
      qty_issued: inventoryDo.qtyIssued,
      received_date: inventoryDo.receivedDate,
      received_at: inventoryDo.receivedAt,
    })
    .from(inventoryDo)
    .leftJoin(suppliers, eq(suppliers.id, inventoryDo.supplierId))
    .orderBy(desc(inventoryDo.receivedAt));
  return ok(rows);
});

adminRoutes.post(
  "/inventory-do",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(inventoryDo)
        .values({
          supplierId: body.supplier_id ?? null,
          doNumber: body.do_number,
          supplier: body.supplier ?? null,
          partNumber: body.part_number ?? null,
          lotNumber: body.lot_number ?? null,
          materialCode: body.material_code ?? body.part_number ?? "UNKNOWN",
          totalQty: body.total_qty ?? body.qty_received ?? null,
          qtyReceived: body.qty_received ?? 0,
          qtyIssued: body.qty_issued ?? 0,
          receivedDate: body.received_date ?? null,
          receivedAt: body.received_at ? new Date(body.received_at) : new Date(),
        })
        .returning({
          id: inventoryDo.id,
          supplier_id: inventoryDo.supplierId,
          do_number: inventoryDo.doNumber,
          part_number: inventoryDo.partNumber,
          material_code: inventoryDo.materialCode,
          total_qty: inventoryDo.totalQty,
          qty_received: inventoryDo.qtyReceived,
          qty_issued: inventoryDo.qtyIssued,
          received_date: inventoryDo.receivedDate,
          received_at: inventoryDo.receivedAt,
        });
      await auditConfigChange(
        user.userId,
        "INVENTORY_DO",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create DO");
    }
  },
  {
    body: t.Object({
      supplier_id: t.Optional(t.String()),
      do_number: t.String(),
      supplier: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      lot_number: t.Optional(t.String()),
      material_code: t.Optional(t.String()),
      total_qty: t.Optional(t.Number()),
      qty_received: t.Optional(t.Number()),
      qty_issued: t.Optional(t.Number()),
      received_date: t.Optional(t.String()),
      received_at: t.Optional(t.String()),
    }),
  }
);

adminRoutes.get("/supplier-packs", async () => {
  const rows = await db
    .select({
      id: supplierPacks.id,
      unit_id: supplierPacks.unitId,
      part_number: supplierPacks.partNumber,
      supplier_id: supplierPacks.supplierId,
      vendor_id: supplierPacks.supplierId,
      supplier_code: suppliers.code,
      vendor_code: suppliers.code,
      supplier_name: suppliers.name,
      vendor_name: suppliers.name,
      vendor_master_id: suppliers.vendorId,
      do_id: supplierPacks.doId,
      do_number: inventoryDo.doNumber,
      supplier_lot: supplierPacks.supplierLot,
      vendor_lot: supplierPacks.supplierLot,
      pack_barcode_raw: supplierPacks.packBarcodeRaw,
      pack_qty_total: supplierPacks.packQtyTotal,
      pack_qty_remaining: supplierPacks.packQtyRemaining,
      production_date: supplierPacks.productionDate,
      parsed_data: supplierPacks.parsedData,
      received_at: supplierPacks.receivedAt,
    })
    .from(supplierPacks)
    .leftJoin(suppliers, eq(suppliers.id, supplierPacks.supplierId))
    .leftJoin(inventoryDo, eq(inventoryDo.id, supplierPacks.doId))
    .orderBy(desc(supplierPacks.receivedAt));
  return ok(rows);
});

adminRoutes.post(
  "/supplier-packs/receive",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const templateMap = getActiveTemplateMap(await getMergedBarcodeTemplateRecords());
      const supplierId = String(body.vendor_id ?? body.supplier_id ?? "").trim();
      if (!supplierId) {
        set.status = 400;
        return fail("INVALID_INPUT", "vendor_id is required");
      }

      const [vendor] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
      if (!vendor) {
        set.status = 404;
        return fail("NOT_FOUND", "Vendor not found");
      }

      const preParsedResult = parsePackBarcodeByKey(body.pack_barcode_raw, body.parser_key, templateMap);
      const preParsed = preParsedResult.parsed;
      const partNumber = String(body.part_number ?? preParsed.partNumber ?? "")
        .trim()
        .toUpperCase();

      if (!partNumber) {
        set.status = 400;
        return fail("INVALID_INPUT", "part_number is required");
      }

      const [partMaster] = await db
        .select({ id: partNumbers.id, part_number: partNumbers.partNumber })
        .from(partNumbers)
        .where(eq(partNumbers.partNumber, partNumber))
        .limit(1);
      if (!partMaster) {
        set.status = 404;
        return fail("NOT_FOUND", "Part number not found in master");
      }

      const profiles = await db
        .select()
        .from(supplierPartProfiles)
        .where(
          and(
            eq(supplierPartProfiles.supplierId, supplierId),
            eq(supplierPartProfiles.partNumber, partNumber),
            eq(supplierPartProfiles.isActive, true)
          )
        );

      const supplierPartNumber = String(body.vendor_part_number ?? body.supplier_part_number ?? "")
        .trim()
        .toUpperCase();
      const profile =
        (supplierPartNumber
          ? profiles.find((p) => p.supplierPartNumber === supplierPartNumber)
          : profiles.find((p) => p.supplierPartNumber === "")) ??
        profiles[0] ??
        null;

      const parserKey = String(body.parser_key ?? profile?.parserKey ?? preParsedResult.parserKey ?? "GENERIC")
        .trim()
        .toUpperCase();
      const parsedResult = parsePackBarcodeByKey(body.pack_barcode_raw, parserKey, templateMap);
      const parsed = parsedResult.parsed;
      const packQtyTotal = Number(body.pack_qty_total ?? parsed.packQty ?? profile?.defaultPackQty ?? 0);
      const supplierLot = body.vendor_lot ?? body.supplier_lot ?? parsed.lotNumber ?? null;

      if (!partNumber || !Number.isFinite(packQtyTotal) || packQtyTotal <= 0) {
        set.status = 400;
        return fail("INVALID_INPUT", "part_number and pack_qty_total are required");
      }
      const selectedVendorId =
        normalizeVendorIdToken(vendor.vendorId) ??
        getVendorIdByVendorCode(vendor.code) ??
        getVendorIdByVendorCode(vendor.name) ??
        null;
      const parsedVendorId = normalizeVendorIdToken(parsed.vendorId ?? parsed.supplierCode ?? null);
      if (parsedVendorId && selectedVendorId && parsedVendorId !== selectedVendorId) {
        set.status = 400;
        return {
          success: false,
          error_code: "VENDOR_ID_MISMATCH",
          message: "Parsed vendor id does not match selected vendor",
        };
      }

      const [unit] = await db
        .insert(units)
        .values({
          unitType: "SUPPLIER_PACK",
          status: "RECEIVED",
          batchRef: body.do_number ?? null,
          qtyTotal: packQtyTotal,
          qtyRemaining: packQtyTotal,
          metadata: {
            supplier_id: supplierId,
            supplier_code: parsed.supplierCode ?? null,
            vendor_id: parsedVendorId ?? selectedVendorId,
            part_number: partNumber,
            lot_number: supplierLot,
            supplier_part_profile_id: profile?.id ?? null,
            parser_key: parserKey,
            parser_source: parsedResult.parserSource,
          },
        })
        .returning({ id: units.id });

      let doId: string | null = body.do_id ?? null;
      if (!doId && body.do_number) {
        const [existingDo] = await db
          .select({
            id: inventoryDo.id,
            supplier_id: inventoryDo.supplierId,
            part_number: inventoryDo.partNumber,
          })
          .from(inventoryDo)
          .where(eq(inventoryDo.doNumber, body.do_number))
          .limit(1);
        if (existingDo) {
          if (existingDo.supplier_id && existingDo.supplier_id !== supplierId) {
            set.status = 400;
            return fail("INVALID_INPUT", "DO number belongs to another vendor");
          }
          if (existingDo.part_number && existingDo.part_number !== partNumber) {
            set.status = 400;
            return fail("INVALID_INPUT", "DO part number mismatch");
          }
          doId = existingDo.id;
        }
      }

      if (!doId && body.do_number) {
        const [createdDo] = await db
          .insert(inventoryDo)
          .values({
            supplierId: supplierId,
            doNumber: body.do_number,
            supplier: body.vendor_name ?? body.supplier_name ?? null,
            partNumber,
            materialCode: body.material_code ?? partNumber,
            totalQty: packQtyTotal,
            qtyReceived: packQtyTotal,
            qtyIssued: 0,
            receivedDate: body.received_date ?? null,
          })
          .returning({ id: inventoryDo.id });
        doId = createdDo.id;
      }

      const [pack] = await db
        .insert(supplierPacks)
        .values({
          unitId: unit.id,
          partNumber,
          supplierId: supplierId,
          doId,
          supplierLot,
          packBarcodeRaw: body.pack_barcode_raw,
          packQtyTotal,
          packQtyRemaining: packQtyTotal,
          productionDate: body.production_date ?? parsed.productionDate ?? null,
          parsedSupplierCode: parsed.supplierCode ?? null,
          parsedPartNumber: parsed.partNumber ?? null,
          parsedLotNumber: parsed.lotNumber ?? null,
          parsedPackQty: parsed.packQty ?? null,
          parsedData: parsed as Record<string, unknown>,
        })
        .returning({
          id: supplierPacks.id,
          unit_id: supplierPacks.unitId,
          part_number: supplierPacks.partNumber,
          supplier_id: supplierPacks.supplierId,
          vendor_id: supplierPacks.supplierId,
          do_id: supplierPacks.doId,
          supplier_lot: supplierPacks.supplierLot,
          vendor_lot: supplierPacks.supplierLot,
          pack_barcode_raw: supplierPacks.packBarcodeRaw,
          pack_qty_total: supplierPacks.packQtyTotal,
          pack_qty_remaining: supplierPacks.packQtyRemaining,
          parsed_data: supplierPacks.parsedData,
        });

      if (doId) {
        await db
          .update(inventoryDo)
          .set({
            qtyReceived: sql`${inventoryDo.qtyReceived} + ${packQtyTotal}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryDo.id, doId));
      }

      await db.insert(component2dScans).values({
        inventoryDoId: doId,
        supplierPackId: pack.id,
        unitId: unit.id,
        scanData: body.pack_barcode_raw,
        parsedData: parsed as Record<string, unknown>,
      });

      await auditConfigChange(user.userId, "SUPPLIER_PACK", pack.id, "RECEIVE", null, pack as Record<string, unknown>);
      return {
        success: true,
        data: {
          ...pack,
          parser_key: parserKey,
          parser_source: parsedResult.parserSource,
          supplier_part_profile_id: profile?.id ?? null,
          vendor_part_profile_id: profile?.id ?? null,
        },
      };
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to receive vendor pack");
    }
  },
  {
    body: t.Object({
      supplier_id: t.Optional(t.String()),
      vendor_id: t.Optional(t.String()),
      do_id: t.Optional(t.String()),
      do_number: t.Optional(t.String()),
      supplier_name: t.Optional(t.String()),
      vendor_name: t.Optional(t.String()),
      parser_key: t.Optional(t.String()),
      part_number: t.Optional(t.String()),
      supplier_part_number: t.Optional(t.String()),
      vendor_part_number: t.Optional(t.String()),
      supplier_lot: t.Optional(t.String()),
      vendor_lot: t.Optional(t.String()),
      material_code: t.Optional(t.String()),
      pack_barcode_raw: t.String(),
      pack_qty_total: t.Optional(t.Number()),
      production_date: t.Optional(t.String()),
      received_date: t.Optional(t.String()),
    }),
  }
);

adminRoutes.get("/stations", async () => {
  const rows = await db
    .select({
      id: stations.id,
      station_code: stations.stationCode,
      name: stations.name,
      line: stations.line,
      area: stations.area,
      process_id: stations.processId,
      process_name: processes.name,
      active: stations.isActive,
    })
    .from(stations)
    .leftJoin(processes, eq(processes.id, stations.processId))
    .orderBy(asc(stations.stationCode));

  return ok(rows);
});

adminRoutes.post(
  "/stations",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(stations)
        .values({
          stationCode: body.station_code,
          name: body.name,
          line: body.line ?? null,
          area: body.area ?? null,
          processId: body.process_id ?? null,
          isActive: body.active ?? true,
        })
        .returning({
          id: stations.id,
          station_code: stations.stationCode,
          name: stations.name,
          line: stations.line,
          area: stations.area,
          process_id: stations.processId,
          active: stations.isActive,
        });

      await auditConfigChange(user.userId, "STATION", created.id, "CREATE", null, created as Record<string, unknown>);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create station");
    }
  },
  {
    body: t.Object({
      station_code: t.String(),
      name: t.String(),
      line: t.Optional(t.String()),
      area: t.Optional(t.String()),
      process_id: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/stations/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Station not found");
    }

    const [updated] = await db
      .update(stations)
      .set({
        stationCode: body.station_code ?? existing.stationCode,
        name: body.name ?? existing.name,
        line: body.line ?? existing.line,
        area: body.area ?? existing.area,
        processId: body.process_id ?? existing.processId,
        isActive: body.active ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(stations.id, params.id))
      .returning({
        id: stations.id,
        station_code: stations.stationCode,
        name: stations.name,
        line: stations.line,
        area: stations.area,
        process_id: stations.processId,
        active: stations.isActive,
      });
    await auditConfigChange(
      user.userId,
      "STATION",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    return ok(updated);
  },
  {
    body: t.Object({
      station_code: t.Optional(t.String()),
      name: t.Optional(t.String()),
      line: t.Optional(t.String()),
      area: t.Optional(t.String()),
      process_id: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/stations/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Station not found");
    }
    await db.update(stations).set({ isActive: false, updatedAt: new Date() }).where(eq(stations.id, params.id));
    await auditConfigChange(user.userId, "STATION", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      active: false,
    });
    return ok(null);
  }
);

adminRoutes.get("/workflow-approvals", async () => {
  const rows = await db
    .select({
      id: workflowApprovalConfigs.id,
      flow_code: workflowApprovalConfigs.flowCode,
      flow_name: workflowApprovalConfigs.flowName,
      from_status: workflowApprovalConfigs.fromStatus,
      to_status: workflowApprovalConfigs.toStatus,
      level: workflowApprovalConfigs.level,
      approver_role_id: workflowApprovalConfigs.approverRoleId,
      approver_role_name: roles.name,
      active: workflowApprovalConfigs.isActive,
      metadata: workflowApprovalConfigs.metadata,
    })
    .from(workflowApprovalConfigs)
    .leftJoin(roles, eq(roles.id, workflowApprovalConfigs.approverRoleId))
    .orderBy(asc(workflowApprovalConfigs.flowCode), asc(workflowApprovalConfigs.level));
  const approverUserIds = Array.from(
    new Set(
      rows
        .flatMap((row) => parseWorkflowApproverUsers(row.metadata).map((approver) => approver.user_id))
        .filter((id) => Boolean(id))
    )
  );
  const userRows =
    approverUserIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            display_name: users.displayName,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, approverUserIds));
  const userMap = userRows.reduce<Record<string, { display_name: string | null; email: string | null }>>((acc, row) => {
    acc[row.id] = { display_name: row.display_name, email: row.email };
    return acc;
  }, {});

  return {
    success: true,
    data: rows.map((row) => {
      const approverUsers = parseWorkflowApproverUsers(row.metadata).map((approver) => ({
        ...approver,
        display_name: userMap[approver.user_id]?.display_name ?? null,
        email: approver.email ?? userMap[approver.user_id]?.email ?? null,
      }));
      const defaultApprover = approverUsers.find((approver) => approver.is_default);
      return {
        ...row,
        approver_users: approverUsers,
        default_approver_user_id: defaultApprover?.user_id ?? null,
        default_approver_email: defaultApprover?.email ?? null,
      };
    }),
  };
});

adminRoutes.post(
  "/workflow-approvals",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const metadata = buildWorkflowMetadata(body);
      const [created] = await db
        .insert(workflowApprovalConfigs)
        .values({
          flowCode: body.flow_code,
          flowName: body.flow_name,
          fromStatus: body.from_status,
          toStatus: body.to_status,
          level: body.level,
          approverRoleId: body.approver_role_id ?? null,
          isActive: body.active ?? true,
          metadata,
        })
        .returning({
          id: workflowApprovalConfigs.id,
          flow_code: workflowApprovalConfigs.flowCode,
          flow_name: workflowApprovalConfigs.flowName,
          from_status: workflowApprovalConfigs.fromStatus,
          to_status: workflowApprovalConfigs.toStatus,
          level: workflowApprovalConfigs.level,
          approver_role_id: workflowApprovalConfigs.approverRoleId,
          active: workflowApprovalConfigs.isActive,
          metadata: workflowApprovalConfigs.metadata,
        });

      await auditConfigChange(
        user.userId,
        "WORKFLOW_APPROVAL",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      const approverUsers = parseWorkflowApproverUsers(created.metadata);
      return {
        success: true,
        data: {
          ...created,
          approver_users: approverUsers,
          default_approver_user_id: approverUsers.find((approver) => approver.is_default)?.user_id ?? null,
          default_approver_email: approverUsers.find((approver) => approver.is_default)?.email ?? null,
        },
      };
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create workflow approval rule");
    }
  },
  {
    body: t.Object({
      flow_code: t.String(),
      flow_name: t.String(),
      from_status: t.String(),
      to_status: t.String(),
      level: t.Number(),
      approver_role_id: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  }
);

adminRoutes.put(
  "/workflow-approvals/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db
      .select()
      .from(workflowApprovalConfigs)
      .where(eq(workflowApprovalConfigs.id, params.id))
      .limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Workflow approval rule not found");
    }

    const metadata =
      body.metadata !== undefined
        ? buildWorkflowMetadata(body, existing.metadata as Record<string, unknown> | null)
        : existing.metadata;
    const [updated] = await db
      .update(workflowApprovalConfigs)
      .set({
        flowCode: body.flow_code ?? existing.flowCode,
        flowName: body.flow_name ?? existing.flowName,
        fromStatus: body.from_status ?? existing.fromStatus,
        toStatus: body.to_status ?? existing.toStatus,
        level: body.level ?? existing.level,
        approverRoleId: body.approver_role_id ?? existing.approverRoleId,
        isActive: body.active ?? existing.isActive,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(workflowApprovalConfigs.id, params.id))
      .returning({
        id: workflowApprovalConfigs.id,
        flow_code: workflowApprovalConfigs.flowCode,
        flow_name: workflowApprovalConfigs.flowName,
        from_status: workflowApprovalConfigs.fromStatus,
        to_status: workflowApprovalConfigs.toStatus,
        level: workflowApprovalConfigs.level,
        approver_role_id: workflowApprovalConfigs.approverRoleId,
        active: workflowApprovalConfigs.isActive,
        metadata: workflowApprovalConfigs.metadata,
      });
    await auditConfigChange(
      user.userId,
      "WORKFLOW_APPROVAL",
      params.id,
      "UPDATE",
      existing as Record<string, unknown>,
      updated as Record<string, unknown>
    );
    const approverUsers = parseWorkflowApproverUsers(updated.metadata);
    return {
      success: true,
      data: {
        ...updated,
        approver_users: approverUsers,
        default_approver_user_id: approverUsers.find((approver) => approver.is_default)?.user_id ?? null,
        default_approver_email: approverUsers.find((approver) => approver.is_default)?.email ?? null,
      },
    };
  },
  {
    body: t.Object({
      flow_code: t.Optional(t.String()),
      flow_name: t.Optional(t.String()),
      from_status: t.Optional(t.String()),
      to_status: t.Optional(t.String()),
      level: t.Optional(t.Number()),
      approver_role_id: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  }
);

adminRoutes.delete(
  "/workflow-approvals/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db
      .select()
      .from(workflowApprovalConfigs)
      .where(eq(workflowApprovalConfigs.id, params.id))
      .limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Workflow approval rule not found");
    }

    await db.delete(workflowApprovalConfigs).where(eq(workflowApprovalConfigs.id, params.id));
    await auditConfigChange(
      user.userId,
      "WORKFLOW_APPROVAL",
      params.id,
      "DELETE",
      existing as Record<string, unknown>,
      null
    );
    return ok(null);
  }
);

adminRoutes.get("/workflow-transitions", async () => {
  const rows = await db
    .select({
      flow_code: workflowApprovalConfigs.flowCode,
      flow_name: workflowApprovalConfigs.flowName,
      from_status: workflowApprovalConfigs.fromStatus,
      to_status: workflowApprovalConfigs.toStatus,
      level: workflowApprovalConfigs.level,
    })
    .from(workflowApprovalConfigs)
    .where(eq(workflowApprovalConfigs.isActive, true))
    .orderBy(asc(workflowApprovalConfigs.flowCode), asc(workflowApprovalConfigs.level));
  return ok(rows);
});

adminRoutes.get("/settings/heartbeat", async () => {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "heartbeat")).limit(1);
  if (!row) {
    return ok({ online_window_minutes: 2 });
  }
  return ok(row.value);
});

adminRoutes.put(
  "/settings/heartbeat",
  async ({ body, user }: { body: { online_window_minutes: number }; user: AccessTokenPayload }) => {
    const value = { online_window_minutes: body.online_window_minutes };
    await db
      .insert(appSettings)
      .values({
        key: "heartbeat",
        value,
        description: "Online heartbeat threshold settings",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
    await auditConfigChange(user.userId, "SETTINGS", "heartbeat", "UPDATE", null, value);
    return ok(value);
  },
  { body: t.Object({ online_window_minutes: t.Number() }) }
);

adminRoutes.get(
  "/audit-logs",
  async ({ query }: { query: { entity_type?: string; user_id?: string; date_from?: string; date_to?: string } }) => {
    const conditions = [];
    if (query.entity_type) conditions.push(eq(configAuditLogs.entityType, query.entity_type));
    if (query.user_id) conditions.push(eq(configAuditLogs.userId, query.user_id));
    if (query.date_from) conditions.push(gte(configAuditLogs.createdAt, new Date(query.date_from)));
    if (query.date_to) conditions.push(lte(configAuditLogs.createdAt, new Date(query.date_to)));

    const rows = await db
      .select({
        id: configAuditLogs.id,
        user_id: configAuditLogs.userId,
        username: users.username,
        entity_type: configAuditLogs.entityType,
        entity_id: configAuditLogs.entityId,
        action: configAuditLogs.action,
        before_data: configAuditLogs.beforeData,
        after_data: configAuditLogs.afterData,
        created_at: configAuditLogs.createdAt,
      })
      .from(configAuditLogs)
      .leftJoin(users, eq(users.id, configAuditLogs.userId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(configAuditLogs.createdAt));

    return ok(rows);
  }
);

// ─── Set Recovery Endpoints ─────────────────────────────

adminRoutes.post(
  "/set/force-close",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const { set_run_id, status: targetStatus } = body;
    const finalStatus = targetStatus === "CANCELLED" ? "CANCELLED" : "COMPLETED";

    const [setRun] = await db.select().from(setRuns).where(eq(setRuns.id, set_run_id)).limit(1);

    if (!setRun) {
      set.status = 404;
      return fail("NOT_FOUND", "Set run not found");
    }

    if (setRun.status !== "ACTIVE" && setRun.status !== "HOLD") {
      set.status = 409;
      return {
        success: false,
        error_code: "INVALID_STATE",
        message: `Set run is ${setRun.status}, can only force-close ACTIVE or HOLD`,
      };
    }

    await db.update(setRuns).set({ status: finalStatus, endedAt: new Date() }).where(eq(setRuns.id, set_run_id));

    await auditConfigChange(
      user.userId,
      "SET_RUN",
      set_run_id,
      "FORCE_CLOSE",
      { status: setRun.status },
      { status: finalStatus }
    );

    console.log(`[ADMIN] Force-closed set_run="${set_run_id}" → ${finalStatus} by user="${user.userId}"`);
    return ok({ set_run_id, previous_status: setRun.status, new_status: finalStatus });
  },
  {
    body: t.Object({
      set_run_id: t.String(),
      status: t.Optional(t.String()),
    }),
  }
);

adminRoutes.post(
  "/set/reopen-last",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const { assy_unit_id } = body;

    const [lastClosed] = await db
      .select()
      .from(setRuns)
      .where(and(eq(setRuns.assyUnitId, assy_unit_id), sql`${setRuns.status} IN ('COMPLETED', 'CANCELLED', 'HOLD')`))
      .orderBy(desc(setRuns.endedAt))
      .limit(1);

    if (!lastClosed) {
      set.status = 404;
      return fail("NOT_FOUND", "No closed set_run found for this assy");
    }

    await db.update(setRuns).set({ status: "ACTIVE", endedAt: null }).where(eq(setRuns.id, lastClosed.id));

    await auditConfigChange(
      user.userId,
      "SET_RUN",
      lastClosed.id,
      "REOPEN",
      { status: lastClosed.status },
      { status: "ACTIVE" }
    );

    console.log(`[ADMIN] Reopened set_run="${lastClosed.id}" for assy="${assy_unit_id}" by user="${user.userId}"`);
    return ok({ set_run_id: lastClosed.id, previous_status: lastClosed.status, new_status: "ACTIVE" });
  },
  {
    body: t.Object({
      assy_unit_id: t.String(),
    }),
  }
);

adminRoutes.post(
  "/material/reassign",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const { container_id, from_set_run_id, to_set_run_id, reason } = body;

    // Validate reason (non-space)
    const trimmedReason = String(reason ?? "").trim();
    if (trimmedReason.length < 5) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_INPUT",
        message: "reason must contain at least 5 non-space characters",
      };
    }

    // Patch 1: reject same-set reassign
    if (from_set_run_id === to_set_run_id) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_INPUT",
        message: "from_set_run_id and to_set_run_id must be different",
      };
    }

    try {
      const result = await db.transaction(async (tx) => {
        // Verify container belongs to from_set_run_id
        const [container] = await tx
          .select()
          .from(containers)
          .where(and(eq(containers.id, container_id), eq(containers.setRunId, from_set_run_id)))
          .limit(1);

        if (!container) {
          throw { httpStatus: 404, error_code: "NOT_FOUND", message: "Container not found in source set_run" };
        }

        // Block reassign if consumption exists for this container's unitId in source set
        if (container.unitId) {
          const [existing] = await tx
            .select({ id: consumption.id })
            .from(consumption)
            .where(and(eq(consumption.setRunId, from_set_run_id), eq(consumption.sourceUid, container.unitId)))
            .limit(1);

          if (existing) {
            throw {
              httpStatus: 409,
              error_code: "CONSUMPTION_EXISTS",
              message: `Cannot reassign: material "${container.unitId}" has already been consumed in set_run "${from_set_run_id}"`,
            };
          }
        }

        // Validate target set_run exists and is ACTIVE
        const [targetSetRun] = await tx
          .select({ id: setRuns.id, status: setRuns.status })
          .from(setRuns)
          .where(eq(setRuns.id, to_set_run_id))
          .limit(1);

        if (!targetSetRun) {
          throw { httpStatus: 404, error_code: "NOT_FOUND", message: "Target set_run not found" };
        }

        if (targetSetRun.status !== "ACTIVE") {
          throw {
            httpStatus: 409,
            error_code: "INVALID_STATE",
            message: `Target set_run is ${targetSetRun.status}, must be ACTIVE`,
          };
        }

        // Patch 2: concurrency-safe conditional UPDATE with returning
        // If someone already moved the container, this will affect 0 rows.
        const updated = await tx
          .update(containers)
          .set({ setRunId: to_set_run_id })
          .where(and(eq(containers.id, container_id), eq(containers.setRunId, from_set_run_id)))
          .returning({ id: containers.id });

        if (updated.length === 0) {
          throw {
            httpStatus: 409,
            error_code: "CONCURRENT_MODIFICATION",
            message: "Container was reassigned by another action; retry with latest state",
          };
        }

        const now = new Date();

        // Patch 4: Asia/Bangkok shiftDay (stable formatting)
        const shiftDay = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now); // YYYY-MM-DD

        // Patch 3: receivedAtServer on trace event
        await tx.insert(events).values({
          id: crypto.randomUUID(),
          unitId: container.unitId ?? null,
          eventType: "ADMIN_CONTAINER_REASSIGNED",
          payload: {
            container_id,
            from_set_run_id,
            to_set_run_id,
            reason: trimmedReason,
            admin_user_id: user.userId,
          },
          createdAtDevice: now,
          receivedAtServer: now,
          shiftDay,
        });

        // Audit log (atomic with the move)
        await auditConfigChange(
          user.userId,
          "CONTAINER",
          container_id,
          "REASSIGN",
          { set_run_id: from_set_run_id, reason: trimmedReason },
          { set_run_id: to_set_run_id, reason: trimmedReason }
        );

        return { container_id, from_set_run_id, to_set_run_id, reason: trimmedReason };
      });

      console.log(
        `[ADMIN] Reassigned container="${container_id}" from set="${from_set_run_id}" to set="${to_set_run_id}" reason="${trimmedReason}" by user="${user.userId}"`
      );
      return ok(result);
    } catch (err: any) {
      if (err?.httpStatus) {
        set.status = err.httpStatus;
        return fail(err.error_code, err.message);
      }
      throw err;
    }
  },
  {
    body: t.Object({
      container_id: t.String(),
      from_set_run_id: t.String(),
      to_set_run_id: t.String(),
      reason: t.String({ minLength: 5 }),
    }),
  }
);

// ═══════════════════════════════════════════════════════
//  Cost Center CRUD
// ═══════════════════════════════════════════════════════

adminRoutes.get("/cost-centers", async ({ query }: { query: { is_active?: string } }) => {
  const conditions = [];
  if (query.is_active !== undefined) {
    conditions.push(eq(costCenters.isActive, query.is_active === "true"));
  }

  const rows = await db
    .select({
      id: costCenters.id,
      group_code: costCenters.groupCode,
      cost_code: costCenters.costCode,
      short_text: costCenters.shortText,
      is_active: costCenters.isActive,
      section_id: costCenters.sectionId,
      is_default: costCenters.isDefault,
      created_at: costCenters.createdAt,
      updated_at: costCenters.updatedAt,
    })
    .from(costCenters)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(costCenters.groupCode), asc(costCenters.costCode));

  return ok(rows);
});

const VALID_GROUP_CODES = ["DL", "IDL", "DIS", "ADM"] as const;

adminRoutes.post(
  "/cost-centers",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    const groupCode = String(body.group_code ?? "")
      .trim()
      .toUpperCase();
    if (!VALID_GROUP_CODES.includes(groupCode as any)) {
      set.status = 400;
      return fail("INVALID_GROUP_CODE", `group_code must be one of: ${VALID_GROUP_CODES.join(", ")}`);
    }

    try {
      const created = await db.transaction(async (tx) => {
        if (body.section_id && body.is_default) {
          await tx.update(costCenters).set({ isDefault: false }).where(eq(costCenters.sectionId, body.section_id));
        }
        const [inserted] = await tx
          .insert(costCenters)
          .values({
            groupCode,
            costCode: String(body.cost_code ?? "")
              .trim()
              .toUpperCase(),
            shortText: String(body.short_text ?? "").trim(),
            sectionId: body.section_id || null,
            isDefault: body.is_default ?? false,
            isActive: body.is_active ?? true,
            createdBy: user.userId,
          })
          .returning();
        return inserted;
      });

      await auditConfigChange(
        user.userId,
        "COST_CENTER",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create cost center");
    }
  },
  {
    body: t.Object({
      group_code: t.String(),
      cost_code: t.String(),
      short_text: t.String(),
      section_id: t.Optional(t.String()),
      is_default: t.Optional(t.Boolean()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/cost-centers/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(costCenters).where(eq(costCenters.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Cost center not found");
    }

    if (body.group_code !== undefined) {
      const gc = String(body.group_code).trim().toUpperCase();
      if (!VALID_GROUP_CODES.includes(gc as any)) {
        set.status = 400;
        return fail("INVALID_GROUP_CODE", `group_code must be one of: ${VALID_GROUP_CODES.join(", ")}`);
      }
    }

    try {
      const updated = await db.transaction(async (tx) => {
        const nextSectionId = body.section_id !== undefined ? body.section_id || null : existing.sectionId;
        const nextIsDefault = body.is_default !== undefined ? body.is_default : existing.isDefault;
        if (nextSectionId && nextIsDefault && (nextSectionId !== existing.sectionId || !existing.isDefault)) {
          await tx.update(costCenters).set({ isDefault: false }).where(eq(costCenters.sectionId, nextSectionId));
        }

        const [modified] = await tx
          .update(costCenters)
          .set({
            groupCode:
              body.group_code !== undefined ? String(body.group_code).trim().toUpperCase() : existing.groupCode,
            costCode: body.cost_code !== undefined ? String(body.cost_code).trim().toUpperCase() : existing.costCode,
            shortText: body.short_text !== undefined ? String(body.short_text).trim() : existing.shortText,
            sectionId: nextSectionId,
            isDefault: nextIsDefault,
            isActive: body.is_active ?? existing.isActive,
            updatedAt: new Date(),
          })
          .where(eq(costCenters.id, params.id))
          .returning();
        return modified;
      });

      await auditConfigChange(user.userId, "COST_CENTER", params.id, "UPDATE", existing as any, updated as any);
      return ok(updated);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to update cost center");
    }
  },
  {
    body: t.Object({
      group_code: t.Optional(t.String()),
      cost_code: t.Optional(t.String()),
      short_text: t.Optional(t.String()),
      section_id: t.Optional(t.String()),
      is_default: t.Optional(t.Boolean()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/cost-centers/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(costCenters).where(eq(costCenters.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Cost center not found");
    }

    await db.update(costCenters).set({ isActive: false, updatedAt: new Date() }).where(eq(costCenters.id, params.id));
    await auditConfigChange(user.userId, "COST_CENTER", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
    });
    return ok(null);
  }
);

// ═══════════════════════════════════════════════════════
//  Section CRUD
// ═══════════════════════════════════════════════════════

adminRoutes.get("/sections", async () => {
  const sectionRows = await db
    .select({
      id: sections.id,
      section_code: sections.sectionCode,
      section_name: sections.sectionName,
      is_active: sections.isActive,
      created_at: sections.createdAt,
      updated_at: sections.updatedAt,
    })
    .from(sections)
    .orderBy(asc(sections.sectionCode));

  const enriched = await Promise.all(
    sectionRows.map(async (sec) => {
      const mappings = await db
        .select({
          id: sectionCostCenters.id,
          cost_center_id: sectionCostCenters.costCenterId,
          is_default: sectionCostCenters.isDefault,
          cost_code: costCenters.costCode,
          short_text: costCenters.shortText,
          group_code: costCenters.groupCode,
          cc_is_active: costCenters.isActive,
        })
        .from(sectionCostCenters)
        .innerJoin(costCenters, eq(costCenters.id, sectionCostCenters.costCenterId))
        .where(eq(sectionCostCenters.sectionId, sec.id))
        .orderBy(asc(costCenters.groupCode), asc(costCenters.costCode));

      return { ...sec, cost_centers: mappings };
    })
  );

  return ok(enriched);
});

adminRoutes.post(
  "/sections",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload }) => {
    try {
      const [created] = await db
        .insert(sections)
        .values({
          sectionCode: String(body.section_code ?? "")
            .trim()
            .toUpperCase(),
          sectionName: String(body.section_name ?? "").trim(),
          isActive: body.is_active ?? true,
        })
        .returning();

      await auditConfigChange(user.userId, "SECTION", created.id, "CREATE", null, created as Record<string, unknown>);
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to create section");
    }
  },
  {
    body: t.Object({
      section_code: t.String(),
      section_name: t.String(),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.put(
  "/sections/:id",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(sections).where(eq(sections.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Section not found");
    }

    try {
      const [updated] = await db
        .update(sections)
        .set({
          sectionCode:
            body.section_code !== undefined ? String(body.section_code).trim().toUpperCase() : existing.sectionCode,
          sectionName: body.section_name !== undefined ? String(body.section_name).trim() : existing.sectionName,
          isActive: body.is_active ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(sections.id, params.id))
        .returning();

      await auditConfigChange(user.userId, "SECTION", params.id, "UPDATE", existing as any, updated as any);
      return ok(updated);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to update section");
    }
  },
  {
    body: t.Object({
      section_code: t.Optional(t.String()),
      section_name: t.Optional(t.String()),
      is_active: t.Optional(t.Boolean()),
    }),
  }
);

adminRoutes.delete(
  "/sections/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload }) => {
    const [existing] = await db.select().from(sections).where(eq(sections.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return fail("NOT_FOUND", "Section not found");
    }

    await db.update(sections).set({ isActive: false, updatedAt: new Date() }).where(eq(sections.id, params.id));
    await auditConfigChange(user.userId, "SECTION", params.id, "DEACTIVATE", existing as Record<string, unknown>, {
      is_active: false,
    });
    return ok(null);
  }
);

// ═══════════════════════════════════════════════════════
//  Section ↔ Cost Center mapping
// ═══════════════════════════════════════════════════════

// POST /admin/sections/:id/cost-centers – add mapping
adminRoutes.post(
  "/sections/:id/cost-centers",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    // Verify section exists
    const [sec] = await db.select({ id: sections.id }).from(sections).where(eq(sections.id, params.id)).limit(1);
    if (!sec) {
      set.status = 404;
      return fail("NOT_FOUND", "Section not found");
    }

    // Verify cost center exists
    const [cc] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.id, body.cost_center_id))
      .limit(1);
    if (!cc) {
      set.status = 404;
      return fail("NOT_FOUND", "Cost center not found");
    }

    try {
      const [created] = await db.transaction(async (tx) => {
        // If this is being set as default, clear previous default first
        if (body.is_default) {
          await tx
            .update(sectionCostCenters)
            .set({ isDefault: false })
            .where(and(eq(sectionCostCenters.sectionId, params.id), eq(sectionCostCenters.isDefault, true)));
        }

        return await tx
          .insert(sectionCostCenters)
          .values({
            sectionId: params.id,
            costCenterId: body.cost_center_id,
            isDefault: body.is_default ?? false,
          })
          .returning();
      });

      await auditConfigChange(
        user.userId,
        "SECTION_COST_CENTER",
        created.id,
        "CREATE",
        null,
        created as Record<string, unknown>
      );
      return ok(created);
    } catch (error) {
      set.status = 400;
      return fail(parseErrorCode(error), "Failed to add cost center mapping");
    }
  },
  {
    body: t.Object({
      cost_center_id: t.String(),
      is_default: t.Optional(t.Boolean()),
    }),
  }
);

// DELETE /admin/sections/:id/cost-centers/:costCenterId – remove mapping
adminRoutes.delete(
  "/sections/:id/cost-centers/:costCenterId",
  async ({
    params,
    set,
    user,
  }: {
    params: { id: string; costCenterId: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    const [deleted] = await db
      .delete(sectionCostCenters)
      .where(and(eq(sectionCostCenters.sectionId, params.id), eq(sectionCostCenters.costCenterId, params.costCenterId)))
      .returning({ id: sectionCostCenters.id });

    if (!deleted) {
      set.status = 404;
      return fail("NOT_FOUND", "Mapping not found");
    }

    await auditConfigChange(
      user.userId,
      "SECTION_COST_CENTER",
      deleted.id,
      "DELETE",
      { section_id: params.id, cost_center_id: params.costCenterId },
      null
    );
    return ok(null);
  }
);

// PATCH /admin/sections/:id/default-cost-center – set default
adminRoutes.patch(
  "/sections/:id/default-cost-center",
  async ({ params, body, set, user }: { params: { id: string }; body: any; set: any; user: AccessTokenPayload }) => {
    // Transaction: lookup + clear old default + set new (eliminates TOCTOU)
    const mapping = await db.transaction(async (tx) => {
      const [found] = await tx
        .select({ id: sectionCostCenters.id })
        .from(sectionCostCenters)
        .where(
          and(eq(sectionCostCenters.sectionId, params.id), eq(sectionCostCenters.costCenterId, body.cost_center_id))
        )
        .limit(1);

      if (!found) return null;

      await tx
        .update(sectionCostCenters)
        .set({ isDefault: false })
        .where(and(eq(sectionCostCenters.sectionId, params.id), eq(sectionCostCenters.isDefault, true)));

      await tx.update(sectionCostCenters).set({ isDefault: true }).where(eq(sectionCostCenters.id, found.id));

      return found;
    });

    if (!mapping) {
      set.status = 404;
      return {
        success: false,
        error_code: "NOT_FOUND",
        message: "Cost center is not mapped to this section. Add it first.",
      };
    }

    await auditConfigChange(user.userId, "SECTION_COST_CENTER", mapping.id, "SET_DEFAULT", null, {
      section_id: params.id,
      cost_center_id: body.cost_center_id,
    });

    return ok({ id: mapping.id, is_default: true });
  },
  {
    body: t.Object({
      cost_center_id: t.String(),
    }),
  }
);

// ═══════════════════════════════════════════════════════
//  User ↔ Section assignment (ADMIN-only)
// ═══════════════════════════════════════════════════════

// GET /admin/user-sections?q=search
adminRoutes.get("/user-sections", async ({ query }: { query: { q?: string } }) => {
  const search = (query.q ?? "").trim();

  // Base query: LEFT JOIN so users without section show up
  let base = db
    .select({
      user_id: users.id,
      username: users.username,
      display_name: users.displayName,
      employee_code: users.employeeCode,
      email: users.email,
      department: users.department,
      is_active: users.isActive,
      section_id: userSections.sectionId,
      section_code: sections.sectionCode,
      section_name: sections.sectionName,
    })
    .from(users)
    .leftJoin(userSections, eq(userSections.userId, users.id))
    .leftJoin(sections, eq(sections.id, userSections.sectionId));

  const conditions = [eq(users.isActive, true)];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(
        ${users.username} ILIKE ${pattern}
        OR ${users.displayName} ILIKE ${pattern}
        OR ${users.email} ILIKE ${pattern}
        OR ${users.employeeCode} ILIKE ${pattern}
      )`
    );
  }

  const rows = await base
    .where(and(...conditions))
    .orderBy(asc(users.displayName))
    .limit(100);

  return ok(rows);
});

// PUT /admin/user-sections/:userId – upsert assign
adminRoutes.put(
  "/user-sections/:userId",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { userId: string };
    body: { section_id: string };
    set: any;
    user: AccessTokenPayload;
  }) => {
    // Validate user exists
    const [targetUser] = await db
      .select({ id: users.id, display_name: users.displayName })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);
    if (!targetUser) {
      set.status = 404;
      return fail("NOT_FOUND", "User not found");
    }

    // Validate section exists and is active
    const [sec] = await db
      .select({ id: sections.id, section_code: sections.sectionCode })
      .from(sections)
      .where(and(eq(sections.id, body.section_id), eq(sections.isActive, true)))
      .limit(1);
    if (!sec) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_SECTION",
        message: "Section not found or inactive",
      };
    }

    // Upsert: on conflict on user_id PK, update section_id
    const [result] = await db
      .insert(userSections)
      .values({ userId: params.userId, sectionId: body.section_id })
      .onConflictDoUpdate({
        target: userSections.userId,
        set: { sectionId: body.section_id },
      })
      .returning();

    await auditConfigChange(user.userId, "USER_SECTION", params.userId, "UPSERT", null, {
      user_id: params.userId,
      section_id: body.section_id,
      section_code: sec.section_code,
    });

    return ok(result);
  },
  {
    body: t.Object({
      section_id: t.String(),
    }),
  }
);

// DELETE /admin/user-sections/:userId – unassign
adminRoutes.delete(
  "/user-sections/:userId",
  async ({ params, set, user }: { params: { userId: string }; set: any; user: AccessTokenPayload }) => {
    const [deleted] = await db
      .delete(userSections)
      .where(eq(userSections.userId, params.userId))
      .returning({ userId: userSections.userId, sectionId: userSections.sectionId });

    if (!deleted) {
      set.status = 404;
      return fail("NOT_FOUND", "User has no section assignment");
    }

    await auditConfigChange(
      user.userId,
      "USER_SECTION",
      params.userId,
      "DELETE",
      { user_id: deleted.userId, section_id: deleted.sectionId },
      null
    );

    return ok(null);
  }
);
