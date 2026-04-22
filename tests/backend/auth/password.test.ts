import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  passwordNeedsRehash,
  dummyVerify,
  DUMMY_HASH,
} from "../../../src/backend/auth/password.js";

describe("password", () => {
  it("hashes to argon2id format", async () => {
    const h = await hashPassword("secret123");
    expect(h.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies correct password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword(h, "secret123")).toBe(true);
  });

  it("rejects wrong password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });

  it("rejects malformed hash without throwing", async () => {
    expect(await verifyPassword("not-a-hash", "secret123")).toBe(false);
  });

  it("needsRehash=false for fresh hash", async () => {
    const h = await hashPassword("secret123");
    expect(passwordNeedsRehash(h)).toBe(false);
  });

  it("needsRehash=true for hash with different params", async () => {
    // Manually crafted PHC string with old params (m=4096, t=3, p=1)
    const oldHash = "$argon2id$v=19$m=4096,t=3,p=1$c29tZXNhbHQ$fakehashdata";
    expect(passwordNeedsRehash(oldHash)).toBe(true);
  });

  it("DUMMY_HASH resolves to argon2id string", async () => {
    const h = await DUMMY_HASH;
    expect(h.startsWith("$argon2id$")).toBe(true);
  });

  it("dummyVerify does not throw on any input", async () => {
    await expect(dummyVerify("anything")).resolves.toBeUndefined();
  });

  it("dummyVerify timing is comparable to real verify", async () => {
    const h = await hashPassword("secret123");
    // Warm-up pass to amortize caches
    await verifyPassword(h, "wrong");
    await dummyVerify("anything");

    const t1 = performance.now();
    await verifyPassword(h, "wrong");
    const real = performance.now() - t1;

    const t2 = performance.now();
    await dummyVerify("anything");
    const dummy = performance.now() - t2;

    const ratio = Math.max(real, dummy) / Math.min(real, dummy);
    expect(ratio).toBeLessThan(3);
  });
});
