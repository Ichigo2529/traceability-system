 # 16 – Test Case Matrix



 ## Domain Tests



 - Shift boundary test at 07:59 and 08:00

 - Variant WITH _SHROUD vs NO _SHROUD

 - Shared bonding divergence

 - Supplier pack qty underflow

 - Revision immutability enforcement

 - Step double-consume blocked

 - Offline queue replay idempotent



---



 ## End-to-End Scenarios



1 ) WITH _SHROUD full flow

2 ) NO _SHROUD full flow

3 ) Line switch before first step allowed

4 ) Line switch after first step blocked

5 ) Label blocked offline

6 ) Serial reset across shift boundary



All must pass before production release.



