import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { describeWithContainers } from "../helpers/containerRuntime.js";

describeWithContainers("migrations", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./src/backend/db/migrations" });
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE users, sessions CASCADE");
  });

  it("creates users and sessions tables", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
    );
    const names = res.rows.map((r) => r.table_name);
    expect(names).toContain("users");
    expect(names).toContain("sessions");
  });

  it("enforces unique email", async () => {
    await pool.query(`INSERT INTO users (email, name, password_hash) VALUES ('a@b.c', 'A', 'h')`);
    await expect(
      pool.query(`INSERT INTO users (email, name, password_hash) VALUES ('a@b.c', 'B', 'h2')`),
    ).rejects.toThrow(/duplicate key/i);
  });

  it("cascades user delete to sessions", async () => {
    const userRes = await pool.query(
      `INSERT INTO users (email, name, password_hash) VALUES ('cascade@b.c', 'C', 'h') RETURNING id`,
    );
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, 'unique-hash-1', now() + interval '1 day')`,
      [userId],
    );
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    const remaining = await pool.query(
      `SELECT COUNT(*)::int as c FROM sessions WHERE user_id = $1`,
      [userId],
    );
    expect(remaining.rows[0].c).toBe(0);
  });
});
