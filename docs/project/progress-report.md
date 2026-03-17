# Progress report

อัปเดตสัปดาห์ละครั้ง (หรือตาม need) — ใช้ประเมินความคืบหน้าและ % การทำงานของโปรเจกต์

**อัปเดตล่าสุด:** 2026-03-17  
**Go-live target:** 2026-07-13

---

## 1. สรุปความคืบหน้า (%)

| ฐานที่ใช้คำนวณ             | Done | In progress | Not started | **รวม** | **% เสร็จ (strict)** |
| -------------------------- | ---- | ----------- | ----------- | ------- | -------------------- |
| **Master tasks (T01–T20)** | 6    | 1           | 13          | 20      | **30%** (6/20)       |
| **Checklist รายการ**       | 21   | 0           | 2           | 23      | **91%** (21/23)      |

- **Strict %** = นับเฉพาะ Done (ไม่นับ In progress เป็นครึ่งหนึ่ง)
- Master tasks ดูจาก [roadmap.md](roadmap.md) / [execution-board.md](../operations/execution-board.md)
- Checklist ดูจาก [checklist.md](checklist.md)

**หมายเหตุ:** % จาก T01–T20 สะท้อนงาน phase/go-live ได้ตรงกว่า (ยังเหลือ UAT, cutover, sign-off). % จาก checklist สูงเพราะ foundation + Admin/Station UI ทำเสร็จแล้ว.

---

## 2. Master tasks (T01–T20) — สถานะล่าสุด

| ID  | Task                                      | Phase     | Status      |
| --- | ----------------------------------------- | --------- | ----------- |
| T01 | Stabilize Admin UX and validation         | P0        | Done        |
| T02 | Stabilize Station UX                      | P0        | Done        |
| T03 | Timezone and shift-day validation         | P0        | Done        |
| T04 | Department / section / cost center config | P1        | Done        |
| T05 | Vendor and supplier pack governance       | P1        | Not started |
| T06 | BOM and routing config + barcode/trace    | P1        | Not started |
| T07 | Barcode template merge and test-parse     | P1        | Not started |
| T08 | Material flow UI full flow                | P2        | Done        |
| T09 | UAT cycle 1 (core scenarios)              | P2        | In progress |
| T10 | Offline queue conflict handling           | P2        | Done        |
| T11 | Trace APIs and genealogy verification     | P3        | Not started |
| T12 | Station event chain + label E2E           | P3        | Not started |
| T13 | Dashboard and alerting                    | P3        | Not started |
| T14 | Final UAT                                 | P4        | Not started |
| T15 | UAT sign-off                              | P4        | Not started |
| T16 | Cutover rehearsal                         | P4        | Not started |
| T17 | Runbook and rollback finalization         | P4        | Not started |
| T18 | Go-live day execution                     | Go-live   | Not started |
| T19 | Hypercare monitoring                      | Hypercare | Not started |
| T20 | Project closure and handover              | Hypercare | Not started |

**ที่มา:** [../operations/execution-board.md](../operations/execution-board.md) (อัปเดตทุกศุกร์)

---

## 3. Phase ปัจจุบันและงานถัดไป

- **Phase ปัจจุบัน:** P1 – Master data & barcode (Mar 16 – Apr 10, 2026)
- **งานที่ควรทำต่อ (P1):** T05, T06, T07 (vendor, BOM, barcode template/parser)
- **งานที่กำลังทำ:** T09 UAT cycle 1 — ใช้ [uat-cycle1.md](../operations/uat-cycle1.md)

---

## 4. การอัปเดตรายงานนี้

1. อัปเดต **execution-board.md** (สถานะ T01–T20) ทุกศุกร์
2. อัปเดต **วันที่ "อัปเดตล่าสุด"** และตารางใน section 1–2 ตาม execution-board และ checklist
3. ถ้ามี **daily standup / weekly report** แยก สามารถลิงก์มาที่ไฟล์นี้เป็น single source ของ % และ phase

---

ดูเพิ่ม: [roadmap.md](roadmap.md) | [checklist.md](checklist.md) | [execution-board.md](../operations/execution-board.md) | [gantt-tracker.md](../operations/gantt-tracker.md) | [status-pack.md](../operations/status-pack.md)
