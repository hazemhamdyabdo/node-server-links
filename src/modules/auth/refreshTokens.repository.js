export async function create(db, { userId, tokenHash, expiresAt }) {
  const result = await db.query(
    `
    INSERT INTO refresh_tokens(user_id,token_hash,expires_at) 
    VALUES($1,$2,$3)`,
    [userId, tokenHash, expiresAt],
  );
  return result;
}

export async function getValid(db, tokenHash) {
  const result = await db.query(
    "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW()",
    [tokenHash],
  );
  return result;
}

export async function getRevoked(db, tokenHash) {
  const result = await db.query(
    "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_revoked = true",
    [tokenHash],
  );
  return result;
}

export async function getByHash(db, tokenHash) {
  const result = await db.query(
    "SELECT * FROM refresh_tokens WHERE token_hash = $1",
    [tokenHash],
  );
  return result;
}

export async function revoke(db, tokenId) {
  const result = await db.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`,
    [tokenId],
  );

  return result;
}

export async function revokeAll(db, userId) {
  const result = await db.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1`,
    [userId],
  );

  return result;
}
