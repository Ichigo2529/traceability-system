CREATE TABLE IF NOT EXISTS "material_request_item_issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "material_request_id" uuid NOT NULL,
  "material_request_item_id" uuid NOT NULL,
  "part_number" varchar(120) NOT NULL,
  "supplier_id" uuid,
  "do_id" uuid,
  "do_number" varchar(120) NOT NULL,
  "supplier_pack_size" integer NOT NULL,
  "issued_packs" integer NOT NULL,
  "issued_qty" integer NOT NULL,
  "remarks" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "material_request_item_issues" ADD CONSTRAINT "material_request_item_issues_material_request_id_material_requests_id_fk" FOREIGN KEY ("material_request_id") REFERENCES "public"."material_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_request_item_issues" ADD CONSTRAINT "material_request_item_issues_material_request_item_id_material_request_items_id_fk" FOREIGN KEY ("material_request_item_id") REFERENCES "public"."material_request_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_request_item_issues" ADD CONSTRAINT "material_request_item_issues_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_request_item_issues" ADD CONSTRAINT "material_request_item_issues_do_id_inventory_do_id_fk" FOREIGN KEY ("do_id") REFERENCES "public"."inventory_do"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_mri_issues_request_id" ON "material_request_item_issues" USING btree ("material_request_id");
CREATE INDEX IF NOT EXISTS "idx_mri_issues_item_id" ON "material_request_item_issues" USING btree ("material_request_item_id");
CREATE INDEX IF NOT EXISTS "idx_mri_issues_part_number" ON "material_request_item_issues" USING btree ("part_number");
CREATE INDEX IF NOT EXISTS "idx_mri_issues_do_number" ON "material_request_item_issues" USING btree ("do_number");
