import argon2 from "argon2";
import crypto from "crypto";

export async function hashPassword(plainPassword) {
  const hashedPassword = await argon2.hash(plainPassword);
  return hashedPassword;
}

export async function verifyPassword(hashedPassword, password) {
  const isSame = await argon2.verify(hashedPassword, password);
  return isSame;
}

export function generateRefreshToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
