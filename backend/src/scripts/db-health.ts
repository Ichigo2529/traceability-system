import { sql } from "drizzle-orm";
import { closeDbConnection, db } from "../db/connection";

async function main() {
  const timeoutMs = 10000;
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`DB health check timeout (${timeoutMs}ms)`)), timeoutMs);
  });

  try {
    const result = await Promise.race([
      db.execute<{ ok: number }>(sql`select 1 as ok`),
      timeout,
    ]);
    const row = result[0];
    if (!row || row.ok !== 1) {
      throw new Error("DB health check failed");
    }
    console.log("DB health check OK");
  } finally {
    await closeDbConnection();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
