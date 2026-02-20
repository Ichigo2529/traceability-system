import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { users, roles, userRoles, permissions, rolePermissions } from "./schema/auth";
import { costCenters, sections } from "./schema/organization";

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
  { groupCode: "DL",  costCode: "663010A101", shortText: "STX DI WASH" },
  { groupCode: "DL",  costCode: "663010A102", shortText: "STX DI ASSY" },
  { groupCode: "DL",  costCode: "663010A103", shortText: "STX DI FG PACK" },
  { groupCode: "DL",  costCode: "663010A104", shortText: "STX DI SAW" },
  { groupCode: "DL",  costCode: "663010A105", shortText: "STX DI WB" },
  { groupCode: "DL",  costCode: "663010A106", shortText: "STX DI MOLD" },
  { groupCode: "DL",  costCode: "663010A107", shortText: "STX DI PLATING" },
  { groupCode: "DL",  costCode: "663010A108", shortText: "STX DI MARK" },
  { groupCode: "DL",  costCode: "663010A109", shortText: "STX DI TEST" },
  { groupCode: "DL",  costCode: "663010A110", shortText: "STX DI SOLDER" },
  { groupCode: "DL",  costCode: "663010A111", shortText: "STX DI DEJUNK" },
  { groupCode: "DL",  costCode: "663010A112", shortText: "STX DI SORT" },
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

const SECTION_SEEDS = [
  { sectionCode: "STORE", sectionName: "Store / Warehouse" },
];

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
      await db
        .insert(permissions)
        .values(permission)
        .onConflictDoNothing({ target: permissions.code });
    }
    console.log(`Seeded ${DEFAULT_PERMISSIONS.length} permissions.`);

    console.log("Seeding admin user...");
    const passwordHash = await hash(adminPassword, 12);

    const [adminUser] = await db
      .insert(users)
      .values({
        username: adminUsername,
        displayName: "System Administrator",
        passwordHash,
        authSource: "local",
        isActive: true,
      })
      .onConflictDoNothing({ target: users.username })
      .returning({ id: users.id });

    const [adminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "ADMIN"))
      .limit(1);

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
      await db
        .insert(costCenters)
        .values(cc)
        .onConflictDoNothing({ target: costCenters.costCode });
    }
    console.log(`Seeded ${COST_CENTER_SEEDS.length} cost centers.`);

    // ─── Seed sections ─────────────────────────────────
    console.log("Seeding sections...");
    for (const sec of SECTION_SEEDS) {
      await db
        .insert(sections)
        .values(sec)
        .onConflictDoNothing({ target: sections.sectionCode });
    }
    console.log(`Seeded ${SECTION_SEEDS.length} sections.`);

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
