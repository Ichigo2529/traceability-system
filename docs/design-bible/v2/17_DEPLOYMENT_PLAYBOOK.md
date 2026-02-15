 # 17 – Deployment  & Go-Live Playbook



 ## Pre-Go-Live



 - Seed roles + admin

 - Configure machines + lines

 - Configure model revision

 - Run readiness validator PASS

 - Execute UAT matrix



---



 ## Go-Live Day



 - Activate revision

 - Monitor device heartbeat

 - Monitor event queue

 - Validate serial generation



---



 ## Rollback Strategy



 - Never edit active revision

 - Create new revision if config error

 - Maintain DB backup before activation

 - In outage:

&nbsp; - Shopfloor continues offline

&nbsp; - Labels paused until online



---



 ## Audit Readiness



System must allow:

 - Full genealogy trace

 - Operator attribution

 - Timestamp trace

 - Supplier lot recall



