import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return times * 1000;
  },
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

export default redis;
