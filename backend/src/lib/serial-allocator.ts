import { sql } from "drizzle-orm";
import { db } from "../db/connection";
import { serialCounters } from "../db/schema/labels";
import { DomainError } from "./errors";

/**
 * Allocates the next serial number for a given part/shift/line combination.
 * The operation is atomic using PostgreSQL's ON CONFLICT DO UPDATE.
 * The serial resets daily per line per part due to the composite primary key strategy.
 * 
 * Range: 1 to 9999.
 * Throws error if quota exceeded.
 */
export async function allocateSerial(
  partNumber: string,
  shiftDay: string,
  lineCode: string
): Promise<number> {
  // Atomic increment:
  // If record exists, last_serial = last_serial + 1
  // If not exists, insert last_serial = 1
  const [row] = await db
    .insert(serialCounters)
    .values({
      partNumber,
      shiftDay,
      lineCode,
      lastSerial: 1,
    })
    .onConflictDoUpdate({
      target: [
        serialCounters.partNumber,
        serialCounters.shiftDay,
        serialCounters.lineCode,
      ],
      set: {
        lastSerial: sql`${serialCounters.lastSerial} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({
      lastSerial: serialCounters.lastSerial,
    });

  if (!row) {
    throw new DomainError("SERIAL_ALLOCATION_FAILED", "Database failed to return new serial");
  }

  const serial = row.lastSerial;

  if (serial > 9999) {
    throw new DomainError("SERIAL_EXHAUSTED", `Daily serial limit (9999) exceeded for ${partNumber} on ${shiftDay}`);
  }

  return serial;
}
