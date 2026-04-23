import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { users, sessions } from "../../../src/backend/db/schema.js";
import {
  createSession, rotateSession, revokeByRawToken, revokeAllForUser,
  RefreshInvalid, RefreshReuseDetected,
} from "../../../src/backend/auth/sessions.js";

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

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

describe("sessions", () => {
  it("createSession inserts hashed token, returns raw", async () => {
    const { rawToken, sessionId } = await createSession(db as any, userId, { ttlSec: 60 });
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]+$/);
    const res = await pool.query(`SELECT token_hash FROM sessions WHERE id=$1`, [sessionId]);
    expect(res.rows[0].token_hash).toHaveLength(64);
    expect(res.rows[0].token_hash).not.toBe(rawToken);
    expect(res.rows[0].token_hash).toBe(sha256(rawToken));
  });

  it("rotateSession issues new token and revokes old with replaced_by_id", async () => {
    const { rawToken: t1 } = await createSession(db as any, userId, { ttlSec: 60 });
    const { rawToken: t2, userId: uid } = await rotateSession(db as any, t1, { ttlSec: 60 });
    expect(uid).toBe(userId);
    expect(t2).not.toBe(t1);
    const res = await pool.query(
      `SELECT revoked_at, replaced_by_id FROM sessions WHERE user_id=$1 ORDER BY created_at`,
      [userId],
    );
    expect(res.rows[0].revoked_at).not.toBeNull();
    expect(res.rows[0].replaced_by_id).not.toBeNull();
    expect(res.rows[1].revoked_at).toBeNull();
  });

  it("rotateSession on expired throws RefreshInvalid", async () => {
    const { rawToken } = await createSession(db as any, userId, { ttlSec: 1 });
    await new Promise((r) => setTimeout(r, 1200));
    await expect(rotateSession(db as any, rawToken, { ttlSec: 60 })).rejects.toBeInstanceOf(RefreshInvalid);
  });

  it("rotateSession on replayed revoked token (>grace) triggers family revoke", async () => {
    const { rawToken: t1 } = await createSession(db as any, userId, { ttlSec: 60 });
    await rotateSession(db as any, t1, { ttlSec: 60 });
    // Backdate the revocation >5s ago so it falls outside the grace window
    await pool.query(
      `UPDATE sessions SET revoked_at = now() - interval '10 seconds' WHERE token_hash = $1`,
      [sha256(t1)],
    );
    await expect(rotateSession(db as any, t1, { ttlSec: 60 })).rejects.toBeInstanceOf(RefreshReuseDetected);
    const active = await pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE user_id=$1 AND revoked_at IS NULL`,
      [userId],
    );
    expect(active.rows[0].c).toBe(0);
  });

  it("rotateSession on recently-revoked token (<grace) throws RefreshInvalid WITHOUT family revoke", async () => {
    const { rawToken: t1 } = await createSession(db as any, userId, { ttlSec: 60 });
    await rotateSession(db as any, t1, { ttlSec: 60 });
    // Revocation is fresh (<5s ago), replaced_by_id is set by rotateSession
    await expect(rotateSession(db as any, t1, { ttlSec: 60 })).rejects.toBeInstanceOf(RefreshInvalid);
    const active = await pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE user_id=$1 AND revoked_at IS NULL`,
      [userId],
    );
    expect(active.rows[0].c).toBe(1);
  });

  it("revokeByRawToken is idempotent", async () => {
    const { rawToken } = await createSession(db as any, userId, { ttlSec: 60 });
    await revokeByRawToken(db as any, rawToken);
    await revokeByRawToken(db as any, rawToken);
    const res = await pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE user_id=$1 AND revoked_at IS NOT NULL`,
      [userId],
    );
    expect(res.rows[0].c).toBe(1);
  });

  it("revokeAllForUser revokes all active sessions", async () => {
    await createSession(db as any, userId, { ttlSec: 60 });
    await createSession(db as any, userId, { ttlSec: 60 });
    await revokeAllForUser(db as any, userId);
    const res = await pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE user_id=$1 AND revoked_at IS NULL`,
      [userId],
    );
    expect(res.rows[0].c).toBe(0);
  });

  it("rotateSession on unknown token throws RefreshInvalid", async () => {
    await expect(rotateSession(db as any, "never-existed", { ttlSec: 60 })).rejects.toBeInstanceOf(RefreshInvalid);
  });
});
