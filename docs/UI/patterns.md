# UI patterns

Recurring patterns used in Admin and Station UIs.

---

## 1. List page (Admin)

- Page title + optional "Add" or primary action in the header.
- Toolbar: filters, search, export if applicable.
- Table/list with row actions (view, edit, delete); delete with confirmation dialog.
- Pagination or "Load more" when not using infinite scroll.

---

## 2. Detail page (Admin)

- Back navigation (e.g. to list or parent).
- Title + key metadata at top.
- Tabs or sections for related data (e.g. BOM, routing, history).
- Actions: Edit, Delete, or workflow (Approve, Issue, etc.) with clear feedback.

---

## 3. Form dialog (Admin)

- Modal dialog with form; title reflects action (e.g. "New process", "Edit station").
- Required fields marked; validation on blur and submit.
- Footer: Primary (Save/Submit) and Secondary (Cancel); disable submit while saving.

---

## 4. Station flow (single purpose)

- One main action per screen (e.g. scan, confirm, next).
- Large touch targets; clear success/error message.
- Back or "Exit" to leave flow; optional progress indicator for multi-step.

---

## 5. Queue / pending list

- List of pending items (e.g. offline queue, material requests to approve).
- Per row: key info + actions (Retry, Remove, View).
- Global actions: Retry all, Clear completed; show last sync/error if relevant.

---

## 6. Empty and loading states

- **Empty:** Illustration or icon + short message + primary CTA if applicable.
- **Loading:** Skeleton or spinner for full block; same for tables/lists.
- **Error:** Alert (destructive) + retry or link to support.

---

See [guidelines.md](guidelines.md), [shadcn-guide.md](shadcn-guide.md).
