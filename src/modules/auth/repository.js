export async function createUser(db, { email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users(email,password_hash) VALUES($1,$2)
      RETURNING id, email, created_at
      `,
    [email, passwordHash],
  );
  return rows;
}

export async function findUserByEmail(db, email) {
  const result = await db.query(
    "SELECT id,email,password_hash FROM users WHERE email = $1",
    [email],
  );

  return result;
}
