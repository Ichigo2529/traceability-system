# UI/UX guidelines

Standards for Admin and Station UIs. Aligned with [../architecture/tech-stack.md](../architecture/tech-stack.md).

---

## 1. Design direction

- **Theme:** shadcn-style CSS variables; optional dark mode (`dark` class). Same design language for admin and shopfloor.
- **Style:** Clear hierarchy, consistent spacing (e.g. 8px grid), actionable lists and forms.
- **Audience:** Admin = desktop; Station = kiosk/touch, large targets, minimal steps.

---

## 2. Layout

- **Admin:** Shell with sidebar navigation; content area with page title and breadcrumb where useful.
- **Station:** Full-screen flows; one primary action per screen when possible; back/exit visible.
- **Spacing:** Use consistent spacing (e.g. 0.5rem, 1rem) and FlexBox/grid for alignment.
- **Responsive:** Admin supports desktop; station UIs assume fixed kiosk resolution.

---

## 3. Tables and lists

- Use shared `DataTable` / `@traceability/ui` or native table + Tailwind with consistent column widths.
- Sortable columns where useful; loading state (skeleton or spinner) during fetch.
- Row actions: icon buttons (edit, delete, etc.) with tooltips; confirm destructive actions.
- Empty state: message + optional primary action (e.g. "No items — Add first").

---

## 4. Forms and dialogs

- **Forms:** Label + input per field; use shadcn Form/Input/Label or shared `@traceability/ui` Form component.
- **Validation:** Zod + react-hook-form; show errors inline and on submit.
- **Dialogs:** Title bar, content, footer with primary (e.g. Save) and secondary (Cancel).
- **Required fields:** Mark clearly; validate before submit.

---

## 5. Feedback and errors

- **Success:** Short toast (e.g. Sonner) or inline message after create/update/delete.
- **Errors:** Show API error message; use shadcn `Alert` (destructive) for block-level errors.
- **Loading:** Skeleton or spinner for full-page/overlay; button loading state for actions.

---

## 6. Accessibility and consistency

- Use semantic HTML and Radix/shadcn components; preserve keyboard and screen reader usability.
- Icons: **Lucide** (`lucide-react`); import only icons in use.
- Naming: consistent terminology (e.g. "Material request", "Station", "Revision") across admin and station.

---

See [shadcn-guide.md](shadcn-guide.md), [patterns.md](patterns.md), [fcl-standards.md](fcl-standards.md).
