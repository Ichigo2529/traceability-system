# Spec 05 – API contract

- **Response shape:** Success `{ success: true, data }`; Error `{ success: false, error_code, message, details? }`.
- **Auth:** JWT access + refresh; device token + operator session for station events.
- **Validation:** TypeBox on all route bodies/params. See [../reference/api-baseline.md](../reference/api-baseline.md), [../architecture/api-and-routes.md](../architecture/api-and-routes.md).
- **Change policy:** No path removal without deprecation; breaking changes in PR title.
