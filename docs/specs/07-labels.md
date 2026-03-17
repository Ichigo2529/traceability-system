# Spec 07 – Labels and serial allocation

- **Label format:** 92-byte internal format; fixed length.
- **Serial scope:** (part_number, shift_day, line_code). Allocation via `SELECT … FOR UPDATE` on serial_counters.
- **Shift-day:** 08:00–07:59 (Asia/Bangkok). Serial resets per shift-day.
- **Online only:** Label generation and serial allocation require backend; no offline serial.
