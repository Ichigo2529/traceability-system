# Skill usage baseline (Traceability System)

## Goal

Define a stable, repeatable way to use installed skills so delivery is faster and safer for this MES/traceability project.

## Scope

- Frontend (Admin/Station UI)
- Backend/API
- Database migration
- Testing
- Security review
- Documentation

## Core rule

Always start from project domain docs first (`docs/specs`, [reference/api-baseline.md](../reference/api-baseline.md), [project/roadmap.md](../project/roadmap.md)), then apply skills to execute.

## Recommended flow by task

### 1) UI/UX implementation

- Primary skills: `web-design-guidelines`, `frontend-design`, `tailwind-design-system`
- Use when: new page/layout/form, visual consistency pass, interaction polish
- Must produce: consistent spacing/typography/states, responsive behavior, accessible focus/ARIA patterns

### 2) Voucher/form-heavy screens

- Primary skills: `web-design-guidelines`, `design-md`
- Use when: paper form to digital UI mapping, dense data tables and inline actions
- Must produce: clear visual hierarchy, low-cognitive-load grouping, explicit totals/validation feedback

### 3) API / backend route work

- Primary skills: `api-design-principles`, `software-backend` (if needed)
- Use when: new endpoint, refactor, validation changes

(Continue per your installed skills; keep domain docs and [process/execution-baseline.md](execution-baseline.md) as the source of truth.)
