# Spec 16 – Supplier pack and barcode

- **Supplier pack:** Tracked as traceable unit; genealogy supports Tray → Assy → Supplier Pack → DO → Supplier. Auditable end-to-end.
- **Barcode templates:** System (read-only) + custom; merge and parser keys per api-and-routes. Test-parse and receive flows use merged active template map.
- **Parsers:** Static registry + template-driven; receive uses merged map for flexibility.
