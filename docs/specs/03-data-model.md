# Spec 03 – Data model (schema)

- **Source of truth:** `backend/src/db/schema/`. Summary in [../architecture/database.md](../architecture/database.md).
- **Key areas:** Auth (users, roles, permissions), Config (models, revisions, variants, BOM, routing), Organization (departments, sections, cost centers), Devices, Production events, Genealogy, Labels, Inventory, Material requests, Audit.
- **Changes:** Schema only via Drizzle migrations; no ad-hoc SQL.
