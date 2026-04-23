import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { Pool } from "pg";
import Redis from "ioredis";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../../../src/backend/http/server.js";
import { registerAuthRoutes } from "../../../../src/backend/http/routes/auth.js";
import { registerMeRoute } from "../../../../src/backend/http/routes/me.js";
import { registerHealthRoutes } from "../../../../src/backend/http/routes/health.js";
import * as schema from "../../../../src/backend/db/schema.js";

const SECRET = "x".repeat(48);

export type TestHarness = {
  app: FastifyInstance;
  pool: Pool;
  redis: Redis;
  close: () => Promise<void>;
};

export async function createTestApp(): Promise<TestHarness> {
  const [pg, rd] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine").start(),
    new RedisContainer("redis:7-alpine").start(),
  ]);
  const pool = new Pool({ connectionString: pg.getConnectionUri() });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "./src/backend/db/migrations" });
  const redis = new Redis(rd.getConnectionUrl());

  const env = {
    NODE_ENV: "test",
    PORT: 0,
    DATABASE_URL: pg.getConnectionUri(),
    REDIS_URL: rd.getConnectionUrl(),
    AUTH_ACCESS_SECRET: SECRET,
    COOKIE_SECURE: false,
    LOG_LEVEL: "silent",
    ACCESS_TTL_SEC: 900,
    REFRESH_TTL_SEC: 2_592_000,
  } as any;

  const app = await buildApp({ env, db: db as any, redis });
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerMeRoute(app);
  return {
    app,
    pool,
    redis,
    async close() {
      await app.close();
      await pool.end();
      try { await redis.quit(); } catch { redis.disconnect(); }
      await pg.stop();
      await rd.stop();
    },
  };
}

export async function resetDb(pool: Pool): Promise<void> {
  await pool.query("TRUNCATE users, sessions CASCADE");
}
