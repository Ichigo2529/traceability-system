# 03 Domain Rulebook (Authoritative)

## A) Shifts and shift_day
Shift schedule:
- Day shift: 08:00–19:59
- Night shift: 20:00–07:59 (next day)

shift_day rule:
- If local time >= 08:00: shift_day = today (YYYY-MM-DD)
- Else: shift_day = yesterday

All serial resets and daily production grouping uses shift_day (not calendar day midnight).

## B) Revisions
- Exactly one ACTIVE revision per model.
- ACTIVE revision cannot be modified (BOM, routing, templates, serial policy).
- To change anything: create new revision and activate it.
- Activation requires readiness validation (see governance doc).

## C) Variants
Variants are optional per revision.
- If a revision defines no variants, system uses DEFAULT variant.
- If variants exist: batch must be assigned a variant before assembly steps.
- Variant is locked once the first assembly step begins (cannot change mid-batch).

Marlin family:
- WITH_SHROUD
- NO_SHROUD
Differences: only shroud component + shroud step.

## D) RFID card circulation (physical)
- Dispatch card: Production → Jigging → Return Production → repeat
- Plate card: Jigging → Wash1 → Bonding → Return Jigging → repeat
- Magnet card: Bonding → Return Jigging → repeat
- Component jig cards (Pin430/Pin300/Shroud/Crash):
  Store → Jigging → Wash2 → Assembly → Return Jigging → repeat

Cards are reused; materials are not reused.

## E) Component jig rule
For Pin430/Pin300/Shroud/CrashStop:
- 1 jig = 1 RFID card = 1 traceable unit
- Each jig has qty_total and qty_remaining.

## F) Wash rules
- Plate must pass Wash1 before Bonding.
- Component jigs must pass Wash2 before Assembly binding.
- If not washed: system blocks binding.

## G) Assembly binding & consumption
- Assembly Start is the binding point: ASSY_120 must be bound to required component jigs.
- Consumption is step-based: deduct qty_remaining only when step completes.
- Prevent double consumption per step.

## H) Shared Bonding machine
Bonding machine can process multiple models/variants.
ASSY output is created at bonding and later routed to assembly lines.

## I) Multi-assembly-lines per model
- A model can run on multiple assembly lines (Line 1/2/3).
- Device config pins the line_code (operator should not manually select line_code).
- A line has capability mapping of supported variants; line must support the batch variant.

Line switching policy:
- Allowed before first assembly step begins.
- After first step: block switching (default strict policy) to maintain audit clarity.

## J) Offline rules
Allowed offline:
- Wash events
- Assembly step events
- Binding events (queued)

Not allowed offline:
- Serial allocation
- Label generation (requires online & server-side locking)

## K) Label rules
- Labels are generated after FVMI inspection (post camera).
- 92-byte 2D barcode for tray labels is template-driven.
- Serial running is 0001–9999 within (part_number + shift_day + line_code).
