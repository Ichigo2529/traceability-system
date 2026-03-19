# Required reading for AI agents

Before changing UI or frontend behavior, read these in order.

---

## 1. Must read first

1. **[../architecture/tech-stack.md](../architecture/tech-stack.md)**  
   Theme: shadcn CSS variables. Server state: React Query. UI state: useState/Context. Types from `web/packages/sdk`.

2. **[../specs/README.md](../specs/README.md)**  
   Non-negotiable domain rules (revision immutability, variant lock, consumption on step DONE, label online-only, etc.). Do not violate.

3. **[guidelines.md](guidelines.md)**  
   Layout, tables, forms, dialogs, feedback, accessibility, station patterns, stack rules. Keep changes consistent.

---

## 2. When touching UI components

- **[shadcn-guide.md](shadcn-guide.md):** Theme setup, components, icons, styling, forms, data tables.

---

## 3. Rules to never break

- Do not change theme away from project CSS variables (shadcn) without explicit requirement.
- Do not remove or bypass validation (Zod + API contract).
- Do not introduce new global state for server data; use React Query + SDK.
- Do not add Docker or change runtime/package manager without alignment to [tech-stack](../architecture/tech-stack.md).

---

After reading, proceed with edits; update docs if you add new patterns or override guidelines.
