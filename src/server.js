import { pool } from "./db/pool.js";
import redis from "./lib/redis.js";
import app from "./app.js";

const server = app.listen(process.env.PORT);

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);

  setTimeout(() => {
    console.error("Forced shutdown after timeout");

    process.exit(0);
  }, 10_000);

  server.close(async () => {
    await pool.end();
    await redis.quit();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
