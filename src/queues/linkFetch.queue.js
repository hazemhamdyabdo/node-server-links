import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const linkFetchQueue = new Queue("link-fetch", {
  connection: redis,
});
