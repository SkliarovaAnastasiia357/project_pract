import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../../auth/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string };
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Требуется авторизация" });
  }
  const token = header.slice(7);
  try {
    const { userId } = await verifyAccessToken({
      token,
      secret: req.server.deps.env.AUTH_ACCESS_SECRET,
    });
    req.user = { id: userId };
  } catch {
    return reply.code(401).send({ message: "Требуется авторизация" });
  }
}
