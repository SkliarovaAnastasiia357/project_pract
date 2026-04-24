import { describe, it, expect } from "vitest";
import {
  issueAccessToken,
  verifyAccessToken,
  TokenExpired,
  InvalidToken,
} from "../../../src/backend/auth/tokens.js";

const SECRET = "x".repeat(48);

describe("tokens", () => {
  it("issue and verify roundtrip", async () => {
    const tok = await issueAccessToken({ userId: "u-1", secret: SECRET, ttlSec: 60 });
    const { userId } = await verifyAccessToken({ token: tok, secret: SECRET });
    expect(userId).toBe("u-1");
  });

  it("throws TokenExpired for ttl<=0", async () => {
    const tok = await issueAccessToken({ userId: "u-1", secret: SECRET, ttlSec: -1 });
    await expect(
      verifyAccessToken({ token: tok, secret: SECRET }),
    ).rejects.toBeInstanceOf(TokenExpired);
  });

  it("throws InvalidToken for wrong secret", async () => {
    const tok = await issueAccessToken({ userId: "u-1", secret: SECRET, ttlSec: 60 });
    await expect(
      verifyAccessToken({ token: tok, secret: "y".repeat(48) }),
    ).rejects.toBeInstanceOf(InvalidToken);
  });

  it("throws InvalidToken for tampered token", async () => {
    const tok = await issueAccessToken({ userId: "u-1", secret: SECRET, ttlSec: 60 });
    const tampered = tok.slice(0, -4) + "AAAA";
    await expect(
      verifyAccessToken({ token: tampered, secret: SECRET }),
    ).rejects.toBeInstanceOf(InvalidToken);
  });

  it("throws InvalidToken for garbage", async () => {
    await expect(
      verifyAccessToken({ token: "garbage", secret: SECRET }),
    ).rejects.toBeInstanceOf(InvalidToken);
  });
});
