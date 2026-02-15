import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Connection for queries (pool)
const queryClient = postgres(databaseUrl);
export const db = drizzle(queryClient, { schema });

// Separate connection for migrations (single, non-pooled)
export function createMigrationClient() {
  return postgres(databaseUrl!, { max: 1 });
}

export async function closeDbConnection() {
  await queryClient.end();
}
