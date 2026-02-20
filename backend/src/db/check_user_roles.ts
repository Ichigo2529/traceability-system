import postgres from "postgres";

async function run() {
  const sql = postgres(process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/traceability");
  try {
    const res = await sql`
      SELECT u.username, r.name as role_name 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      WHERE u.username = 'yotin'
    `;
    console.log("User Roles:", res);
  } catch(e) {
    console.error(e);
  }
  await sql.end();
}
run();
