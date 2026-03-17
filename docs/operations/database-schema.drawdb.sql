-- Minimal PostgreSQL DDL for ER import (drawDB-friendly)
-- Source: docs/operations/database-schema.er.json
-- Note: This file focuses on PK/FK structure for diagramming.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(120) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS component_types (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS model_revisions (
  id UUID PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES models(id)
);

CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES model_revisions(id)
);

CREATE TABLE IF NOT EXISTS part_numbers (
  id UUID PRIMARY KEY,
  component_type_id UUID REFERENCES component_types(id)
);

CREATE TABLE IF NOT EXISTS routing (
  id UUID PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES model_revisions(id)
);

CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY,
  process_id UUID REFERENCES processes(id)
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY,
  model_revision_id UUID REFERENCES model_revisions(id),
  variant_id UUID REFERENCES variants(id),
  machine_id UUID REFERENCES machines(id)
);

CREATE TABLE IF NOT EXISTS material_requests (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES models(id),
  request_section_id UUID REFERENCES sections(id),
  request_cost_center_id UUID REFERENCES cost_centers(id),
  requested_by_user_id UUID REFERENCES users(id),
  approved_by_user_id UUID REFERENCES users(id),
  dispatched_by_user_id UUID REFERENCES users(id),
  issued_by_user_id UUID REFERENCES users(id),
  received_by_user_id UUID REFERENCES users(id),
  production_ack_by_user_id UUID REFERENCES users(id),
  forklift_ack_by_user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventory_do (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS label_templates (
  id UUID PRIMARY KEY,
  revision_id UUID REFERENCES model_revisions(id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_sections (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  section_id UUID NOT NULL REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS user_departments (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS workflow_approval_configs (
  id UUID PRIMARY KEY,
  approver_role_id UUID REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS section_cost_centers (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES sections(id),
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id)
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  station_id UUID REFERENCES stations(id),
  process_id UUID REFERENCES processes(id)
);

CREATE TABLE IF NOT EXISTS device_operator_sessions (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id),
  user_id UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bom (
  id UUID PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES model_revisions(id),
  variant_id UUID REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS routing_steps (
  id UUID PRIMARY KEY,
  routing_id UUID NOT NULL REFERENCES routing(id),
  variant_only UUID REFERENCES variants(id)
);

CREATE TABLE IF NOT EXISTS unit_links (
  id UUID PRIMARY KEY,
  parent_unit_id UUID NOT NULL REFERENCES units(id),
  child_unit_id UUID NOT NULL REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  machine_id UUID REFERENCES machines(id),
  device_id UUID REFERENCES devices(id),
  operator_user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS supplier_packs (
  id UUID PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  do_id UUID REFERENCES inventory_do(id)
);

CREATE TABLE IF NOT EXISTS component_2d_scans (
  id UUID PRIMARY KEY,
  inventory_do_id UUID REFERENCES inventory_do(id),
  supplier_pack_id UUID REFERENCES supplier_packs(id),
  unit_id UUID REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS supplier_part_profiles (
  id UUID PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS config_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS holds (
  id UUID PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  created_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS label_bindings (
  id UUID PRIMARY KEY,
  model_revision_id UUID NOT NULL REFERENCES model_revisions(id),
  variant_id UUID REFERENCES variants(id),
  label_template_id UUID NOT NULL REFERENCES label_templates(id)
);

CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  label_template_id UUID NOT NULL REFERENCES label_templates(id)
);

CREATE TABLE IF NOT EXISTS serial_counters (
  part_number VARCHAR(100) NOT NULL,
  shift_day DATE NOT NULL,
  line_code VARCHAR(50) NOT NULL,
  PRIMARY KEY (part_number, shift_day, line_code)
);

CREATE TABLE IF NOT EXISTS material_request_items (
  id UUID PRIMARY KEY,
  material_request_id UUID NOT NULL REFERENCES material_requests(id)
);

CREATE TABLE IF NOT EXISTS material_request_item_issues (
  id UUID PRIMARY KEY,
  material_request_id UUID NOT NULL REFERENCES material_requests(id),
  material_request_item_id UUID NOT NULL REFERENCES material_request_items(id),
  supplier_id UUID REFERENCES suppliers(id),
  do_id UUID REFERENCES inventory_do(id)
);

CREATE TABLE IF NOT EXISTS handover_batches (
  id UUID PRIMARY KEY,
  material_request_id UUID NOT NULL REFERENCES material_requests(id),
  issued_by_user_id UUID NOT NULL REFERENCES users(id),
  assigned_forklift_user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS handover_batch_items (
  id UUID PRIMARY KEY,
  handover_batch_id UUID NOT NULL REFERENCES handover_batches(id),
  material_request_item_issue_id UUID NOT NULL REFERENCES material_request_item_issues(id)
);

CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID PRIMARY KEY,
  handover_batch_id UUID NOT NULL REFERENCES handover_batches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id UUID REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY,
  scan_session_id UUID NOT NULL REFERENCES scan_sessions(id),
  handover_batch_id UUID NOT NULL REFERENCES handover_batches(id),
  matched_batch_item_id UUID REFERENCES handover_batch_items(id),
  matched_supplier_pack_id UUID REFERENCES supplier_packs(id),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id UUID REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS set_runs (
  id UUID PRIMARY KEY,
  assy_unit_id UUID REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS containers (
  id UUID PRIMARY KEY,
  set_run_id UUID NOT NULL REFERENCES set_runs(id),
  unit_id UUID REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS bag100 (
  id UUID PRIMARY KEY,
  supplier_pack_id UUID REFERENCES supplier_packs(id)
);

CREATE TABLE IF NOT EXISTS consumption (
  id UUID PRIMARY KEY,
  set_run_id UUID NOT NULL REFERENCES set_runs(id),
  component_type_id UUID REFERENCES component_types(id),
  machine_id UUID REFERENCES machines(id)
);

CREATE TABLE IF NOT EXISTS email_reminder_logs (
  id UUID PRIMARY KEY,
  material_request_id UUID NOT NULL REFERENCES material_requests(id),
  recipient_user_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS master_routing_steps (
  id UUID PRIMARY KEY
);

-- Optional relationships present in code but not declared as DB FK:
-- departments.section_id -> sections.id
-- cost_centers.section_id -> sections.id
-- cost_centers.created_by -> users.id
-- scan_sessions.station_id -> stations.id
-- set_runs.model_revision_id -> model_revisions.id
-- set_runs.variant_id -> variants.id
