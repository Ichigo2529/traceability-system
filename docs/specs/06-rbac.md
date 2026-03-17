# Spec 06 – RBAC

- **Roles and permissions:** Stored in DB (roles, permissions, role_permissions, user_roles). Enforced in backend routes (e.g. authDerive, role checks).
- **Frontend:** RoleGuard (e.g. ADMIN for /admin, OPERATOR for /station). Routes and UI elements gated by role.
- **Audit:** Login/logout and sensitive actions logged to config_audit_logs.
