# Domain Model Definitions (Formal)

## Entities

### Model
- model_id (PK)
- model_name
- base_part_number

### Revision
- revision_id (PK)
- model_id (FK)
- revision_code
- active (immutable once active)
- effective_from
- effective_to

### Variant
- variant_id (PK)
- revision_id (FK)
- variant_code

### Component Type
- component_type_id (PK)
- name (e.g., Plate, Magnet, Pin430, Shroud, CrashStop)

### Part Number
- part_number (PK)
- component_type_id (FK)
- description

### Supplier
- supplier_id (PK)
- supplier_code
- supplier_name

### Delivery Order (DO)
- do_id (PK)
- do_number UNIQUE
- supplier_id
- part_number
- received_at

### Supplier Pack (traceable)
- supplier_pack_id (PK)
- do_id (FK)
- raw_2d_barcode
- parsed_supplier_code
- parsed_part_number
- supplier_lot
- pack_qty_total
- pack_qty_remaining
- received_at

UNIT_TYPE: SUPPLIER_PACK
