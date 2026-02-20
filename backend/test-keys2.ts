import { materialRequests } from "./src/db/schema";
console.log({
  id: !!materialRequests.id,
  requestNo: !!materialRequests.requestNo,
  dmiNo: !!materialRequests.dmiNo,
  requestDate: !!materialRequests.requestDate,
  modelId: !!materialRequests.modelId,
  section: !!materialRequests.section,
  costCenter: !!materialRequests.costCenter,
  requestSectionId: !!materialRequests.requestSectionId,
  requestCostCenterId: !!materialRequests.requestCostCenterId,
  processName: !!materialRequests.processName,
  status: !!materialRequests.status,
  remarks: !!materialRequests.remarks,
});
