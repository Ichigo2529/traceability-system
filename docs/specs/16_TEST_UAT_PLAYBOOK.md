# 16 UAT & Test Playbook

## Seed scenario (Marlin family)

Model: 760629200
Revision: R01 ACTIVE
Variants: WITH_SHROUD, NO_SHROUD
Assembly lines:

- Line1 supports WITH_SHROUD + NO_SHROUD
- Line2 supports NO_SHROUD
- Line3 supports WITH_SHROUD

## UAT tests

1. End-to-end WITH_SHROUD batch through pallet
2. End-to-end NO_SHROUD batch through pallet
3. Shared bonding then diverge assembly lines
4. Line switching before first step allowed
5. Line switching after first step blocked
6. Offline during assembly step: events queued and replayed
7. Offline during label generation: blocked
8. Shift boundary serial reset:
   - Generate label at 07:58 → shift_day = previous day
   - Generate label at 08:02 → shift_day = new day; serial resets

## Regression tests

- cannot modify active revision
- cannot activate incomplete revision
- cannot consume more than remaining
- cannot double-consume same step
- trace endpoint returns correct genealogy links
