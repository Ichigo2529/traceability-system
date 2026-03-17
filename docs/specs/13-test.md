# Spec 13 – Test and quality

- **Backend:** Unit tests (e.g. `bun test`); rules validation script (`rules:validate`). Contract tests where applicable.
- **Pre-commit:** lint-staged (Prettier). PR: CR, rules:validate, tests, docs updated.
- **Go-live gate:** `bun run check:go-live` (check + db:health). See [../operations/uat-checklist.md](../operations/uat-checklist.md).
