import { materialRequestItems } from "./src/db/schema";
import { db } from "./src/db/connection";

async function run() {
  try {
    const created = await db.transaction(async (tx) => {
      await tx.insert(materialRequestItems).values([]);
      return true;
    });
    console.log("Success:", created);
  } catch (e) {
    console.error("Caught error:");
    console.error(e);
  }
}

run();
