# Enterprise-grade UI with shadcn — แนวทางและส่วนที่เพิ่มแล้ว

เอกสารนี้สรุปสิ่งที่โปรเจกต์มีอยู่แล้ว และสิ่งที่ควรใช้/เพิ่มเพื่อให้ UI ระดับ Enterprise กับ shadcn

---

## สิ่งที่มีและเพิ่มแล้ว

### คอมโพเนนต์ shadcn ที่ติดตั้ง/เพิ่มแล้ว

| คอมโพเนนต์       | การใช้งานระดับ Enterprise                                                    |
| ---------------- | ---------------------------------------------------------------------------- |
| **Tooltip**      | ห่อปุ่มไอคอนใน header/sidebar, ข้อความช่วยเหลือ, คำอธิบายฟิลด์               |
| **Breadcrumb**   | นำทาง hierarchy (Models → Revision → BOM), ใช้ร่วมกับ `ModelsBreadcrumb` ได้ |
| **Alert Dialog** | ยืนยันการลบ/การทำลาย (แทนหรือใช้ร่วมกับ `ConfirmDialog`)                     |
| **Command**      | Command palette (เช่น Cmd+K / Ctrl+K) สำหรับเปิดหน้า, search, shortcuts      |
| **Progress**     | แสดงความคืบหน้าการอัปโหลด, sync, batch job                                   |
| **Scroll Area**  | บริเวณ scroll ที่ควบคุมได้ (sidebar, ตารางสูงคงที่)                          |

### ปรับปรุงแล้ว

- **States.tsx** — ใช้ `gap` แทน `space-y` ตามแนวทาง shadcn
- **Toast** — ใช้ `sonner` ผ่าน `@/lib/toast` และ `<Toaster />` ใน App แล้ว
- **ConfirmDialog** — ใช้ Radix AlertDialog อยู่แล้ว; ต้องการ style ให้เหมือนระบบใช้ `@/components/ui/alert-dialog` ได้

---

## แนวทางที่ควรทำต่อ (Enterprise)

### 1. การใช้คอมโพเนนต์ที่เพิ่มแล้ว

- **Tooltip**
  - ห่อปุ่ม theme toggle, notifications, user menu ใน header ด้วย `<Tooltip><TooltipTrigger>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>`
  - ใช้กับปุ่มลบ/แก้ไขในตาราง และไอคอนที่ไม่มีความหมายชัดจากรูปเดียว
- **Breadcrumb**
  - ใช้ `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbPage` ในหน้าที่มี hierarchy (แทนหรือเสริม `ModelsBreadcrumb`)
- **Alert Dialog**
  - ใช้ `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` สำหรับยืนยันการลบ/การทำลาย
  - ค่อยๆ เปลี่ยนจาก `ConfirmDialog` ที่ใช้ Radix โดยตรงมาใช้ชุดนี้เพื่อให้ style และ accessibility เหมือนกันทั้งแอป
- **Command (Command Palette)**
  - ใช้ `CommandDialog` + `CommandInput` + `CommandList` + `CommandGroup` + `CommandItem` (+ `CommandShortcut` ถ้าต้องการ)
  - เปิดด้วย Cmd+K / Ctrl+K จาก header หรือ global shortcut
  - แนะนำ: รายการเมนูจาก sidebar (หรือจาก route config) + search ตาม path/label
- **Progress**
  - ใช้ในหน้า Forklift Intake, Scan Session, หรือทุกที่ที่มี “ขั้นตอนที่กำลังทำ” หรือ % completion
- **Scroll Area**
  - ใช้กับ sidebar และตารางที่กำหนดความสูงคงที่ (เช่น `h-[60vh]` + `ScrollArea`) เพื่อควบคุม scroll และ scrollbar style

### 2. แนวทาง shadcn ที่ควรยึดถือ

- **ระยะห่าง**: ใช้ `gap-*` (flex/grid) แทน `space-x-*` / `space-y-*`
- **สี**: ใช้ semantic tokens (`text-muted-foreground`, `bg-destructive`, `border-border`) ไม่ใช้สีตรงๆ เช่น `text-green-600`
- **ฟอร์ม**: ใช้ `Label` + `Input`/`Select` + คำอธิบาย/ข้อความ error ที่ผูกกับฟิลด์ (และถ้ามี FieldGroup/Field ใน design system ให้ใช้ตามนั้น)
- **สถานะ**: ใช้ `Badge` (รวม variant ที่มี เช่น success, danger) แทน `<span>` สีเอง
- **โหลด**: ใช้ `Skeleton` จาก `@/components/ui/skeleton` แทน div `animate-pulse` เอง
- **ว่าง**: ใช้ `EmptyState` (หรือคอมโพเนนต์ Empty ของ design system) แทนข้อความเปล่าๆ

### 3. สิ่งที่ควรเพิ่ม/พิจารณา (ถ้าต้องการระดับ Enterprise เต็ม)

- **Keyboard navigation**
  - Focus trap ใน Dialog/Sheet, ลำดับ Tab ที่สมเหตุสมผล
  - Shortcut หลัก: Cmd+K (Command palette), Escape ปิด overlay
- **Loading ในปุ่ม**
  - ปุ่ม submit: ใช้ `Spinner` + `disabled` (หรือปุ่มที่มีสถานะ loading) แทนแค่ข้อความ “Processing...”
- **Pagination**
  - ถ้า DataTable จาก `@traceability/ui` ยังไม่มี Pagination แบบ shadcn ให้เพิ่มคอมโพเนนต์ Pagination และใช้ร่วมกับตาราง
- **Form validation**
  - แสดง error ใต้ฟิลด์ด้วยข้อความ + `aria-invalid` และถ้ามี `data-invalid` / FieldDescription ให้ใช้ตาม design system
- **Empty state แบบรวม**
  - คอมโพเนนต์ Empty รูปแบบเดียว (ไอคอน + หัวข้อ + คำอธิบาย + ปุ่ม action) ใช้ทั้งตารางว่าง, ฟิลเตอร์ไม่เจอ, หน้า “ยังไม่มีข้อมูล”
- **Accessibility**
  - หน้า/ส่วนหลักมี heading level ที่ต่อเนื่อง (h1 → h2 → h3)
  - Dialog/AlertDialog มี `DialogTitle` / `AlertDialogTitle` (หรือซ่อนด้วย `sr-only` ถ้าไม่แสดง)
  - ปุ่มไอคอนมี `aria-label`

---

## การติดตั้งคอมโพเนนต์เพิ่ม (ถ้ายังไม่มี)

```bash
cd web/apps/admin
npx shadcn@latest add tooltip breadcrumb alert-dialog command progress scroll-area
```

ถ้ามีไฟล์ซ้ำ ให้เลือกไม่ overwrite (ตอบ N) สำหรับไฟล์ที่แก้เองแล้ว เช่น `button.tsx`.

---

## สรุป

- **มีแล้ว**: Tooltip, Breadcrumb, Alert Dialog, Command, Progress, Scroll Area; ปรับ States เป็น `gap`; ใช้ Toast และ ConfirmDialog อยู่แล้ว
- **ควรทำต่อ**: ใช้ Tooltip ใน header/sidebar, ใช้ Alert Dialog แทน/ร่วม ConfirmDialog, เปิด Command Palette (Cmd+K), ใช้ Progress/Scroll Area ในหน้าที่เหมาะสม
- **แนวทาง**: ยึดกฎ spacing/สี/ฟอร์ม/Badge/Skeleton/Empty ตาม shadcn และเพิ่ม keyboard, loading state, pagination, validation, accessibility ให้ครบจะได้ระดับ Enterprise ชัดเจน
