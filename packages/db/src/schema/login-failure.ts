import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Failed login attempts, counted per scope.
 *
 * The gate has to work before an account is known to exist — the whole point
 * is that an unknown address costs the same scrypt call as a real one
 * (OCL-99) and must be refused the same way too. So the scope is never a
 * user id: it is the email string as submitted, and separately the caller's
 * origin, exactly like `pairing_failure`'s scope-by-origin pattern for the
 * pairing endpoint. Same shape, same reason: whoever is guessing has to pay
 * for the guess before anything downstream looks at it.
 */
export const loginFailure = pgTable("login_failure", {
  /** The scope the attempt is charged to, e.g. `login-email:x@y.test`. */
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
