 # API Contracts – Formal



Each endpoint must have:

 - input spec

 - output spec

 - error codes

 - pre/post conditions



 ### POST /events

Input:

{

  event _id: UUID,

  unit _id,

  machine _id,

  created _at _device,

  payload (JSON)

}



Precondition:

operator _session must be active

machine assigned

authorized



Postcondition:

idempotent persist



Error codes:

 - INVALID _STATE _TRANSITION

 - COMPONENT _NOT _WASHED

 - INSUFFICIENT _QTY _REMAINING

... per reference



