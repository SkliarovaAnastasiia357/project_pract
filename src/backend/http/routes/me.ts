import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { ApiError } from "../errors.js";

export async function registerMeRoute(app: FastifyInstance): Promise<void> {
  app.get("/api/me", { preHandler: requireAuth }, async (req) => {
    const [user] = await app.deps.db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!user) throw new ApiError("Требуется авторизация", 401);
    return { id: user.id, email: user.email, name: user.name, bio: user.bio };
  });
}
