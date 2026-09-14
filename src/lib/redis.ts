import IORedis from "ioredis";

let redisClient: IORedis | null = null;

export function getRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured.");
  }

  if (!redisClient) {
    redisClient = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return redisClient;
}
