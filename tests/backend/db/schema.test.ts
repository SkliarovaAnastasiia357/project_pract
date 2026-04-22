import { describe, it, expect } from "vitest";
import { users, sessions } from "../../../src/backend/db/schema.js";

describe("schema", () => {
  it("users has expected columns", () => {
    const cols = Object.keys(users);
    expect(cols).toEqual(expect.arrayContaining(["id", "email", "name", "passwordHash", "bio", "createdAt", "updatedAt"]));
  });

  it("sessions has expected columns", () => {
    const cols = Object.keys(sessions);
    expect(cols).toEqual(expect.arrayContaining(["id", "userId", "tokenHash", "replacedById", "expiresAt", "revokedAt"]));
  });
});
