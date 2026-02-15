\# Offline Event Queue Formal



Offline operations allowed:

\- Wash events

\- Assembly step events

\- Binding events



Offline disallowed:

\- Serial allocate

\- Label generation



Offline queue replay:

\- Must maintain order

\- Must respect idempotency



If conflict => INVALID\_STATE\_TRANSITION



