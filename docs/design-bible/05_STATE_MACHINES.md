# 05 State Machines (Final)

## 1) ASSY_120 state machine

```mermaid
stateDiagram-v2
  [*] --> CREATED
  CREATED --> WASH2_DONE: WASH2_END
  WASH2_DONE --> MAG_DONE: MAGNETIZE_DONE
  MAG_DONE --> FLUX_PASS: FLUX_PASS
  FLUX_PASS --> COMPONENTS_BOUND: ASSY_BIND_COMPONENTS
  COMPONENTS_BOUND --> ASSEMBLY_IN_PROGRESS: FIRST_ASSEMBLY_STEP_START
  ASSEMBLY_IN_PROGRESS --> ASSEMBLY_COMPLETED: FVMI_PASS
  ASSEMBLY_COMPLETED --> LABELED: LABELS_GENERATED
  LABELED --> [*]

2) Component JIG state machine (PIN430_JIG, etc.)
stateDiagram-v2
  [*] --> LOADED
  LOADED --> WASH2_COMPLETED: WASH2_END
  WASH2_COMPLETED --> IN_USE: ASSY_BIND_COMPONENTS
  IN_USE --> WASH2_COMPLETED: JIG_RETURNED  /* returned to jigging staging */

3) TRAY (FOF_TRAY_20)
stateDiagram-v2
  [*] --> CREATED
  CREATED --> LABELED: LABEL_ATTACHED
  LABELED --> GROUPED: SPLIT_GROUP_ASSIGNED
  GROUPED --> PACKED: OUTER_PACKED
  PACKED --> [*]

4) OUTER
stateDiagram-v2
  [*] --> CREATED
  CREATED --> PALLETIZED: PALLET_MAP
  PALLETIZED --> [*]

5) Device/operator session

device is registered + assigned to machine

operator must have active session on device to create events (kiosk mode)
```
