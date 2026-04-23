import { and, eq, isNull } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import type { Db } from "../db/client.js";
import { sessions } from "../db/schema.js";

export class RefreshInvalid extends Error {
  constructor(m = "refresh invalid") { super(m); this.name = "RefreshInvalid"; }
}

export class RefreshReuseDetected extends Error {
  constructor() { super("refresh reuse"); this.name = "RefreshReuseDetected"; }
}

const GRACE_MS = 5_000;

export type SessionMeta = { userAgent?: string | null; ip?: string | null };
export type CreateResult = { rawToken: string; sessionId: string; expiresAt: Date };
export type RotateResult = { rawToken: string; sessionId: string; expiresAt: Date; userId: string };

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Db,
  userId: string,
  opts: SessionMeta & { ttlSec: number },
): Promise<CreateResult> {
  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + opts.ttlSec * 1000);
  const [row] = await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: opts.userAgent ?? null,
    ip: opts.ip ?? null,
  }).returning({ id: sessions.id });
  if (!row) throw new Error("createSession: insert returned no row");
  return { rawToken, sessionId: row.id, expiresAt };
}

export async function rotateSession(
  db: Db,
  rawToken: string,
  opts: SessionMeta & { ttlSec: number },
): Promise<RotateResult> {
  const tokenHash = sha256(rawToken);

  // Read the existing session outside the transaction so we can inspect it
  // before deciding whether to commit a family revoke or a normal rotation.
  const [existing] = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
  if (!existing) throw new RefreshInvalid("unknown token");

  if (existing.revokedAt) {
    const revokedAgoMs = Date.now() - existing.revokedAt.getTime();
    if (revokedAgoMs <= GRACE_MS && existing.replacedById) {
      throw new RefreshInvalid("recently rotated");
    }
    // True replay — revoke entire session family and commit immediately
    // before throwing, so the revoke is not rolled back by the error.
    await revokeAllForUser(db, existing.userId);
    throw new RefreshReuseDetected();
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw new RefreshInvalid("expired");
  }

  return db.transaction(async (tx) => {
    // Re-read inside transaction to guard against concurrent rotation.
    const [locked] = await tx.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    if (!locked) throw new RefreshInvalid("unknown token");
    if (locked.revokedAt) throw new RefreshInvalid("recently rotated");
    if (locked.expiresAt.getTime() < Date.now()) throw new RefreshInvalid("expired");

    const newRaw = generateToken();
    const newHash = sha256(newRaw);
    const newExpires = new Date(Date.now() + opts.ttlSec * 1000);
    const [inserted] = await tx.insert(sessions).values({
      userId: existing.userId,
      tokenHash: newHash,
      expiresAt: newExpires,
      userAgent: opts.userAgent ?? null,
      ip: opts.ip ?? null,
    }).returning({ id: sessions.id });
    if (!inserted) throw new Error("rotateSession: insert returned no row");

    await tx.update(sessions)
      .set({ revokedAt: new Date(), replacedById: inserted.id })
      .where(eq(sessions.id, existing.id));

    return {
      rawToken: newRaw,
      sessionId: inserted.id,
      expiresAt: newExpires,
      userId: existing.userId,
    };
  });
}

export async function revokeByRawToken(db: Db, rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  await db.update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}

export async function revokeAllForUser(db: Db, userId: string): Promise<void> {
  await db.update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
