# Station Pattern Library v4

Reuse patterns. Do not invent new ones.

---

## Scan Pattern

IDLE → SCAN → VALIDATE → RESULT → NEXT

Rules:

- Auto focus input
- Enter submits
- Do not clear on error
- Clear only after success

---

## Pass/Fail Pattern

Action → Confirm → Save → Toast → Reset

Never auto-confirm destructive action.

---

## Packing Pattern

All parts valid → enable PACK
Missing part → highlight
Pack disabled until valid

---

## Assembly Pattern

Wrong component → Error + Block
Correct component → Auto advance

---

## Label Print Pattern

Scan → Preview → Print → Confirm

Never print without preview.

---

## Error Display Standard

Blocking → Dialog
Business → MessageStrip
Field → ValueState
Info → Toast
