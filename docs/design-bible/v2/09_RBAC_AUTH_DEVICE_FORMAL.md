 # RBAC + Device + Operator Formal Model



Users:

 - user _id

 - roles



Devices:

 - device _id

 - machine _id



Operator Sessions:

 - device _id

 - user _id

 - started _at

 - ended _at



Constraint:

Events must carry operator _user _id resolved server-side.



Unauthorized event => OPERATOR _SESSION _REQUIRED



