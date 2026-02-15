import { allocateSerial } from "../lib/serial-allocator";
import { buildLabelContent } from "../lib/label-builder";
import { db } from "../db/connection";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Testing Serial Allocator ===");
  
  const today = "2026-02-13";
  const tomorrow = "2026-02-14";
  const part = "TEST-PART-001";
  
  // Clean up
  await db.execute(sql`DELETE FROM serial_counters WHERE part_number = ${part}`);

  // Test 1: First allocation
  const s1 = await allocateSerial(part, today, "L1");
  console.log(`L1 Today #1: ${s1} (Expect 1)`);

  // Test 2: Second allocation
  const s2 = await allocateSerial(part, today, "L1");
  console.log(`L1 Today #2: ${s2} (Expect 2)`);

  // Test 3: Different Line
  const s3 = await allocateSerial(part, today, "L2");
  console.log(`L2 Today #1: ${s3} (Expect 1)`);

  // Test 4: Different Day
  const s4 = await allocateSerial(part, tomorrow, "L1");
  console.log(`L1 Tomorrow #1: ${s4} (Expect 1)`);

  console.log("\n=== Testing Label Builder ===");
  try {
    const label = buildLabelContent({
      partNumber: part,
      variantCode: "VAR-X",
      serial: s2,
      lineCode: "L1",
      shiftDay: today,
    });
    console.log(`Label: "${label}"`);
    console.log(`Length: ${label.length} (Expect 92)`);
  } catch (e: any) {
    console.error(`Builder Error: ${e.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
