# Business Logic Summary

สรุป business logic ของระบบ traceability เพื่อใช้ตรวจสอบว่า behavior ปัจจุบันตรงกับ requirement ทางธุรกิจหรือไม่

อัปเดตล่าสุด: 2026-03-17

---

## 1. วัตถุประสงค์ของระบบ

ระบบนี้เป็น `Manufacturing Traceability System` สำหรับติดตามวัตถุดิบตั้งแต่รับเข้าจาก supplier, ผ่านการจ่ายเข้าไลน์ผลิต, การทำงานในแต่ละ station, การสร้าง label, การ pack, จนถึง `pallet` ปลายทาง

อีกองค์ประกอบสำคัญที่เอกสารธุรกิจระบุไว้ชัดคือ `RFID card / RFID carrier flow` ซึ่งใช้เป็นตัวพาวัตถุดิบหรือหน่วยงานระหว่าง process ต่าง ๆ และเป็นส่วนหนึ่งของการผูก traceability ใน shopfloor

เป้าหมายทางธุรกิจหลักคือ:

- ตอบได้ว่าสินค้าสำเร็จรูปแต่ละหน่วยมาจาก material lot, supplier pack, และ process step ใดบ้าง
- ควบคุม flow การเบิกและจ่าย material ระหว่าง production กับ store
- ควบคุมการหมุนเวียนของ `RFID card / RFID carrier` ระหว่างหน่วยงานและ station
- บันทึก event การผลิตเพื่อใช้ตรวจสอบย้อนหลัง
- รองรับการ trace ย้อนกลับและไปข้างหน้าตามโครงสร้าง genealogy

ภาพรวมธุรกิจของระบบ:

`ตั้งค่า master data -> ขอ/อนุมัติ/จ่าย material -> dispatch RFID / move carrier -> ทำงานที่ station -> bind genealogy ที่ assembly -> generate label -> pack -> map เข้า pallet -> trace ได้`

---

## 2. ผู้ใช้งานหลักในเชิงธุรกิจ

- `ADMIN`: ดูแล master data, users, roles, devices, process, stations, templates, approvals
- `OPERATOR`: ปฏิบัติงานที่ station หน้างาน
- `STORE`: อนุมัติและจ่าย material
- `PRODUCTION`: สร้างคำขอ material และ dispatch เข้าไลน์
- `SUPERVISOR`: ตรวจสอบ trace และจัดการ exception
- `QA`: ตรวจสอบ quality hold และข้อมูล trace ที่เกี่ยวข้อง

ในเชิงการใช้งานจริง ระบบแบ่งเป็น 2 ฝั่งหลัก:

- `Admin Web` สำหรับการตั้งค่าและควบคุมระบบ
- `Station UI` สำหรับการทำงานหน้างานและ material flow

---

## 3. ข้อมูลธุรกิจหลักที่ระบบจัดการ

### 3.1 Master data

- `Model`
- `Revision`
- `Variant`
- `BOM`
- `Routing`
- `Process`
- `Station`
- `Machine`
- `Device`
- `Department`
- `Section`
- `Cost center`
- `Supplier`
- `Barcode template`
- `Label template`

### 3.2 Transaction / execution data

- `Material request`
- `Approval / rejection`
- `Issue / allocation`
- `Receive scan`
- `RFID dispatch / RFID circulation`
- `Production events`
- `Labels`
- `Tray / outer / pallet mapping`
- `Audit log`

### 3.3 Traceability data

- `Unit`
- `Unit link`
- `Genealogy`
- `Trace result by tray / outer / pallet`

---

## 4. Business Logic หลักของระบบ

## 4.1 Admin and governance

ก่อนเริ่มใช้งานจริง ระบบต้องมีการตั้งค่าพื้นฐานก่อน เช่น user, role, model, revision, variant, BOM, routing, station, machine, device, supplier, barcode template, label template และ approval rule

แนวคิดสำคัญคือระบบเป็น `config-driven` หมายความว่า behavior หลายส่วนขึ้นกับการตั้งค่า ไม่ได้ hardcode ตามสินค้าแต่ละรุ่น

ข้อสังเกตเชิงธุรกิจ:

- ถ้า master data ไม่ครบ การทำงาน downstream จะไม่สมบูรณ์
- revision ที่ active ควรมีลักษณะ controlled และไม่ควรถูกแก้ตรง

## 4.2 Material flow

flow หลักของ material request คือ:

`Create request -> Approve/Reject -> Allocate/Issue -> Receive -> Voucher/View/Print -> Audit`

ความหมายเชิงธุรกิจ:

- ฝั่ง production หรือ store เป็นผู้เริ่มคำขอ
- ฝั่งที่มีสิทธิ์อนุมัติจะ approve หรือ reject
- หลังอนุมัติ จะมีการ allocate และ issue material ตาม DO หรือ stock ที่มี
- ฝั่งรับของสามารถยืนยัน receive และ scan เพื่อยืนยันการรับจริง
- ระบบเก็บหลักฐานการทำรายการและ voucher สำหรับตรวจสอบย้อนหลัง

จุดที่ควรใช้ตรวจ requirement:

- ต้องการ approval กี่ชั้น
- การแบ่งหน้าที่ระหว่าง production กับ store ตรงกับการทำงานจริงหรือไม่
- เอกสาร voucher และ audit trail เพียงพอต่อการใช้งานจริงหรือไม่

## 4.3 RFID card circulation and carrier flow

จากเอกสารธุรกิจ RFID ไม่ได้เป็นแค่เทคโนโลยีสำหรับ scan แต่เป็นส่วนหนึ่งของ logic การไหลของงานในโรงงาน

การเคลื่อนที่หลักของ RFID card / carrier ที่พบในเอกสารคือ:

- `Production dispatch RFID`: `Production -> Jigging -> Return Production -> repeat`
- `Plate RFID`: `Jigging -> Wash1 -> Bonding -> Return Jigging -> repeat`
- `Magnet RFID`: `Bonding -> Return Jigging -> repeat`
- `Component jigs RFID (Pin430 / Pin300 / Shroud / Crash)`: `Store -> Jigging -> Wash2 -> Assembly -> Return Jigging -> repeat`

ความหมายเชิงธุรกิจ:

- RFID ทำหน้าที่เป็นตัวแทนของ carrier หรือชุด material ที่หมุนเวียนอยู่ในโรงงาน
- ระบบต้องรู้ว่า RFID ใบไหนควรอยู่ที่ process ไหน และควรย้อนกลับไปที่ไหน
- การไหลของ RFID ไม่ได้เป็นเส้นตรงทั้งหมด บางชุดมีลักษณะ `วนกลับ` เพื่อใช้งานซ้ำ
- ถ้า RFID flow ผิดลำดับ อาจทำให้ทั้ง material flow และ genealogy ผิดตามไปด้วย

จุดที่ควรใช้ตรวจ requirement:

- โรงงานต้องการติดตามเพียง material movement หรือรวม `RFID carrier circulation` ด้วย
- RFID แต่ละประเภทมี rule การคืนกลับต้นทางเหมือนในเอกสารหรือไม่
- มีกรณี line switching หรือ manual override ที่ต้องรองรับเพิ่มหรือไม่

## 4.4 Production execution at station

เมื่อ material ถูกจ่ายเข้า production แล้ว ระบบจะบันทึกการทำงานตาม station ต่าง ๆ เช่น:

- `Jigging`
- `Bonding`
- `Magnetize / Flux`
- `Assembly / Scan`
- `Label`
- `Packing`
- `FG`

แนวคิดหลักคือทุก action สำคัญควรถูกบันทึกเป็น `event` เพื่อให้สามารถตรวจสอบย้อนหลังได้

ผลเชิงธุรกิจของแนวคิดนี้คือ:

- รู้ว่าแต่ละ lot หรือหน่วยผ่าน process ไหนมาแล้ว
- รู้ว่า RFID carrier หรือ jig ที่เกี่ยวข้องเคลื่อนผ่านจุดใดมาบ้าง
- ใช้ตรวจสอบ state ปัจจุบันของชิ้นงานได้
- รองรับการ trace เมื่อต้องสอบสวนปัญหาคุณภาพหรือ production incident

## 4.5 Genealogy binding

จุดที่สำคัญที่สุดของระบบในเชิง traceability คือการผูกความสัมพันธ์ของชิ้นส่วนและสินค้าระหว่าง process ต่าง ๆ

กติกาทางธุรกิจที่พบในเอกสาร:

- `Bonding` เป็น shared process
- การแยก variant จริงเกิดขึ้นที่ `Assembly`
- การ bind component genealogy เกิดที่ `Assembly`
- หลังจากเริ่ม assembly แล้ว variant จะถูก lock

ความหมายเชิงธุรกิจ:

- ก่อนถึง assembly อาจยังใช้ flow ร่วมกันได้
- ที่ assembly จะเป็นจุดตัดสินว่าชิ้นส่วนใดถูกใช้กับสินค้ารุ่นใด
- RFID ของ component jig มีผลต่อความถูกต้องของการ bind ในขั้น assembly
- ถ้า requirement จริงของโรงงาน bind กันตั้งแต่ก่อน assembly ระบบอาจต้องทบทวน logic นี้

## 4.6 Label, packing, and finished goods

หลังการประกอบเสร็จ ระบบจะ:

- generate label
- รวมชิ้นงานเป็น `tray`
- pack เป็น `outer`
- map `outer` หรือหน่วยปลายทางเข้า `pallet`

ผลลัพธ์ทางธุรกิจคือสามารถ trace ได้จากหลายระดับ เช่น:

- trace จาก `tray`
- trace จาก `outer`
- trace จาก `pallet`

ตรงนี้สำคัญมากสำหรับการ recall, quality investigation, และการตรวจสอบย้อนหลัง

---

## 5. Login / Auth Business Logic

ระบบมี logic การเข้าใช้งาน 2 รูปแบบหลัก

## 5.1 Web login

ผู้ใช้ทั่วไปเข้าใช้งานผ่าน `username/password`

เมื่อ login สำเร็จ ระบบจะ:

- ตรวจว่าผู้ใช้มีอยู่จริงหรือไม่
- ตรวจว่า account active หรือไม่
- ตรวจ password
- โหลด role ของผู้ใช้
- ออก `access token`
- ออก `refresh token`
- บันทึก audit log ของการ login

การพาไปหน้าถัดไปเป็นไปตามบทบาท:

- ถ้าเป็น `ADMIN` ไป `/admin`
- ถ้าเป็น `STORE` ไป `/station/material/store`
- บทบาทอื่นที่ไม่ใช่ admin จะไป `/station/material/request`

ความหมายเชิงธุรกิจ:

- ระบบใช้ `role-based access`
- หน้าหลัง login ไม่ได้เหมือนกันทุก role
- login fail และ login success ถูกเก็บ log

จุดที่ควรใช้ตรวจ requirement:

- role mapping หลัง login ตรงกับหน้าที่งานจริงหรือไม่
- `STORE` ควรอยู่หน้า material/store ใช่หรือไม่
- role อื่น ๆ เช่น `SUPERVISOR`, `QA`, `PRODUCTION` ควรถูกพาไปหน้าไหนเป็น default

## 5.2 Station / Device login

ฝั่งหน้างานมี logic เพิ่มจาก web login ปกติ โดยลำดับธุรกิจคือ:

`register device -> activate / assign device -> operator login -> submit production events`

กติกาหลัก:

- device ต้อง register ก่อน
- device ต้อง active และไม่ถูก disable
- device ควรถูก assign กับ machine / station / process
- operator ต้อง login บนอุปกรณ์ก่อน จึงจะทำ event ได้
- ถ้ามี operator session เดิมบนอุปกรณ์เดียวกัน ระบบจะปิด session เก่าและเปิด session ใหม่

ความหมายเชิงธุรกิจ:

- ระบบไม่ได้เชื่อแค่ user อย่างเดียว แต่เชื่อทั้ง `user + device`
- เครื่องหน้างานเป็นส่วนหนึ่งของ trust model
- event การผลิตควรผูกกับ operator, machine, device, line code, และ shift day

จุดที่ควรใช้ตรวจ requirement:

- ฝั่งโรงงานยอมรับ model แบบต้อง register/assign device ก่อนหรือไม่
- operator ใช้ `badge`, `employee id`, หรือ `username` เป็นตัวจริงในการ login
- การบังคับ one active operator session per device ตรงกับการใช้งานจริงหรือไม่

## 5.3 Token and session behavior

จากเอกสาร:

- `access token` อายุ 45 นาที
- `refresh token` อายุ 16 ชั่วโมง
- มี refresh rotation

ผลเชิงธุรกิจ:

- session web ไม่ได้ยาวแบบไม่จำกัด
- ระบบมีการหมุน refresh token เพื่อเพิ่มความปลอดภัย
- logout เป็นการ revoke refresh token

---

## 6. End-to-end business flow แบบย่อ

### 6.1 Setup phase

`Admin setup users/roles/models/BOM/routing/stations/devices/templates`

### 6.2 Material preparation phase

`Production creates request -> Store approves/issues -> Production receives and scans`

### 6.3 RFID and shopfloor movement phase

`Production dispatch RFID -> Jigging -> Wash / Bonding -> return some RFID carriers -> move component jig RFID to Assembly`

### 6.4 Shopfloor execution phase

`Jigging -> Bonding -> Magnetize/Flux -> Assembly/Scan -> Label -> Packing -> FG`

### 6.5 Trace phase

`Search by tray / outer / pallet -> inspect genealogy upstream/downstream`

---

## 7. สถานะปัจจุบันที่เข้าใจได้จากเอกสาร

### 7.1 สิ่งที่ดูว่ามีแล้วหรือใกล้พร้อม

- Auth และ RBAC
- Device register / activate / heartbeat
- Operator login / logout / me
- Material request flow
- Station screens หลัก
- Event API และ state machine
- Label engine
- Trace API ระดับ tray / outer / pallet
- Offline queue และ conflict handling
- เอกสาร RFID circulation rule มีอยู่แล้วใน spec

### 7.2 สิ่งที่ยังควรถือว่ายังไม่ปิดงาน

- Vendor และ supplier pack governance
- BOM / routing alignment กับ barcode และ traceability
- Barcode template merge และ test-parse
- UAT แบบเต็มรอบ
- Cutover, sign-off, go-live
- Dashboard และ alerting
- E2E verification บางส่วนของ trace/genealogy

### 7.3 ข้อควรระวังในการตีความ

เอกสารบางชุดระบุว่า feature หลายส่วน `done` แล้ว แต่เอกสาร roadmap และ progress ยังระบุว่าบางหัวข้อด้าน traceability, genealogy, UAT, และ go-live readiness ยังไม่เสร็จ

ดังนั้นในการวิเคราะห์ requirement ควรแยกเป็น 2 ชั้น:

- `Feature exists in system`
- `Business flow has been proven by UAT / real operation`

---

## 8. ประเด็นที่ควรใช้ตรวจว่า "ตรง requirement หรือไม่"

คำถามสำคัญสำหรับการ review กับผู้ใช้งานธุรกิจ:

1. ระบบต้อง trace ย้อนกลับได้ถึงระดับใด: `pallet`, `outer`, `tray`, `lot`, `supplier pack`, หรือ `RFID carrier`
2. จุดที่ระบบ bind genealogy ที่ `Assembly` ตรงกับ process จริงในโรงงานหรือไม่
3. flow `request -> approve -> issue -> receive` ตรงกับบทบาทงานจริงหรือไม่
4. rule การหมุนเวียนของ `RFID card / RFID carrier` ตรงกับ operation จริงหรือไม่
5. การพาผู้ใช้ไปหน้าต่าง ๆ หลัง login ตรงกับ role และหน้าที่งานจริงหรือไม่
6. ฝั่ง station จำเป็นต้องใช้ `device trust model` แบบ register/assign ก่อนใช้งานจริงหรือไม่
7. สิทธิ์ของ `ADMIN`, `STORE`, `PRODUCTION`, `QA`, `SUPERVISOR`, `OPERATOR` ตรงกับ requirement จริงหรือไม่
8. สิ่งที่ระบบทำได้ตอนนี้เป็นเพียง UI/API พร้อมใช้ หรือผ่าน UAT และพร้อม go-live แล้ว

---

## 9. สรุปสั้นที่สุด

ระบบนี้ไม่ใช่แค่ระบบ login หรือแค่ระบบบันทึกการผลิต แต่เป็นระบบที่รวม 4 เรื่องไว้ด้วยกัน:

- `Master data governance`
- `Material control`
- `RFID carrier circulation`
- `Production event capture`
- `End-to-end traceability`

ถ้าจะนำไปเทียบกับ requirement ธุรกิจ ควรดูทั้งเรื่อง:

- ความถูกต้องของ flow งาน
- ความถูกต้องของ RFID circulation
- ความถูกต้องของ role และสิทธิ์
- ความถูกต้องของจุด bind genealogy
- ความพร้อมใช้งานจริงระดับ UAT / go-live

---

## References

- `docs/specs/01_SYSTEM_CONTEXT_ARCHITECTURE.md`
- `docs/specs/08_RBAC_AUTH_DEVICE_MODEL.md`
- `docs/specs/11_RFID_CARD_CIRCULATION_AND_MATERIAL_FLOW.md`
- `docs/specs/15-material-form.md`
- `docs/specs/18-traceability-chain.md`
- `docs/architecture/api-and-routes.md`
- `docs/project/roadmap.md`
- `docs/project/progress-report.md`
- `docs/project/checklist.md`
- `docs/operations/execution-board.md`
- `backend/src/routes/auth.ts`
- `backend/src/routes/device.ts`
- `web/apps/admin/src/pages/LoginPage.tsx`
- `web/apps/admin/src/pages/station/OperatorLoginPage.tsx`
