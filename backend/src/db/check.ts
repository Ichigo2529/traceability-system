import postgres from "postgres";

async function check() {
  const sql = postgres(process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/traceability");
  
  const res = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'master_routing_steps')`;
  console.log("Table exists:", res[0].exists);
  
  if (!res[0].exists) {
    console.log("Creating table manually to bypass Drizzle sync issues...");
    await sql`
      CREATE TABLE "master_routing_steps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "step_code" varchar(100) NOT NULL,
        "description" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "master_routing_steps_step_code_unique" UNIQUE("step_code")
      );
    `;
    await sql`CREATE INDEX "idx_master_routing_steps_active" ON "master_routing_steps" USING btree ("is_active");`;
    console.log("Table created.");
  }
  
  await sql.end();
}

check().catch(console.error);
