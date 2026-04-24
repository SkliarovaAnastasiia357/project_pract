import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";

let h: TestHarness;
beforeAll(async () => { h = await createTestApp(); }, 180_000);
afterAll(async () => { await h?.close(); });
beforeEach(async () => {
  await resetDb(h.pool);
  await h.redis.flushall();
  await h.app.inject({
    method: "POST",
    url: "/api/register",
    payload: { email: "alice@example.com", name: "A", password: "secret1", confirmPassword: "secret1" },
  });
});

describe("POST /api/login", () => {
  it("200 with correct creds", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: "alice@example.com", password: "secret1" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe("alice@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("401 with wrong password", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: "alice@example.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Неверный email или пароль");
  });

  it("401 with nonexistent email, SAME message", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/login",
      payload: { email: "nobody@example.com", password: "anything" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toBe("Неверный email или пароль");
  });

  it("timing: nonexistent user comparable to wrong password", async () => {
    // Warm-up so JIT and argon2 caches settle
    await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "alice@example.com", password: "wrong" } });
    await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "nobody@ex.com", password: "wrong" } });

    const t1 = performance.now();
    await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "alice@example.com", password: "wrong" } });
    const wrongPw = performance.now() - t1;

    const t2 = performance.now();
    await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "nobody@ex.com", password: "wrong" } });
    const unknown = performance.now() - t2;

    const ratio = Math.max(wrongPw, unknown) / Math.min(wrongPw, unknown);
    expect(ratio).toBeLessThan(3);
  });
});
