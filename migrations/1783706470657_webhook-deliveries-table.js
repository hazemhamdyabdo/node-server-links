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
  pgm.createTable("webhook_deliveries", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    webhook_endpoint_id: {
      type: "uuid",
      notNull: true,
      references: "webhook_endpoints",
    },
    link_id: {
      type: "uuid",
      notNull: false,
      references: "links",
    },
    event_type: {
      type: "text",
      notNull: true,
    },
    payload: {
      type: "jsonb",
      notNull: true,
    },
    status: {
      type: "text",
      notNull: true,
      default: "pending",
      check: "status IN ('pending','delivered','failed')",
    },
    attempts: {
      type: "int",
      notNull: true,
      default: 0,
    },
    response_status: {
      type: "int",
      notNull: false,
    },
    last_attempt_at: {
      type: "timestamptz",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: false,
      default: pgm.func("now()"),
    },
  });
  pgm.createIndex("webhook_deliveries", ["webhook_endpoint_id"]);
  pgm.createIndex("webhook_deliveries", ["status"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex("webhook_deliveries", ["status"]);
  pgm.dropIndex("webhook_deliveries", ["webhook_endpoint_id"]);
  pgm.dropTable("webhook_deliveries");
};
