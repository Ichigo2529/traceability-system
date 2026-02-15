# 04 Data Model ERD (Schema Spec + Mermaid)

## Primary entities
- users, roles, user_roles, refresh_tokens
- devices, machines, device_operator_sessions
- models, model_revisions, variants
- bom, routing, routing_steps
- units, unit_links
- events
- inventory_do, component_2d_scans
- label_templates, label_bindings, labels
- serial_counters
- config_audit_logs (recommended)
- holds/exceptions (recommended)

## Mermaid ERD
```mermaid
erDiagram
  USERS ||--o{ USER_ROLES : has
  ROLES ||--o{ USER_ROLES : assigned
  USERS ||--o{ REFRESH_TOKENS : issues
  DEVICES ||--o{ DEVICE_OPERATOR_SESSIONS : hosts
  USERS ||--o{ DEVICE_OPERATOR_SESSIONS : logs_in

  MACHINES ||--o{ DEVICES : assigned
  MODELS ||--o{ MODEL_REVISIONS : has
  MODEL_REVISIONS ||--o{ VARIANTS : has
  MODEL_REVISIONS ||--o{ BOM : defines
  MODEL_REVISIONS ||--o{ ROUTING : defines
  ROUTING ||--o{ ROUTING_STEPS : contains

  MODEL_REVISIONS ||--o{ LABEL_TEMPLATES : owns
  MODEL_REVISIONS ||--o{ LABEL_BINDINGS : binds
  LABEL_TEMPLATES ||--o{ LABELS : generates
  UNITS ||--o{ LABELS : labeled

  UNITS ||--o{ EVENTS : produces
  MACHINES ||--o{ EVENTS : occurs_on
  USERS ||--o{ EVENTS : performed_by

  UNITS ||--o{ UNIT_LINKS : parent
  UNITS ||--o{ UNIT_LINKS : child

  INVENTORY_DO ||--o{ COMPONENT_2D_SCANS : referenced
  SERIAL_COUNTERS ||--o{ LABELS : allocates

  USERS {
    uuid user_id PK
    string username
    string display_name
    string employee_code
    string password_hash
    string auth_source
    boolean is_active
    datetime created_at
  }

Key constraints
model_revisions: one active revision per model (enforced by unique partial index).
events: event_id unique (idempotency).
serial_counters: PK(part_number, shift_day, line_code).
label_bindings: unique(model_revision_id, variant_id, unit_type, process_point).
devices: fingerprint unique.
