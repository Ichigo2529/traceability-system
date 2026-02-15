# 11 RFID Card Circulation & Material Flow

## Card movement (authoritative)

- Production dispatch RFID:
  Production → Jigging → Return Production → repeat

- Plate RFID:
  Jigging → Wash1 → Bonding → Return Jigging → repeat

- Magnet RFID:
  Bonding → Return Jigging → repeat

- Component jigs RFID (Pin430/Pin300/Shroud/Crash):
  Store → Jigging → Wash2 → Assembly → Return Jigging → repeat

## Material movement (forward only)

Store → Production → Jigging → Wash → Bonding → Magnetize → Flux → Assembly → Label → Split → Packing → FG

## Assembly divergence

Bonding shared. At Assembly:

- WITH_SHROUD requires Shroud jig bind + shroud step
- NO_SHROUD skips that component and step

## Line switching

- Allowed before first assembly step
- Block after first step
