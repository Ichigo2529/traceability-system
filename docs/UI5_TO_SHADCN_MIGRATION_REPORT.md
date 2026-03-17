# UI5 → shadcn/ui Migration Report

## 1. Migration Summary

This document records the **completed** migration from OpenUI5 / UI5 Web Components for React to **shadcn/ui** and Tailwind CSS in the traceability-system monorepo. The migration is **UI-only**: business logic, API contracts, validation, state, routing, and feature workflows were preserved.

**Current state (100% migrated):**

- **Admin app** (`web/apps/admin`): Fully on shadcn/ui + Tailwind + Lucide. No `@ui5/*` dependencies. Route `/test-ui` uses `UISmokeTest` page (renamed from `Ui5SmokeTest`).
- **Station apps** (`station-fg`, `station-packing`, `station-assembly`, `station-label`): All use `@traceability/ui` (Card, Button) and Tailwind. No `@ui5/*` dependencies.
- **Kiosk** (`kiosk-pi5`): Uses `@traceability/ui` and Tailwind (no full shadcn/Radix set). Theme toggling uses class-based dark mode (`app-theme` in localStorage, `dark` class on `document.documentElement`) instead of UI5 `setTheme`. Kept lightweight so future customisation stays easy; can add shadcn later if needed.
- **@traceability/ui**: No UI5. Components use Tailwind, Radix AlertDialog, and Lucide.
- **@traceability/material-ui**: No UI5 (per prior migration).

---

## 2. Major Component Replacements

| Old (UI5)                     | New (shadcn / Tailwind)                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| ShellBar + SideNavigation     | Custom header + sidebar (Tailwind + Lucide)                                      |
| DynamicPage / PageLayout      | Custom `PageLayout` (div + Tailwind)                                             |
| UI5 ThemeProvider / setTheme  | ThemeContext with `document.documentElement.classList` ("dark") or none          |
| Button (design prop)          | shadcn `Button` or `@traceability/ui` Button (variant: primary/secondary/danger) |
| Input / TextArea              | shadcn `Input` / `Textarea`                                                      |
| Select + Option               | shadcn (Radix) `Select`                                                          |
| CheckBox                      | shadcn (Radix) `Checkbox`                                                        |
| Label                         | shadcn (Radix) `Label`                                                           |
| Card, CardHeader, Title, Text | shadcn `Card` or `@traceability/ui` `Card` (title, description, children)        |
| Dialog / Bar                  | Radix `Dialog`; custom `Modal`                                                   |
| MessageStrip                  | shadcn `Alert`                                                                   |
| Tag (badge)                   | shadcn `Badge`                                                                   |
| Toast                         | Sonner via `useToast` hook                                                       |
| ObjectStatus                  | Custom `StatusBadge` (Tailwind)                                                  |
| EmptyState                    | Custom `EmptyState` (Tailwind + Lucide)                                          |
| ConfirmDialog                 | Radix `AlertDialog` in `@traceability/ui`                                        |
| DataTable                     | Native `<table>` + Tailwind + Lucide in `@traceability/ui`                       |
| AppShell nav icons            | Lucide via `nav-icons.tsx`                                                       |

---

## 3. Removed / No Longer Used

- **All apps:** No `@ui5/webcomponents-react`, `@ui5/webcomponents-base`, `@ui5/webcomponents-icons`, `@ui5/webcomponents-localization`, or `@ui5/webcomponents`. No `ThemeProvider` or `setTheme` from UI5.
- **Admin:** No `src/ui5.ts`; no `sap-ui-config` in HTML. Smoke test page renamed to `UISmokeTest`; route remains `/test-ui`.
- **Station apps:** No `sap-ui-config` in index.html; no `ui5-button` or `station-content ui5-button` in CSS.
- **Kiosk:** ThemeContext uses `app-theme` (light/dark) and `document.documentElement.classList.add/remove('dark')` instead of `setTheme` from UI5.

---

## 4. Packages Using UI5

**None.** All web apps and shared packages are off OpenUI5/UI5 Web Components.

---

## 5. Validation

- **Dependency install:** Run `bun install` at repo root (and in `web` if needed). No `@ui5/*` in app `package.json` files.
- **TypeScript:** `bun run check` (or `tsc` per app).
- **Build:** `bun run build:admin`, `bun run build:kiosk`, and build each station app as needed.
- **Lint:** `bun run check:web` (or per-app lint).

---

## 6. Summary

- **Done:** Full migration to shadcn/ui + Tailwind + Lucide. Admin, all station apps, and kiosk use `@traceability/ui` and/or admin shadcn components. No OpenUI5/UI5 code or dependencies remain in the repo.
- **Docs:** README, `.cursorrules`, and this report updated to describe the current stack and remove UI5 references.
