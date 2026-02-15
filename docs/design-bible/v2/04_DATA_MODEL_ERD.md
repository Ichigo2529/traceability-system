 # Formal ERD Specification



Entities (high-level):

users, roles, user _roles, refresh _tokens

devices, machines, operator _sessions

models, revisions, variants

part _numbers, component _types

suppliers, delivery _orders, supplier _packs

bom, routing, routing _steps

units, unit _links

events

label _templates, label _bindings, labels

serial _counters

inventory _do (reference only)

component _2d _scans



Mermaid:

```mermaid

erDiagram

 -   MODELS ||--o{ REVISIONS : has

 -   REVISIONS ||--o{ VARIANTS : has

 -   REVISIONS ||--o{ BOM : defines

 -   REVISIONS ||--o{ ROUTING : defines

 -   BOM ||--o{ PART _NUMBERS : indexes

 -   ROUTING ||--o{ ROUTING _STEPS : has

 -   SUPPLIERS ||--o{ DELIVERY _ORDERS : has

 -   DELIVERY _ORDERS ||--o{ SUPPLIER _PACKS : has

 -   SUPPLIER _PACKS ||--o{ UNITS : produces

 -   UNITS ||--o{ UNIT _LINKS : parent

 -   UNITS ||--o{ EVENTS : produces

 -   LABEL _TEMPLATES ||--o{ LABELS : produces

 -   SERIAL _COUNTERS ||--o{ LABELS : allocates

 -   USERS ||--o{ USER _ROLES : has

 -   ROLES ||--o{ USER _ROLES : has

 -   DEVICES ||--o{ OPERATOR _SESSIONS : has



