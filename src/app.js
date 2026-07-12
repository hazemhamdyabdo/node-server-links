import "./env.js";
import express from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { validate } from "./middleware/validate.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(pinoHttp());
app.use(express.json());
app.use(cookieParser());

app.use(errorHandler);

export default app;
