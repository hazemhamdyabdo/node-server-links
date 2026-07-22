export async function create(db, { user_id, url, normalized_url }) {
  const { rows } = await db.query(
    `INSERT INTO links(user_id,url,normalized_url)
     VALUES($1,$2,$3)
     RETURNING id,url,status
     `,
    [user_id, url, normalized_url],
  );
  return rows;
}
