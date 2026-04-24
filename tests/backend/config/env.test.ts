import { describe, it, expect } from "vitest";
import { loadEnv } from "../../../src/backend/config/env.js";

describe("loadEnv", () => {
  const base = {
    DATABASE_URL: "postgres://u:p@h:5432/d",
    REDIS_URL: "redis://h:6379",
    AUTH_ACCESS_SECRET: "a".repeat(48),
  };

  it("parses valid env", () => {
    const env = loadEnv(base as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it("throws if AUTH_ACCESS_SECRET too short", () => {
    expect(() => loadEnv({ ...base, AUTH_ACCESS_SECRET: "short" } as NodeJS.ProcessEnv))
      .toThrow(/AUTH_ACCESS_SECRET/);
  });

  it("throws if DATABASE_URL missing", () => {
    const { DATABASE_URL: _dbUrl, ...partial } = base;
    expect(() => loadEnv(partial as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });
});
