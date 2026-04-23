import { describe, it, expect } from "vitest";
import { buildApp } from "../../../src/backend/http/server.js";
import { requireAuth } from "../../../src/backend/http/middleware/requireAuth.js";
import { issueAccessToken } from "../../../src/backend/auth/tokens.js";

const SECRET = "x".repeat(48);

function fakeEnv(): any {
  return { LOG_LEVEL: "silent", AUTH_ACCESS_SECRET: SECRET } as any;
}

async function appWithProtected() {
  const app = await buildApp({ env: fakeEnv(), db: {} as any, redis: {} as any });
  app.get("/protected", { preHandler: requireAuth }, async (req) => ({ uid: req.user?.id }));
  return app;
}

describe("requireAuth", () => {
  it("401 without Authorization", async () => {
    const app = await appWithProtected();
    const res = await app.inject({ method: "GET", url: "/protected" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ message: "Требуется авторизация" });
    await app.close();
  });

  it("401 with non-Bearer scheme", async () => {
    const app = await appWithProtected();
    const res = await app.inject({
      method: "GET", url: "/protected",
      headers: { authorization: "Basic xxx" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("401 with bad signature (wrong secret)", async () => {
    const app = await appWithProtected();
    const tok = await issueAccessToken({ userId: "u-1", secret: "y".repeat(48), ttlSec: 60 });
    const res = await app.inject({
      method: "GET", url: "/protected",
      headers: { authorization: `Bearer ${tok}` },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("401 with expired token", async () => {
    const app = await appWithProtected();
    const tok = await issueAccessToken({ userId: "u-1", secret: SECRET, ttlSec: -1 });
    const res = await app.inject({
      method: "GET", url: "/protected",
      headers: { authorization: `Bearer ${tok}` },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("200 with valid token, sets req.user", async () => {
    const app = await appWithProtected();
    const tok = await issueAccessToken({ userId: "u-42", secret: SECRET, ttlSec: 60 });
    const res = await app.inject({
      method: "GET", url: "/protected",
      headers: { authorization: `Bearer ${tok}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ uid: "u-42" });
    await app.close();
  });
});
