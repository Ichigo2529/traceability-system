ALTER TABLE "material_requests"
ADD COLUMN IF NOT EXISTS "model_id" uuid;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_material_requests_model_id" ON "material_requests" USING btree ("model_id");
