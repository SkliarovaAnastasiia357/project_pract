import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from "fastify";
import { createHash } from "node:crypto";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export type AuthRateLimits = {
  registerLimit: preHandlerAsyncHookHandler;
  loginIpLimit: preHandlerAsyncHookHandler;
  loginEmailLimit: preHandlerAsyncHookHandler;
  refreshLimit: preHandlerAsyncHookHandler;
};

function ipKey(req: FastifyRequest): string {
  return req.ip;
}

function emailKey(req: FastifyRequest): string {
  const body = req.body as { email?: string } | null | undefined;
  const email = body?.email ?? "";
  return `email:${hashEmail(email)}`;
}

type RateLimitResult = Awaited<ReturnType<ReturnType<FastifyInstance["createRateLimit"]>>>;

// createRateLimit returns a checker without the rateLimitRan dedup guard,
// so multiple limiters can run on the same request without short-circuiting.
// applyRateLimit always returns isAllowed:false for non-allowlisted requests;
// use isExceeded to determine whether the limit has been reached.
function makePreHandler(
  checker: (req: FastifyRequest) => Promise<RateLimitResult>,
): preHandlerAsyncHookHandler {
  return async function rateLimitPreHandler(req: FastifyRequest, reply: FastifyReply) {
    const result = await checker(req);
    if (result.isAllowed) return;
    if (!result.isExceeded) return;

    const ttlInSeconds = Math.ceil(result.ttl / 1000);
    reply.header("retry-after", ttlInSeconds);
    reply.header("x-ratelimit-limit", result.max);
    reply.header("x-ratelimit-remaining", 0);
    reply.header("x-ratelimit-reset", ttlInSeconds);

    const retryAfterMs = result.ttl;
    const minutes = Math.ceil(retryAfterMs / 60000);
    const retryAfter = minutes > 0 ? `${minutes} minutes` : `${ttlInSeconds} seconds`;

    return reply.code(429).send({
      message: "Слишком много попыток, подождите",
      retryAfter,
    });
  };
}

export async function registerAuthRateLimits(app: FastifyInstance): Promise<AuthRateLimits> {
  await app.register(rateLimit, {
    global: false,
    redis: app.deps.redis,
    skipOnError: true,
  });

  return {
    registerLimit: makePreHandler(app.createRateLimit({ max: 5, timeWindow: "1 hour", keyGenerator: ipKey })),
    loginIpLimit: makePreHandler(app.createRateLimit({ max: 10, timeWindow: "1 hour", keyGenerator: ipKey })),
    loginEmailLimit: makePreHandler(app.createRateLimit({ max: 5, timeWindow: "1 hour", keyGenerator: emailKey })),
    refreshLimit: makePreHandler(app.createRateLimit({ max: 60, timeWindow: "1 minute", keyGenerator: ipKey })),
  };
}
