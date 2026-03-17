# Required reading for AI agents

Before changing UI or frontend behavior, read these in order.

---

## 1. Must read first

1. **[../architecture/tech-stack.md](../architecture/tech-stack.md)**
   - Theme: `sap_horizon`. Server state: React Query. UI state: useState/Context. Types from `web/packages/sdk`.

2. **[../specs/README.md](../specs/README.md)**
   - Non-negotiable rules (revision immutability, variant lock, consumption on step DONE, label online-only, etc.). Do not violate.

3. **[guidelines.md](guidelines.md)**
   - Layout, tables, forms, dialogs, feedback, accessibility. Keep changes consistent.

---

## 2. When touching UI components

- **[shadcn-guide.md](shadcn-guide.md):** Theme setup, components, icons, styling.
- **[patterns.md](patterns.md):** List page, detail page, form dialog, station flow, queue, empty/loading.

---

## 3. When changing layout (master–detail, columns)

- **[fcl-standards.md](fcl-standards.md):** When to use FCL, column roles, behavior.

---

## 4. Rules to never break

- Do not change theme away from `sap_horizon` without explicit requirement.
- Do not remove or bypass validation (Zod + API contract).
- Do not introduce new global state for server data; use React Query + SDK.
- Do not add Docker or change runtime/package manager without alignment to [tech-stack](../architecture/tech-stack.md).

---

After reading, proceed with edits; update docs if you add new patterns or override guidelines.
