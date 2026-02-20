import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/traceability");
  try {
    const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'master_routing_steps'`;
    console.log("Columns:", res);
  } catch(e) {
    console.error(e);
  }
  await sql.end();
}
run();
