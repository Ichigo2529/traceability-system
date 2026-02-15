CREATE TYPE "public"."auth_source" AS ENUM('local', 'ldap');--> statement-breakpoint
CREATE TYPE "public"."role_name" AS ENUM('ADMIN', 'SUPERVISOR', 'OPERATOR', 'STORE', 'PRODUCTION', 'QA');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('OPEN', 'RESOLVED', 'SCRAPPED');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "role_name" NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"employee_code" varchar(50),
	"password_hash" varchar(255) NOT NULL,
	"auth_source" "auth_source" DEFAULT 'local' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "device_operator_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(500) NOT NULL,
	"hostname" varchar(200),
	"mac" varchar(50),
	"device_token_hash" varchar(255),
	"machine_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen" timestamp with time zone,
	"app_version" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"machine_type" varchar(100) NOT NULL,
	"line_code" varchar(50),
	"capabilities" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"component_type" varchar(100) NOT NULL,
	"qty_per_batch" integer NOT NULL,
	"unit_type" varchar(100) NOT NULL,
	"variant_id" uuid,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"revision_code" varchar(50) NOT NULL,
	"status" "revision_status" DEFAULT 'DRAFT' NOT NULL,
	"base_part_number" varchar(100),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routing_id" uuid NOT NULL,
	"step_code" varchar(100) NOT NULL,
	"sequence" integer NOT NULL,
	"component_type" varchar(100),
	"consumes_qty" integer,
	"variant_only" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"mapped_codes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid,
	"machine_id" uuid,
	"device_id" uuid,
	"operator_user_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb,
	"created_at_device" timestamp with time zone NOT NULL,
	"received_at_server" timestamp with time zone DEFAULT now() NOT NULL,
	"shift_day" date NOT NULL,
	"line_code" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "unit_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_unit_id" uuid NOT NULL,
	"child_unit_id" uuid NOT NULL,
	"link_type" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'CREATED' NOT NULL,
	"model_revision_id" uuid,
	"variant_id" uuid,
	"machine_id" uuid,
	"line_code" varchar(50),
	"batch_ref" varchar(200),
	"qty_total" integer,
	"qty_remaining" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_revision_id" uuid NOT NULL,
	"variant_id" uuid,
	"unit_type" varchar(100) NOT NULL,
	"process_point" varchar(100) NOT NULL,
	"label_template_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"template_body" text NOT NULL,
	"revision_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"label_template_id" uuid NOT NULL,
	"serial_number" integer NOT NULL,
	"label_data" varchar(100) NOT NULL,
	"shift_day" date NOT NULL,
	"line_code" varchar(50) NOT NULL,
	"part_number" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serial_counters" (
	"part_number" varchar(100) NOT NULL,
	"shift_day" date NOT NULL,
	"line_code" varchar(50) NOT NULL,
	"last_serial" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "serial_counters_part_number_shift_day_line_code_pk" PRIMARY KEY("part_number","shift_day","line_code")
);
--> statement-breakpoint
CREATE TABLE "component_2d_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_do_id" uuid,
	"unit_id" uuid,
	"scan_data" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_do" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"do_number" varchar(100) NOT NULL,
	"supplier" varchar(200),
	"lot_number" varchar(100),
	"material_code" varchar(100) NOT NULL,
	"qty_received" integer NOT NULL,
	"qty_issued" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"hold_type" varchar(100) NOT NULL,
	"reason" text,
	"status" "hold_status" DEFAULT 'OPEN' NOT NULL,
	"created_by" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_operator_sessions" ADD CONSTRAINT "device_operator_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_operator_sessions" ADD CONSTRAINT "device_operator_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom" ADD CONSTRAINT "bom_revision_id_model_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom" ADD CONSTRAINT "bom_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_revisions" ADD CONSTRAINT "model_revisions_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing" ADD CONSTRAINT "routing_revision_id_model_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_routing_id_routing_id_fk" FOREIGN KEY ("routing_id") REFERENCES "public"."routing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_variant_only_variants_id_fk" FOREIGN KEY ("variant_only") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_revision_id_model_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_operator_user_id_users_id_fk" FOREIGN KEY ("operator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_links" ADD CONSTRAINT "unit_links_parent_unit_id_units_id_fk" FOREIGN KEY ("parent_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_links" ADD CONSTRAINT "unit_links_child_unit_id_units_id_fk" FOREIGN KEY ("child_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_model_revision_id_model_revisions_id_fk" FOREIGN KEY ("model_revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_bindings" ADD CONSTRAINT "label_bindings_model_revision_id_model_revisions_id_fk" FOREIGN KEY ("model_revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_bindings" ADD CONSTRAINT "label_bindings_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_bindings" ADD CONSTRAINT "label_bindings_label_template_id_label_templates_id_fk" FOREIGN KEY ("label_template_id") REFERENCES "public"."label_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_templates" ADD CONSTRAINT "label_templates_revision_id_model_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."model_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_label_template_id_label_templates_id_fk" FOREIGN KEY ("label_template_id") REFERENCES "public"."label_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_2d_scans" ADD CONSTRAINT "component_2d_scans_inventory_do_id_inventory_do_id_fk" FOREIGN KEY ("inventory_do_id") REFERENCES "public"."inventory_do"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_2d_scans" ADD CONSTRAINT "component_2d_scans_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_audit_logs" ADD CONSTRAINT "config_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_device_operator_sessions_device_id" ON "device_operator_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_device_operator_sessions_user_id" ON "device_operator_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_devices_machine_id" ON "devices" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_bom_revision_id" ON "bom" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "idx_model_revisions_model_id" ON "model_revisions" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_model_revisions_active_per_model" ON "model_revisions" USING btree ("model_id") WHERE "model_revisions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "idx_routing_revision_id" ON "routing" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "idx_routing_steps_routing_id" ON "routing_steps" USING btree ("routing_id");--> statement-breakpoint
CREATE INDEX "idx_variants_revision_id" ON "variants" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "idx_events_unit_id_received" ON "events" USING btree ("unit_id","received_at_server");--> statement-breakpoint
CREATE INDEX "idx_events_event_type" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_events_shift_day" ON "events" USING btree ("shift_day");--> statement-breakpoint
CREATE INDEX "idx_events_machine_id" ON "events" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX "idx_unit_links_parent_unit_id" ON "unit_links" USING btree ("parent_unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_links_child_unit_id" ON "unit_links" USING btree ("child_unit_id");--> statement-breakpoint
CREATE INDEX "idx_units_unit_type" ON "units" USING btree ("unit_type");--> statement-breakpoint
CREATE INDEX "idx_units_unit_type_created_at" ON "units" USING btree ("unit_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_units_model_revision_id" ON "units" USING btree ("model_revision_id");--> statement-breakpoint
CREATE INDEX "idx_units_status" ON "units" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_label_bindings_key" ON "label_bindings" USING btree ("model_revision_id","variant_id","unit_type","process_point");--> statement-breakpoint
CREATE INDEX "idx_label_templates_revision_id" ON "label_templates" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "idx_labels_unit_id" ON "labels" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_labels_shift_day" ON "labels" USING btree ("shift_day");--> statement-breakpoint
CREATE INDEX "idx_component_2d_scans_unit_id" ON "component_2d_scans" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_component_2d_scans_inventory_do_id" ON "component_2d_scans" USING btree ("inventory_do_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_do_do_number" ON "inventory_do" USING btree ("do_number");--> statement-breakpoint
CREATE INDEX "idx_inventory_do_material_code" ON "inventory_do" USING btree ("material_code");--> statement-breakpoint
CREATE INDEX "idx_config_audit_logs_entity" ON "config_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_config_audit_logs_user_id" ON "config_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_config_audit_logs_created_at" ON "config_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_holds_unit_id" ON "holds" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_holds_status" ON "holds" USING btree ("status");