# shadcn/ui guide

How we use shadcn/ui (Radix + Tailwind + Lucide) in this project.

---

## 1. Installation and structure (Vite)

Aligned with [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite):

| Item          | Location                            | Notes                                                          |
| ------------- | ----------------------------------- | -------------------------------------------------------------- |
| Config        | `web/apps/admin/components.json`    | `style: new-york`, `cssVariables: true`, `iconLibrary: lucide` |
| Tailwind      | `web/apps/admin/tailwind.config.js` | `darkMode: ["class"]`, `tailwindcss-animate`                   |
| Theme CSS     | `web/apps/admin/src/index.css`      | All `--primary`, `--ring`, etc. (Blue theme)                   |
| Path alias    | `@/` → `./src/`                     | Set in `vite.config.ts` and `tsconfig.json`                    |
| UI components | `web/apps/admin/src/components/ui/` | Button, Input, Card, Dialog, Select, etc.                      |
| Utils         | `web/apps/admin/src/lib/utils.ts`   | `cn()` (clsx + tailwind-merge)                                 |

- **Add components:** From `web/apps/admin`: `npx shadcn@latest add <component>` (e.g. `button`, `dialog`).
- **Monorepo:** Other apps (kiosk-pi5, station-\*) do not use full shadcn; they use `@traceability/ui` + Tailwind and minimal CSS variables.

---

## 2. Theme: Blue

- **Primary/accent:** Blue theme. Variables in `web/apps/admin/src/index.css`:
  - Light: `--primary: oklch(0.523 0.214 259.815)`, `--ring` and sidebar/chart use same blue.
  - Dark: `--primary: oklch(0.707 0.165 254.624)`.
- **Base surface:** Neutral (background, card, muted). Only primary/ring/accent/sidebar-primary use blue.
- Refs: [shadcn theming](https://ui.shadcn.com/docs/theming), [Tailwind colors (blue)](https://ui.shadcn.com/colors#blue).

---

## 3. AI skills (Cursor / AI assistants)

So the AI assistant follows shadcn/ui patterns and project config when generating or fixing UI:

1. **shadcn/ui (required for admin UI)**  
   From project root or `web/apps/admin`:

   ```bash
   npx skills add shadcn/ui
   ```

   See [shadcn Skills](https://ui.shadcn.com/docs/skills). The skill reads `components.json` and provides CLI usage, theming, and composition rules.

2. **Other frontend skills (optional, from [skills.sh](https://skills.sh/))**
   - `vercel-labs/agent-skills` → `vercel-react-best-practices` — React patterns and best practices.
   - `anthropics/skills` → `frontend-design` — UI/UX and frontend design.
   - `antfu/skills` → `vite` — Vite project context (if you use Vite-specific features).

Install with: `npx skills add <owner/repo>` or the specific skill ID shown on skills.sh.

---

## 4. Components

- Use shadcn components from `@/components/ui/*` in admin (Button, Input, Card, Dialog, Select, Checkbox, Label, Alert, etc.).
- Use shared `@traceability/ui` for shared pieces (Card, Button, ConfirmDialog, DataTable, PageLayout, etc.).
- Prefer project conventions in `@traceability/ui` when they encapsulate layout or behaviour.

---

## 5. Icons

- Icons: **Lucide** (`lucide-react`). Import only what you use:
  - `import { Check, ChevronDown } from "lucide-react";`
- Do not import the full icon set; keep bundle size down.

---

## 6. Styling

- Use Tailwind and CSS variables for theming. Override via `className` or theme variables.
- Prefer theme alignment over one-off colors; document overrides in component or pattern doc.
- Scoped CSS or CSS modules for page-specific layout.

---

## 7. Forms and validation

- shadcn Input, Select, Checkbox, Label with react-hook-form; validate with Zod.
- Keep types in sync with API (SDK types); use same schemas for form and API where possible.

---

## 8. Data tables

- Use shared `DataTable` from `@traceability/ui` or native `<table>` + Tailwind.
- For server-side data: TanStack React Query + pagination/sort params; show loading and empty states.
- See [../datatable/TABLE_STANDARDS.md](../datatable/TABLE_STANDARDS.md) for table rules.

---

## 9. References

- [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Tailwind CSS](https://tailwindcss.com/), [Lucide](https://lucide.dev/).
- Project: [guidelines.md](guidelines.md).
