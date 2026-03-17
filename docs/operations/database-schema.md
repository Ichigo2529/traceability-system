# Database Schema (ER Summary)

เอกสารนี้สรุปโครงสร้างฐานข้อมูลสำหรับใช้อ้างอิงและวาด ER Diagram  
Source หลัก: `backend/src/db/schema/*.ts`

## 1) Authentication & Authorization

### `users`

- **PK:** `id`

### `roles`

- **PK:** `id`

### `permissions`

- **PK:** `id`

### `user_roles`

- **PK:** (`user_id`, `role_id`)
- **FK:** `user_id -> users.id`, `role_id -> roles.id`

### `role_permissions`

- **PK:** (`role_id`, `permission_id`)
- **FK:** `role_id -> roles.id`, `permission_id -> permissions.id`

### `refresh_tokens`

- **PK:** `id`
- **FK:** `user_id -> users.id`

## 2) Organization

### `processes`

- **PK:** `id`

### `stations`

- **PK:** `id`
- **FK:** `process_id -> processes.id`

### `sections`

- **PK:** `id`

### `departments`

- **PK:** `id`

### `cost_centers`

- **PK:** `id`

### `section_cost_centers`

- **PK:** `id`
- **FK:** `section_id -> sections.id`, `cost_center_id -> cost_centers.id`

### `user_sections`

- **PK:** `user_id`
- **FK:** `user_id -> users.id`, `section_id -> sections.id`

### `user_departments`

- **PK:** `user_id`
- **FK:** `user_id -> users.id`, `department_id -> departments.id`

### `workflow_approval_configs`

- **PK:** `id`
- **FK:** `approver_role_id -> roles.id`

### `app_settings`

- **PK:** `key`

## 3) Device & Machine

### `machines`

- **PK:** `id`

### `devices`

- **PK:** `id`
- **FK:** `machine_id -> machines.id`, `station_id -> stations.id`, `process_id -> processes.id`

### `device_operator_sessions`

- **PK:** `id`
- **FK:** `device_id -> devices.id`, `user_id -> users.id`

## 4) Master Data / Configuration

### `models`

- **PK:** `id`

### `model_revisions`

- **PK:** `id`
- **FK:** `model_id -> models.id`

### `variants`

- **PK:** `id`
- **FK:** `revision_id -> model_revisions.id`

### `component_types`

- **PK:** `id`

### `part_numbers`

- **PK:** `id`
- **FK:** `component_type_id -> component_types.id`

### `bom`

- **PK:** `id`
- **FK:** `revision_id -> model_revisions.id`, `variant_id -> variants.id`

### `routing`

- **PK:** `id`
- **FK:** `revision_id -> model_revisions.id`

### `routing_steps`

- **PK:** `id`
- **FK:** `routing_id -> routing.id`, `variant_only -> variants.id`

### `master_routing_steps`

- **PK:** `id`

## 5) Production & Traceability

### `units`

- **PK:** `id`
- **FK:** `model_revision_id -> model_revisions.id`, `variant_id -> variants.id`, `machine_id -> machines.id`

### `unit_links`

- **PK:** `id`
- **FK:** `parent_unit_id -> units.id`, `child_unit_id -> units.id`

### `events`

- **PK:** `id`
- **FK:** `unit_id -> units.id`, `machine_id -> machines.id`, `device_id -> devices.id`, `operator_user_id -> users.id`

### `set_runs`

- **PK:** `id`
- **FK:** `assy_unit_id -> units.id`

### `containers`

- **PK:** `id`
- **FK:** `set_run_id -> set_runs.id`, `unit_id -> units.id`

### `bag100`

- **PK:** `id`
- **FK:** `supplier_pack_id -> supplier_packs.id`

### `consumption`

- **PK:** `id`
- **FK:** `set_run_id -> set_runs.id`, `component_type_id -> component_types.id`, `machine_id -> machines.id`

## 6) Labels

### `label_templates`

- **PK:** `id`
- **FK:** `revision_id -> model_revisions.id`

### `label_bindings`

- **PK:** `id`
- **FK:** `model_revision_id -> model_revisions.id`, `variant_id -> variants.id`, `label_template_id -> label_templates.id`

### `labels`

- **PK:** `id`
- **FK:** `unit_id -> units.id`, `label_template_id -> label_templates.id`

### `serial_counters`

- **PK:** (`part_number`, `shift_day`, `line_code`)

## 7) Inventory

### `suppliers`

- **PK:** `id`

### `inventory_do`

- **PK:** `id`
- **FK:** `supplier_id -> suppliers.id`

### `supplier_packs`

- **PK:** `id`
- **FK:** `unit_id -> units.id`, `supplier_id -> suppliers.id`, `do_id -> inventory_do.id`

### `component_2d_scans`

- **PK:** `id`
- **FK:** `inventory_do_id -> inventory_do.id`, `supplier_pack_id -> supplier_packs.id`, `unit_id -> units.id`

### `supplier_part_profiles`

- **PK:** `id`
- **FK:** `supplier_id -> suppliers.id`

## 8) Material Request

### `material_requests`

- **PK:** `id`
- **FK:**  
  `model_id -> models.id`  
  `request_section_id -> sections.id`  
  `request_cost_center_id -> cost_centers.id`  
  `requested_by_user_id -> users.id`  
  `approved_by_user_id -> users.id`  
  `dispatched_by_user_id -> users.id`  
  `issued_by_user_id -> users.id`  
  `received_by_user_id -> users.id`  
  `production_ack_by_user_id -> users.id`  
  `forklift_ack_by_user_id -> users.id`

### `material_request_items`

- **PK:** `id`
- **FK:** `material_request_id -> material_requests.id`

### `material_request_item_issues`

- **PK:** `id`
- **FK:** `material_request_id -> material_requests.id`, `material_request_item_id -> material_request_items.id`, `supplier_id -> suppliers.id`, `do_id -> inventory_do.id`

## 9) Handover / Forklift Intake

### `handover_batches`

- **PK:** `id`
- **FK:** `material_request_id -> material_requests.id`, `issued_by_user_id -> users.id`, `assigned_forklift_user_id -> users.id`

### `handover_batch_items`

- **PK:** `id`
- **FK:** `handover_batch_id -> handover_batches.id`, `material_request_item_issue_id -> material_request_item_issues.id`

### `scan_sessions`

- **PK:** `id`
- **FK:** `handover_batch_id -> handover_batches.id`, `user_id -> users.id`, `device_id -> devices.id`

### `scan_events`

- **PK:** `id`
- **FK:** `scan_session_id -> scan_sessions.id`, `handover_batch_id -> handover_batches.id`, `matched_batch_item_id -> handover_batch_items.id`, `matched_supplier_pack_id -> supplier_packs.id`, `user_id -> users.id`, `device_id -> devices.id`

## 10) Audit & Email

### `config_audit_logs`

- **PK:** `id`
- **FK:** `user_id -> users.id`

### `holds`

- **PK:** `id`
- **FK:** `unit_id -> units.id`, `created_by -> users.id`, `resolved_by -> users.id`

### `email_settings`

- **PK:** `id`

### `email_reminder_logs`

- **PK:** `id`
- **FK:** `material_request_id -> material_requests.id`, `recipient_user_id -> users.id`

---

## Implicit Relationships (ยังไม่ประกาศ FK ตรงใน schema)

- `departments.section_id -> sections.id`
- `cost_centers.section_id -> sections.id`
- `cost_centers.created_by -> users.id`
- `scan_sessions.station_id -> stations.id`
- `set_runs.model_revision_id -> model_revisions.id`
- `set_runs.variant_id -> variants.id`
