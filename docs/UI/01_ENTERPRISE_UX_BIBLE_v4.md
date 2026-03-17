# ENTERPRISE UX BIBLE v4

This is a Manufacturing Execution-like system.
This is NOT an office ERP.

If unsure → choose fewer user decisions.

---

## 1. Core Priorities

1. Speed > Beauty
2. Clarity > Density
3. Deterministic > Smart
4. Scan flow > Mouse flow
5. Status visibility > Minimalism

---

## 2. Environment Separation (Never Mix)

Admin → DynamicPage
Shopfloor → Full Height Workspace
Kiosk → Single Action Screen

---

## 3. Navigation Decision Matrix (Deterministic)

IF object has children → Object Page  
IF deep inspection from table → FCL  
IF quick small edit → Dialog  
IF operator task execution → Full workspace  
IF configuration list → Table page

Forbidden:

- Dialog inside dialog
- Edit large object inside table
- More than 3 navigation levels
- New route for small edits

---

## 4. Manufacturing Status Semantics (Immutable)

Draft → None  
Released → Success  
In Process → Warning  
Completed → Success  
Hold → Warning  
Scrap → Error

Use ObjectStatus or Tag ONLY.
Never plain text.

---

## 5. Loading Behavior

Page load → Skeleton  
Table reload → Busy  
Button action → Button busy only

Never freeze entire page.

---

## 6. Error Behavior

Field validation → ValueState  
Business rule → MessageStrip (Warning)  
System failure → MessageBox (Error)

No random toast errors.

---

## 7. Offline Rules

If API unreachable:

- Show offline banner
- Queue if supported
- Never silently fail
- Show sync indicator

---

## 8. Keyboard Rules

Enter → Confirm / Scan  
Esc → Close dialog  
Ctrl+S → Save (Admin only)

Delete:

- Requires confirmation
- Never emphasized button

---

## 9. Density

Admin → Compact  
Shopfloor → Cozy  
Kiosk → Spacious
