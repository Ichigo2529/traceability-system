  # Genealogy Link Semantics



Each unit may be linked to others via unit  _links.



Formal link types:

  - DERIVED  _FROM  

  - (child unit was derived from parent)

  - CONSUMES  

  - (child unit consumes quantity from parent)

  - OUTPUT  _OF  

  - (child unit was created by processing parent)

  - PACKED  _IN  

  - (child unit placed inside parent)

  - SPLIT  _FROM  

  - (child unit is part of a split)



Genealogy invariant:

```text

No cycles allowed

Genetic lineage must always trace back to one or more SUPPLIER  _PACK



