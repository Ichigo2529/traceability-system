# Spec 15 – Material request form

- **Flow:** Create request (production or store) → Approve/Reject → Allocate/Issue → Receive (scan) → Voucher/view/print. Audit trail.
- **API:** material-requests routes (create, approve, reject, issue, receive). See [../architecture/api-and-routes.md](../architecture/api-and-routes.md).
- **UI:** Admin list/detail/create; station production request and store approval. Forms aligned with API types (Zod + SDK).
