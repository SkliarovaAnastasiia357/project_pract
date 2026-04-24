import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnv } from "./config/env.js";
import { createDb } from "./db/client.js";
import { createRedis } from "./redis/client.js";
import { buildApp } from "./http/server.js";
import { registerAuthRoutes } from "./http/routes/auth.js";
import { registerMeRoute } from "./http/routes/me.js";
import { registerHealthRoutes } from "./http/routes/health.js";
import { startCleanupJob } from "./auth/sessions-cleanup.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder =
  process.env.NODE_ENV === "production"
    ? join(here, "db/migrations")
    : "./src/backend/db/migrations";

async function main(): Promise<void> {
  const env = loadEnv();
  const dbHandle = createDb({ connectionString: env.DATABASE_URL });
  await migrate(dbHandle.db, { migrationsFolder });

  const redisHandle = createRedis(env.REDIS_URL);
  const app = await buildApp({ env, db: dbHandle.db, redis: redisHandle.client });

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerMeRoute(app);

  const stopCleanup = startCleanupJob({
    db: dbHandle.db,
    intervalMs: 24 * 60 * 60 * 1000,
    logger: { info: (o) => app.log.info(o), error: (o) => app.log.error(o) },
  });

  let closing = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, "shutting down");
    stopCleanup();
    try {
      await app.close();
    } catch (err) {
      app.log.error({ err: String(err) }, "app.close failed");
    }
    await dbHandle.close();
    await redisHandle.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ host: "0.0.0.0", port: env.PORT });
  app.log.info({ port: env.PORT }, "listening");
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "fatal", msg: "boot failed", err: String(err) }));
  process.exit(1);
});
