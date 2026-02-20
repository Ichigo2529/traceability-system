import { materialRequests } from "./src/db/schema";
import { db } from "./src/db/connection";

async function run() {
  try {
    const created = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(materialRequests)
        .values({
          requestNo: "TEST-" + Date.now(),
          requestDate: "2026-02-21",
        })
        .returning({
          id: materialRequests.id,
          missingColumn: undefined as any // simulate a missing/misspelled column
        });

      return header;
    });
    console.log("Success:", created);
  } catch (e) {
    console.error("Caught error:");
    console.error(e);
  }
}

run();
