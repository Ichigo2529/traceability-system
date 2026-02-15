\# 13 – Admin UI Specification (Formal)



Admin UI must enforce governance rules.



---



\## 13.1 Model Management



\- Create model

\- Create revision

\- Clone revision

\- Activate revision (ADMIN only)



Constraint:

Active revision immutable.



---



\## 13.2 Variant Management



\- Add variant

\- Remove variant (only inactive revision)

\- Set default variant



---



\## 13.3 BOM Editor



Fields:

\- component\_type

\- part\_number

\- qty\_per\_assy

\- required

\- variant\_rule



---



\## 13.4 Routing Editor



Fields:

\- step\_code

\- sequence

\- mandatory

\- variant\_rule



---



\## 13.5 Label Templates



Fields:

\- template JSON

\- fixed length 92 validation



---



\## 13.6 Machine Capability



\- Assign line\_code

\- Assign supported\_variants



Block assembly if unsupported.



---



\## 13.7 Readiness Validator



Must check:

\- BOM exists

\- Routing exists

\- Variants configured

\- Label template bound

\- Machine capability configured

\- Serial policy configured



Only PASS → allow activation.



