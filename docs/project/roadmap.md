# Roadmap and program status

Single document for vision, go-live targets, and current timeline.

---

## 1. Vision and value

- **Vision:** Manufacturing traceability platform with high genealogy accuracy.
- **UI:** shadcn/ui + Tailwind + Lucide — same standard for admin and shopfloor (station apps use `@traceability/ui` + Tailwind).
- **Offline:** Pi5 stations support offline event queue (Dexie).
- **Traceability:** Idempotent events, immutable genealogy links.

---

## 2. Tech stack (summary)

- Runtime: Bun | Backend: Elysia + TypeScript | DB: PostgreSQL + Drizzle
- Frontend: React + Vite + shadcn/ui (Tailwind + Radix + Lucide)
- API client: Eden Treaty + SDK

---

## 3. Program targets

- **Single go-live (full scope): July 13, 2026**
- **Project closure (hypercare): July 31, 2026**

(Single go-live; no Wave 1/Wave 2.)

---

## 4. Current status (summary)

- **Current phase:** P0 – Stabilization
- **Go-live readiness:** Not ready (UAT, cutover rehearsal, sign-offs pending)
- **Critical path:** Validation, timezone, vendor/barcode governance, parser, UAT

Overall (from checklist): foundation and backend core are done; Admin UI and material flow in progress; station integration and UAT/go-live not complete.

---

## 5. Timeline (date-driven)

| Phase                         | Window                | Goal                                     |
| ----------------------------- | --------------------- | ---------------------------------------- |
| P0 – Stabilization            | Feb 16 – Mar 13, 2026 | Stabilize UX, validation, runtime        |
| P1 – Master data & barcode    | Mar 16 – Apr 10, 2026 | Department/vendor/BOM + barcode template |
| P2 – Integration build I      | Apr 13 – May 30, 2026 | Material flow + UAT cycle 1              |
| P3 – Integration build II     | Jun 2 – Jun 20, 2026  | Traceability chain + genealogy           |
| P4 – Final UAT & cutover prep | Jun 23 – Jul 10, 2026 | Final UAT, cutover rehearsal             |
| **Single go-live**            | **July 13, 2026**     | Production launch                        |
| Hypercare & closure           | Jul 13 – Jul 31, 2026 | Production stabilization and closure     |

---

## 6. Go-live scope (combined)

- **Material flow:** Request, approve/reject, DO allocation, issue, receive (2D scan), voucher view/print, audit.
- **Traceability:** Station event chain, genealogy, barcode template governance, 92-digit label, station UIs + offline, dashboard/alerting.

---

---

## 7. Task list (T01–T20)

Master task set for execution board and Gantt. **Status ต้องอัปเดตที่ [../operations/execution-board.md](../operations/execution-board.md)** เป็นหลัก (ตารางด้านล่างสรุปให้ดูใน roadmap).

| ID  | Task                                                                                         | Phase     | Status      |
| --- | -------------------------------------------------------------------------------------------- | --------- | ----------- |
| T01 | Stabilize Admin UX and validation (forms, errors, feedback)                                  | P0        | **Done**    |
| T02 | Stabilize Station UX (Jigging, Bonding, Magnetize/Flux, Scan, Label, Packing, FG)            | P0        | **Done**    |
| T03 | Timezone and shift-day validation (08:00 Bangkok) end-to-end                                 | P0        | **Done**    |
| T04 | Department / section / cost center config and usage                                          | P1        | **Done**    |
| T05 | Vendor and supplier pack governance (barcode template, parser)                               | P1        | Not started |
| T06 | BOM and routing config aligned with barcode and traceability                                 | P1        | Not started |
| T07 | Barcode template merge (system + custom) and test-parse flow                                 | P1        | Not started |
| T08 | Material flow UI: submit → approve → allocate → issue → receive → print                      | P2        | **Done**    |
| T09 | UAT cycle 1: core scenarios (WITH_SHROUD, NO_SHROUD, rejections)                             | P2        | In progress |
| T10 | Offline queue conflict handling and queue monitor (retry, remove, clear)                     | P2        | **Done**    |
| T11 | Trace APIs and genealogy verification (tray, outer, pallet)                                  | P3        | Not started |
| T12 | Station event chain and label generation E2E                                                 | P3        | Not started |
| T13 | Dashboard and alerting (heartbeat, readiness, errors)                                        | P3        | Not started |
| T14 | Final UAT: all scenarios in [../operations/uat-checklist.md](../operations/uat-checklist.md) | P4        | Not started |
| T15 | UAT sign-off (Production, Quality, IT operations)                                            | P4        | Not started |
| T16 | Cutover rehearsal (T-1 dry run, backup/restore, device check)                                | P4        | Not started |
| T17 | Runbook and rollback procedure finalization                                                  | P4        | Not started |
| T18 | Go-live day execution (revision enable, first event, monitoring)                             | Go-live   | Not started |
| T19 | Hypercare: first-week monitoring and incident handling                                       | Hypercare | Not started |
| T20 | Project closure and handover                                                                 | Hypercare | Not started |

**สรุป:** P0 (T01–T03), T04 (P1), T08・T10 (P2) เสร็จแล้ว. T09 UAT cycle 1 script/checklist พร้อมรัน — ดู [../operations/uat-cycle1.md](../operations/uat-cycle1.md). งานที่ต้องไปอัปเดต/ไล่ทำต่อ: **execution-board.md** (Status/Owner ทุก task), **checklist.md** (ติ๊กรายการที่ทำเสร็จ), **gantt-tracker.md** (ถ้ามีวันเริ่ม/จบจริง).

---

See [checklist.md](checklist.md) and [../operations/](../operations/) (runbook, UAT, Gantt) for task and weekly detail.
