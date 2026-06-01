import type { FastifyInstance } from "fastify";
import { cleanupDemoWorkspace, seedDemoWorkspace } from "../../demo/demo-data.js";
import { requireAuth } from "../middleware/requireAuth.js";

export async function registerDemoRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/demo/seed", { preHandler: requireAuth }, async (req, reply) => {
    const result = await seedDemoWorkspace(app.deps.db, app.deps.redis, req.user!.id);
    reply.code(201);
    return result;
  });

  app.delete("/api/demo", { preHandler: requireAuth }, async (req) => {
    return cleanupDemoWorkspace(app.deps.db, app.deps.redis, req.user!.id);
  });
}
