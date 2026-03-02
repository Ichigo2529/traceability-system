import { boolean, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const emailSettings = pgTable("email_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: varchar("smtp_user", { length: 255 }),
  smtpPassword: varchar("smtp_password", { length: 500 }),
  smtpFromEmail: varchar("smtp_from_email", { length: 255 }).notNull(),
  smtpFromName: varchar("smtp_from_name", { length: 255 }),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
