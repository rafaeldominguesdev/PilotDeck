import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

/** Per-workspace cardapio policy: activity type → CLI · model · effort. No skills. */
export const cardapioEntry = pgTable(
  "cardapio_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    activityType: text("activity_type").notNull(),
    cli: text("cli"),
    model: text("model"),
    /**
     * The line of succession for this activity, best first, `model` included as
     * its head. The board claims the first entry the workspace can still run,
     * so turning an executor off degrades the policy instead of voiding it.
     * Null on rows written before the column existed: those read as a chain of
     * one, which is exactly what they were.
     */
    chain: text("chain").array(),
    effort: text("effort").notNull(),
    /**
     * Who wrote this line last: an email when it came from Settings, the token
     * label when it came from harness_set over MCP. Denormalized on purpose so
     * the trail survives a revoked token or a deleted user.
     */
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("cardapio_entry_workspace_type").on(table.workspaceId, table.activityType),
    index("cardapio_entry_workspace_idx").on(table.workspaceId),
  ],
);
