import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async () => ({ ok: true }));

  app.get("/readyz", async (_req, reply) => {
    const { db, redis } = app.deps;
    try {
      await db.execute(sql`SELECT 1`);
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error("redis not ok");
      return { ok: true, db: "ok", redis: "ok" };
    } catch (err) {
      reply.code(503);
      return { ok: false, err: String(err) };
    }
  });
}
