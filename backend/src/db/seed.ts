import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, inArray } from "drizzle-orm";
import { hash } from "bcryptjs";
import { users, roles, userRoles, permissions, rolePermissions } from "./schema/auth";
import {
  costCenters,
  sections,
  departments,
  userSections,
  userDepartments,
  workflowApprovalConfigs,
} from "./schema/organization";
import { models, modelRevisions, componentTypes, partNumbers, bom } from "./schema/config";
import { suppliers, supplierPartProfiles } from "./schema/inventory";
import { materialRequests, materialRequestItems } from "./schema/material-requests";

const ROLE_NAMES = ["ADMIN", "SUPERVISOR", "OPERATOR", "STORE", "PRODUCTION", "QA"] as const;
const DEFAULT_PERMISSIONS = [
  { code: "users.read", name: "Read Users", module: "users" },
  { code: "users.write", name: "Manage Users", module: "users" },
  { code: "roles.read", name: "Read Roles", module: "roles" },
  { code: "roles.write", name: "Manage Roles", module: "roles" },
  { code: "devices.read", name: "Read Devices", module: "devices" },
  { code: "devices.write", name: "Manage Devices", module: "devices" },
  { code: "models.read", name: "Read Models", module: "models" },
  { code: "models.write", name: "Manage Models", module: "models" },
  { code: "workflow.read", name: "Read Workflow", module: "workflow" },
  { code: "workflow.write", name: "Manage Workflow", module: "workflow" },
];

const COST_CENTER_SEEDS: { groupCode: string; costCode: string; shortText: string }[] = [
  { groupCode: "DL", costCode: "663010A101", shortText: "STX DI WASH" },
  { groupCode: "DL", costCode: "663010A102", shortText: "STX DI ASSY" },
  { groupCode: "DL", costCode: "663010A103", shortText: "STX DI FG PACK" },
  { groupCode: "DL", costCode: "663010A104", shortText: "STX DI SAW" },
  { groupCode: "DL", costCode: "663010A105", shortText: "STX DI WB" },
  { groupCode: "DL", costCode: "663010A106", shortText: "STX DI MOLD" },
  { groupCode: "DL", costCode: "663010A107", shortText: "STX DI PLATING" },
  { groupCode: "DL", costCode: "663010A108", shortText: "STX DI MARK" },
  { groupCode: "DL", costCode: "663010A109", shortText: "STX DI TEST" },
  { groupCode: "DL", costCode: "663010A110", shortText: "STX DI SOLDER" },
  { groupCode: "DL", costCode: "663010A111", shortText: "STX DI DEJUNK" },
  { groupCode: "DL", costCode: "663010A112", shortText: "STX DI SORT" },
  { groupCode: "IDL", costCode: "663010A201", shortText: "STX IDI PRODUCTION" },
  { groupCode: "IDL", costCode: "663010A202", shortText: "STX IDI PE" },
  { groupCode: "IDL", costCode: "663010A203", shortText: "STX IDI QA" },
  { groupCode: "IDL", costCode: "663010A204", shortText: "STX IDI PLANNING" },
  { groupCode: "IDL", costCode: "663010A205", shortText: "STX IDI WAREHOUSE" },
  { groupCode: "DIS", costCode: "663010A301", shortText: "STX DIS MAINTENANCE" },
  { groupCode: "ADM", costCode: "663010A401", shortText: "STX ADM HR" },
  { groupCode: "ADM", costCode: "663010A402", shortText: "STX ADM ACCOUNT" },
  { groupCode: "ADM", costCode: "663010A403", shortText: "STX IT" },
];

const SECTION_SEEDS = [{ sectionCode: "STORE", sectionName: "Store / Warehouse" }];

// Dummy data below: links admin to section/department, demo model+BOM for Material Request catalog,
// one supplier, workflow approval (STORE approves requests), and 3 sample material requests (REQUESTED, APPROVED, ISSUED).

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change_me";

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("Seeding roles...");
    for (const roleName of ROLE_NAMES) {
      await db
        .insert(roles)
        .values({
          name: roleName,
          description: `${roleName} role`,
        })
        .onConflictDoNothing({ target: roles.name });
    }
    console.log(`Seeded ${ROLE_NAMES.length} roles.`);

    console.log("Seeding permissions...");
    for (const permission of DEFAULT_PERMISSIONS) {
      await db.insert(permissions).values(permission).onConflictDoNothing({ target: permissions.code });
    }
    console.log(`Seeded ${DEFAULT_PERMISSIONS.length} permissions.`);

    console.log("Seeding admin user...");
    const passwordHash = await hash(adminPassword, 12);

    await db
      .insert(users)
      .values({
        username: adminUsername,
        displayName: "System Administrator",
        passwordHash,
        authSource: "local",
        isActive: true,
      })
      .onConflictDoNothing({ target: users.username });

    const [adminUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, adminUsername)).limit(1);

    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "ADMIN")).limit(1);

    if (adminUser && adminRole) {
      await db
        .insert(userRoles)
        .values({
          userId: adminUser.id,
          roleId: adminRole.id,
        })
        .onConflictDoNothing();
    }

    if (adminRole) {
      const allPermissionRows = await db.select({ id: permissions.id }).from(permissions);
      if (allPermissionRows.length) {
        await db
          .insert(rolePermissions)
          .values(allPermissionRows.map((p) => ({ roleId: adminRole.id, permissionId: p.id })))
          .onConflictDoNothing();
      }
    }

    // ─── Seed cost centers ──────────────────────────────
    console.log("Seeding cost centers...");
    for (const cc of COST_CENTER_SEEDS) {
      await db.insert(costCenters).values(cc).onConflictDoNothing({ target: costCenters.costCode });
    }
    console.log(`Seeded ${COST_CENTER_SEEDS.length} cost centers.`);

    // ─── Seed sections ─────────────────────────────────
    console.log("Seeding sections...");
    for (const sec of SECTION_SEEDS) {
      await db.insert(sections).values(sec).onConflictDoNothing({ target: sections.sectionCode });
    }
    console.log(`Seeded ${SECTION_SEEDS.length} sections.`);

    // ─── Link cost centers to STORE section & set default ──
    const [storeSection] = await db.select().from(sections).where(eq(sections.sectionCode, "STORE")).limit(1);
    if (storeSection) {
      const ccCodesToLink = ["663010A101", "663010A102", "663010A103", "663010A201", "663010A205"];
      await db
        .update(costCenters)
        .set({ sectionId: storeSection.id, isDefault: false })
        .where(inArray(costCenters.costCode, ccCodesToLink));
      await db
        .update(costCenters)
        .set({ sectionId: storeSection.id, isDefault: true })
        .where(eq(costCenters.costCode, "663010A101"));
      console.log("Linked cost centers to STORE section (default: 663010A101).");
    }

    // ─── Seed departments (for user department & request metadata) ──
    const storeSectionId = storeSection?.id ?? null;
    const DEPARTMENT_SEEDS = [
      { code: "PROD", name: "Production", sectionId: storeSectionId, sortOrder: 10 },
      { code: "STORE", name: "Store / Warehouse", sectionId: storeSectionId, sortOrder: 20 },
    ];
    for (const d of DEPARTMENT_SEEDS) {
      await db
        .insert(departments)
        .values({
          code: d.code,
          name: d.name,
          sectionId: d.sectionId,
          sortOrder: d.sortOrder,
        })
        .onConflictDoNothing({ target: departments.code });
    }
    console.log(`Seeded ${DEPARTMENT_SEEDS.length} departments.`);

    // ─── Link admin user to STORE section and Production department ──
    const [prodDept] = await db.select().from(departments).where(eq(departments.code, "PROD")).limit(1);
    if (adminUser?.id && storeSection) {
      await db
        .insert(userSections)
        .values({ userId: adminUser.id, sectionId: storeSection.id })
        .onConflictDoNothing({ target: userSections.userId });
      if (prodDept) {
        await db
          .insert(userDepartments)
          .values({ userId: adminUser.id, departmentId: prodDept.id })
          .onConflictDoNothing({ target: userDepartments.userId });
      }
      console.log("Linked admin user to STORE section and department.");
    }

    // ─── Seed models & revisions (for Material Request catalog) ──
    await db
      .insert(models)
      .values({
        code: "MDL-DEMO-01",
        name: "Demo Model A",
        partNumber: "PN-DEMO-A",
        packSize: 1,
        isActive: true,
      })
      .onConflictDoNothing({ target: models.code });

    const [modelRow] = await db.select({ id: models.id }).from(models).where(eq(models.code, "MDL-DEMO-01")).limit(1);
    const modelIdA = modelRow?.id ?? null;
    let revisionIdA: string | null = null;
    if (modelIdA) {
      const existingRev = await db
        .select({ id: modelRevisions.id })
        .from(modelRevisions)
        .where(eq(modelRevisions.modelId, modelIdA))
        .limit(1);
      if (existingRev.length === 0) {
        const [revA] = await db
          .insert(modelRevisions)
          .values({
            modelId: modelIdA,
            revisionCode: "R1",
            status: "ACTIVE",
            basePartNumber: "PN-DEMO-A",
          })
          .returning({ id: modelRevisions.id });
        revisionIdA = revA?.id ?? null;
      } else {
        revisionIdA = existingRev[0].id;
      }
      console.log("Seeded model MDL-DEMO-01 with ACTIVE revision R1.");
    }

    // ─── Seed component types & part numbers ──
    const CT_SEEDS = [
      { code: "RAW", name: "Raw Material" },
      { code: "CMP", name: "Component" },
      { code: "PKG", name: "Packaging" },
    ];
    for (const ct of CT_SEEDS) {
      await db.insert(componentTypes).values(ct).onConflictDoNothing({ target: componentTypes.code });
    }
    const [rawCt] = await db.select().from(componentTypes).where(eq(componentTypes.code, "RAW")).limit(1);
    const [cmpCt] = await db.select().from(componentTypes).where(eq(componentTypes.code, "CMP")).limit(1);

    const PN_SEEDS = [
      {
        partNumber: "PN-RAW-001",
        description: "Steel sheet",
        componentTypeId: rawCt?.id ?? null,
        rmLocation: "WH-A01",
      },
      {
        partNumber: "PN-RAW-002",
        description: "Copper wire",
        componentTypeId: rawCt?.id ?? null,
        rmLocation: "WH-A02",
      },
      {
        partNumber: "PN-CMP-001",
        description: "Bearing unit",
        componentTypeId: cmpCt?.id ?? null,
        rmLocation: "WH-B01",
      },
      { partNumber: "PN-CMP-002", description: "Gasket set", componentTypeId: cmpCt?.id ?? null },
    ];
    for (const pn of PN_SEEDS) {
      await db
        .insert(partNumbers)
        .values({
          partNumber: pn.partNumber,
          description: pn.description,
          componentTypeId: pn.componentTypeId,
          rmLocation: pn.rmLocation ?? null,
          isActive: true,
        })
        .onConflictDoNothing({ target: partNumbers.partNumber });
    }
    console.log(`Seeded ${CT_SEEDS.length} component types, ${PN_SEEDS.length} part numbers.`);

    // ─── Seed BOM (for catalog: model + components) ──
    if (revisionIdA) {
      const existingBom = await db.select({ id: bom.id }).from(bom).where(eq(bom.revisionId, revisionIdA)).limit(1);
      if (existingBom.length === 0) {
        const bomRows = [
          { componentType: "RAW", componentPartNumber: "PN-RAW-001", componentName: "Steel sheet", qtyPerBatch: 2 },
          { componentType: "RAW", componentPartNumber: "PN-RAW-002", componentName: "Copper wire", qtyPerBatch: 5 },
          { componentType: "CMP", componentPartNumber: "PN-CMP-001", componentName: "Bearing unit", qtyPerBatch: 1 },
        ];
        for (const row of bomRows) {
          await db.insert(bom).values({
            revisionId: revisionIdA,
            componentType: row.componentType,
            componentPartNumber: row.componentPartNumber,
            componentName: row.componentName,
            qtyPerBatch: row.qtyPerBatch,
            unitType: "PCS",
          });
        }
        console.log(`Seeded ${bomRows.length} BOM lines for MDL-DEMO-01.`);
      }
    }

    // ─── Seed supplier (optional, for catalog/issue) ──
    const [supplier] = await db
      .insert(suppliers)
      .values({ code: "SUP-DEMO", name: "Demo Supplier Co." })
      .onConflictDoNothing({ target: suppliers.code })
      .returning({ id: suppliers.id });
    if (supplier) {
      const existingProfile = await db
        .select()
        .from(supplierPartProfiles)
        .where(eq(supplierPartProfiles.supplierId, supplier.id))
        .limit(1);
      if (existingProfile.length === 0) {
        await db.insert(supplierPartProfiles).values({
          supplierId: supplier.id,
          partNumber: "PN-RAW-001",
          supplierPartNumber: "SP-001",
          defaultPackQty: 10,
        });
      }
      console.log("Seeded 1 supplier and 1 supplier part profile.");
    }

    // ─── Seed workflow approval (Material Request: REQUESTED → APPROVED by STORE) ──
    const [storeRole] = await db.select().from(roles).where(eq(roles.name, "STORE")).limit(1);
    if (storeRole) {
      const existingWf = await db
        .select()
        .from(workflowApprovalConfigs)
        .where(
          and(eq(workflowApprovalConfigs.flowCode, "MATERIAL_REQUEST_APPROVAL"), eq(workflowApprovalConfigs.level, 1))
        )
        .limit(1);
      if (existingWf.length === 0) {
        await db.insert(workflowApprovalConfigs).values({
          flowCode: "MATERIAL_REQUEST_APPROVAL",
          flowName: "Material Request Approval",
          fromStatus: "REQUESTED",
          toStatus: "APPROVED",
          level: 1,
          approverRoleId: storeRole.id,
          isActive: true,
        });
      }
      console.log("Seeded workflow approval: MATERIAL_REQUEST_APPROVAL (STORE).");
    }

    // ─── Seed dummy material requests ──
    if (adminUser?.id && storeSection && modelIdA) {
      const [ccRow] = await db
        .select()
        .from(costCenters)
        .where(and(eq(costCenters.sectionId, storeSection.id), eq(costCenters.costCode, "663010A101")))
        .limit(1);

      const today = new Date().toISOString().slice(0, 10);
      const requestNoList = ["MR-DEMO-0001", "MR-DEMO-0002", "MR-DEMO-0003"];
      const statusList = ["REQUESTED", "APPROVED", "ISSUED"] as const;
      let insertedCount = 0;

      for (let i = 0; i < requestNoList.length; i++) {
        const [mr] = await db
          .insert(materialRequests)
          .values({
            requestNo: requestNoList[i],
            dmiNo: `DMI-${String(i + 1).padStart(4, "0")}`,
            requestDate: today,
            modelId: modelIdA,
            section: storeSection.sectionName,
            costCenter: ccRow?.shortText ?? "STX DI WASH",
            requestSectionId: storeSection.id,
            requestCostCenterId: ccRow?.id ?? null,
            requestDepartmentName: prodDept?.name ?? "Production",
            requestedByUserId: adminUser.id,
            status: statusList[i],
          })
          .onConflictDoNothing({ target: materialRequests.requestNo })
          .returning({ id: materialRequests.id });

        if (mr?.id) {
          insertedCount++;
          const items = [
            { itemNo: 1, partNumber: "PN-RAW-001", description: "Steel sheet", requestedQty: 100, uom: "PCS" },
            { itemNo: 2, partNumber: "PN-CMP-001", description: "Bearing unit", requestedQty: 20, uom: "PCS" },
          ];
          for (const it of items) {
            await db
              .insert(materialRequestItems)
              .values({
                materialRequestId: mr.id,
                itemNo: it.itemNo,
                partNumber: it.partNumber,
                description: it.description,
                requestedQty: it.requestedQty,
                uom: it.uom,
              })
              .onConflictDoNothing({ target: [materialRequestItems.materialRequestId, materialRequestItems.itemNo] });
          }
        }
      }
      if (insertedCount > 0) {
        console.log(`Seeded ${insertedCount} dummy material requests (REQUESTED, APPROVED, ISSUED).`);
      }
    }

    console.log("Seed completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
