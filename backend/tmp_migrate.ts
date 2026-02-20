import { db } from "./src/db/connection";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Migrating rm_location...");
    await db.execute(sql`ALTER TABLE part_numbers ADD COLUMN IF NOT EXISTS rm_location varchar(50);`);
    console.log("Added rm_location to part_numbers");
    
    try {
        await db.execute(sql`ALTER TABLE bom DROP COLUMN rm_location;`);
        console.log("Dropped rm_location from bom");
    } catch(e) {
        console.log("bom rm_location drop failed or already dropped", e);
    }
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    process.exit(0);
  }
}

run();
