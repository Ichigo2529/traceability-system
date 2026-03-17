# Spec 11 – Errors and validation

- **Backend:** Use `fail(error_code, message, details?)` from lib/http; set status (400, 401, 404, 500). Validation via TypeBox; global handler in app.ts.
- **Frontend:** Show API error message; Zod for form validation. Consistent error codes (e.g. UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND).
