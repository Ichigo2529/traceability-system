# Safe execution protocol

This protocol prevents domain-rule violations.

Automated or AI-assisted changes must NOT:

- Change shift reset boundary.
- Move consumption to binding stage.
- Remove supplier pack tracking.
- Make active revision editable.
- Allocate serial without shift scope.
- Allow label generation offline.

## Mandatory process

Before implementation:

1. Read [../history/context-bootstrap.md](../history/context-bootstrap.md).
2. Read `docs/specs/`.
3. Summarize enforced constraints.
4. Create a change request document.
5. List impacted rules.

## Domain safety gates

- **Gate A:** Revision immutability (active revision cannot be modified).
- **Gate B:** Variant lock (variant cannot change after first assembly step).
- **Gate C:** Wash enforcement (plate Wash1 before bonding; jigs Wash2 before assembly).
- **Gate D:** Step consumption (consumption only on step DONE).
- **Gate E:** Online label (label and serial allocation must be online).
- **Gate F:** Serial scope (part_number + shift_day + line_code).
- **Gate G:** Supplier pack auditable end-to-end.
