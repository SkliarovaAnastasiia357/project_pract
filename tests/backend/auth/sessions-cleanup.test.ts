import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { users, sessions } from "../../../src/backend/db/schema.js";
import {
  cleanupExpiredSessions,
  startCleanupJob,
} from "../../../src/backend/auth/sessions-cleanup.js";

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle>;
let userId: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  db = drizzle(pool, { schema: { users, sessions } });
  await migrate(db, { migrationsFolder: "./src/backend/db/migrations" });
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

beforeEach(async () => {
  await pool.query("TRUNCATE users, sessions CASCADE");
  const res = await pool.query(
    `INSERT INTO users (email, name, password_hash) VALUES ('a@b.c', 'A', 'h') RETURNING id`,
  );
  userId = res.rows[0].id;
});

describe("sessions-cleanup", () => {
  it("deletes long-expired and long-revoked rows, keeps recent", async () => {
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, 'a', now() - interval '40 days')`,
      [userId],
    );
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, revoked_at) VALUES ($1, 'b', now(), now() - interval '40 days')`,
      [userId],
    );
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, 'c', now() + interval '1 day')`,
      [userId],
    );

    const { deleted } = await cleanupExpiredSessions(db as any);
    expect(deleted).toBe(2);
    const res = await pool.query(
      `SELECT token_hash FROM sessions WHERE user_id = $1 ORDER BY token_hash`,
      [userId],
    );
    expect(res.rows.map((r) => r.token_hash)).toEqual(["c"]);
  });

  it("deletes 0 when no rows match", async () => {
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, 'a', now() + interval '1 day')`,
      [userId],
    );
    const { deleted } = await cleanupExpiredSessions(db as any);
    expect(deleted).toBe(0);
  });

  it("startCleanupJob fires after firstRunDelayMs and then at intervalMs", async () => {
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, 'a', now() - interval '40 days')`,
      [userId],
    );
    const logs: object[] = [];
    const stop = startCleanupJob({
      db: db as any,
      intervalMs: 100,
      firstRunDelayMs: 50,
      logger: { info: (o) => logs.push(o), error: (o) => logs.push(o) },
    });
    await new Promise((r) => setTimeout(r, 400));
    stop();
    const okLogs = logs.filter((l: any) => l.msg === "sessions-cleanup ok");
    expect(okLogs.length).toBeGreaterThanOrEqual(2);
    expect((okLogs[0] as any).deleted).toBe(1);
  });

  it("stop() cancels next tick", async () => {
    const logs: object[] = [];
    const stop = startCleanupJob({
      db: db as any,
      intervalMs: 100,
      firstRunDelayMs: 50,
      logger: { info: (o) => logs.push(o), error: (o) => logs.push(o) },
    });
    await new Promise((r) => setTimeout(r, 70));
    stop();
    const countAfterStop = logs.length;
    await new Promise((r) => setTimeout(r, 250));
    // Expect no additional ticks after stop
    expect(logs.length).toBe(countAfterStop);
  });
});
