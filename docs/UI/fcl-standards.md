# Flexible Column Layout (FCL) standards

When and how to use multi-column layouts in the Admin UI.

---

## 1. When to use FCL

- **Use:** Master–detail flows where the user picks an item from a list and sees detail in a second column (e.g. Models list + revision/variant detail).
- **Avoid:** Simple list-only or form-only pages; single-step station flows.

---

## 2. Column roles

- **Column 1 (Master):** List or tree; selection drives detail.
- **Column 2 (Detail):** Detail view, sub-list, or nested master for the selected item.
- **Column 3 (optional):** Further detail or action panel (e.g. BOM line item detail).

---

## 3. Behavior

- Preserve selection and scroll position when data refetches (e.g. React Query).
- Responsive: collapse to single column on narrow viewport if needed; master remains accessible (drawer or first screen).
- Loading: show skeleton or spinner in the column that is loading; do not block the whole layout.

---

## 4. Implementation note

- Use custom layout (FlexBox, grid, or Tailwind) for master–detail; keep breakpoints and column ratios consistent with [guidelines.md](guidelines.md).

---

See [guidelines.md](guidelines.md), [patterns.md](patterns.md).
