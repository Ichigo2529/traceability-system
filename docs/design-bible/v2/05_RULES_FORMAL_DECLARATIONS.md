 # Formal Rule Declarations



Each rule below must be enforced in code.



 ## Serial Reset Rule

Let:

shift _day = if local _time >= 08:00 then date else date - 1



yaml

Copy code

Serial must reset at shift _day boundary.



---



 ## Label Online Only

Label generation functions must throw OFFLINE _SERIAL _NOT _ALLOWED when offline.



---



 ## Variant Lock Rule

Variant assignment is allowed only:

 - Before first assembly step

Lock permanently after first step.



---



 ## Revision Immutable Rule

Active revision cannot be modified. Admin must create new revision.



---



 ## Consume Only on Step DONE

For each step:

```text

PRESS _FIT _ * _DONE

qty _remaining deduction happens only on DONE event.



Wash Enforcement

Plate must be WASH1 _DONE before bonding consumption.

Component jigs must be WASH2 _DONE before binding.



Supplier Pack Tracking

Pack qty deduction and genealogy must link:

ASSY _120 → SUPPLIER _PACK.

