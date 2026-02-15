# 14 Error Handling Matrix

| Error Code                   | Where            | Blocking | Operator Guidance                           |
| ---------------------------- | ---------------- | -------: | ------------------------------------------- |
| DEVICE_NOT_ASSIGNED          | any station      |      Yes | Ask admin to assign device to machine       |
| OPERATOR_SESSION_REQUIRED    | any station      |      Yes | Login operator on kiosk                     |
| COMPONENT_NOT_WASHED         | bonding/assembly |      Yes | Send to wash first                          |
| MISSING_REQUIRED_COMPONENT   | assembly start   |      Yes | Scan required jig(s)                        |
| INSUFFICIENT_QTY_REMAINING   | bonding/steps    |      Yes | Replace jig/pack                            |
| LINE_NOT_CAPABLE_FOR_VARIANT | assembly start   |      Yes | Move to supported line or update capability |
| INVALID_STATE_TRANSITION     | any              |      Yes | Stop and call supervisor                    |
| OFFLINE_SERIAL_NOT_ALLOWED   | label            |      Yes | Wait network up                             |
| REVISION_NOT_READY           | jigging/admin    |      Yes | Admin must complete config and activate     |
| REVISION_LOCKED              | admin            |      Yes | Create new revision                         |

Soft warnings (non-block):

- COMPONENT_ALREADY_WASHED
- SHROUD_NOT_REQUIRED_FOR_VARIANT
