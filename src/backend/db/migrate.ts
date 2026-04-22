import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { loadEnv } from "../config/env.js";

async function runMigrations(): Promise<void> {
  const env = loadEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./src/backend/db/migrations" });
  await pool.end();
}

runMigrations()
  .then(() => {
    console.log(JSON.stringify({ level: "info", msg: "migrations applied" }));
    process.exit(0);
  })
  .catch((err) => {
    console.error(JSON.stringify({ level: "fatal", msg: "migration failed", err: String(err) }));
    process.exit(1);
  });
