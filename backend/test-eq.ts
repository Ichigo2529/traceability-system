import { users } from "./src/db/schema";
import { db } from "./src/db/connection";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const val: any = undefined;
    await db.select().from(users).where(eq(users.id, val));
    console.log("Success");
  } catch (e) {
    console.error("Caught error:");
    console.error(e);
  }
}

run();
