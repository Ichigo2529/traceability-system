 # Barcode Domain Separation



 ### Supplier 2D Barcode

 - raw _scan

 - parsed fields:

  - supplier _code

  - part _number

  - lot

  - pack _qty _total

  - production _date

Parser interface must be pluggable per supplier.



 ### Internal 92-byte Barcode

 - fixed length 92

 - fields:

  - model

  - shift _day

  - line _code

  - component fields (if needed)

  - running serial



Must validate exact length.



94



