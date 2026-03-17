# Spec 18 – Traceability chain and genealogy

- **Trace APIs:** GET /trace/tray/:id, /trace/outer/:id, /trace/pallet/:id — return upstream/downstream and correct mapping.
- **Units:** Jig batch, tray, outer, pallet; unit_link for genealogy. Assembly is binding point; component consumption per step.
- **Variant:** Lock after first assembly step; shared Bonding; divergence at Assembly.
