import { and, eq, sql } from "drizzle-orm";
import { db, closeDbConnection } from "./backend/src/db/connection";
import { models, modelRevisions, bom } from "./backend/src/db/schema";

async function main() {
  const allModels = await db.select({ id: models.id, code: models.code, name: models.name, active: models.isActive }).from(models);
  const activeRevs = await db
    .select({ id: modelRevisions.id, modelId: modelRevisions.modelId, code: modelRevisions.revisionCode, status: modelRevisions.status })
    .from(modelRevisions)
    .where(eq(modelRevisions.status, "ACTIVE"));

  const catalogRows = await db
    .select({
      modelId: models.id,
      modelCode: models.code,
      revisionId: modelRevisions.id,
      revisionCode: modelRevisions.revisionCode,
      part: bom.componentPartNumber,
      comp: bom.componentName,
    })
    .from(bom)
    .innerJoin(modelRevisions, eq(bom.revisionId, modelRevisions.id))
    .innerJoin(models, eq(modelRevisions.modelId, models.id))
    .where(and(eq(modelRevisions.status, "ACTIVE"), eq(models.isActive, true), sql`${bom.componentPartNumber} is not null`));

  console.log("models:", allModels.length);
  console.log("active revisions:", activeRevs.length);
  console.log("catalog rows:", catalogRows.length);
  console.log("sample models:", allModels.slice(0, 5));
  console.log("sample active revs:", activeRevs.slice(0, 5));
  console.log("sample catalog:", catalogRows.slice(0, 10));

  await closeDbConnection();
}

main().catch(async (e) => {
  console.error(e);
  await closeDbConnection();
  process.exit(1);
});
