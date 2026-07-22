import "./env.js";
import express from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/routes.js";
import linksRoutes from "./modules/links/links.routes.js";
import { authHandler } from "./middleware/authHandler.js";

const app = express();

app.use(
  pinoHttp({
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty" }
        : undefined,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api", authHandler, linksRoutes);

app.use(errorHandler);

export default app;
