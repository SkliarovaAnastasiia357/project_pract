import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";
import { describeWithContainers } from "../helpers/containerRuntime.js";
import { medianTimingRatio } from "../helpers/timing.js";

describeWithContainers("POST /api/login", () => {
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
    const ratio = await medianTimingRatio(
      async () => {
        await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "alice@example.com", password: "wrong" } });
      },
      async () => {
        await h.app.inject({ method: "POST", url: "/api/login", payload: { email: "nobody@ex.com", password: "wrong" } });
      },
      { beforeSample: async () => { await h.redis.flushall(); } },
    );
    expect(ratio).toBeLessThan(3);
  });
});
