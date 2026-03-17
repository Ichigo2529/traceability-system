# UAT / Go-live sign-off template

Use one copy per signatory role. Complete after UAT execution per [uat-checklist.md](uat-checklist.md) and [uat-script.md](uat-script.md).

---

## Sign-off: Production owner

- **Role:** Production owner (business)
- **Scope:** UAT results and go-live readiness from production perspective.

| Item                                                                      | Confirmed |
| ------------------------------------------------------------------------- | --------- |
| Core scenarios (WITH_SHROUD, NO_SHROUD, rejections) executed and accepted | [ ]       |
| Material flow (request → approve → issue → receive) acceptable            | [ ]       |
| Traceability and genealogy behaviour acceptable                           | [ ]       |
| Exceptions / open items documented and accepted                           | [ ]       |

**Name:** **\*\***\_\_\_**\*\***  
**Date:** **\*\***\_\_\_**\*\***  
**Signature / approval:** **\*\***\_\_\_**\*\***

**Comments (if any):** **\*\***\_\_\_**\*\***

---

## Sign-off: Quality owner

- **Role:** Quality owner (QA / quality assurance)
- **Scope:** UAT execution and test evidence.

| Item                                               | Confirmed |
| -------------------------------------------------- | --------- |
| UAT script executed; results recorded              | [ ]       |
| Defects logged; critical/high resolved or accepted | [ ]       |
| Offline and recovery scenarios verified            | [ ]       |
| Traceability verification passed                   | [ ]       |

**Name:** **\*\***\_\_\_**\*\***  
**Date:** **\*\***\_\_\_**\*\***  
**Signature / approval:** **\*\***\_\_\_**\*\***

**Comments (if any):** **\*\***\_\_\_**\*\***

---

## Sign-off: IT operations

- **Role:** IT operations
- **Scope:** Environment, runbook, and operational readiness.

| Item                                                               | Confirmed |
| ------------------------------------------------------------------ | --------- |
| UAT environment precheck passed                                    | [ ]       |
| `bun run check:go-live` and DB migration/backup procedure verified | [ ]       |
| Runbook and rollback steps reviewed and acceptable                 | [ ]       |
| Device inventory and heartbeat monitoring acceptable               | [ ]       |

**Name:** **\*\***\_\_\_**\*\***  
**Date:** **\*\***\_\_\_**\*\***  
**Signature / approval:** **\*\***\_\_\_**\*\***

**Comments (if any):** **\*\***\_\_\_**\*\***

---

**Program:** Traceability System – Single go-live  
**Target go-live:** July 13, 2026  
**Reference:** [uat-checklist.md](uat-checklist.md), [runbook-go-live.md](runbook-go-live.md)
