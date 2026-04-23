import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";

let h: TestHarness;
beforeAll(async () => { h = await createTestApp(); }, 180_000);
afterAll(async () => { await h?.close(); });
beforeEach(async () => {
  await resetDb(h.pool);
  await h.redis.flushall();
});

describe("GET /api/me", () => {
  it("200 with valid token", async () => {
    const reg = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "a@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
    });
    const token = reg.json().token;
    const res = await h.app.inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ email: "a@example.com", name: "A", bio: "" });
  });

  it("401 without token", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/me" });
    expect(res.statusCode).toBe(401);
  });

  it("401 if user deleted after token issued", async () => {
    const reg = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "a@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
    });
    const token = reg.json().token;
    await h.pool.query("DELETE FROM users");
    const res = await h.app.inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });
});
