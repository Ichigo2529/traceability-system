import Elysia, { t } from "elysia";
import { and, asc, desc, eq, gte, inArray, lte, or, sql, aliasedTable } from "drizzle-orm";
import { db } from "../db/connection";
import { checkAuth, checkRole } from "../middleware/auth";
import { authDerive } from "../middleware/auth";
import { type AccessTokenPayload } from "../lib/jwt";
import { publishMaterialRequestUpdate } from "../lib/realtime";
import { sendAlertEmail } from "../lib/alert";
import {
  bom,
  component2dScans,
  configAuditLogs,
  costCenters,
  inventoryDo,
  materialRequestItemIssues,
  materialRequestItems,
  materialRequests,
  modelRevisions,
  models,
  partNumbers,
  roles,
  sections,
  sectionCostCenters,
  departments,
  userDepartments,
  supplierPartProfiles,
  supplierPacks,
  suppliers,
  userRoles,
  userSections,
  users,
  workflowApprovalConfigs,
  handoverBatches,
  handoverBatchItems,
} from "../db/schema";

function parseErrorCode(error: unknown): string {
  const maybe = error as { code?: string };
  if (maybe?.code === "23505") return "DUPLICATE_KEY";
  if (maybe?.code === "23503") return "FOREIGN_KEY_ERROR";
  return "INTERNAL_ERROR";
}

export async function auditConfigChange(
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

function hasAnyRole(user: AccessTokenPayload | null, roles: string[]) {
  if (!user) return false;
  return roles.some((r) => user.roles?.includes(r));
}

/** Section IDs linked to the user (production can list/view MRs for their section). */
async function getUserSectionIdsForMaterialAccess(userId: string): Promise<string[]> {
  const rows = await db
    .select({ sectionId: userSections.sectionId })
    .from(userSections)
    .where(eq(userSections.userId, userId));
  return rows.map((r) => r.sectionId).filter((id): id is string => Boolean(id));
}

type WorkflowApproverUser = {
  user_id: string;
  email?: string | null;
  is_default?: boolean;
};

type MaterialWorkflowPolicy = {
  requestor_roles: string[];
  approver_role_name: string | null;
  approver_users: WorkflowApproverUser[];
  default_approver_user_id: string | null;
};

type AlertRecipient = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  source: "WORKFLOW_USER" | "WORKFLOW_ROLE";
};

const MATERIAL_REQUEST_FLOW_CODE = "MATERIAL_REQUEST_APPROVAL";

function parseWorkflowApproverUsers(metadata: unknown): WorkflowApproverUser[] {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>).approver_users;
  if (!Array.isArray(value)) return [];
  const normalized = value
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
      } as WorkflowApproverUser;
    })
    .filter((row): row is WorkflowApproverUser => Boolean(row));

  const unique = new Map<string, WorkflowApproverUser>();
  for (const row of normalized) {
    if (!unique.has(row.user_id)) unique.set(row.user_id, row);
  }
  return Array.from(unique.values());
}

async function getMaterialWorkflowPolicy(): Promise<MaterialWorkflowPolicy> {
  const rows = await db
    .select({
      level: workflowApprovalConfigs.level,
      approver_role_name: roles.name,
      metadata: workflowApprovalConfigs.metadata,
    })
    .from(workflowApprovalConfigs)
    .leftJoin(roles, eq(roles.id, workflowApprovalConfigs.approverRoleId))
    .where(
      and(eq(workflowApprovalConfigs.flowCode, MATERIAL_REQUEST_FLOW_CODE), eq(workflowApprovalConfigs.isActive, true))
    )
    .orderBy(asc(workflowApprovalConfigs.level));

  if (!rows.length) {
    return {
      requestor_roles: ["PRODUCTION"],
      approver_role_name: "STORE",
      approver_users: [],
      default_approver_user_id: null,
    };
  }

  const level1 = rows.find((row) => row.level === 1) ?? rows[0];
  const level2 = rows.find((row) => row.level === 2) ?? rows[rows.length - 1];

  const level1RequestorRolesRaw =
    level1?.metadata && typeof level1.metadata === "object"
      ? (level1.metadata as Record<string, unknown>).requestor_roles
      : null;
  const requestor_roles = Array.isArray(level1RequestorRolesRaw)
    ? level1RequestorRolesRaw
        .map((role) =>
          String(role ?? "")
            .trim()
            .toUpperCase()
        )
        .filter((role) => role.length > 0)
    : ["PRODUCTION"];

  const approver_users = parseWorkflowApproverUsers(level2?.metadata);
  const default_approver_user_id =
    approver_users.find((row) => row.is_default)?.user_id ??
    (level2?.metadata && typeof level2.metadata === "object"
      ? String((level2.metadata as Record<string, unknown>).default_approver_user_id ?? "").trim() || null
      : null);

  return {
    requestor_roles: requestor_roles.length ? requestor_roles : ["PRODUCTION"],
    approver_role_name: level2?.approver_role_name ?? "STORE",
    approver_users,
    default_approver_user_id,
  };
}

function canCreateMaterialRequestByWorkflow(user: AccessTokenPayload, policy: MaterialWorkflowPolicy) {
  if (user.roles?.includes("ADMIN")) return true;
  return hasAnyRole(user, policy.requestor_roles);
}

function canApproveMaterialRequestByWorkflow(user: AccessTokenPayload, policy: MaterialWorkflowPolicy) {
  if (user.roles?.includes("ADMIN")) return true;

  if (policy.approver_role_name && !user.roles?.includes(policy.approver_role_name)) {
    return false;
  }

  if (!policy.approver_users.length) return true;
  return policy.approver_users.some((approver) => approver.user_id === user.userId);
}

function canStoreHandleIssue(user: AccessTokenPayload, policy: MaterialWorkflowPolicy) {
  // Store issue flow should remain operable by STORE/SUPERVISOR even when
  // workflow approver-user config is stricter than role mapping.
  if (hasAnyRole(user, ["STORE", "SUPERVISOR", "ADMIN"])) return true;
  return canApproveMaterialRequestByWorkflow(user, policy);
}

async function resolveMaterialRequestAlertRecipients(policy: MaterialWorkflowPolicy): Promise<AlertRecipient[]> {
  if (policy.approver_users.length > 0) {
    const approverIds = policy.approver_users.map((approver) => approver.user_id);
    const rows = await db
      .select({
        id: users.id,
        display_name: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(and(inArray(users.id, approverIds), eq(users.isActive, true)));

    const byId = rows.reduce<Record<string, { display_name: string | null; email: string | null }>>((acc, row) => {
      acc[row.id] = { display_name: row.display_name, email: row.email };
      return acc;
    }, {});

    return policy.approver_users.map((approver) => ({
      user_id: approver.user_id,
      display_name: byId[approver.user_id]?.display_name ?? null,
      email: approver.email ?? byId[approver.user_id]?.email ?? null,
      source: "WORKFLOW_USER",
    }));
  }

  if (!policy.approver_role_name) return [];
  const rows = await db
    .select({
      user_id: users.id,
      display_name: users.displayName,
      email: users.email,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(roles.name, policy.approver_role_name), eq(users.isActive, true)))
    .orderBy(asc(users.displayName));

  return rows.map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    email: row.email,
    source: "WORKFLOW_ROLE",
  }));
}

async function resolveRecipientsByRoles(roleNames: string[]): Promise<AlertRecipient[]> {
  if (!roleNames.length) return [];
  const rows = await db
    .select({
      user_id: users.id,
      display_name: users.displayName,
      email: users.email,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(inArray(roles.name, roleNames), eq(users.isActive, true)))
    .orderBy(asc(users.displayName));

  const uniq = new Map<string, AlertRecipient>();
  for (const row of rows) {
    uniq.set(row.user_id, {
      user_id: row.user_id,
      display_name: row.display_name,
      email: row.email,
      source: "WORKFLOW_ROLE",
    });
  }
  return Array.from(uniq.values());
}

async function resolveRecipientByUserId(userId: string | null | undefined): Promise<AlertRecipient[]> {
  if (!userId) return [];
  const [row] = await db
    .select({
      user_id: users.id,
      display_name: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);
  if (!row) return [];
  return [
    {
      user_id: row.user_id,
      display_name: row.display_name,
      email: row.email,
      source: "WORKFLOW_USER",
    },
  ];
}

function mergeAlertRecipients(...groups: AlertRecipient[][]): AlertRecipient[] {
  const uniq = new Map<string, AlertRecipient>();
  for (const group of groups) {
    for (const row of group) {
      const key = row.user_id || String(row.email ?? "").toLowerCase();
      if (!key) continue;
      if (!uniq.has(key)) uniq.set(key, row);
    }
  }
  return Array.from(uniq.values());
}

async function resolveActorName(userId: string): Promise<string> {
  const [row] = await db
    .select({
      display_name: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.display_name ?? row?.email ?? userId;
}

async function buildNextVoucherNumbers(targetDate: Date = new Date()) {
  const dateIso = targetDate.toISOString().slice(0, 10);
  const dateKey = dateIso.replace(/-/g, "");
  const requestPrefix = `NO-${dateKey}-`;
  const dmiPrefix = `DMI-${dateKey}-`;

  const [requestCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(materialRequests)
    .where(sql`${materialRequests.requestNo} like ${`${requestPrefix}%`}`);
  const [dmiCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(materialRequests)
    .where(sql`${materialRequests.dmiNo} like ${`${dmiPrefix}%`}`);

  const nextReq = (requestCountRow?.count ?? 0) + 1;
  const nextDmi = (dmiCountRow?.count ?? 0) + 1;
  return {
    request_no: `${requestPrefix}${String(nextReq).padStart(4, "0")}`,
    dmi_no: `${dmiPrefix}${String(nextDmi).padStart(4, "0")}`,
    request_date: dateIso,
    generated_at: targetDate.toISOString(),
  };
}

async function getActiveBomCatalogRows() {
  return db
    .select({
      model_id: models.id,
      model_code: models.code,
      model_name: models.name,
      model_part_number: models.partNumber,
      pack_size: models.packSize,
      revision_id: modelRevisions.id,
      revision_code: modelRevisions.revisionCode,
      part_number: bom.componentPartNumber,
      qty_per_assy: bom.qtyPerBatch,
      uom_default: supplierPartProfiles.defaultPackQty,
      component_name: bom.componentName,
      rm_location: partNumbers.rmLocation,
    })
    .from(models)
    .innerJoin(modelRevisions, eq(models.id, modelRevisions.modelId))
    .innerJoin(bom, eq(modelRevisions.id, bom.revisionId))
    .leftJoin(partNumbers, eq(bom.componentPartNumber, partNumbers.partNumber))
    .leftJoin(supplierPartProfiles, eq(bom.componentPartNumber, supplierPartProfiles.partNumber))
    .where(
      and(eq(modelRevisions.status, "ACTIVE"), eq(models.isActive, true), sql`${bom.componentPartNumber} is not null`)
    )
    .orderBy(asc(models.code), asc(bom.componentType), asc(bom.componentPartNumber));
}

export const materialRequestRoutes = new Elysia({ prefix: "/material-requests" }).use(authDerive);

materialRequestRoutes.get("/next-numbers", async ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
  const unauthorized = checkAuth({ user, set });
  if (unauthorized) return unauthorized;
  return { success: true, data: await buildNextVoucherNumbers() };
});

materialRequestRoutes.get("/catalog", async ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
  const unauthorized = checkAuth({ user, set });
  if (unauthorized) return unauthorized;
  const rows = await getActiveBomCatalogRows();

  return {
    success: true,
    data: rows.map((row) => ({
      ...row,
      part_number: String(row.part_number ?? "").toUpperCase(),
      active: true,
      uom_default: "PCS",
    })),
  };
});

materialRequestRoutes.get(
  "/",
  async ({
    query,
    user,
    set,
  }: {
    query: { status?: string; date_from?: string; date_to?: string };
    user: AccessTokenPayload | null;
    set: any;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;
    const workflowPolicy = await getMaterialWorkflowPolicy();
    const alertRecipients = await resolveMaterialRequestAlertRecipients(workflowPolicy);

    const conditions = [];
    const canViewAll = hasAnyRole(currentUser, ["STORE", "SUPERVISOR", "ADMIN"]);
    const reqUser = aliasedTable(users, "request_user");

    if (!canViewAll) {
      const sectionIds = await getUserSectionIdsForMaterialAccess(currentUser.userId);
      if (sectionIds.length) {
        conditions.push(
          or(
            eq(materialRequests.requestedByUserId, currentUser.userId),
            inArray(materialRequests.requestSectionId, sectionIds)
          )!
        );
      } else {
        conditions.push(eq(materialRequests.requestedByUserId, currentUser.userId));
      }
    }
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
        request_department_name: materialRequests.requestDepartmentName,
        requested_by_user_id: materialRequests.requestedByUserId,
        requested_by_name: reqUser.displayName,
        approved_by_user_id: materialRequests.approvedByUserId,
        dispatched_by_user_id: materialRequests.dispatchedByUserId,
        dispatched_at: materialRequests.dispatchedAt,
        issued_by_user_id: materialRequests.issuedByUserId,
        issued_at: materialRequests.issuedAt,
        received_by_user_id: materialRequests.receivedByUserId,
        production_ack_by_user_id: materialRequests.productionAcknowledgedByUserId,
        production_ack_at: materialRequests.productionAcknowledgedAt,
        forklift_ack_by_user_id: materialRequests.forkliftAcknowledgedByUserId,
        forklift_ack_at: materialRequests.forkliftAcknowledgedAt,
        created_at: materialRequests.createdAt,
        updated_at: materialRequests.updatedAt,
      })
      .from(materialRequests)
      .leftJoin(models, eq(models.id, materialRequests.modelId))
      .leftJoin(reqUser, eq(reqUser.id, materialRequests.requestedByUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(materialRequests.createdAt));

    const ids = rows.map((r) => r.id);
    let itemCounts: Record<string, number> = {};
    if (ids.length) {
      const counts = await db
        .select({
          material_request_id: materialRequestItems.materialRequestId,
          count: materialRequestItems.id,
        })
        .from(materialRequestItems)
        .where(inArray(materialRequestItems.materialRequestId, ids));
      itemCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.material_request_id] = (acc[row.material_request_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        item_count: itemCounts[row.id] ?? 0,
        alert_status: "UNTRACKED",
        alert_recipients: alertRecipients,
      })),
    };
  },
  {
    query: t.Object({
      status: t.Optional(t.String()),
      date_from: t.Optional(t.String()),
      date_to: t.Optional(t.String()),
    }),
  }
);

materialRequestRoutes.get("/pending", async ({ user, set }: { user: AccessTokenPayload | null; set: any }) => {
  const unauthorized = checkAuth({ user, set });
  if (unauthorized) return unauthorized;
  const currentUser = user as AccessTokenPayload;
  const policy = await getMaterialWorkflowPolicy();
  const alertRecipients = await resolveMaterialRequestAlertRecipients(policy);
  if (!canApproveMaterialRequestByWorkflow(currentUser, policy)) {
    return { success: true, data: [] };
  }

  const reqUser = aliasedTable(users, "request_user");

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
      request_department_name: materialRequests.requestDepartmentName,
      requested_by_user_id: materialRequests.requestedByUserId,
      requested_by_name: reqUser.displayName,
      approved_by_user_id: materialRequests.approvedByUserId,
      dispatched_by_user_id: materialRequests.dispatchedByUserId,
      dispatched_at: materialRequests.dispatchedAt,
      issued_by_user_id: materialRequests.issuedByUserId,
      issued_at: materialRequests.issuedAt,
      received_by_user_id: materialRequests.receivedByUserId,
      production_ack_by_user_id: materialRequests.productionAcknowledgedByUserId,
      production_ack_at: materialRequests.productionAcknowledgedAt,
      forklift_ack_by_user_id: materialRequests.forkliftAcknowledgedByUserId,
      forklift_ack_at: materialRequests.forkliftAcknowledgedAt,
      created_at: materialRequests.createdAt,
      updated_at: materialRequests.updatedAt,
    })
    .from(materialRequests)
    .leftJoin(models, eq(models.id, materialRequests.modelId))
    .leftJoin(reqUser, eq(reqUser.id, materialRequests.requestedByUserId))
    .where(eq(materialRequests.status, "REQUESTED"))
    .orderBy(asc(materialRequests.requestDate), asc(materialRequests.createdAt));

  return {
    success: true,
    data: rows.map((row) => ({
      ...row,
      alert_status: "UNTRACKED",
      alert_recipients: alertRecipients,
    })),
  };
});

// GET /material-requests/meta — register before /:id so "meta" is not treated as a request UUID
materialRequestRoutes.get("/meta", async ({ set, user }: { set: any; user: AccessTokenPayload | null }) => {
  const unauthorized = checkAuth({ user, set });
  if (unauthorized) return unauthorized;
  const currentUser = user as AccessTokenPayload;

  const meta = await resolveUserSectionMeta(currentUser);
  if (!meta) {
    set.status = 400;
    return {
      success: false,
      error_code: "SECTION_NOT_SET",
      message: "User section is not configured. Contact admin.",
    };
  }

  return { success: true, data: meta };
});

materialRequestRoutes.get(
  "/:id",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;
    const workflowPolicy = await getMaterialWorkflowPolicy();
    const alertRecipients = await resolveMaterialRequestAlertRecipients(workflowPolicy);
    const reqUser = aliasedTable(users, "request_user");

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
        request_department_name: materialRequests.requestDepartmentName,
        request_section_id: materialRequests.requestSectionId,
        requested_by_user_id: materialRequests.requestedByUserId,
        requested_by_name: reqUser.displayName,
        approved_by_user_id: materialRequests.approvedByUserId,
        dispatched_by_user_id: materialRequests.dispatchedByUserId,
        dispatched_at: materialRequests.dispatchedAt,
        issued_by_user_id: materialRequests.issuedByUserId,
        issued_at: materialRequests.issuedAt,
        received_by_user_id: materialRequests.receivedByUserId,
        production_ack_by_user_id: materialRequests.productionAcknowledgedByUserId,
        production_ack_at: materialRequests.productionAcknowledgedAt,
        forklift_ack_by_user_id: materialRequests.forkliftAcknowledgedByUserId,
        forklift_ack_at: materialRequests.forkliftAcknowledgedAt,
        created_at: materialRequests.createdAt,
        updated_at: materialRequests.updatedAt,
      })
      .from(materialRequests)
      .leftJoin(models, eq(models.id, materialRequests.modelId))
      .leftJoin(reqUser, eq(reqUser.id, materialRequests.requestedByUserId))
      .where(eq(materialRequests.id, params.id))
      .limit(1);

    if (!header) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }

    const canViewAll = hasAnyRole(currentUser, ["STORE", "SUPERVISOR", "ADMIN"]);
    if (!canViewAll) {
      const isOwner = header.requested_by_user_id === currentUser.userId;
      const sectionIds = await getUserSectionIdsForMaterialAccess(currentUser.userId);
      const inSameSection =
        Boolean(header.request_section_id) && sectionIds.includes(String(header.request_section_id));
      if (!isOwner && !inSameSection) {
        set.status = 403;
        return { success: false, error_code: "FORBIDDEN", message: "No permission to view this request" };
      }
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

    const allocations = await db
      .select({
        id: materialRequestItemIssues.id,
        material_request_item_id: materialRequestItemIssues.materialRequestItemId,
        do_number: materialRequestItemIssues.doNumber,
        issued_packs: materialRequestItemIssues.issuedPacks,
        issued_qty: materialRequestItemIssues.issuedQty,
        supplier_pack_size: materialRequestItemIssues.supplierPackSize,
        vendor_pack_size: materialRequestItemIssues.supplierPackSize,
        supplier_id: materialRequestItemIssues.supplierId,
        vendor_id: materialRequestItemIssues.supplierId,
        supplier_name: suppliers.name,
        vendor_name: suppliers.name,
        remarks: materialRequestItemIssues.remarks,
        gr_number: inventoryDo.grNumber,
        available_qty: sql<number>`${inventoryDo.qtyReceived} - ${inventoryDo.qtyIssued}`,
      })
      .from(materialRequestItemIssues)
      .leftJoin(suppliers, eq(suppliers.id, materialRequestItemIssues.supplierId))
      .leftJoin(inventoryDo, eq(inventoryDo.id, materialRequestItemIssues.doId))
      .where(eq(materialRequestItemIssues.materialRequestId, params.id))
      .orderBy(asc(materialRequestItemIssues.createdAt));

    const allocationsByItem = allocations.reduce<Record<string, typeof allocations>>((acc, row) => {
      const key = row.material_request_item_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    let issuedByName: string | null = null;
    if (header.issued_by_user_id) {
      const [issuedByUser] = await db
        .select({ display_name: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, header.issued_by_user_id))
        .limit(1);
      issuedByName = issuedByUser?.display_name ?? issuedByUser?.email ?? null;
    }
    let receivedByName: string | null = null;
    if (header.received_by_user_id) {
      const [receivedByUser] = await db
        .select({ display_name: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, header.received_by_user_id))
        .limit(1);
      receivedByName = receivedByUser?.display_name ?? receivedByUser?.email ?? null;
    }

    // Fetch handover batch number for QR code on voucher (optional if table not migrated yet)
    let handoverBatchNo: string | null = null;
    try {
      const [batchRow] = await db
        .select({ batch_no: handoverBatches.batchNo })
        .from(handoverBatches)
        .where(eq(handoverBatches.materialRequestId, params.id))
        .orderBy(asc(handoverBatches.createdAt))
        .limit(1);
      handoverBatchNo = batchRow?.batch_no ?? null;
    } catch {
      // relation "handover_batches" may not exist if migrations not run; detail view still works
    }

    return {
      success: true,
      data: {
        ...header,
        issued_by_name: issuedByName,
        received_by_name: receivedByName,
        received_at: header.received_by_user_id ? header.updated_at : null,
        handover_batch_no: handoverBatchNo,
        alert_status: "UNTRACKED",
        alert_recipients: alertRecipients,
        items: items.map((item) => ({
          ...item,
          issue_allocations: allocationsByItem[item.id] ?? [],
        })),
      },
    };
  }
);

// ═══════════════════════════════════════════════════════
//  Section & Cost Center resolution helper
// ═══════════════════════════════════════════════════════

const STRICT_SECTION_CC = process.env.STRICT_MR_SECTION_COSTCENTER === "true";

export async function resolveUserSectionMeta(currentUser: AccessTokenPayload) {
  // STORE role → fixed STORE section
  const isStore = currentUser.roles.includes("STORE");

  let section: { id: string; section_code: string; section_name: string } | null = null;

  if (isStore) {
    const [storeSection] = await db
      .select({
        id: sections.id,
        section_code: sections.sectionCode,
        section_name: sections.sectionName,
      })
      .from(sections)
      .where(and(eq(sections.sectionCode, "STORE"), eq(sections.isActive, true)))
      .limit(1);
    section = storeSection ?? null;
  } else {
    // Look up user_sections
    const [userSec] = await db
      .select({
        id: sections.id,
        section_code: sections.sectionCode,
        section_name: sections.sectionName,
      })
      .from(userSections)
      .innerJoin(sections, eq(sections.id, userSections.sectionId))
      .where(and(eq(userSections.userId, currentUser.userId), eq(sections.isActive, true)))
      .limit(1);
    section = userSec ?? null;
  }

  if (!section) return null;

  // Fetch the requesting user's department name
  let departmentName: string | null = (currentUser as any).department ?? null;

  if (!departmentName) {
    const [userDep] = await db
      .select({ name: departments.name })
      .from(userDepartments)
      .innerJoin(departments, eq(departments.id, userDepartments.departmentId))
      .where(and(eq(userDepartments.userId, currentUser.userId), eq(departments.isActive, true)))
      .limit(1);
    departmentName = userDep?.name ?? null;

    if (!departmentName) {
      const [requestUser] = await db
        .select({ department: users.department })
        .from(users)
        .where(eq(users.id, currentUser.userId))
        .limit(1);
      departmentName = requestUser?.department ?? null;
    }
  }

  // Fetch allowed cost centers for this section (now via cost_centers.section_id direct FK)
  const allowedCostCenters = await db
    .select({
      cost_center_id: costCenters.id,
      is_default: costCenters.isDefault,
      cost_code: costCenters.costCode,
      short_text: costCenters.shortText,
      group_code: costCenters.groupCode,
    })
    .from(costCenters)
    .where(and(eq(costCenters.sectionId, section.id), eq(costCenters.isActive, true)))
    .orderBy(asc(costCenters.groupCode), asc(costCenters.costCode));

  const defaultCC = allowedCostCenters.find((cc) => cc.is_default);

  return {
    section,
    department: departmentName ? { name: departmentName } : null,
    allowed_cost_centers: allowedCostCenters,
    default_cost_center_id: defaultCC?.cost_center_id ?? null,
  };
}

materialRequestRoutes.post(
  "/",
  async ({ body, set, user }: { body: any; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canCreateMaterialRequestByWorkflow(currentUser, workflowPolicy)) {
      set.status = 403;
      return {
        success: false,
        error_code: "FORBIDDEN",
        message: `Requires requestor role (${workflowPolicy.requestor_roles.join("/")})`,
      };
    }

    const items = (body.items ?? []).filter((item: any) => item.part_number?.trim());
    if (!items.length) {
      set.status = 400;
      return { success: false, error_code: "INVALID_INPUT", message: "At least one line item is required" };
    }

    const selectedModelId = body.model_id ? String(body.model_id).trim() : null;
    if (!selectedModelId) {
      set.status = 400;
      return { success: false, error_code: "INVALID_INPUT", message: "model_id is required" };
    }
    const partNos = items.map((item: any) =>
      String(item.part_number ?? "")
        .trim()
        .toUpperCase()
    );
    const catalogRows = await getActiveBomCatalogRows();
    const scopedCatalog = catalogRows.filter((row) => row.model_id === selectedModelId);

    if (selectedModelId && !scopedCatalog.length) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Model has no ACTIVE revision/BOM catalog" };
    }

    const catalogByPart = new Map<string, (typeof scopedCatalog)[number]>();
    for (const row of scopedCatalog) {
      const key = String(row.part_number ?? "").toUpperCase();
      if (!key) continue;
      if (!catalogByPart.has(key)) catalogByPart.set(key, row);
    }

    const missing = partNos.filter((p: string) => !catalogByPart.has(p));
    if (missing.length) {
      set.status = 400;
      return {
        success: false,
        error_code: "NOT_FOUND",
        message: `Component part number not found in BOM: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`,
      };
    }

    const invalidQtyLine = items.find((item: any) => {
      const qty = Number(item.requested_qty);
      return !Number.isFinite(qty) || qty <= 0;
    });
    if (invalidQtyLine) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_INPUT",
        message: `requested_qty must be greater than 0 for part ${String(invalidQtyLine.part_number ?? "")
          .trim()
          .toUpperCase()}`,
      };
    }

    // ─── Section & Cost Center resolution ────────────

    const meta = await resolveUserSectionMeta(currentUser);
    let requestSectionId: string | null = null;
    let requestCostCenterId: string | null = null;
    let sectionText: string | null = null;
    let costCenterText: string | null = null;

    if (meta) {
      requestSectionId = meta.section.id;
      sectionText = meta.section.section_name;

      if (body.cost_center_id) {
        // Validate against allowed list
        const allowed = meta.allowed_cost_centers.find((cc) => cc.cost_center_id === body.cost_center_id);
        if (!allowed) {
          set.status = 400;
          return {
            success: false,
            error_code: "INVALID_COST_CENTER",
            message: "Selected cost center is not allowed for your section",
          };
        }
        requestCostCenterId = allowed.cost_center_id;
        costCenterText = `${allowed.cost_code} ${allowed.short_text}`;
      } else if (meta.default_cost_center_id) {
        // Use default
        const defaultCC = meta.allowed_cost_centers.find((cc) => cc.cost_center_id === meta.default_cost_center_id);
        requestCostCenterId = meta.default_cost_center_id;
        costCenterText = defaultCC ? `${defaultCC.cost_code} ${defaultCC.short_text}` : null;
      } else if (STRICT_SECTION_CC) {
        // Strict mode: cost center must be set
        set.status = 400;
        return {
          success: false,
          error_code: "COST_CENTER_DEFAULT_NOT_SET",
          message: "No cost center provided and no default is configured for your section",
        };
      }
      // Non-strict: proceed with null cost center for backward compat
    } else if (STRICT_SECTION_CC) {
      // Strict mode: section is mandatory
      set.status = 400;
      return {
        success: false,
        error_code: "SECTION_NOT_SET",
        message: "User section is not configured. Contact admin.",
      };
    }
    // Non-strict: meta is null, proceed with null FK columns for backward compat

    const nextNumbers = await buildNextVoucherNumbers();
    const requestNo = body.request_no?.trim() || nextNumbers.request_no;
    const dmiNo = body.dmi_no?.trim() || nextNumbers.dmi_no;
    const requestDate = body.request_date ?? nextNumbers.request_date;
    const [requestUser] = await db
      .select({ display_name: users.displayName, department: users.department })
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1);
    const departmentSnapshot = requestUser?.department ?? meta?.department?.name ?? null;
    const sectionAuto = [requestUser?.display_name, requestUser?.department].filter(Boolean).join(" / ");

    try {
      const created = await db.transaction(async (tx) => {
        const [header] = await tx
          .insert(materialRequests)
          .values({
            requestNo,
            dmiNo,
            requestDate,
            modelId: selectedModelId,
            section: sectionText || body.section?.trim() || sectionAuto || null,
            costCenter: costCenterText || body.cost_center?.trim() || null,
            requestSectionId,
            requestCostCenterId,
            requestDepartmentName: departmentSnapshot,
            processName: body.process_name?.trim() || null,
            requestedByUserId: currentUser.userId,
            receivedByUserId: body.received_by_user_id ?? null,
            status: "REQUESTED",
            remarks: body.remarks?.trim() || null,
          })
          .returning({
            id: materialRequests.id,
            request_no: materialRequests.requestNo,
            dmi_no: materialRequests.dmiNo,
            request_date: materialRequests.requestDate,
            model_id: materialRequests.modelId,
            section: materialRequests.section,
            cost_center: materialRequests.costCenter,
            request_section_id: materialRequests.requestSectionId,
            request_cost_center_id: materialRequests.requestCostCenterId,
            request_department_name: materialRequests.requestDepartmentName,
            process_name: materialRequests.processName,
            status: materialRequests.status,
            remarks: materialRequests.remarks,
          });

        await tx.insert(materialRequestItems).values(
          items.map((item: any, idx: number) => ({
            materialRequestId: header.id,
            itemNo: idx + 1,
            partNumber: item.part_number.trim().toUpperCase(),
            description:
              item.description?.trim() ??
              catalogByPart.get(item.part_number.trim().toUpperCase())?.component_name ??
              null,
            requestedQty: item.requested_qty ?? null,
            issuedQty: item.issued_qty ?? null,
            uom: item.uom?.trim() || "PCS",
            doNumber: item.do_number?.trim() || null,
            lotNumber: item.lot_number?.trim() || null,
            remarks: item.remarks?.trim() || null,
          }))
        );

        return header;
      });

      await auditConfigChange(currentUser.userId, "MATERIAL_REQUEST", created.id, "CREATE", null, {
        request_no: created.request_no,
        status: created.status,
      });
      publishMaterialRequestUpdate({
        event_type: "CREATED",
        id: created.id,
        status: created.status,
        request_no: created.request_no,
        dmi_no: created.dmi_no,
      });

      const alertRecipients = await resolveMaterialRequestAlertRecipients(workflowPolicy);
      const alertStatus = await sendAlertEmail({
        templateId: "material_request_created",
        recipients: alertRecipients,
        context: {
          requestNo: created.request_no,
          dmiNo: created.dmi_no,
          actorName: requestUser?.display_name ?? currentUser.username,
        },
      });
      return {
        success: true,
        data: {
          ...created,
          alert_status: alertStatus,
          alert_recipients: alertRecipients,
        },
      };
    } catch (error) {
      set.status = 500;
      return { success: false, error_code: parseErrorCode(error), message: "Failed to create material request" };
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
      cost_center_id: t.Optional(t.String()),
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

materialRequestRoutes.get(
  "/:id/issue-options",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;
    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canStoreHandleIssue(currentUser, workflowPolicy)) {
      set.status = 403;
      return {
        success: false,
        error_code: "FORBIDDEN",
        message: "Requires STORE/SUPERVISOR role or workflow approver permission",
      };
    }

    const [header] = await db
      .select({
        id: materialRequests.id,
        status: materialRequests.status,
      })
      .from(materialRequests)
      .where(eq(materialRequests.id, params.id))
      .limit(1);
    if (!header) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }

    const items = await db
      .select({
        id: materialRequestItems.id,
        item_no: materialRequestItems.itemNo,
        part_number: materialRequestItems.partNumber,
        requested_qty: materialRequestItems.requestedQty,
        issued_qty: materialRequestItems.issuedQty,
      })
      .from(materialRequestItems)
      .where(eq(materialRequestItems.materialRequestId, params.id))
      .orderBy(asc(materialRequestItems.itemNo));

    const partNumbers = Array.from(new Set(items.map((item) => item.part_number).filter(Boolean)));
    const stockRows =
      partNumbers.length === 0
        ? []
        : await db
            .select({
              part_number: inventoryDo.partNumber,
              do_id: inventoryDo.id,
              do_number: inventoryDo.doNumber,
              supplier_id: inventoryDo.supplierId,
              vendor_id: inventoryDo.supplierId,
              supplier_name: suppliers.name,
              vendor_name: suppliers.name,
              qty_received: inventoryDo.qtyReceived,
              qty_issued: inventoryDo.qtyIssued,
              pack_size: sql<number>`COALESCE(MAX(${supplierPacks.packQtyTotal}), 0)::int`,
              gr_number: inventoryDo.grNumber,
            })
            .from(inventoryDo)
            .leftJoin(suppliers, eq(suppliers.id, inventoryDo.supplierId))
            .leftJoin(supplierPacks, eq(supplierPacks.doId, inventoryDo.id))
            .where(inArray(inventoryDo.partNumber, partNumbers))
            .groupBy(
              inventoryDo.id,
              inventoryDo.partNumber,
              inventoryDo.doNumber,
              inventoryDo.supplierId,
              suppliers.name,
              inventoryDo.qtyReceived,
              inventoryDo.qtyIssued,
              inventoryDo.grNumber
            )
            .orderBy(asc(inventoryDo.partNumber), asc(inventoryDo.doNumber));

    const stockByPart = stockRows.reduce<Record<string, any[]>>((acc, row) => {
      const partNo = String(row.part_number ?? "").toUpperCase();
      if (!partNo) return acc;
      const availableQty = Math.max(row.qty_received ?? 0, 0);
      const packSize = row.pack_size && row.pack_size > 0 ? row.pack_size : 1;
      if (!acc[partNo]) acc[partNo] = [];
      acc[partNo].push({
        do_id: row.do_id,
        do_number: row.do_number,
        gr_number: row.gr_number,
        supplier_id: row.supplier_id,
        vendor_id: row.vendor_id ?? row.supplier_id,
        supplier_name: row.supplier_name,
        vendor_name: row.vendor_name ?? row.supplier_name,
        pack_size: packSize,
        available_qty: availableQty,
        available_packs: Math.floor(availableQty / packSize),
      });
      return acc;
    }, {});

    const profileRows =
      partNumbers.length === 0
        ? []
        : await db
            .select({
              part_number: supplierPartProfiles.partNumber,
              supplier_id: supplierPartProfiles.supplierId,
              vendor_id: supplierPartProfiles.supplierId,
              supplier_name: suppliers.name,
              vendor_name: suppliers.name,
              supplier_part_number: supplierPartProfiles.supplierPartNumber,
              vendor_part_number: supplierPartProfiles.supplierPartNumber,
              default_pack_qty: supplierPartProfiles.defaultPackQty,
            })
            .from(supplierPartProfiles)
            .innerJoin(suppliers, eq(suppliers.id, supplierPartProfiles.supplierId))
            .where(
              and(
                inArray(supplierPartProfiles.partNumber, partNumbers),
                eq(supplierPartProfiles.isActive, true),
                eq(suppliers.isActive, true)
              )
            )
            .orderBy(
              asc(supplierPartProfiles.partNumber),
              asc(suppliers.name),
              asc(supplierPartProfiles.supplierPartNumber)
            );

    const suppliersByPart = profileRows.reduce<Record<string, any[]>>((acc, row) => {
      const partNo = String(row.part_number ?? "").toUpperCase();
      if (!partNo) return acc;
      if (!acc[partNo]) acc[partNo] = [];
      acc[partNo].push({
        supplier_id: row.supplier_id,
        vendor_id: row.vendor_id ?? row.supplier_id,
        supplier_name: row.supplier_name,
        vendor_name: row.vendor_name ?? row.supplier_name,
        supplier_part_number: row.supplier_part_number || null,
        vendor_part_number: row.vendor_part_number || row.supplier_part_number || null,
        default_pack_qty: row.default_pack_qty ?? null,
      });
      return acc;
    }, {});

    return {
      success: true,
      data: {
        request_id: header.id,
        status: header.status,
        items: items.map((item) => ({
          item_id: item.id,
          item_no: item.item_no,
          part_number: item.part_number,
          requested_qty: item.requested_qty ?? 0,
          already_issued_qty: item.issued_qty ?? 0,
          issue_options: stockByPart[String(item.part_number ?? "").toUpperCase()] ?? [],
          supplier_options: suppliersByPart[String(item.part_number ?? "").toUpperCase()] ?? [],
          vendor_options: suppliersByPart[String(item.part_number ?? "").toUpperCase()] ?? [],
        })),
      },
    };
  }
);

materialRequestRoutes.post(
  "/:id/approve",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const blocked = checkRole(["STORE", "SUPERVISOR", "ADMIN"])({ user, set });
    if (blocked) return blocked;

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "REQUESTED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only REQUESTED can be approved" };
    }

    await db
      .update(materialRequests)
      .set({
        status: "APPROVED",
        approvedByUserId: currentUser.userId,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
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

    const requestorRecipients = await resolveRecipientByUserId(existing.requestedByUserId);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_approved",
      recipients: requestorRecipients,
      context: {
        requestNo: existing.requestNo,
        dmiNo: existing.dmiNo,
        actorName,
      },
    });

    return { success: true, data: { id: params.id, status: "APPROVED", alert_status: alertStatus } };
  }
);

materialRequestRoutes.post(
  "/:id/issue-with-allocation",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: {
      dmi_no?: string;
      remarks?: string;
      allocations: Array<{
        item_id: string;
        part_number: string;
        do_number: string;
        supplier_id?: string;
        vendor_id?: string;
        issued_packs: number;
        issued_qty?: number;
        supplier_pack_size?: number;
        vendor_pack_size?: number;
        remarks?: string;
      }>;
    };
    set: any;
    user: AccessTokenPayload | null;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canStoreHandleIssue(currentUser, workflowPolicy)) {
      set.status = 403;
      return {
        success: false,
        error_code: "FORBIDDEN",
        message: "Requires STORE/SUPERVISOR role or workflow approver permission",
      };
    }

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "APPROVED" && existing.status !== "REQUESTED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only REQUESTED or APPROVED can be issued" };
    }

    const lines = (body.allocations ?? []).filter(
      (line) => line?.item_id && line?.part_number && line?.do_number && Number(line.issued_packs) > 0
    );
    if (!lines.length) {
      set.status = 400;
      return { success: false, error_code: "INVALID_INPUT", message: "At least one allocation line is required" };
    }

    const items = await db
      .select({
        id: materialRequestItems.id,
        item_no: materialRequestItems.itemNo,
        part_number: materialRequestItems.partNumber,
        requested_qty: materialRequestItems.requestedQty,
      })
      .from(materialRequestItems)
      .where(eq(materialRequestItems.materialRequestId, params.id));
    const itemById = new Map(items.map((item) => [item.id, item]));

    const doNumbers = Array.from(new Set(lines.map((line) => String(line.do_number).trim().toUpperCase())));
    const doRows = await db
      .select({
        id: inventoryDo.id,
        do_number: inventoryDo.doNumber,
        part_number: inventoryDo.partNumber,
        supplier_id: inventoryDo.supplierId,
        vendor_id: inventoryDo.supplierId,
        pack_size: sql<number>`COALESCE(MAX(${supplierPacks.packQtyTotal}), 0)::int`,
      })
      .from(inventoryDo)
      .leftJoin(supplierPacks, eq(supplierPacks.doId, inventoryDo.id))
      .where(inArray(inventoryDo.doNumber, doNumbers))
      .groupBy(inventoryDo.id, inventoryDo.doNumber, inventoryDo.partNumber, inventoryDo.supplierId);
    const doByNumber = new Map(doRows.map((row) => [String(row.do_number).toUpperCase(), row]));

    const itemTotals = new Map<string, number>();
    const normalized = lines.map((line) => {
      const item = itemById.get(line.item_id);
      if (!item) {
        const err = new Error("Invalid item_id in allocation");
        (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
        throw err;
      }
      const allocPartNumber = String(line.part_number ?? "")
        .trim()
        .toUpperCase();
      if (!allocPartNumber || allocPartNumber !== String(item.part_number ?? "").toUpperCase()) {
        const err = new Error(`Allocation part number mismatch for item ${item.item_no}`);
        (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
        throw err;
      }
      const doNumber = String(line.do_number).trim().toUpperCase();
      const doRow = doByNumber.get(doNumber);
      if (doRow && String(doRow.part_number ?? "").toUpperCase() !== String(item.part_number ?? "").toUpperCase()) {
        const err = new Error(`DO ${doNumber} does not match part number ${item.part_number}`);
        (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
        throw err;
      }
      const packSize = Number(line.vendor_pack_size ?? line.supplier_pack_size ?? doRow?.pack_size ?? 0);
      const issuedPacks = Number(line.issued_packs);
      if (!Number.isFinite(packSize) || packSize <= 0 || !Number.isFinite(issuedPacks) || issuedPacks <= 0) {
        const err = new Error("Invalid pack size or issued packs");
        (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
        throw err;
      }
      const issuedQty = Number(line.issued_qty ?? issuedPacks * packSize);
      if (issuedQty !== issuedPacks * packSize) {
        const err = new Error("issued_qty must equal issued_packs * vendor_pack_size");
        (err as Error & { error_code?: string }).error_code = "INVALID_INPUT";
        throw err;
      }
      itemTotals.set(item.id, (itemTotals.get(item.id) ?? 0) + issuedQty);
      return {
        itemId: item.id,
        partNumber: item.part_number,
        doId: doRow?.id ?? null,
        doNumber,
        supplierId: line.vendor_id ?? line.supplier_id ?? doRow?.vendor_id ?? doRow?.supplier_id ?? null,
        supplierPackSize: packSize,
        issuedPacks,
        issuedQty,
        remarks: line.remarks?.trim() || null,
      };
    });

    for (const item of items) {
      const requestedQty = item.requested_qty ?? 0;
      const issuedQty = itemTotals.get(item.id) ?? 0;
      if (requestedQty > 0 && issuedQty < requestedQty) {
        set.status = 400;
        return {
          success: false,
          error_code: "UNDER_ISSUE",
          message: `Item ${item.item_no} (${item.part_number}) issued qty is lower than requested`,
        };
      }
    }

    try {
      await db.transaction(async (tx) => {
        const groupedByItem = normalized.reduce<Record<string, typeof normalized>>((acc, line) => {
          if (!acc[line.itemId]) acc[line.itemId] = [];
          acc[line.itemId].push(line);
          return acc;
        }, {});

        for (const item of items) {
          const linesByItem = groupedByItem[item.id] ?? [];
          const totalQty = linesByItem.reduce((sum, line) => sum + line.issuedQty, 0);
          const doSummary =
            linesByItem.length === 0 ? null : Array.from(new Set(linesByItem.map((line) => line.doNumber))).join(", ");
          await tx
            .update(materialRequestItems)
            .set({
              issuedQty: totalQty || null,
              doNumber: doSummary,
              updatedAt: new Date(),
            })
            .where(eq(materialRequestItems.id, item.id));
        }

        await tx.delete(materialRequestItemIssues).where(eq(materialRequestItemIssues.materialRequestId, params.id));
        await tx.insert(materialRequestItemIssues).values(
          normalized.map((line) => ({
            materialRequestId: params.id,
            materialRequestItemId: line.itemId,
            partNumber: String(line.partNumber ?? "").toUpperCase(),
            supplierId: line.supplierId,
            doId: line.doId,
            doNumber: line.doNumber,
            supplierPackSize: line.supplierPackSize,
            issuedPacks: line.issuedPacks,
            issuedQty: line.issuedQty,
            remarks: line.remarks,
          }))
        );

        await tx
          .update(materialRequests)
          .set({
            status: "ISSUED",
            dmiNo: body.dmi_no?.trim() || existing.dmiNo,
            remarks: body.remarks?.trim() || existing.remarks,
            approvedByUserId: existing.approvedByUserId ?? currentUser.userId,
            dispatchedByUserId: existing.dispatchedByUserId ?? currentUser.userId,
            dispatchedAt: existing.dispatchedAt ?? new Date(),
            issuedByUserId: currentUser.userId,
            issuedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(materialRequests.id, params.id));

        // Create the handover batch
        const dateStr = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
        const batchNo = `HB-${dateStr}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`;

        const [batch] = await tx
          .insert(handoverBatches)
          .values({
            batchNo,
            materialRequestId: params.id,
            issuedByUserId: currentUser.userId,
            expectedItemCount: normalized.length,
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Map the newly inserted item issues to batch items
        // We need the inserted IDs, so we re-select them. Since this is in tx,
        // it's safe to select by materialRequestId = params.id
        const currentIssues = await tx
          .select({
            id: materialRequestItemIssues.id,
            partNumber: materialRequestItemIssues.partNumber,
            doNumber: materialRequestItemIssues.doNumber,
            issuedQty: materialRequestItemIssues.issuedQty,
            issuedPacks: materialRequestItemIssues.issuedPacks,
          })
          .from(materialRequestItemIssues)
          .where(eq(materialRequestItemIssues.materialRequestId, params.id));

        if (currentIssues.length > 0) {
          await tx.insert(handoverBatchItems).values(
            currentIssues.map((issue) => ({
              handoverBatchId: batch.id,
              materialRequestItemIssueId: issue.id,
              partNumber: issue.partNumber,
              doNumber: issue.doNumber,
              expectedQty: issue.issuedQty,
              expectedPacks: issue.issuedPacks,
              scannedQty: 0,
              scannedPacks: 0,
              status: "PENDING",
              createdAt: new Date(),
            }))
          );
        }
      });

      await auditConfigChange(
        currentUser.userId,
        "MATERIAL_REQUEST",
        params.id,
        "ISSUE",
        { status: existing.status, dmi_no: existing.dmiNo ?? null },
        { status: "ISSUED", dmi_no: body.dmi_no ?? existing.dmiNo ?? null, allocation_count: lines.length }
      );
      publishMaterialRequestUpdate({
        event_type: "ISSUED",
        id: params.id,
        status: "ISSUED",
        request_no: existing.requestNo,
        dmi_no: body.dmi_no ?? existing.dmiNo ?? null,
      });

      const requestorRecipients = await resolveRecipientByUserId(existing.requestedByUserId);
      const actorName = await resolveActorName(currentUser.userId);
      const alertStatus = await sendAlertEmail({
        templateId: "material_request_issued",
        recipients: requestorRecipients,
        context: {
          requestNo: existing.requestNo,
          dmiNo: body.dmi_no ?? existing.dmiNo ?? null,
          actorName,
        },
      });

      return { success: true, data: { id: params.id, status: "ISSUED", alert_status: alertStatus } };
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        error_code: parseErrorCode(error),
        message: (error as Error).message || "Failed to issue material request",
      };
    }
  },
  {
    body: t.Object({
      dmi_no: t.Optional(t.String()),
      remarks: t.Optional(t.String()),
      allocations: t.Array(
        t.Object({
          item_id: t.String(),
          part_number: t.String(),
          do_number: t.String(),
          supplier_id: t.Optional(t.String()),
          vendor_id: t.Optional(t.String()),
          issued_packs: t.Number(),
          issued_qty: t.Optional(t.Number()),
          supplier_pack_size: t.Optional(t.Number()),
          vendor_pack_size: t.Optional(t.Number()),
          remarks: t.Optional(t.String()),
        })
      ),
    }),
  }
);

materialRequestRoutes.post(
  "/:id/dispatch-to-forklift",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canApproveMaterialRequestByWorkflow(currentUser, workflowPolicy)) {
      set.status = 403;
      return { success: false, error_code: "FORBIDDEN", message: "Current user is not configured as approver" };
    }

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "APPROVED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only APPROVED can be dispatched to forklift" };
    }

    await db
      .update(materialRequests)
      .set({
        dispatchedByUserId: currentUser.userId,
        dispatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "DISPATCH_TO_FORKLIFT",
      { status: existing.status, dispatched_at: existing.dispatchedAt ?? null },
      { status: existing.status, dispatched_at: new Date().toISOString() }
    );
    publishMaterialRequestUpdate({
      event_type: "DISPATCHED_TO_FORKLIFT",
      id: params.id,
      status: existing.status,
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });

    const forkliftRecipients = await resolveRecipientsByRoles(["OPERATOR", "STORE"]);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_dispatched",
      recipients: forkliftRecipients,
      context: {
        requestNo: existing.requestNo,
        dmiNo: existing.dmiNo,
        actorName,
      },
    });

    return {
      success: true,
      data: { id: params.id, status: existing.status, dispatched: true, alert_status: alertStatus },
    };
  }
);

materialRequestRoutes.post(
  "/:id/confirm-receipt",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: {
      scans: Array<{ part_number: string; do_number: string; scan_data: string; pack_count?: number }>;
      remarks?: string;
    };
    set: any;
    user: AccessTokenPayload | null;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;
    if (!hasAnyRole(currentUser, ["PRODUCTION", "OPERATOR", "ADMIN"])) {
      set.status = 403;
      return { success: false, error_code: "FORBIDDEN", message: "Requires PRODUCTION/OPERATOR role" };
    }

    const scans = (body.scans ?? [])
      .map((row) => ({
        part_number: String(row.part_number ?? "")
          .trim()
          .toUpperCase(),
        do_number: String(row.do_number ?? "")
          .trim()
          .toUpperCase(),
        scan_data: String(row.scan_data ?? "").trim(),
        pack_count: Math.max(1, Math.floor(Number(row.pack_count ?? 1))),
      }))
      .filter((row) => row.part_number && row.do_number && row.scan_data);

    if (!scans.length) {
      set.status = 400;
      return { success: false, error_code: "INVALID_INPUT", message: "At least one scan is required" };
    }

    const [header] = await db
      .select({
        id: materialRequests.id,
        request_no: materialRequests.requestNo,
        dmi_no: materialRequests.dmiNo,
        status: materialRequests.status,
        received_by_user_id: materialRequests.receivedByUserId,
        dispatched_by_user_id: materialRequests.dispatchedByUserId,
        production_ack_at: materialRequests.productionAcknowledgedAt,
        remarks: materialRequests.remarks,
      })
      .from(materialRequests)
      .where(eq(materialRequests.id, params.id))
      .limit(1);

    if (!header) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }

    if (header.status !== "ISSUED") {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "Only ISSUED can be confirmed by production receipt",
      };
    }
    if (header.production_ack_at) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "Production acknowledgement already completed",
      };
    }

    const issuedRows = await db
      .select({
        part_number: materialRequestItemIssues.partNumber,
        do_number: materialRequestItemIssues.doNumber,
      })
      .from(materialRequestItemIssues)
      .where(eq(materialRequestItemIssues.materialRequestId, params.id));

    const issuedKey = new Set(
      issuedRows.map((row) => `${String(row.part_number).toUpperCase()}|${String(row.do_number).toUpperCase()}`)
    );
    if (!issuedKey.size) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "This request has no issued allocation to receive",
      };
    }

    for (const scan of scans) {
      const key = `${scan.part_number}|${scan.do_number}`;
      if (!issuedKey.has(key)) {
        set.status = 400;
        return {
          success: false,
          error_code: "INVALID_INPUT",
          message: `Scan allocation mismatch for ${scan.part_number} / DO ${scan.do_number}`,
        };
      }
    }

    let saved = 0;
    try {
      saved = await db.transaction(async (tx) => {
        let insertedCount = 0;
        for (const scan of scans) {
          const [doRow] = await tx
            .select({
              id: inventoryDo.id,
            })
            .from(inventoryDo)
            .where(
              and(
                sql`upper(${inventoryDo.doNumber}) = ${scan.do_number}`,
                sql`upper(${inventoryDo.partNumber}) = ${scan.part_number}`
              )
            )
            .limit(1);

          const [pack] = await tx
            .select({
              id: supplierPacks.id,
              unit_id: supplierPacks.unitId,
              do_id: supplierPacks.doId,
              parsed_data: supplierPacks.parsedData,
            })
            .from(supplierPacks)
            .where(eq(supplierPacks.packBarcodeRaw, scan.scan_data))
            .limit(1);

          if (pack?.do_id && doRow?.id && pack.do_id !== doRow.id) {
            throw new Error(`Scanned barcode does not belong to DO ${scan.do_number}`);
          }

          await tx.insert(component2dScans).values({
            inventoryDoId: doRow?.id ?? pack?.do_id ?? null,
            supplierPackId: pack?.id ?? null,
            unitId: pack?.unit_id ?? null,
            scanData: scan.scan_data,
            parsedData: pack?.parsed_data ?? null,
            packCount: scan.pack_count,
          });
          insertedCount += scan.pack_count;
        }

        const mergedRemarks = [header.remarks, body.remarks].filter(Boolean).join(" | ") || null;
        await tx
          .update(materialRequests)
          .set({
            receivedByUserId: currentUser.userId,
            productionAcknowledgedByUserId: currentUser.userId,
            productionAcknowledgedAt: new Date(),
            remarks: mergedRemarks,
            updatedAt: new Date(),
          })
          .where(eq(materialRequests.id, params.id));

        return insertedCount;
      });
    } catch (error) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_INPUT",
        message: (error as Error).message || "Failed to confirm receipt",
      };
    }

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "CONFIRM_RECEIPT",
      { status: header.status, received_by_user_id: header.received_by_user_id ?? null },
      {
        status: header.status,
        received_by_user_id: currentUser.userId,
        production_ack_by_user_id: currentUser.userId,
        scans_saved: saved,
      }
    );

    publishMaterialRequestUpdate({
      event_type: "RECEIPT_CONFIRMED",
      id: params.id,
      status: "ISSUED",
    });

    const forkliftRecipients = await resolveRecipientByUserId(header.dispatched_by_user_id);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_receipt_confirmed",
      recipients: forkliftRecipients,
      context: {
        requestNo: header.request_no,
        dmiNo: header.dmi_no,
        actorName,
      },
    });

    return {
      success: true,
      data: {
        id: params.id,
        status: "ISSUED",
        received_by_user_id: currentUser.userId,
        received_at: new Date().toISOString(),
        scans_saved: saved,
        alert_status: alertStatus,
      },
    };
  },
  {
    body: t.Object({
      scans: t.Array(
        t.Object({
          part_number: t.String(),
          do_number: t.String(),
          scan_data: t.String(),
          pack_count: t.Optional(t.Number()),
        })
      ),
      remarks: t.Optional(t.String()),
    }),
  }
);

materialRequestRoutes.post(
  "/:id/withdraw",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { reason?: string };
    set: any;
    user: AccessTokenPayload | null;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (!["REQUESTED", "APPROVED"].includes(existing.status)) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "Only REQUESTED or APPROVED can be withdrawn",
      };
    }
    if (existing.dispatchedAt) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "Cannot withdraw after dispatch to forklift",
      };
    }

    const isOwner = existing.requestedByUserId === currentUser.userId;
    const isAdmin = hasAnyRole(currentUser, ["ADMIN"]);
    if (!isOwner && !isAdmin) {
      set.status = 403;
      return {
        success: false,
        error_code: "FORBIDDEN",
        message: "Only request owner or ADMIN can withdraw this request",
      };
    }

    const reason = String(body.reason ?? "").trim();
    const actorName = await resolveActorName(currentUser.userId);
    await db
      .update(materialRequests)
      .set({
        status: "CANCELLED",
        remarks: reason ? `${existing.remarks ? `${existing.remarks}\n` : ""}[WITHDRAW] ${reason}` : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "WITHDRAW",
      { status: existing.status, dispatched_at: existing.dispatchedAt ?? null },
      { status: "CANCELLED", reason: reason || null }
    );
    publishMaterialRequestUpdate({
      event_type: "WITHDRAWN",
      id: params.id,
      status: "CANCELLED",
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });

    const workflowPolicy = await getMaterialWorkflowPolicy();
    const workflowRecipients = await resolveMaterialRequestAlertRecipients(workflowPolicy);
    const requestorRecipients = await resolveRecipientByUserId(existing.requestedByUserId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_withdrawn",
      recipients: mergeAlertRecipients(workflowRecipients, requestorRecipients),
      context: {
        requestNo: existing.requestNo,
        dmiNo: existing.dmiNo,
        actorName,
        reason,
      },
    });

    return { success: true, data: { id: params.id, status: "CANCELLED", alert_status: alertStatus } };
  },
  {
    body: t.Object({
      reason: t.Optional(t.String()),
    }),
  }
);

materialRequestRoutes.post(
  "/:id/reject",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { reason?: string };
    set: any;
    user: AccessTokenPayload | null;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canApproveMaterialRequestByWorkflow(currentUser, workflowPolicy)) {
      set.status = 403;
      return { success: false, error_code: "FORBIDDEN", message: "Current user is not configured as level-2 approver" };
    }

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "REQUESTED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only REQUESTED can be rejected" };
    }

    await db
      .update(materialRequests)
      .set({
        status: "REJECTED",
        remarks: body.reason
          ? `${existing.remarks ? `${existing.remarks}\n` : ""}[REJECT] ${body.reason}`
          : existing.remarks,
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "REJECT",
      { status: existing.status },
      { status: "REJECTED", reason: body.reason ?? null }
    );
    publishMaterialRequestUpdate({
      event_type: "REJECTED",
      id: params.id,
      status: "REJECTED",
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });

    const requestorRecipients = await resolveRecipientByUserId(existing.requestedByUserId);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_rejected",
      recipients: requestorRecipients,
      context: {
        requestNo: existing.requestNo,
        dmiNo: existing.dmiNo,
        actorName,
        reason: body.reason ?? "",
      },
    });

    return { success: true, data: { id: params.id, status: "REJECTED", alert_status: alertStatus } };
  },
  {
    body: t.Object({
      reason: t.Optional(t.String()),
    }),
  }
);

materialRequestRoutes.post(
  "/:id/ack-forklift",
  async ({ params, set, user }: { params: { id: string }; set: any; user: AccessTokenPayload | null }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;
    if (!hasAnyRole(currentUser, ["STORE", "OPERATOR", "SUPERVISOR", "ADMIN"])) {
      set.status = 403;
      return { success: false, error_code: "FORBIDDEN", message: "Requires forklift/store role" };
    }

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "ISSUED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only ISSUED can be forklift-acknowledged" };
    }
    if (!existing.productionAcknowledgedAt) {
      set.status = 400;
      return {
        success: false,
        error_code: "INVALID_STATUS",
        message: "Production acknowledgement is required before forklift acknowledgement",
      };
    }

    await db
      .update(materialRequests)
      .set({
        forkliftAcknowledgedByUserId: currentUser.userId,
        forkliftAcknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "ACK_FORKLIFT",
      {
        status: existing.status,
        forklift_ack_by_user_id: existing.forkliftAcknowledgedByUserId ?? null,
        forklift_ack_at: existing.forkliftAcknowledgedAt ?? null,
      },
      {
        status: existing.status,
        forklift_ack_by_user_id: currentUser.userId,
        forklift_ack_at: new Date().toISOString(),
      }
    );
    publishMaterialRequestUpdate({
      event_type: "FORKLIFT_ACKNOWLEDGED",
      id: params.id,
      status: existing.status,
      request_no: existing.requestNo,
      dmi_no: existing.dmiNo,
    });

    const storeRecipients = await resolveRecipientsByRoles(["STORE", "SUPERVISOR", "ADMIN"]);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_forklift_ack",
      recipients: storeRecipients,
      context: {
        requestNo: existing.requestNo,
        dmiNo: existing.dmiNo,
        actorName,
      },
    });

    return {
      success: true,
      data: { id: params.id, status: existing.status, forklift_acknowledged: true, alert_status: alertStatus },
    };
  }
);

materialRequestRoutes.post(
  "/:id/issue",
  async ({
    params,
    body,
    set,
    user,
  }: {
    params: { id: string };
    body: { dmi_no?: string; remarks?: string };
    set: any;
    user: AccessTokenPayload | null;
  }) => {
    const unauthorized = checkAuth({ user, set });
    if (unauthorized) return unauthorized;
    const currentUser = user as AccessTokenPayload;

    const workflowPolicy = await getMaterialWorkflowPolicy();
    if (!canApproveMaterialRequestByWorkflow(currentUser, workflowPolicy)) {
      set.status = 403;
      return { success: false, error_code: "FORBIDDEN", message: "Current user is not configured as level-2 approver" };
    }

    const [existing] = await db.select().from(materialRequests).where(eq(materialRequests.id, params.id)).limit(1);
    if (!existing) {
      set.status = 404;
      return { success: false, error_code: "NOT_FOUND", message: "Requested record was not found" };
    }
    if (existing.status !== "APPROVED") {
      set.status = 400;
      return { success: false, error_code: "INVALID_STATUS", message: "Only APPROVED can be issued" };
    }

    await db
      .update(materialRequests)
      .set({
        status: "ISSUED",
        dmiNo: body.dmi_no?.trim() || existing.dmiNo,
        remarks: body.remarks?.trim() || existing.remarks,
        issuedByUserId: currentUser.userId,
        issuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(materialRequests.id, params.id));

    await auditConfigChange(
      currentUser.userId,
      "MATERIAL_REQUEST",
      params.id,
      "ISSUE",
      { status: existing.status, dmi_no: existing.dmiNo ?? null },
      { status: "ISSUED", dmi_no: body.dmi_no ?? existing.dmiNo ?? null }
    );
    publishMaterialRequestUpdate({
      event_type: "ISSUED",
      id: params.id,
      status: "ISSUED",
      request_no: existing.requestNo,
      dmi_no: body.dmi_no ?? existing.dmiNo ?? null,
    });

    const requestorRecipients = await resolveRecipientByUserId(existing.requestedByUserId);
    const actorName = await resolveActorName(currentUser.userId);
    const alertStatus = await sendAlertEmail({
      templateId: "material_request_issued",
      recipients: requestorRecipients,
      context: {
        requestNo: existing.requestNo,
        dmiNo: body.dmi_no ?? existing.dmiNo ?? null,
        actorName,
      },
    });

    return { success: true, data: { id: params.id, status: "ISSUED", alert_status: alertStatus } };
  },
  {
    body: t.Object({
      dmi_no: t.Optional(t.String()),
      remarks: t.Optional(t.String()),
    }),
  }
);
