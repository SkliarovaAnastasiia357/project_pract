import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";
import { describeWithContainers } from "../helpers/containerRuntime.js";

describeWithContainers("POST /api/register", () => {
  let h: TestHarness;

  beforeAll(async () => { h = await createTestApp(); }, 180_000);
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await resetDb(h.pool);
    await h.redis.flushall();
  });

  it("201 and returns token+user with refresh cookie", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "Test@Example.COM", name: "Test", password: "secret1", confirmPassword: "secret1" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toMatch(/^eyJ/);
    expect(body.user.email).toBe("test@example.com");
    expect(body.user.bio).toBe("");
    const setCookie = res.headers["set-cookie"];
    const cookie = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
    expect(cookie).toMatch(/tn_refresh=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it("409 for duplicate email", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "dup@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
    });
    const res = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "dup@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().fieldErrors.email).toBeDefined();
  });

  it("400 for short password", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "short@example.com", name: "A", password: "1", confirmPassword: "1" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().fieldErrors.password).toBeDefined();
  });

  it("400 for mismatched confirmPassword", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/register",
      payload: { email: "mismatch@example.com", name: "A", password: "secret1", confirmPassword: "secret2" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().fieldErrors.confirmPassword).toBeDefined();
  });

  it("concurrent duplicate registration: one succeeds, others 409 (not 500)", async () => {
    const payload = {
      email: "race@example.com",
      name: "R",
      password: "secret1",
      confirmPassword: "secret1",
    };
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        h.app.inject({ method: "POST", url: "/api/register", payload }),
      ),
    );
    const statuses = responses.map((r) => r.statusCode).sort();
    const success = statuses.filter((s) => s === 201).length;
    const conflict = statuses.filter((s) => s === 409).length;
    const other = statuses.filter((s) => s !== 201 && s !== 409).length;
    expect(success).toBe(1);
    expect(conflict + other).toBe(9);
    const server_errors = statuses.filter((s) => s >= 500).length;
    expect(server_errors).toBe(0);
  });
});
