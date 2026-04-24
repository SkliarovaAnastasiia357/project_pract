import { Redis, type RedisOptions } from "ioredis";

export type RedisHandle = {
  client: Redis;
  close: () => Promise<void>;
};

export function createRedis(url: string, options: RedisOptions = {}): RedisHandle {
  const client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3, ...options });
  return {
    client,
    async close() {
      try {
        await client.quit();
      } catch {
        // Client already closed or connection failed — disconnect idempotently
        client.disconnect();
      }
    },
  };
}
