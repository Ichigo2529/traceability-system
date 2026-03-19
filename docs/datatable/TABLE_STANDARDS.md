# Table standards (Admin) — enforced by DataTable

Scope:

- Applies to ALL Admin pages that render tables using the shared DataTable component (`@traceability/ui` or admin DataTable).
- Applies to all Admin list and inspection tables that use DataTable.
- Shopfloor/Kiosk screens may use different patterns (see UI guidelines).

Goal:

- Single-line rows (no wrapping)
- Stable row height (compact feel)
- Predictable column widths
- Consistent Actions/Status behaviour
- Clear, scannable tables

---

## 1) Hard rule — no wrap (Admin only)

Admin tables MUST NOT wrap text.

All headers and cells must be single-line:

- `white-space: nowrap`
- `overflow: hidden`
- `text-overflow: ellipsis`

Forbidden:

- `<br/>`, newline rendering
- Stacked blocks that create multi-line rows
- Variable-height table rows

---

## 2) Where it’s enforced

No-wrap behaviour is enforced in the **shared DataTable** component (via Tailwind/CSS on header and body cells, and a wrapper for each cell render).

Pages MUST NOT add ad-hoc per-page fixes.

---

## 3) Column width policy

- Prefer `minWidth`/min size for text columns.
- Use fixed width only for short numeric/actions columns.

Actions column:

- Fixed 80–110px
- Last column only
- Header: empty string

---

## 4) Status column policy

Status must be semantic:

- Use shared `StatusBadge` or shadcn `Badge` with consistent variants.
- Map to the same immutable semantics (e.g. approval status, workflow state).

Avoid custom ad-hoc HTML badges.

---

## 5) Multi-token fields (e.g. cost center, section, long IDs)

Do NOT stack vertically in a cell.

Allowed:

- Join values in one line with " / " or " • "
- Ellipsis in table; full value in tooltip/title or popover

Forbidden:

- Multi-line formatting inside a cell

---

## 6) Loading / empty / error

- **Loading:** Skeleton rows in the table area only.
- **Empty:** Use EmptyState (or illustrated message + CTA).
- **Errors:** Business rule errors → Alert; system failures → error message/toast as appropriate. No random toasts for table load failures.

---

## 7) Governance

If wrapping appears again:

- Fix must be applied in the shared DataTable component.
- Do not patch individual pages first.
