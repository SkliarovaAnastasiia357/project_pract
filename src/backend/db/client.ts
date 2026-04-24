import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

export type DbHandle = {
  db: Db;
  pool: Pool;
  close: () => Promise<void>;
};

export function createDb(options: PoolConfig & { connectionString: string }): DbHandle {
  const pool = new Pool(options);
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
