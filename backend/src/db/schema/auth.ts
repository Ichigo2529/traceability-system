import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  primaryKey,
  index,
  text,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  employeeCode: varchar("employee_code", { length: 50 }),
  email: varchar("email", { length: 255 }),
  department: varchar("department", { length: 120 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  authSource: varchar("auth_source", { length: 20 }).default("local").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_refresh_tokens_user_id").on(table.userId),
  ]
);

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  module: varchar("module", { length: 80 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("idx_role_permissions_role_id").on(table.roleId),
    index("idx_role_permissions_permission_id").on(table.permissionId),
  ]
);
