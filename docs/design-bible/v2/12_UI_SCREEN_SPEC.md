\# 12 – UI Screen Specification (Formal)



This document defines UI behavior as formal interaction contracts.

No UI may violate domain rules defined in previous chapters.



All station screens must display:



HEADER (always visible):

\- Machine Name

\- Station Type

\- Line Code

\- Operator Name + ID

\- Shift Day (computed server-side)

\- Network Status (Online / Offline)

\- Pending Queue Count



---



\## 12.1 Jigging – Plate Load Screen



Inputs:

\- Scan Plate RFID

\- Confirm 5 jigs = 120 pcs



Action:

\- Create PLATE\_120 unit

\- Emit PLATE\_LOADED event



Block if:

\- Active revision missing

\- Device not assigned

\- Operator not logged in



---



\## 12.2 Wash1 Screen



Input:

\- Scan Plate RFID



Action:

\- Emit WASH1\_END



Precondition:

\- Plate state = LOADED



Postcondition:

\- Plate state = WASH1\_DONE



---



\## 12.3 Wash2 Screen (Component Jigs)



Input:

\- Scan Jig RFID



Action:

\- Emit WASH2\_END



Precondition:

\- Jig state = LOADED



Postcondition:

\- Jig state = WASH2\_COMPLETED



---



\## 12.4 Bonding Screen (Shared Machine)



Inputs:

\- Scan Plate RFID

\- Scan Magnet Supplier Pack RFID



Display:

\- Magnet pack qty\_remaining



Action:

\- Emit BONDING\_END



Preconditions:

\- Plate state = WASH1\_DONE

\- Magnet pack qty\_remaining >= 120



Postconditions:

\- Create ASSY\_120

\- Deduct magnet qty\_remaining -= 120

\- Link ASSY → PLATE

\- Link ASSY → SUPPLIER\_PACK



Errors:

\- COMPONENT\_NOT\_WASHED

\- INSUFFICIENT\_QTY\_REMAINING



---



\## 12.5 Assembly Start Screen



Inputs:

\- Scan ASSY\_120

\- If variant null → select variant

\- Scan required jigs



Display:

\- Jig wash status

\- qty\_remaining per jig



Action:

\- Emit ASSY\_BIND\_COMPONENTS



Block if:

\- Variant not supported by line

\- Jig not washed

\- Missing required component



---



\## 12.6 Assembly Step Screen



Buttons:

\- PIN430 DONE

\- PIN300 DONE

\- SHROUD DONE (if WITH\_SHROUD)

\- CRASH STOP DONE

\- IONIZER DONE

\- FVMI PASS

\- FVMI FAIL



On each DONE:

\- Deduct 120 from corresponding jig

\- Prevent duplicate consume



---



\## 12.7 Label Station



Input:

\- ASSY\_120



Action:

\- POST /labels/generate



Precondition:

\- Online only

\- ASSY state = ASSEMBLY\_COMPLETED



Postcondition:

\- Create 6 tray labels

\- State → LABELED



---



\## 12.8 Packing Screen



Actions:

\- Create 2 GROUP\_60

\- Pack 3 trays into OUTER



---



\## 12.9 FG Screen



Inputs:

\- Scan OUTER

\- Scan PALLET



Action:

\- Emit FG\_PALLET\_MAPPED



