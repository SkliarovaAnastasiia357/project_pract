import type { FastifyInstance } from "fastify";
import { getDashboardMetrics } from "../../demo/demo-data.js";
import { requireAuth } from "../middleware/requireAuth.js";

export async function registerDashboardRoute(app: FastifyInstance): Promise<void> {
  app.get("/api/dashboard", { preHandler: requireAuth }, async (req) => {
    return getDashboardMetrics(app.deps.db, app.deps.redis, req.user!.id);
  });
}
