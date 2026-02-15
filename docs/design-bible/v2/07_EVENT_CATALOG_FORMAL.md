 # Event Registry



Each event type must have:

 - domain effect

 - side effects

 - preconditions

 - postconditions



Examples:



 ### ASSY _BIND _COMPONENTS

Preconditions:

 - assy _unit.status = FLUX _PASS

 - all required jigs in WASH2 _COMPLETED

Postconditions:

 - assy _unit.variant _id assigned if null

 - linked jigs via unit _links

 - assy.status = COMPONENTS _BOUND



 ### PRESS _FIT _PIN430 _DONE

Formal:

 - quantity deduction from PIN430 _JIG.qty _remaining

 - assert qty _remaining >= qty _per _batch

 - no double consume



(Either failed => INVALID _STATE _TRANSITION)



