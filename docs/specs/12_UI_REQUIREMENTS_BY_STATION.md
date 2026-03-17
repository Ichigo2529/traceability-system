# 12 UI Requirements by Station (Pi5 / PC)

## Common header (all shopfloor screens)

- Machine name
- Station type
- Line (line_code)
- Operator (display_name + id)
- Network: Online/Offline
- Pending queue: N
- Shift_day label

## Station: Jigging (Plate load)

Actions:

- Scan/assign Plate RFID (5 jigs = 120)
- Confirm creation of PLATE_120 unit
  Errors:
- REVISION_NOT_READY (if model not active)
- INVALID_REQUEST

## Station: Wash1 (Plate)

- Scan Plate RFID
- Confirm WASH1_END

## Station: Wash2 (Component jigs)

- Scan jig RFID (Pin430/Pin300/Shroud/Crash)
- Confirm WASH2_END
  Errors:
- COMPONENT_ALREADY_WASHED (optional warning)

## Station: Bonding (shared)

- Scan Plate RFID
- Scan Magnet RFID
- Confirm Bonding creates ASSY_120
  Show:
- Magnet remaining after consume
  Errors:
- COMPONENT_NOT_WASHED (plate not wash1)
- INSUFFICIENT_QTY_REMAINING (mag pack)

## Station: Magnetize / Flux

- Confirm MAGNETIZE_DONE
- Confirm FLUX_PASS or FLUX_FAIL (hold)

## Station: Assembly Start (per line)

- Scan ASSY_120
- If variant not assigned: select WITH_SHROUD / NO_SHROUD
- Scan required jig RFIDs (variant-dependent)
- Confirm bind
  Show:
- each jig remaining and wash status
  Errors:
- LINE_NOT_CAPABLE_FOR_VARIANT
- MISSING_REQUIRED_COMPONENT
- COMPONENT_NOT_WASHED
- INSUFFICIENT_QTY_REMAINING

## Station: Assembly Steps

Buttons for steps:

- Pin430 done
- Pin300 done
- Shroud done (only WITH_SHROUD)
- Crash stop done
- Ionizer done
- FVMI pass/fail
  Each step consumes 120 from correct jig on DONE.
  Errors:
- INVALID_STATE_TRANSITION
- INSUFFICIENT_QTY_REMAINING
- DOUBLE_CONSUME_BLOCKED

## Station: Label (PC or dedicated)

- Generate labels (online only)
- Print and confirm attached
  Errors:
- OFFLINE_SERIAL_NOT_ALLOWED
- SERIAL_ALLOCATION_FAILED

## Station: Split / Packing

- Create 2 groups of 60
- Pack 3 trays into 1 outer bag
- Print outer barcode
  Errors:
- TRAY_NOT_LABELED

## Station: FG

- Scan outer barcode
- Map to pallet barcode
- Trace lookup quick view
