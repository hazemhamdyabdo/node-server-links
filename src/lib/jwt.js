import jwt from "jsonwebtoken";

const JWTSecret = process.env.JWT_SECRET;

export function generateAccessToken(payload) {
  const token = jwt.sign(payload, JWTSecret, {
    algorithm: "HS256",
    expiresIn: "15h",
  });
  return token;
}

export function validateAccessToken(accessToken) {
  return jwt.verify(accessToken, JWTSecret);
}
