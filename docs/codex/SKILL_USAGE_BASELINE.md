# Skill Usage Baseline (Traceability System)

## Goal
Define a stable, repeatable way to use installed skills so delivery is faster and safer for this MES/Traceability project.

## Scope
- Frontend (Admin/Station UI)
- Backend/API
- Database migration
- Testing
- Security review
- Documentation

## Core Rule
Always start from project domain docs first (`docs/design-bible`, contracts, roadmap), then apply skills to execute.

## Recommended Flow by Task

### 1) UI/UX Implementation
- Primary skills:
  - `web-design-guidelines`
  - `frontend-design`
  - `tailwind-design-system`
- Use when:
  - New page/layout/form
  - Visual consistency pass
  - Interaction polish
- Must produce:
  - Consistent spacing/typography/states
  - Responsive behavior for 1920x1080 + touch
  - Accessible focus/aria patterns

### 2) Voucher/Form-heavy Screens
- Primary skills:
  - `web-design-guidelines`
  - `design-md`
- Use when:
  - Paper form to digital UI mapping
  - Dense data tables and inline actions
- Must produce:
  - Clear visual hierarchy
  - Low-cognitive-load row grouping
  - Explicit totals/validation feedback

### 3) API / Backend Route Work
- Primary skills:
  - `api-design-principles`
  - `software-backend` (if needed)
- Use when:
  - New endpoint
  - Status transition logic
  - Payload/response contract updates
- Must produce:
  - Stable request/response schema
  - Explicit error codes/messages
  - Backward-compatible changes where possible

### 4) Database & Migration Work
- Primary skills:
  - `postgresql-database-engineering`
  - `database-migrations-sql-migrations`
- Use when:
  - New table/column/index
  - Migration safety checks
- Must produce:
  - Non-breaking migration path
  - Correct indexes for critical queries
  - No destructive changes without explicit approval

### 5) Test Coverage
- Primary skills:
  - `webapp-testing`
  - `javascript-testing-patterns`
  - `e2e-testing-patterns`
- Use when:
  - Feature complete PR
  - Regression fix
- Must produce:
  - API happy-path + invalid-path tests
  - UI interaction tests for critical workflows
  - Realtime/update regression checks where applicable

### 6) Security / Hardening
- Primary skills:
  - `security-review`
  - `api-security-best-practices`
  - `security-requirement-extraction`
- Use when:
  - Auth/RBAC/device identity changes
  - Before go-live
- Must produce:
  - Authz checks on protected routes
  - Input validation coverage
  - Secret/key handling and logging review

### 7) Documentation
- Primary skills:
  - `documentation-lookup`
  - `api-documentation-generator`
  - `documentation-templates`
- Use when:
  - Feature merged
  - Contract changed
- Must produce:
  - Updated API contract and usage notes
  - Updated operator/admin flow docs
  - Change log entry

## Project-Specific Execution Order (Default)
1. Validate requirement against domain docs
2. Apply relevant implementation skill(s)
3. Implement code + migration
4. Apply testing skill(s) and run checks
5. Apply security skill for touched area
6. Update docs

## Definition of Done (DoD)
- Build/typecheck passes (`web` + `backend`)
- Critical workflow tested (request -> allocation -> issue -> voucher view)
- Security checks for touched endpoints complete
- Docs/contracts updated for any API/UI changes

## Notes
- Skills accelerate quality but do not replace domain truth.
- Domain truth for this project remains: design-bible + contracts + approved process rules.
