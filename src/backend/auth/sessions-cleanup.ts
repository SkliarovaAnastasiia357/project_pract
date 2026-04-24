import { sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { sessions } from "../db/schema.js";

export type CleanupResult = { deleted: number };
export type Logger = { info: (o: object) => void; error: (o: object) => void };

export async function cleanupExpiredSessions(db: Db): Promise<CleanupResult> {
  const res = await db
    .delete(sessions)
    .where(
      sql`(${sessions.expiresAt} < now() - interval '30 days') OR (${sessions.revokedAt} < now() - interval '30 days')`,
    )
    .returning({ id: sessions.id });
  return { deleted: res.length };
}

export type StartOptions = {
  db: Db;
  intervalMs: number;
  firstRunDelayMs?: number;
  logger: Logger;
};

export function startCleanupJob(opts: StartOptions): () => void {
  let active = true;
  let handle: NodeJS.Timeout | undefined;

  const tick = async () => {
    if (!active) return;
    const started = Date.now();
    try {
      const { deleted } = await cleanupExpiredSessions(opts.db);
      opts.logger.info({ msg: "sessions-cleanup ok", deleted, durationMs: Date.now() - started });
    } catch (err) {
      opts.logger.error({ msg: "sessions-cleanup failed", err: String(err) });
    }
    if (active) handle = setTimeout(tick, opts.intervalMs);
  };

  handle = setTimeout(tick, opts.firstRunDelayMs ?? 60_000);

  return () => {
    active = false;
    if (handle) clearTimeout(handle);
  };
}
