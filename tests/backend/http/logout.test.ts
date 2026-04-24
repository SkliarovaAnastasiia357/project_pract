import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";
import { describeWithContainers } from "../helpers/containerRuntime.js";

function extractCookie(setCookie: string | string[] | undefined): string | undefined {
  const s = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
  const m = s?.match(/tn_refresh=([^;]+)/);
  return m?.[1];
}

describeWithContainers("auth logout flows", () => {
  let h: TestHarness;

  beforeAll(async () => { h = await createTestApp(); }, 180_000);
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await resetDb(h.pool);
    await h.redis.flushall();
  });

  async function registerSession(): Promise<{ cookie: string; token: string }> {
    const res = await h.app.inject({
      method: "POST", url: "/api/register",
      payload: { email: "a@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
    });
    const cookie = extractCookie(res.headers["set-cookie"])!;
    const token = res.json().token;
    return { cookie, token };
  }

  it("POST /api/logout returns 204, revokes session and clears cookie", async () => {
    const { cookie } = await registerSession();
    const res = await h.app.inject({
      method: "POST", url: "/api/logout",
      headers: { cookie: `tn_refresh=${cookie}` },
    });
    expect(res.statusCode).toBe(204);
    const setCookie = res.headers["set-cookie"];
    const asStr = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
    expect(asStr).toMatch(/tn_refresh=/);
    const active = await h.pool.query(`SELECT COUNT(*)::int AS c FROM sessions WHERE revoked_at IS NULL`);
    expect(active.rows[0].c).toBe(0);
  });

  it("POST /api/logout is idempotent without cookie", async () => {
    const res = await h.app.inject({ method: "POST", url: "/api/logout" });
    expect(res.statusCode).toBe(204);
  });

  it("POST /api/logout is idempotent on second call", async () => {
    const { cookie } = await registerSession();
    const first = await h.app.inject({
      method: "POST", url: "/api/logout",
      headers: { cookie: `tn_refresh=${cookie}` },
    });
    const second = await h.app.inject({
      method: "POST", url: "/api/logout",
      headers: { cookie: `tn_refresh=${cookie}` },
    });
    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(204);
  });

  it("POST /api/auth/logout-all revokes all sessions with valid access JWT", async () => {
    const { token } = await registerSession();
    await h.app.inject({
      method: "POST", url: "/api/login",
      payload: { email: "a@example.com", password: "secret1" },
    });
    const res = await h.app.inject({
      method: "POST", url: "/api/auth/logout-all",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
    const active = await h.pool.query(`SELECT COUNT(*)::int AS c FROM sessions WHERE revoked_at IS NULL`);
    expect(active.rows[0].c).toBe(0);
  });

  it("POST /api/auth/logout-all returns 401 without access JWT", async () => {
    const res = await h.app.inject({ method: "POST", url: "/api/auth/logout-all" });
    expect(res.statusCode).toBe(401);
  });
});
