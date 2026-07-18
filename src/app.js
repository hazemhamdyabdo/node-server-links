import "./env.js";
import express from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/routes.js";
import { authHandler } from "./middleware/authHandler.js";

const app = express();

app.use(pinoHttp());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

// app.use(authHandler);

app.use(errorHandler);

export default app;
