# UI/UX guidelines

Single source of truth for Admin and Station UIs. Aligned with [../architecture/tech-stack.md](../architecture/tech-stack.md).

---

## 1. Design direction

- **Theme:** shadcn-style CSS variables; optional dark mode (`dark` class). Same design language for admin and shopfloor.
- **Style:** Clear hierarchy, consistent spacing (e.g. 8px grid), actionable lists and forms.
- **Audience:** Admin = desktop; Station = kiosk/touch, large targets, minimal steps.

### Enterprise priorities (manufacturing context)

- Speed > Beauty | Clarity > Density | Deterministic > Smart
- Scan flow > Mouse flow | Status visibility > Minimalism
- **Environment separation:** Admin → dynamic page; Shopfloor → full-height workspace; Kiosk → single-action screen. Never mix.

---

## 2. Layout

- **Admin:** Shell with sidebar navigation; content area with page title and breadcrumb where useful.
- **Station:** Full-screen flows; one primary action per screen when possible; back/exit visible.
- **Spacing:** Consistent spacing (e.g. 0.5rem, 1rem); Flexbox/grid for alignment.
- **Responsive:** Admin supports desktop; station UIs assume fixed kiosk resolution.

### Navigation rules

- Object has children → Object page. Deep inspection from table → Navigate to object/detail page (or drawer if appropriate). Quick small edit → Dialog. Operator task → Full workspace. Configuration list → Table page.
- **Forbidden:** Dialog inside dialog; editing large object inside table; more than 3 navigation levels; new route for small edits.

---

## 3. Tables and lists

- Use shared `DataTable` / `@traceability/ui` or native table + Tailwind with consistent column widths.
- Sortable columns where useful; loading state (skeleton or spinner) during fetch.
- Row actions: icon buttons (edit, delete, etc.) with tooltips; confirm destructive actions.
- Empty state: message + optional primary action (e.g. "No items — Add first").
- **Rules:** No text wrapping; actions column on the right; row click → object/detail page.

---

## 4. Forms and dialogs

- **Forms:** Label + input per field; shadcn Form/Input/Label or shared `@traceability/ui` Form. react-hook-form + Zod only; no manual useState forms.
- **Validation:** Zod + react-hook-form; show errors inline and on submit. Required fields marked clearly.
- **Dialogs:** Title bar, content, footer with primary (e.g. Save) and secondary (Cancel). Cancel = secondary; Save = primary.
- **Required fields:** Mark clearly; validate before submit.

---

## 5. Feedback and errors

- **Success:** Short toast (e.g. Sonner) or inline message after create/update/delete.
- **Errors:** Field validation → value state. Business rule → MessageStrip (warning). System failure → Alert/MessageBox (error). No random toast errors.
- **Loading:** Page load → skeleton. Table reload → busy indicator. Button action → button busy only. Never freeze entire page.

### Manufacturing status semantics

Use ObjectStatus or Tag only; never plain text: Draft → None | Released → Success | In Process → Warning | Completed → Success | Hold → Warning | Scrap → Error.

---

## 6. Offline and keyboard

- **Offline:** If API unreachable: show offline banner; queue if supported; never silently fail; show sync indicator.
- **Keyboard:** Enter → Confirm/Scan; Esc → Close dialog; Ctrl+S → Save (Admin). Delete requires confirmation; never emphasize delete button.

### Density

- Admin → Compact | Shopfloor → Cozy | Kiosk → Spacious

---

## 7. Accessibility and consistency

- Semantic HTML and Radix/shadcn components; preserve keyboard and screen reader usability.
- **Icons:** Lucide (`lucide-react`); import only icons in use.
- **Naming:** Consistent terminology (e.g. "Material request", "Station", "Revision") across admin and station.

---

## 8. Recurring patterns

### List page (Admin)

Page title + optional "Add" or primary action in header. Toolbar: filters, search, export if applicable. Table with row actions (view, edit, delete); delete with confirmation. Pagination or "Load more" when not using infinite scroll.

### Detail page (Admin)

Back navigation to list or parent. Title + key metadata at top. Tabs or sections for related data. Actions: Edit, Delete, or workflow (Approve, Issue, etc.) with clear feedback.

### Form dialog (Admin)

Modal with form; title reflects action (e.g. "New process", "Edit station"). Footer: Primary (Save/Submit) and Secondary (Cancel); disable submit while saving.

### Station flow (single purpose)

One main action per screen (e.g. scan, confirm, next). Large touch targets; clear success/error message. Back or "Exit" to leave flow; optional progress indicator for multi-step.

### Queue / pending list

List of pending items (e.g. offline queue, material requests to approve). Per row: key info + actions (Retry, Remove, View). Global: Retry all, Clear completed; show last sync/error if relevant.

### Empty and loading states

**Empty:** Illustration or icon + short message + primary CTA if applicable. **Loading:** Skeleton or spinner for block/table. **Error:** Alert (destructive) + retry or link to support.

---

## 9. Station pattern library

Reuse these; do not invent new ones.

| Pattern         | Flow                                                    | Rules                                                                            |
| --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Scan**        | IDLE → SCAN → VALIDATE → RESULT → NEXT                  | Auto focus input; Enter submits; do not clear on error; clear only after success |
| **Pass/Fail**   | Action → Confirm → Save → Toast → Reset                 | Never auto-confirm destructive action                                            |
| **Packing**     | All parts valid → enable PACK; missing part → highlight | Pack disabled until valid                                                        |
| **Assembly**    | Wrong component → Error + Block; correct → Auto advance | —                                                                                |
| **Label print** | Scan → Preview → Print → Confirm                        | Never print without preview                                                      |

**Error display:** Blocking → Dialog; Business → MessageStrip; Field → ValueState; Info → Toast.

---

## 10. Stack and safe execution

**Must use:** shadcn/ui (Radix + Tailwind + Lucide), `@traceability/ui` for shared components, React Query for server state. See [../architecture/tech-stack.md](../architecture/tech-stack.md).

**Forbidden:** MUI, Ant Design, Bootstrap, custom layout systems that replace shadcn. Do not change theme away from project CSS variables without explicit requirement. Do not remove or bypass validation (Zod + API contract). Do not introduce new global state for server data (use React Query + SDK).

When in doubt → fewer user decisions; if uncertain about layout or stack → stop and ask.

---

See [shadcn-guide.md](shadcn-guide.md).
