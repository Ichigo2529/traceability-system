import { bom, supplierPartProfiles, users, models } from "./src/db/schema";
console.log("bom:", {
  partNumber: !!bom.partNumber,
  qtyPerAssy: !!bom.qtyPerAssy,
  componentName: !!bom.componentName,
  rmLocation: !!bom.rmLocation,
});
console.log("supplierPartProfiles:", {
  defaultPackQty: !!supplierPartProfiles.defaultPackQty,
});
console.log("models:", {
  id: !!models.id,
  modelCode: !!models.modelCode,
  modelName: !!models.modelName,
});
console.log("users:", {
  displayName: !!users.displayName,
});
