# FCL Technical Rules v4

FCL allowed ONLY for:

- Admin inspection
- Deep object analysis

Never allowed for:

- Shopfloor
- Quick edit
- Primary task execution

---

## Required State

layout: "OneColumn" | "TwoColumnsMidExpanded"
editing: selected object

---

## Required Structure

<FlexibleColumnLayout
style={{ height: "100%" }}
layout={layout}
startColumn={...}
midColumn={...}
/>

Detail must use:

<Page slot="midColumn" style={{ height: "100%" }}>

Without slot → layout invalid.

---

## Split Mode Rule

When layout splits:

- Drop non-essential table columns
- Use minSize, avoid fixed size

---

## Exit Rule

On close or save:
layout → "OneColumn"
