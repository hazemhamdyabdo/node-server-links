import { validateAccessToken } from "../lib/jwt.js";

export function authHandler(req, res, next) {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.split(" ")?.[1];
    try {
      const validToken = validateAccessToken(token);
      req.user = {
        id: validToken.id,
      };
      next();
    } catch (error) {
      error.statusCode = 401;
      next(error);
    }
  } else {
    const error = new Error("Not valid token");
    error.statusCode = 401;
    next(error);
  }
}
