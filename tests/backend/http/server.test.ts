import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildApp } from "../../../src/backend/http/server.js";
import { ApiError } from "../../../src/backend/http/errors.js";

function fakeDeps(): any {
  return {
    env: { NODE_ENV: "test", LOG_LEVEL: "silent", CORS_ORIGIN: ["http://localhost:5173"] } as any,
    db: {} as any,
    redis: {} as any,
  };
}

describe("buildApp", () => {
  it("maps ZodError to 400 with fieldErrors", async () => {
    const app = await buildApp(fakeDeps());
    app.post("/t", async (req) => {
      z.object({ x: z.string().min(3) }).parse(req.body);
      return { ok: true };
    });
    const res = await app.inject({ method: "POST", url: "/t", payload: { x: "a" } });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.message).toBe("Исправьте ошибки в форме");
    expect(body.fieldErrors.x).toBeDefined();
    await app.close();
  });

  it("maps ApiError to declared status", async () => {
    const app = await buildApp(fakeDeps());
    app.get("/t", async () => {
      throw new ApiError("nope", 418);
    });
    const res = await app.inject({ method: "GET", url: "/t" });
    expect(res.statusCode).toBe(418);
    expect(res.json()).toEqual({ message: "nope" });
    await app.close();
  });

  it("sends helmet-style security headers", async () => {
    const app = await buildApp(fakeDeps());
    app.get("/t", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/t" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    await app.close();
  });

  it("handles CORS preflight", async () => {
    const app = await buildApp(fakeDeps());
    app.get("/t", async () => ({ ok: true }));
    const res = await app.inject({
      method: "OPTIONS",
      url: "/t",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "GET",
      },
    });
    expect(res.statusCode).toBe(204);
    await app.close();
  });

  it("maps unhandled error to 500", async () => {
    const app = await buildApp(fakeDeps());
    app.get("/t", async () => {
      throw new Error("boom");
    });
    const res = await app.inject({ method: "GET", url: "/t" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ message: "Внутренняя ошибка сервера" });
    await app.close();
  });
});
