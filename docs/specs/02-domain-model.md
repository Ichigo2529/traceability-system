# Spec 02 – Domain model

- **Core entities:** Model, Revision (immutable when ACTIVE), Variant, BOM, Routing, Station, Process, Device, Unit (tray/outer/pallet), Event, Unit_link (genealogy).
- **Definitions:** shift_day (08:00 boundary), unit, unit_link, event — see [README.md](README.md).
- **Rules:** Multi-model, multi-revision; optional variants; shared Bonding; assembly = binding point; consumption on step DONE.
- **References:** [../architecture/database.md](../architecture/database.md).
