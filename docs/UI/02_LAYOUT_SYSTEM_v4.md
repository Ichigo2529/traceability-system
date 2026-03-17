# Layout System v4

Design Language: SAP Fiori Web (Horizon)
Implementation: @ui5/webcomponents-react

Reference: [UI5 Web Components React – DynamicPage](https://ui5.github.io/webcomponents-react/?path=/docs/layouts-floorplans-dynamicpage--docs), [Fiori Dynamic Page](https://www.sap.com/design-system/fiori-design-web/floorplans/dynamic-page-layout/).

---

## 1. Admin Layout

Must use DynamicPage (via shared `PageLayout` from `@traceability/ui`).

**Standard structure (UI5 DynamicPage):**

```
DynamicPage
 ├─ DynamicPageTitle (titleArea)
 │   ├─ heading (title + optional icon, back button)
 │   └─ actionsBar (headerActions)
 ├─ DynamicPageHeader (headerArea, optional)
 │   ├─ toolbar
 │   ├─ actions
 │   └─ filters
 └─ Content (children)
```

- **Title**: Page heading; primary actions go in `headerActions` (actionsBar) so they stay visible when scrolling (sticky).
- **Header** (DynamicPageHeader): Toolbar / actions / filters when provided; this area **collapses on scroll** (S/4 behavior). Put KPI/summary blocks here, not primary actions.
- **Content**: Page body; scrolls under the collapsed header. Use `var(--spacing-xl)` or theme vars for padding. No hardcoded HEX.

**S/4 DynamicPage collapse:** When the user scrolls down, only the title bar (heading + actionsBar) remains visible; the header content (toolbar/filters) collapses. Do not put Edit/Delete/Approve etc. in toolbar—put them in `headerActions` so they stay sticky on the right.

**Button design (Fiori):**

- Primary → design="Emphasized"
- Secondary → Transparent
- Destructive → Negative

Only one emphasized button per section.

---

## 2. Object Page

If entity has children → Object Page. Use the same `PageLayout` with collapse behavior.

- **Title**: Object identifier (e.g. request no, document id).
- **headerActions**: Put Edit, Delete, Copy, Approve, Reject, Print etc. here so they stay sticky on the right when scrolling.
- **toolbar**: Put KPI/summary (e.g. Number of Items, Status, Total Value) here; this block collapses on scroll.
- **Content**: Tabs, sections, tables; scrolls under the collapsed header.

Footer only if required.

---

## 3. Tables

Use DataTable only.

Rules:

- No text wrapping
- Actions column right
- Row click → Object Page
- Empty → IllustratedMessage

No custom table implementation.

---

## 4. Dialog

Use FormDialog component.

Cancel → Transparent  
Save → Emphasized

Form logic:
react-hook-form + zod only

No manual useState forms.

---

## 5. Theme Enforcement

Horizon Theme only.

**Required:**

- Use UI5/Horizon CSS variables only (e.g. `var(--sapBrandColor)`, `var(--sapTile_Background)`, `var(--sapContent_LabelColor)`).
- PageLayout icon colors: map semantic keys (blue, green, red, etc.) to theme vars only (e.g. blue → `--sapBrandColor`).

**Forbidden:**

- Hardcoded HEX
- Custom gradients or shadows that override theme
- External UI frameworks (Tailwind, MUI, Ant, Bootstrap)

See [UI5 Theming](https://sap.github.io/ui5-webcomponents/docs/advanced/theming-part2/).
