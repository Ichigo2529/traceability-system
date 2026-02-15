# SAFE EXECUTION PROTOCOL

This protocol prevents domain-rule violations.

Codex is NOT allowed to:
- Change shift reset boundary.
- Move consumption to binding stage.
- Remove supplier pack tracking.
- Make active revision editable.
- Allocate serial without shift scope.
- Allow label generation offline.

## Mandatory Process

Before implementation:
1. Read `CONTEXT_BOOTSTRAP.md`.
2. Read `docs/design-bible/*`.
3. Summarize enforced constraints.
4. Create a change request document.
5. List impacted rules.

## Domain Safety Gates

### Gate A - Revision immutability
Active revision cannot be modified.

### Gate B - Variant lock
Variant cannot change after first assembly step.

### Gate C - Wash enforcement
Plate must pass Wash1 before bonding.
Component jigs must pass Wash2 before assembly.

### Gate D - Step consumption
Consumption only on step DONE.

### Gate E - Online label
Label and serial allocation must be online.

### Gate F - Serial scope
Serial scope must be `(part_number + shift_day + line_code)`.

### Gate G - Supplier pack
Each pack is a traceable unit with `qty_total` and `qty_remaining`.

## Stop Conditions

Codex must stop if:
- Rule conflict is detected.
- Supplier barcode format is unclear.
- State transition is ambiguous.
- Serial logic is ambiguous.
