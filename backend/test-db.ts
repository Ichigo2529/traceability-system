import { materialRequests, materialRequestItems } from "./src/db/schema";
import { db } from "./src/db/connection";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const created = await db.transaction(async (tx) => {
      const [header] = await tx
        .insert(materialRequests)
        .values({
          requestNo: "TEST-001",
          dmiNo: "TEST-002",
          requestDate: "2026-02-21",
          modelId: "e9e984fc-15ec-4d7a-b5e1-5bc32b1fffe8",
          section: undefined, // testing undefined in Drizzle ORM
          costCenter: null,
          requestSectionId: null,
          requestCostCenterId: null,
          processName: null,
          requestedByUserId: "e9e984fc-15ec-4d7a-b5e1-5bc32b1fffe8",
          receivedByUserId: null,
          status: "REQUESTED",
          remarks: null,
        })
        .returning({
          id: materialRequests.id,
        });

      await tx.insert(materialRequestItems).values([
        {
          materialRequestId: header.id,
          itemNo: 1,
          partNumber: "TEST-PART",
          description: undefined, // testing undefined in Drizzle ORM array 
          requestedQty: undefined, // testing undefined in Drizzle ORM array
          issuedQty: null,
          uom: "PCS",
          doNumber: null,
          lotNumber: null,
          remarks: null,
        }
      ]);

      return header;
    });
    console.log("Success:", created);
  } catch (e) {
    console.error("Caught expected error:");
    console.error(e);
  }
}

run();
