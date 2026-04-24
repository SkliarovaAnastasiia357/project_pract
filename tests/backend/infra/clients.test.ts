import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { createDb, type DbHandle } from "../../../src/backend/db/client.js";
import { createRedis, type RedisHandle } from "../../../src/backend/redis/client.js";
import { describeWithContainers } from "../helpers/containerRuntime.js";

describeWithContainers("infrastructure clients", () => {
  let pg: StartedPostgreSqlContainer;
  let rd: StartedRedisContainer;
  let dbHandle: DbHandle;
  let redisHandle: RedisHandle;

  beforeAll(async () => {
    [pg, rd] = await Promise.all([
      new PostgreSqlContainer("postgres:16-alpine").start(),
      new RedisContainer("redis:7-alpine").start(),
    ]);
    dbHandle = createDb({ connectionString: pg.getConnectionUri() });
    redisHandle = createRedis(rd.getConnectionUrl());
  }, 120_000);

  afterAll(async () => {
    await dbHandle?.close();
    await redisHandle?.close();
    await pg?.stop();
    await rd?.stop();
  });

  it("db pool connects and selects 1", async () => {
    const res = await dbHandle.pool.query("SELECT 1 as v");
    expect(res.rows[0].v).toBe(1);
  });

  it("redis ping returns PONG", async () => {
    const pong = await redisHandle.client.ping();
    expect(pong).toBe("PONG");
  });
});
