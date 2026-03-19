CREATE TABLE IF NOT EXISTS "master_routing_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_code" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_routing_steps_step_code_unique" UNIQUE("step_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_master_routing_steps_active" ON "master_routing_steps" USING btree ("is_active");
