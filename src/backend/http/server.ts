import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { Db } from "../db/client.js";
import { type Redis } from "ioredis";
import type { Env } from "../config/env.js";
import { errorHandler } from "./errors.js";

export type AppDeps = {
  env: Env;
  db: Db;
  redis: Redis;
};

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: deps.env.LOG_LEVEL },
    trustProxy: true,
    disableRequestLogging: false,
  });

  app.decorate("deps", deps);

  await app.register(cookie, {});
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: deps.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.setErrorHandler(errorHandler);

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    deps: AppDeps;
  }
}
