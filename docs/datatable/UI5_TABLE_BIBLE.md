# UI5 Table Bible (Admin) — _deprecated_

**Superseded by [TABLE_STANDARDS.md](TABLE_STANDARDS.md).** The project now uses shadcn/ui and shared DataTable; rules are unchanged, references updated.

---

_(Original content below kept for history.)_

---

# UI5 Table Bible (Admin) — Enforced by DataTable.tsx

Scope:

- Applies to ALL Admin pages that render tables using the shared DataTable component (TanStack + UI5 <Table>).

- Applies to tables in Admin inspection + FCL startColumn.

- Shopfloor/Kiosk screens may use different patterns (see UX_BIBLE).

Goal:

- Single-line rows (NO wrapping)

- Stable row height (Compact feel)

- Predictable column widths

- Consistent Actions/Status behavior

- Enterprise-grade Fiori Web UX

---

## Official Reference Reading (Must Understand)

UI5 Web Components:

https://ui5.github.io/webcomponents/

UI5 Web Components for React:

https://ui5.github.io/webcomponents-react/

UI5 Table (React docs):

https://ui5.github.io/webcomponents-react/?path=/docs/data-display-table--docs

SAP Fiori Design System (Web):

https://www.sap.com/design-system/fiori-design-web/

Fiori Table guidelines:

https://www.sap.com/design-system/fiori-design-web/ui-elements/table/

Fiori Object Status:

https://www.sap.com/design-system/fiori-design-web/ui-elements/object-status/

Important:

- These links are references.

- If examples conflict with this Bible, this Bible wins for this project.

---

## 1) HARD RULE — No Wrap (Admin Only)

Admin tables MUST NEVER wrap text.

All headers + cells must be single-line:

- white-space: nowrap

- overflow: hidden

- text-overflow: ellipsis

Forbidden:

- <br/>

- newline rendering

- stacked blocks that create multi-line rows

- variable-height table rows

---

## 2) Enforced Implementation (Global Fix Only)

No-wrap behavior is enforced ONLY in the shared DataTable component:

- via UI5 ::part(content) styling for header and body cells

- plus a wrapper div for every cell render

Pages MUST NOT add ad-hoc per-page fixes.

---

## 3) Column Width Policy

Columns should define a width strategy:

- Prefer minSize for text columns

- Use fixed size only for short numeric/actions columns

Actions column:

- fixed 80–110px

- last column only

- header must be empty string

---

## 4) Status Column Policy

Status must be semantic:

- ObjectStatus or Tag (preferred)

- StatusBadge allowed only if it maps to the same immutable semantics

Never custom HTML badges.

---

## 5) Multi-token fields (Cost Center / Section / Long IDs)

Do NOT stack vertically.

Allowed:

- Join values into a single line using " / " or " • "

- Ellipsis in table is expected

- Full value can be exposed via tooltip/title, popover, or Object Page

Forbidden:

- multi-line formatting in a cell

---

## 6) Loading / Empty / Error

Loading:

- Show skeleton rows (table area only)

Empty:

- Use EmptyState / IllustratedMessage

Errors:

- Business rule errors → MessageStrip

- System failures → MessageBox

No random toast errors for table failures.

---

## 7) Governance Rule

If wrapping occurs again:

- Fix must be applied in DataTable.tsx (shared)

- Never patch individual pages first
