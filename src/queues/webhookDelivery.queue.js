import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const webhookDeliveryQueue = new Queue("webhook-delivery", {
  connection: redis,
});
