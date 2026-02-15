# 10 Label Engine: 92-byte + Shift-Day Serial

## 92-byte format

- Label payload is exactly 92 characters.
- Templates define fixed positions.

## Serial reset policy

Reset by shift_day window (08:00–07:59).
Serial scope:
(part_number + shift_day + line_code)

Serial range:
0001–9999 (4 digits). If exceed: block & require supervisor action.

## shift_day computation

Asia/Bangkok local time.

## Template bindings

Binding key:
(model_revision_id, variant_id nullable, unit_type, process_point)

For Marlin:

- process_point = POST_FVMI_LABEL
- unit_type = FOF_TRAY_20

## Fields sources

- STATIC: constants
- MODEL: base_part_number, etc.
- VARIANT: variant_code or mapped codes
- SERIAL: allocated running
- LINE_CODE: from machine config
- SHIFT_DAY: derived
- COMPONENT_2D: resolved by traversing genealogy from tray->assy->components->inbound scans/DO

## Example running segment

Last 4 digits are running (0001..9999). New week is irrelevant; only shift_day boundary matters.
