# Safe Execution Protocol v4

Before writing UI:

1. Read 00_AUTHORITY_ORDER.md
2. Identify environment (Admin / Shopfloor / Kiosk)
3. Apply Navigation Decision Matrix
4. Confirm no forbidden library used
5. Confirm layout matches environment

Forbidden:

- Tailwind
- MUI
- Ant
- Bootstrap
- Custom layout systems

Must use:
@ui5/webcomponents
@ui5/webcomponents-react

If uncertain → STOP and ask.
