import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp, type TestHarness } from "./helpers/testApp.js";
import { describeWithContainers } from "../helpers/containerRuntime.js";

describeWithContainers("health", () => {
  let h: TestHarness;

  beforeAll(async () => { h = await createTestApp(); }, 180_000);
  afterAll(async () => { await h?.close(); });

  it("GET /healthz в†’ 200 ok:true", async () => {
    const res = await h.app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("GET /readyz в†’ 200 when db+redis ok", async () => {
    const res = await h.app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);
    expect(res.json().db).toBe("ok");
    expect(res.json().redis).toBe("ok");
  });
});
