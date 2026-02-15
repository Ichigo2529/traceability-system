# Direct Material Issue Voucher (Production -> Store)

## Purpose

This document maps the real paper form used by production ("Direct Material Issue Voucher")
into system fields and workflow states.

Source reference:
- Attached sample form image/PDF from production operations.
- Existing high-level flow in `01_SYSTEM_CONTEXT_ARCHITECTURE.md`:
  - `Prod -> API: Create material request`
  - `Store -> API: Issue materials per DO`

## Form Fields (Mapped)

Header:
- `NO.` -> `material_requests.request_no`
- `DMI. NO.` -> `material_requests.dmi_no`
- `DATE` -> `material_requests.request_date`
- `MODEL` (selected for voucher) -> `material_requests.model_id`
- `SECTION` -> `material_requests.section`
- `COST CENTER` -> `material_requests.cost_center`
- `TIP / Process` -> `material_requests.process_name`

Line items:
- `ITEM` -> `material_request_items.item_no`
- `PART NO.` -> `material_request_items.part_number` (must be **component part number** from active BOM of selected model, not FG model part number)
- `DESCRIPTION` -> `material_request_items.description` (component detail, e.g. component name/location/qty-per-VCM)
- `QTY. ISSUED` -> `material_request_items.issued_qty`
- `UOM` -> `material_request_items.uom`
- `DO` handwritten reference -> `material_request_items.do_number`
- `Lot` handwritten reference -> `material_request_items.lot_number`
- `REMARKS` -> `material_request_items.remarks`

Sign-off:
- `ISSUED BY` -> `material_requests.issued_by_user_id`
- `RECEIVED BY` -> `material_requests.received_by_user_id`

## Workflow (Initial)

`REQUESTED -> APPROVED -> ISSUED -> RECEIPT_CONFIRMED (operational milestone)`

Alternative transitions:
- `REQUESTED -> REJECTED`
- `REQUESTED -> CANCELLED`

## Backend Baseline Added

Tables:
- `material_requests` (header)
- `material_request_items` (lines)

Enum:
- `material_request_status`

Notes:
- This is phase-1 schema groundwork only.
- UI + API transaction rules will be implemented in next steps.
- Domain guard: one voucher is for one model (`material_requests.model_id`), and all line `part_number` values must belong to that model's ACTIVE BOM.

## Next Step (Phase-2)

1. API endpoints:
   - create request
   - list/search requests
   - approve/reject
   - issue materials with DO/lot binding
   - production confirm receipt by 2D scan (must match issued DO + component part number)
2. Admin/Store screen:
   - request list + detail form
   - status transition actions
3. Production screen:
   - select model first
   - load component part numbers from active BOM
   - submit request form
   - after Store issues, production scans supplier 2D barcode and confirms receipt with forklift
4. Realtime updates:
   - consume `GET /realtime/material-requests` (SSE)
   - auto refresh pending/history/request list on create/approve/reject/issue
