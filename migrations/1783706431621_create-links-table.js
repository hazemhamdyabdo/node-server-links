/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable(
    "links",
    {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
      user_id: {
        type: "uuid",
        notNull: true,
        references: "users",
        onDelete: "CASCADE",
      },
      url: {
        type: "text",
        notNull: true,
      },
      normalized_url: {
        type: "text",
        notNull: true,
      },
      status: {
        type: "text",
        notNull: true,
        default: "queued",
        check: "status IN ('queued','processing','ready','failed')",
      },
      title: {
        type: "text",
        notNull: false,
      },
      description: {
        type: "text",
        notNull: false,
      },
      site_name: {
        type: "text",
        notNull: false,
      },
      favicon_url: {
        type: "text",
        notNull: false,
      },
      error: {
        type: "text",
        notNull: false,
      },
      fetched_at: {
        type: "timestamptz",
        notNull: false,
      },
      created_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
      updated_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("now()"),
      },
    },
    {
      constraints: {
        unique: ["user_id", "normalized_url"],
      },
    },
  );
  pgm.createIndex("links", ["user_id", "status"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex("links", ["user_id", "status"]);
  pgm.dropTable("links");
};
