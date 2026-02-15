 # 14 – Error Handling Formal Matrix



Each error must have:



 - Code

 - Trigger condition

 - Blocking level

 - UI response



---



 ## Blocking Errors



COMPONENT _NOT _WASHED  

INCOMPLETE _BINDING  

INSUFFICIENT _QTY _REMAINING  

VARIANT _MISMATCH  

LINE _NOT _CAPABLE  

REVISION _LOCKED  

OFFLINE _SERIAL _NOT _ALLOWED  

INVALID _STATE _TRANSITION  

OPERATOR _SESSION _REQUIRED  



---



 ## Soft Warnings



COMPONENT _ALREADY _WASHED  

VARIANT _NOT _REQUIRED  



---



All blocking errors must:

 - Prevent state mutation

 - Not partially apply side effects



