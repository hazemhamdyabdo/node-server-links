import { pool } from "../../db/pool.js";
import { createUser, findUserByEmail } from "./repository.js";
import * as refreshTokensRepo from "./refreshTokens.repository.js";
import { generateAccessToken } from "../../lib/jwt.js";
import {
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  hashToken,
} from "../../lib/auth.js";

export async function registerUser(body) {
  if (!body.email?.trim() || !body.password) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    throw error;
  }

  const isEmailExcite = await findUserByEmail(pool, body.email);
  if (isEmailExcite.rows.length) {
    const error = new Error("The email already taken");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(body.password);

  try {
    const newUser = await createUser(pool, {
      email: body.email,
      passwordHash: hashedPassword,
    });

    return newUser[0];
  } catch (error) {
    if (error.code === "23505") {
      const _error = new Error("The email already taken");
      _error.statusCode = 409;
      throw _error;
    }
    throw error;
  }
}

export async function loginUser(body) {
  if (!body.email || !body.password) {
    const error = new Error("Email or Password incorrect");
    error.statusCode = 401;
    throw error;
  }

  const currentUser = await findUserByEmail(pool, body.email);

  if (!currentUser.rows.length) {
    const error = new Error("Email or Password incorrect");
    error.statusCode = 401;
    throw error;
  }

  const userRow = currentUser.rows[0];
  const passwordHash = userRow.password_hash;

  const isPasswordMatch = await verifyPassword(passwordHash, body.password);

  if (!isPasswordMatch) {
    const error = new Error("Email or Password incorrect");
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken({
    id: userRow.id,
  });

  const { rawToken, tokenHash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await refreshTokensRepo.create(pool, {
    userId: userRow.id,
    tokenHash,
    expiresAt,
  });

  return {
    tokens: {
      accessToken,
      rawToken,
    },
    user: {
      id: userRow.id,
      email: userRow.email,
    },
  };
}

export async function refreshTokenService(refreshToken) {
  const now = new Date();

  if (!refreshToken) {
    const error = new Error("Refresh token not valid");
    error.statusCode = 401;
    throw error;
  }

  const hashedToken = hashToken(refreshToken);

  const tokenHashRecord = await refreshTokensRepo.getByHash(pool, hashedToken);

  const hashedTokenRaw = tokenHashRecord.rows?.[0];

  if (!hashedTokenRaw) {
    const error = new Error("Token not found");
    error.statusCode = 401;
    throw error;
  }

  const isTokenInvalid =
    hashedTokenRaw.is_revoked || hashedTokenRaw.expires_at < now;

  if (isTokenInvalid) {
    await refreshTokensRepo.revokeAll(pool, hashedTokenRaw.user_id);
    const error = new Error("Use expired token");
    error.statusCode = 401;
    throw error;
  }

  await refreshTokensRepo.revoke(pool, hashedTokenRaw.id);

  const accessToken = generateAccessToken({
    id: hashedTokenRaw.user_id,
  });

  const { rawToken, tokenHash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await refreshTokensRepo.create(pool, {
    userId: hashedTokenRaw.user_id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    rawToken,
  };
}

export async function logoutService(refreshToken) {
  const hashedToken = hashToken(refreshToken);

  const tokenHashRecord = await refreshTokensRepo.getByHash(pool, hashedToken);

  const hashedTokenRaw = tokenHashRecord.rows?.[0];
  if (!hashedTokenRaw) {
    const error = new Error("Token not found");
    error.statusCode = 401;
    throw error;
  }

  await refreshTokensRepo.revoke(pool, hashedTokenRaw.id);
}
