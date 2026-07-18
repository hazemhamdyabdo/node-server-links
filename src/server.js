import app from "./app.js";
import { pool } from "./db/pool.js";

const server = app.listen(process.env.PORT);

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);

  setTimeout(() => {
    console.error("Forced shutdown after timeout");

    process.exit(0);
  }, 10_000);

  server.close(async () => {
    await pool.end();
    const { default: redis } = await import("./lib/redis.js");
    redis.quit();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
