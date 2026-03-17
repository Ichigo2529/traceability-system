# Database (current schema summary)

Summary of tables from `backend/src/db/schema/` — aligned with the actual code.

---

## Auth (`auth.ts`)

| Table              | Short description                                                                     |
| ------------------ | ------------------------------------------------------------------------------------- |
| `users`            | User accounts (username, displayName, passwordHash, authSource, department, isActive) |
| `roles`            | Roles (name, description)                                                             |
| `user_roles`       | User ↔ role (many-to-many)                                                            |
| `refresh_tokens`   | Token rotation                                                                        |
| `permissions`      | Code-level permissions                                                                |
| `role_permissions` | Role ↔ permission (many-to-many)                                                      |

---

## Config / product (`config.ts`)

| Table                  | Short description                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `models`               | Product models (name, code, part_number, pack_size, is_active)                       |
| `model_revisions`      | Revisions per model (revision_code, status: DRAFT/ACTIVE/INACTIVE)                   |
| `variants`             | Variants per revision (code, mapped_codes)                                           |
| `component_types`      | Component types (code, name)                                                         |
| `part_numbers`         | Part number master (part_number, component_type_id, rm_location)                     |
| `bom`                  | BOM per revision (component_type, part_number, qty_per_batch, unit_type, variant_id) |
| `routing`              | Routing per revision                                                                 |
| `routing_steps`        | Steps in routing (step_code, sequence, component_type, consumes_qty)                 |
| `master_routing_steps` | Shared step code catalog (step_code, description)                                    |

---

## Organization (`organization.ts`)

| Table                       | Short description                                            |
| --------------------------- | ------------------------------------------------------------ |
| `departments`               | Departments (code, name, section_id)                         |
| `processes`                 | Processes (process_code, name, sequence_order)               |
| `stations`                  | Stations (station_code, name, line, process_id)              |
| `workflow_approval_configs` | Approval config by flow/level/role                           |
| `app_settings`              | Key-value config                                             |
| `cost_centers`              | Cost centers (group_code, cost_code, section_id, is_default) |
| `sections`                  | Sections (section_code, section_name)                        |
| `section_cost_centers`      | Section ↔ cost center                                        |
| `user_sections`             | User ↔ section (one section per user)                        |
| `user_departments`          | User ↔ department (one department per user)                  |

### App settings note (barcode templates)

- `app_settings.key = "barcode_templates"` stores only **custom** barcode template master records.
- Built-in **system** templates are defined in backend code and merged at runtime.
- Effective template lookup is therefore: merged `SYSTEM + CUSTOM` map (with custom key override).

---

## Devices (`devices.ts`)

| Table                      | Short description                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `machines`                 | Machines/lines (name, machine_type, line_code, capabilities)                                                        |
| `devices`                  | Kiosk/station devices (fingerprint, device_type, machine_id, station_id, process_id, secret_key, last_heartbeat_at) |
| `device_operator_sessions` | Current device session (device_id, user_id, started_at, ended_at)                                                   |

---

## Production / genealogy (`production.ts`, `genealogy.ts`)

| Table         | Short description                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `units`       | Traceable units (unit_type, status, model_revision_id, variant_id, machine_id, line_code)                    |
| `unit_links`  | Genealogy links (parent_unit_id, child_unit_id, link_type)                                                   |
| `events`      | Events (id = client event_id, unit_id, event_type, payload, shift_day, created_at_device)                    |
| `set_runs`    | Production runs (set_code, model_revision_id, variant_id, assy_unit_id, status)                              |
| `containers`  | Containers in set_run (container_type, unit_id)                                                              |
| `bag100`      | Bulk bag reference (supplier_pack_id, part_number, qty_initial)                                              |
| `consumption` | Consumption ledger (set_run_id, component_type_id, qty, source_type, source_uid, step_code, idempotency_key) |

---

## Labels (`labels.ts`)

| Table             | Short description                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `label_templates` | Label templates (template_body 92-char, revision_id)                                                     |
| `label_bindings`  | Bindings (model_revision_id, variant_id, unit_type, process_point) → label_template_id                   |
| `labels`          | Issued labels (unit_id, label_template_id, serial_number, label_data, shift_day, line_code, part_number) |
| `serial_counters` | PK (part_number, shift_day, line_code), last_serial                                                      |

---

## Inventory / supplier (`inventory.ts`)

| Table                    | Short description                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `suppliers`              | Suppliers (name, code, vendor_id)                                                                                     |
| `inventory_do`           | Delivery orders (do_number, supplier_id, part_number, lot_number, material_code, total_qty, qty_received, qty_issued) |
| `supplier_packs`         | Supplier packs (unit_id, part_number, supplier_id, do_id, pack_barcode_raw, pack_qty_remaining)                       |
| `component_2d_scans`     | 2D scan records (inventory_do_id, supplier_pack_id, unit_id, scan_data, parsed_data)                                  |
| `supplier_part_profiles` | Part profile per supplier (part_number, supplier_part_number, parser_key, default_pack_qty)                           |

---

## Material requests (`material-requests.ts`)

| Table                          | Short description                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `material_requests`            | Requests (request_no, dmi_no, request_date, model_id, section/cost_center, status: REQUESTED/APPROVED/REJECTED/ISSUED/CANCELLED) |
| `material_request_items`       | Line items (part_number, requested_qty, issued_qty, do_number, lot_number)                                                       |
| `material_request_item_issues` | Issue records (do_id, do_number, issued_packs, issued_qty)                                                                       |

---

## Audit / holds (`audit.ts`)

| Table               | Short description                                                      |
| ------------------- | ---------------------------------------------------------------------- |
| `config_audit_logs` | Config audit (entity_type, entity_id, action, before_data, after_data) |
| `holds`             | Units on hold (unit_id, hold_type, status: OPEN/RESOLVED/SCRAPPED)     |

---

## Migrations

- Generate: `bun run db:generate` (or per root scripts)
- Run: `bun run db:migrate`
- Seed: `bun run db:seed`

The source of truth for schema is `backend/src/db/schema/`; this document is a summary only.
