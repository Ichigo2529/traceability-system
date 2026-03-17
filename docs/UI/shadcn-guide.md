# shadcn/ui guide

How we use shadcn/ui (Radix + Tailwind + Lucide) in this project.

---

## 1. Setup

- **Theme:** CSS variables in `index.css` (e.g. `--background`, `--foreground`, `--card`, `--radius`). Dark mode via `dark` class on `document.documentElement`.
- **Admin app:** Components in `web/apps/admin/src/components/ui/` (Button, Input, Card, Dialog, Select, etc.). Add with `npx shadcn@latest add <component>` when needed.
- **Station apps / Kiosk:** Use `@traceability/ui` (Card, Button, etc.) + Tailwind; no full Radix set unless we add it later.

---

## 2. Components

- Use shadcn components from `@/components/ui/*` in admin (Button, Input, Card, Dialog, Select, Checkbox, Label, Alert, etc.).
- Use shared `@traceability/ui` for shared pieces (Card, Button, ConfirmDialog, DataTable, PageLayout, etc.).
- Prefer project conventions in `@traceability/ui` when they encapsulate layout or behaviour.

---

## 3. Icons

- Icons: **Lucide** (`lucide-react`). Import only what you use:
  - `import { Check, ChevronDown } from "lucide-react";`
- Do not import the full icon set; keep bundle size down.

---

## 4. Styling

- Use Tailwind and CSS variables for theming. Override via `className` or theme variables.
- Prefer theme alignment over one-off colors; document overrides in component or pattern doc.
- Scoped CSS or CSS modules for page-specific layout.

---

## 5. Forms and validation

- shadcn Input, Select, Checkbox, Label with react-hook-form; validate with Zod.
- Keep types in sync with API (SDK types); use same schemas for form and API where possible.

---

## 6. Data tables

- Use shared `DataTable` from `@traceability/ui` or native `<table>` + Tailwind.
- For server-side data: TanStack React Query + pagination/sort params; show loading and empty states.
- See [../datatable/TABLE_STANDARDS.md](../datatable/TABLE_STANDARDS.md) for table rules.

---

## 7. References

- [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Tailwind CSS](https://tailwindcss.com/), [Lucide](https://lucide.dev/).
- Project: [guidelines.md](guidelines.md), [patterns.md](patterns.md).
