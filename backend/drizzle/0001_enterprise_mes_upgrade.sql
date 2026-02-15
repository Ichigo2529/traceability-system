DO $$ BEGIN
 CREATE TYPE "public"."device_type" AS ENUM('pi', 'pc', 'tablet', 'kiosk');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."device_status" AS ENUM('active', 'disabled', 'maintenance');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" varchar(120);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "auth_source" TYPE varchar(20) USING "auth_source"::text;
--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "name" TYPE varchar(80) USING "name"::text;
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "pack_size" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "code" varchar(120) NOT NULL,
 "name" varchar(200) NOT NULL,
 "module" varchar(80),
 "description" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
 "role_id" uuid NOT NULL,
 "permission_id" uuid NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_id" ON "role_permissions" USING btree ("role_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission_id" ON "role_permissions" USING btree ("permission_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processes" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "process_code" varchar(80) NOT NULL,
 "name" varchar(200) NOT NULL,
 "sequence_order" integer DEFAULT 1 NOT NULL,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "uq_processes_process_code" UNIQUE("process_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stations" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "station_code" varchar(80) NOT NULL,
 "name" varchar(200) NOT NULL,
 "line" varchar(80),
 "area" varchar(120),
 "process_id" uuid,
 "is_active" boolean DEFAULT true NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "uq_stations_station_code" UNIQUE("station_code")
);
--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stations_process_id" ON "stations" USING btree ("process_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_approval_configs" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "flow_code" varchar(100) NOT NULL,
 "flow_name" varchar(200) NOT NULL,
 "from_status" varchar(50) NOT NULL,
 "to_status" varchar(50) NOT NULL,
 "level" integer NOT NULL,
 "approver_role_id" uuid,
 "is_active" boolean DEFAULT true NOT NULL,
 "metadata" jsonb,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_workflow_approval_flow_level" ON "workflow_approval_configs" USING btree ("flow_code","level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workflow_approval_role" ON "workflow_approval_configs" USING btree ("approver_role_id");
--> statement-breakpoint
ALTER TABLE "workflow_approval_configs" ADD CONSTRAINT "workflow_approval_configs_approver_role_id_roles_id_fk" FOREIGN KEY ("approver_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
 "key" varchar(120) PRIMARY KEY NOT NULL,
 "value" jsonb NOT NULL,
 "description" text,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "device_code" varchar(100);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "name" varchar(200);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "ip_address" varchar(100);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "device_type" "device_type" DEFAULT 'pi' NOT NULL;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "device_status" "device_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "activation_pin" varchar(64);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "secret_key" varchar(255);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "secret_rotated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "station_id" uuid;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "process_id" uuid;
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devices_station_id" ON "devices" USING btree ("station_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devices_process_id" ON "devices" USING btree ("process_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_devices_device_code" ON "devices" USING btree ("device_code") WHERE "device_code" IS NOT NULL;
--> statement-breakpoint
UPDATE "devices"
SET "device_status" = 'active'
WHERE "device_status" IS NULL;
--> statement-breakpoint
UPDATE "devices"
SET "device_type" = 'pi'
WHERE "device_type" IS NULL;
