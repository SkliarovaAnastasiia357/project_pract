import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";

let h: TestHarness;
beforeAll(async () => { h = await createTestApp(); }, 180_000);
afterAll(async () => { await h?.close(); });
beforeEach(async () => {
  await resetDb(h.pool);
  // Flush Redis to avoid rate-limit state leakage from prior tests
  await h.redis.flushall();
});

function extractCookie(setCookie: string | string[] | undefined): string | undefined {
  const s = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
  const m = s?.match(/tn_refresh=([^;]+)/);
  return m?.[1];
}

async function registerAndGetCookie(): Promise<string> {
  const res = await h.app.inject({
    method: "POST", url: "/api/register",
    payload: { email: "a@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
  });
  const cookie = extractCookie(res.headers["set-cookie"]);
  if (!cookie) throw new Error("no cookie from register");
  return cookie;
}

describe("POST /api/auth/refresh", () => {
  it("200 with valid cookie, rotates token", async () => {
    const old = await registerAndGetCookie();
    const res = await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: `tn_refresh=${old}` },
    });
    expect(res.statusCode).toBe(200);
    const newCookie = extractCookie(res.headers["set-cookie"]);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(old);

    const s = await h.pool.query("SELECT revoked_at, replaced_by_id FROM sessions ORDER BY created_at");
    expect(s.rows[0].revoked_at).not.toBeNull();
    expect(s.rows[0].replaced_by_id).not.toBeNull();
    expect(s.rows[1].revoked_at).toBeNull();
  });

  it("401 without cookie, Clear-Cookie sent", async () => {
    const res = await h.app.inject({ method: "POST", url: "/api/auth/refresh" });
    expect(res.statusCode).toBe(401);
    const setCookie = res.headers["set-cookie"];
    const asStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
    // clearCookie writes tn_refresh= with Max-Age=0 (or expired Expires)
    expect(asStr).toMatch(/tn_refresh=/);
  });

  it("401 with unknown cookie", async () => {
    const res = await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: "tn_refresh=neverexisted" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("401 + family revoke on real replay (revoked >5s ago)", async () => {
    const c1 = await registerAndGetCookie();
    // Rotate once to establish revoked state
    await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: `tn_refresh=${c1}` },
    });
    // Backdate the revocation 10s
    const hash = createHash("sha256").update(c1).digest("hex");
    await h.pool.query(
      `UPDATE sessions SET revoked_at = now() - interval '10 seconds' WHERE token_hash = $1`,
      [hash],
    );
    // Replay
    const res = await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: `tn_refresh=${c1}` },
    });
    expect(res.statusCode).toBe(401);
    const active = await h.pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE revoked_at IS NULL`,
    );
    expect(active.rows[0].c).toBe(0);
  });

  it("401 WITHOUT family revoke on immediate double-refresh (within grace)", async () => {
    const c1 = await registerAndGetCookie();
    await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: `tn_refresh=${c1}` },
    });
    const res = await h.app.inject({
      method: "POST", url: "/api/auth/refresh",
      headers: { cookie: `tn_refresh=${c1}` },
    });
    expect(res.statusCode).toBe(401);
    const active = await h.pool.query(
      `SELECT COUNT(*)::int AS c FROM sessions WHERE revoked_at IS NULL`,
    );
    expect(active.rows[0].c).toBe(1);
  });
});
