import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Attempts spent against the public pairing endpoint, counted per scope.
 *
 * A wrong guess matches no row, because the lookup is by hash, so there is
 * no code to attribute the attempt to and the counter has to live outside
 * the codes. What it can be attributed to is where it came from, which is
 * why the key is a scope string and not a fixed one: a single instance-wide
 * counter would let ten anonymous requests freeze the pairing of every
 * workspace at once.
 */
export const pairingFailure = pgTable("pairing_failure", {
  /** The scope the attempts are charged to, e.g. `origin:203.0.113.7`. */
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
