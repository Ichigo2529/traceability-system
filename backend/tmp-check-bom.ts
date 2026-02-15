import { and, eq } from "drizzle-orm";
import { db, closeDbConnection } from "./src/db/connection";
import { models, modelRevisions, bom } from "./src/db/schema";

async function main() {
  const rows = await db
    .select({
      modelCode: models.code,
      revisionCode: modelRevisions.revisionCode,
      revisionStatus: modelRevisions.status,
      bomId: bom.id,
      componentName: bom.componentName,
      componentType: bom.componentType,
      componentPartNumber: bom.componentPartNumber,
      rmLocation: bom.rmLocation,
      qty: bom.qtyPerBatch,
    })
    .from(bom)
    .innerJoin(modelRevisions, eq(bom.revisionId, modelRevisions.id))
    .innerJoin(models, eq(modelRevisions.modelId, models.id))
    .where(and(eq(models.isActive, true), eq(modelRevisions.status, "ACTIVE")));

  console.table(rows);
  await closeDbConnection();
}

main().catch(async (e) => {
  console.error(e);
  await closeDbConnection();
  process.exit(1);
});
