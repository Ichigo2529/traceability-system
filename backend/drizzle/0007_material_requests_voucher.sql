DO $$ BEGIN
 CREATE TYPE "public"."material_request_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "material_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_no" varchar(80) NOT NULL,
	"dmi_no" varchar(80),
	"request_date" date NOT NULL,
	"section" varchar(120),
	"cost_center" varchar(120),
	"process_name" varchar(120),
	"requested_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"issued_by_user_id" uuid,
	"received_by_user_id" uuid,
	"status" "material_request_status" DEFAULT 'REQUESTED' NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "material_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_request_id" uuid NOT NULL,
	"item_no" integer NOT NULL,
	"part_number" varchar(120) NOT NULL,
	"description" varchar(300),
	"requested_qty" integer,
	"issued_qty" integer,
	"uom" varchar(30),
	"do_number" varchar(120),
	"lot_number" varchar(120),
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_request_items" ADD CONSTRAINT "material_request_items_material_request_id_material_requests_id_fk" FOREIGN KEY ("material_request_id") REFERENCES "public"."material_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_material_requests_request_no" ON "material_requests" USING btree ("request_no");
CREATE INDEX IF NOT EXISTS "idx_material_requests_status" ON "material_requests" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_material_requests_request_date" ON "material_requests" USING btree ("request_date");
CREATE INDEX IF NOT EXISTS "idx_material_requests_requested_by" ON "material_requests" USING btree ("requested_by_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_material_request_items_line" ON "material_request_items" USING btree ("material_request_id","item_no");
CREATE INDEX IF NOT EXISTS "idx_material_request_items_request_id" ON "material_request_items" USING btree ("material_request_id");
CREATE INDEX IF NOT EXISTS "idx_material_request_items_part_number" ON "material_request_items" USING btree ("part_number");
