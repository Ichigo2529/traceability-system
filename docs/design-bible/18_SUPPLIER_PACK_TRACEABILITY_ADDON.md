# 18 Supplier Pack Traceability Add-on

This add-on extends Bible v1 with supplier-origin lot traceability for components.

## Domain hierarchy

MODEL -> COMPONENT TYPE -> PART NUMBER -> SUPPLIER -> DO -> SUPPLIER_PACK -> ASSY

Each supplier pack is a traceable unit and may have different `pack_qty` by supplier.

## New core entities

- `suppliers`
- `inventory_do` (extended with supplier + part number semantics)
- `supplier_packs` (linked to `units` where `unit_type = SUPPLIER_PACK`)

## Parsing

Supplier 2D barcode is external supplier data (not internal 92-byte label).
Store raw string and parsed fields:

- supplier_code
- part_number
- lot_number
- pack_qty
- production_date
- extra fields (JSON)

Parser must be pluggable by supplier format key.

## Consumption

When bonding consumes magnet quantity:

- deduct `pack_qty_remaining` from supplier pack
- link `ASSY_120 -> SUPPLIER_PACK` in genealogy

## Trace expectation

Genealogy/material origin should support:

Tray -> Assy -> Supplier Pack -> DO -> Supplier

