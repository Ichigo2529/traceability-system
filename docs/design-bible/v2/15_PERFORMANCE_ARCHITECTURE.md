 # 15 – Performance  & Scaling



 ## Assumptions

 - 3 assembly lines

 - 20,000 units/day

 - 15s heartbeat per device



 ## Indexes Required

 - events(event _id UNIQUE)

 - units(unit _type)

 - unit _links(parent _unit _id)

 - serial _counters(part _number, shift _day, line _code)



 ## Partitioning

Consider monthly partitioning for events table.



 ## Transaction Rules

All event handlers must:

 - Run in single DB transaction

 - Perform state check

 - Apply side effects

 - Commit atomically



