import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { registerSchema, loginSchema } from "../../auth/schemas.js";
import { hashPassword, verifyPassword, dummyVerify, passwordNeedsRehash } from "../../auth/password.js";
import { issueAccessToken } from "../../auth/tokens.js";
import {
  createSession,
  rotateSession,
  revokeByRawToken,
  revokeAllForUser,
  RefreshReuseDetected,
} from "../../auth/sessions.js";
import { users } from "../../db/schema.js";
import { ApiError } from "../errors.js";
import { registerAuthRateLimits } from "../middleware/rateLimits.js";
import { requireAuth } from "../middleware/requireAuth.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const limits = await registerAuthRateLimits(app);
  const { env, db } = app.deps;

  function setRefreshCookie(reply: FastifyReply, rawToken: string): void {
    reply.setCookie("tn_refresh", rawToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "strict",
      path: "/api",
      maxAge: env.REFRESH_TTL_SEC,
    });
  }

  app.post("/api/register", { preHandler: limits.registerLimit }, async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new ApiError("Пользователь с таким email уже существует", 409, {
        email: "Пользователь с таким email уже существует",
      });
    }
    const passwordHash = await hashPassword(input.password);
    let row;
    try {
      const inserted = await db
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash })
        .returning();
      row = inserted[0];
    } catch (err) {
      // Race: another request inserted the same email between our SELECT and INSERT.
      // Drizzle wraps pg errors in DrizzleQueryError, check the cause property.
      const pgError = err && typeof err === "object" && "cause" in err ? (err as { cause?: { code?: string } }).cause : err;
      if (pgError && typeof pgError === "object" && "code" in pgError && (pgError as { code: string }).code === "23505") {
        throw new ApiError("Пользователь с таким email уже существует", 409, {
          email: "Пользователь с таким email уже существует",
        });
      }
      throw err;
    }
    if (!row) throw new ApiError("Внутренняя ошибка сервера", 500);

    const { rawToken } = await createSession(db, row.id, {
      ttlSec: env.REFRESH_TTL_SEC,
      userAgent: req.headers["user-agent"] ?? null,
      ip: req.ip,
    });
    const token = await issueAccessToken({
      userId: row.id,
      secret: env.AUTH_ACCESS_SECRET,
      ttlSec: env.ACCESS_TTL_SEC,
    });
    setRefreshCookie(reply, rawToken);
    reply.code(201);
    return {
      token,
      user: { id: row.id, email: row.email, name: row.name, bio: row.bio },
    };
  });

  app.post("/api/login", { preHandler: [limits.loginIpLimit, limits.loginEmailLimit] }, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const rows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const user = rows[0];
    if (!user) {
      await dummyVerify(input.password);
      throw new ApiError("Неверный email или пароль", 401);
    }
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new ApiError("Неверный email или пароль", 401);

    if (passwordNeedsRehash(user.passwordHash)) {
      const newHash = await hashPassword(input.password);
      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const { rawToken } = await createSession(db, user.id, {
      ttlSec: env.REFRESH_TTL_SEC,
      userAgent: req.headers["user-agent"] ?? null,
      ip: req.ip,
    });
    const token = await issueAccessToken({
      userId: user.id,
      secret: env.AUTH_ACCESS_SECRET,
      ttlSec: env.ACCESS_TTL_SEC,
    });
    setRefreshCookie(reply, rawToken);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, bio: user.bio },
    };
  });

  function clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie("tn_refresh", { path: "/api" });
  }

  app.post("/api/auth/refresh", { preHandler: limits.refreshLimit }, async (req, reply) => {
    const raw = req.cookies.tn_refresh;
    if (!raw) {
      clearRefreshCookie(reply);
      throw new ApiError("Требуется авторизация", 401);
    }
    try {
      const rotated = await rotateSession(db, raw, {
        ttlSec: env.REFRESH_TTL_SEC,
        userAgent: req.headers["user-agent"] ?? null,
        ip: req.ip,
      });
      const [user] = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1);
      if (!user) {
        clearRefreshCookie(reply);
        throw new ApiError("Требуется авторизация", 401);
      }
      const token = await issueAccessToken({
        userId: user.id,
        secret: env.AUTH_ACCESS_SECRET,
        ttlSec: env.ACCESS_TTL_SEC,
      });
      setRefreshCookie(reply, rotated.rawToken);
      return { token, user: { id: user.id, email: user.email, name: user.name, bio: user.bio } };
    } catch (err) {
      clearRefreshCookie(reply);
      if (err instanceof RefreshReuseDetected) {
        req.log.warn({ ip: req.ip, ua: req.headers["user-agent"] }, "refresh_reuse_detected");
      }
      throw new ApiError("Требуется авторизация", 401);
    }
  });

  app.post("/api/logout", async (req, reply) => {
    const raw = req.cookies.tn_refresh;
    if (raw) await revokeByRawToken(db, raw);
    clearRefreshCookie(reply);
    reply.code(204);
    return null;
  });

  app.post("/api/auth/logout-all", { preHandler: requireAuth }, async (req, reply) => {
    await revokeAllForUser(db, req.user!.id);
    clearRefreshCookie(reply);
    reply.code(204);
    return null;
  });
}
