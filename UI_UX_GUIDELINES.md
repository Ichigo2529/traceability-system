# Traceability System UI/UX Guidelines

This document serves as the **Single Source of Truth** for UI/UX standards in the Traceability System. All new features, pages, and UI modifications must adhere to these rules to maintain a cohesive, professional, and performant user experience based on the **SAP Fiori** design language via `@ui5/webcomponents-react`.

---

## 1. Core Principles

- **Consistency**: Use standard UI5 components. Avoid custom generic HTML (`<div>`, `<span>`) for interactive elements unless absolutely necessary for layout containers.
- **Role-Based Simplicity**: Show users only what they need. Respect the `adminNav` role restrictions.
- **High-Tech Premium Look**: The system should feel snappy, modern, and Fiori-compliant. Use subtle shadows, proper spacing, and standard UI5 `design` variants (e.g., `Emphasized` for primary buttons).

---

## 2. Layouts & Structure

### Admin Pages (`DynamicPage` Layout)
All admin management pages (e.g., Users, Models, Stations) must use the `PageLayout.tsx` wrapper which implements the `DynamicPage` structure.

**Rules:**
1. **Title Area**: Include a clear title and an appropriate standard icon from `@ui5/webcomponents-icons`.
2. **Header Actions (Top Right)**: 
   - Primary action (e.g., "New User", "Create Model") must be an `Emphasized` Button.
   - Secondary actions (e.g., View Toggles) must be `Transparent` Buttons.
3. **Filter Area**: Place search bars and filter dropdowns in the `headerArea` below the actions.

### Container Sizing
- Never use fixed pixel widths for primary content (`width: 800px`). Always use responsive units (`100%`, `flex: 1`).
- The maximum width for standard admin pages is constrained by the `PageLayout` wrapper. Do not fight it with negative margins unless implementing full-screen tabs (like `RevisionDetailsPage`).

---

## 3. Data Tables

`DataTable` (not analytical table) is the standard for displaying lists of records.

**Rules:**
1. **No Wrapping**: Configure columns with reasonable widths (`min-width`, `max-width`). Do not let text wrap indefinitely. Use CSS `text-overflow: ellipsis` and `white-space: nowrap` for long data (like UUIDs or long paths).
2. **Actions Column**: Always place the "Actions" column at the far right. Use `Transparent` Buttons with icons (`edit`, `delete`) for row actions.
3. **Hover Effects**: All interactive `DataTable` rows should feature the subtle Fiori hover effect (`cursor: pointer` + background color shift on hover) if they are clickable.
4. **Empty State**: Use the standard `IllustratedMessage` component when a table has no data, utilizing the `NoData` illustration.

---

## 4. Dialogs (Forms & Modals)

All pop-ups and forms must use the standardized `FormDialog.tsx` component.

**Rules:**
1. **Structure**: 
   - `headerText`: Clear and actionable (e.g., "Add Routing Step").
   - `content`: Wrap form fields in the standard `<Form>` component.
   - `footer`: Must contain a "Cancel" (`Transparent`) and "Save"/"Submit" (`Emphasized`) button.
2. **Validation**: Use `react-hook-form` + `zod` for all form state and validation. Do not use manual state objects (`useState({ field: '' })`) for forms.
3. **Read-Only Data**: If a field is auto-calculated or fetched from Master Data (e.g., RM Location in BOM), it must be set to `readonly` and visually indicated as locked (greyed out or standard UI5 readonly state).

---

## 5. Visual Specifics & CSS

### Colors & Theming
- Rely on UI5 CSS Variables (`var(--sapThemeColor)`, `var(--sapTitleColor)`). Do not hardcode HEX/RGB colors for text or backgrounds within components, as this breaks the Dark/Light mode toggle.
- **Status Colors**: Use standard UI5 Value States:
  - `None` (Grey/Neutral) - Inactive / Draft
  - `Success` (Green) - Active / Approved / Completed
  - `Warning` (Orange) - Pending / Near Limit
  - `Error` (Red) - Scrap / Failed / Error

### Animations
- Use the standard staggered fade-slide entrance animations for table rows and tab content (`className="animate-fade-in"`).
- **Scrollbar Restraint**: Never use animations (`translateY`) that expand the DOM vertically beyond 100vh on initial render, as this causes flickering scrollbars. Stick to `opacity`, slight `scale`, or standard CSS transitions.

---

## 6. Development Workflow Requirements

1. **Icons**: Always verify an icon exists in the `@ui5/webcomponents-icons` registry before using it. Import it directly at the top of the file.
2. **TypeScript**: Strict typing is mandatory. Do not use `any` unless bypassing a known library bug (like the `DynamicPage` slot bug). Use proper SDK interfaces.
3. **API Integration**: All data fetching must use `@tanstack/react-query` (`useQuery`, `useMutation`) wrapping the `@traceability/sdk` endpoints. Direct `fetch` calls in components are prohibited.

## 7. Navigation Rules (Very Important)

The system follows a **Drill-Down Navigation Pattern** — NOT modal-driven navigation.

Hierarchy navigation must follow:

List → Object Page → Sub Object → Detail Panel

### Allowed Navigation Types

| Use Case | UI Pattern |
|--------|------|
| Create / Edit small record | Dialog |
| View record details | New Page |
| View child collection | Tab in Object Page |
| Deep detail / history | Flexible Column Layout (Side Panel) |

### Forbidden
- Do NOT open dialogs inside dialogs
- Do NOT edit large objects inside tables
- Do NOT open a new route for small edits

## 8. Shopfloor UI Rules (Operator-First Design)

Shopfloor screens are NOT admin screens.

### Priorities
1. Speed over beauty
2. Scan flow over mouse flow
3. Keyboard / Scanner friendly
4. Large targets for gloves usage

### Input Rules
- Barcode input must auto focus
- Enter key must submit
- No dropdown for frequently scanned data
- Avoid scrolling in main operation area

### Visual Rules
- Minimum touch target: 44px
- Critical actions must be color + icon + text
- Never hide important status in tooltips


## 9. Data Loading & Error Behavior

### Loading
- Page load → Skeleton
- Table reload → Busy indicator
- Button action → Button busy state only (no full page block)

### Errors
- Validation error → inline field message
- Business rule error → MessageStrip (Warning)
- System error → MessageBox (Error)

### Offline (Critical)
If API unreachable:
- Show Offline banner
- Allow queueing actions if feature supports offline mode
- Never silently fail mutations


## 10. Manufacturing Status Language

These meanings must NEVER change across the system.

| Status | Meaning | Color |
|------|------|------|
| Draft | Not released | Neutral |
| Released | Ready for production | Success |
| In Process | Currently running | Warning |
| Completed | Finished good | Success |
| Hold | Blocked by QC | Warning |
| Scrap | Failed | Error |

Always use ObjectStatus or Tag component — never plain text.

## Keyboard Shortcuts

Enter = Confirm / Scan submit
Esc = Close dialog
Ctrl+S = Save form (Admin pages)

Delete must always require confirmation dialog.
Never place delete as emphasized button.

Admin tables = Compact
Shopfloor tables = Cozy
Kiosk = Spacious