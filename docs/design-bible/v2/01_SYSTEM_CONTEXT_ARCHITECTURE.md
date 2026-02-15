 # System Context  & Architecture (Formal)



 ## Goal

Provide end-to-end genealogy traceability from inbound materials (supplier packs) to finished pallet.



 ## Block Diagram

```mermaid

graph TD

&nbsp;   Store((SUPPLIER PACKS + DO))

&nbsp;   Prod((PRODUCTION))

&nbsp;   Jigging((JIGGING))

&nbsp;   Wash1((WASH1))

&nbsp;   Bonding((BONDING))

&nbsp;   Wash2((WASH2))

&nbsp;   Magnetize((MAGNETIZE))

&nbsp;   Flux((FLUX))

&nbsp;   Assembly((ASSEMBLY))

&nbsp;   Label((LABEL STATION))

&nbsp;   Packing((PACKING))

&nbsp;   FG((FG ROOM))

&nbsp;   Pallet((PALLET))

&nbsp;   Store-->Jigging

&nbsp;   Jigging-->Wash1

&nbsp;   Wash1-->Bonding

&nbsp;   Jigging-->Wash2

&nbsp;   Bonding-->Magnetize-->Flux-->Assembly-->Label-->Packing-->FG-->Pallet





Subsystems



Backend API (Bun + Elysia)



Admin UI (config, governance, readiness)



Shopfloor UIs (kiosk + stations)



Offline queue (Dexie)



PostgreSQL (source of truth)

