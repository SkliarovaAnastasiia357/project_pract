import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";
import { buildApp } from "../../../src/backend/http/server.js";
import { registerAuthRateLimits } from "../../../src/backend/http/middleware/rateLimits.js";

let rd: StartedRedisContainer;
let redis: Redis;

beforeAll(async () => {
  rd = await new RedisContainer("redis:7-alpine").start();
  redis = new Redis(rd.getConnectionUrl());
}, 120_000);

afterAll(async () => {
  try { await redis?.quit(); } catch { redis?.disconnect(); }
  await rd?.stop();
});

beforeEach(async () => {
  // flush between tests so counters don't bleed across
  await redis?.flushall();
});

describe("rate limits", () => {
  it("registerLimit blocks 6th request from same IP with 429 and retryAfter", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/r", { preHandler: limits.registerLimit }, async () => ({ ok: true }));

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: "POST", url: "/r", remoteAddress: "1.2.3.4" });
      expect(res.statusCode).toBe(200);
    }

    const blocked = await app.inject({ method: "POST", url: "/r", remoteAddress: "1.2.3.4" });
    expect(blocked.statusCode).toBe(429);
    const body = blocked.json();
    expect(body.message).toMatch(/Слишком/);
    expect(body.retryAfter).toBeDefined();

    await app.close();
  });

  it("registerLimit allows 5th request from same IP (boundary)", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/r2", { preHandler: limits.registerLimit }, async () => ({ ok: true }));

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: "POST", url: "/r2", remoteAddress: "5.6.7.8" });
      expect(res.statusCode).toBe(200);
    }

    await app.close();
  });

  it("loginEmailLimit blocks 6th request to same email from different IPs", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/l", { preHandler: [limits.loginIpLimit, limits.loginEmailLimit] }, async () => ({ ok: true }));

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/l",
        remoteAddress: `10.0.0.${i + 1}`,
        payload: { email: "victim@example.com" },
      });
      expect(res.statusCode).toBe(200);
    }

    // 6th attempt from a fresh IP — blocked by email limit
    const blocked = await app.inject({
      method: "POST",
      url: "/l",
      remoteAddress: "10.0.0.99",
      payload: { email: "victim@example.com" },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().message).toMatch(/Слишком/);

    await app.close();
  });

  it("loginEmailLimit treats different emails as independent counters", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/l2", { preHandler: [limits.loginIpLimit, limits.loginEmailLimit] }, async () => ({ ok: true }));

    // 5 requests to user-a, then 1 to user-b — user-b should still be allowed
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/l2",
        remoteAddress: `172.16.0.${i + 1}`,
        payload: { email: "user-a@example.com" },
      });
      expect(res.statusCode).toBe(200);
    }

    const other = await app.inject({
      method: "POST",
      url: "/l2",
      remoteAddress: "172.16.0.99",
      payload: { email: "user-b@example.com" },
    });
    expect(other.statusCode).toBe(200);

    await app.close();
  });

  it("refreshLimit blocks 61st request from same IP", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/ref", { preHandler: limits.refreshLimit }, async () => ({ ok: true }));

    for (let i = 0; i < 60; i++) {
      const res = await app.inject({ method: "POST", url: "/ref", remoteAddress: "2.2.2.2" });
      expect(res.statusCode).toBe(200);
    }

    const blocked = await app.inject({ method: "POST", url: "/ref", remoteAddress: "2.2.2.2" });
    expect(blocked.statusCode).toBe(429);

    await app.close();
  });

  it("rate limits are independent per IP (different IPs don't share counter)", async () => {
    const app = await buildApp({ env: { NODE_ENV: "test", LOG_LEVEL: "silent" } as any, db: {} as any, redis });
    const limits = await registerAuthRateLimits(app);
    app.post("/r3", { preHandler: limits.registerLimit }, async () => ({ ok: true }));

    // 5 requests from IP-A exhausts its limit
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: "POST", url: "/r3", remoteAddress: "9.9.9.1" });
    }

    // IP-B is unaffected
    const res = await app.inject({ method: "POST", url: "/r3", remoteAddress: "9.9.9.2" });
    expect(res.statusCode).toBe(200);

    await app.close();
  });
});
