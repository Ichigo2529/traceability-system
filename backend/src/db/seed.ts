import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { users, roles, userRoles, permissions, rolePermissions } from "./schema/auth";

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
