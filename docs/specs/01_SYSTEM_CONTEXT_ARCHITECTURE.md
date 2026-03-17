# 01 System Context & Architecture

## 1) Goal

Provide full genealogy traceability from inbound materials (DO / supplier lots) to final pallet.

## 2) System components

- Admin Web (config, users/roles, model definitions, templates)
- Shopfloor Apps (Pi5 kiosk stations, PCs for label/FG)
- Backend API (Auth, config, events, label, trace)
- PostgreSQL DB (source of truth)
- Offline queue (Dexie) on shopfloor apps
- Optional integration adapters (LDAP later)

## 3) High-level architecture

````text
Admin Web ───────┐
Shopfloor Apps ──┼──> Backend API (Bun/Elysia) ───> PostgreSQL
                 │             │
                 │             ├── Serial allocator (shift-day)
                 │             ├── Label builder (92-byte templates)
                 │             └── Trace query (genealogy + timeline)
                 │
Shopfloor Offline Queue (Dexie) retries events when network returns

4) Key design pillars
Config-driven: model differences are configuration (BOM, routing, templates, policies).

Revision-safe: active revisions cannot be edited; create new revision.

Event-driven: all production actions are recorded as events; events are idempotent.

Genealogy: parent-child links represent actual material transformations.

Offline-tolerant: most events queue offline; label generation requires online.

5) Shared machine + divergent downstream
Bonding is shared; the variant/model divergence occurs at Assembly binding (late binding allowed).

6) Timezone
All business time rules are Asia/Bangkok (UTC+7).





## End-to-end sequence (Mermaid)

### Shared Bonding then diverge at Assembly by Variant
```mermaid
sequenceDiagram
  participant Prod as Production
  participant Store as Store
  participant Jig as Jigging
  participant W1 as Wash1
  participant Bond as Bonding
  participant W2 as Wash2
  participant Mag as Magnetize
  participant Flux as Flux
  participant A1 as Assembly Line (Pi5)
  participant Label as Label Station
  participant Pack as Packing
  participant FG as FG
  participant API as Backend API
  participant DB as PostgreSQL

  Prod->>API: Create material request
  API->>DB: persist request
  Store->>API: Issue materials per DO
  API->>DB: update inventory_do
  Prod->>Jig: Dispatch materials (Dispatch RFID)
  Jig->>API: PLATE_LOADED / JIG_LOADED events (offline ok)
  API->>DB: create units (PLATE_120, JIGs)
  Jig->>W1: Plate to Wash1
  W1->>API: WASH1_END (plate)
  Bond->>API: BONDING_END (plate+magnet -> ASSY_120)
  API->>DB: create ASSY_120 + links
  W2->>API: WASH2_END (component jigs)
  Mag->>API: MAGNETIZE_DONE
  Flux->>API: FLUX_PASS
  A1->>API: ASSY_BIND_COMPONENTS (select variant if needed)
  API->>DB: lock variant + create links
  A1->>API: PRESS_FIT_*_DONE (consume per step)
  API->>DB: decrement qty_remaining
  A1->>API: FVMI_PASS (create 6 trays)
  API->>DB: create tray units + links
  Label->>API: LABEL_GENERATE_REQUEST (online only)
  API->>DB: serial allocate (shift_day) + create labels
  Pack->>API: OUTER_PACKED
  FG->>API: FG_PALLET_MAPPED
````
