import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

/**
 * Per-workspace usage collection recipes: CLI → how to measure the run. Rows
 * only exist once someone edits a recipe; the shipped list is what the board
 * hands to agents until then. One row per CLI means a transcript format change
 * is fixed once, here, instead of in every agent's head.
 */
export const usageRecipe = pgTable(
  "usage_recipe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    /** Executor catalog id, or "generic" for the fallback recipe. */
    cli: text("cli").notNull(),
    label: text("label").notNull(),
    /** "tokens_per_model" or "no_tokens": what this recipe can honestly produce. */
    yields: text("yields").notNull(),
    instructions: text("instructions").notNull(),
    /** Empty when the CLI has no command that measures anything. */
    command: text("command").notNull().default(""),
    /** Email when the edit came from Settings. */
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("usage_recipe_workspace_cli").on(table.workspaceId, table.cli),
    index("usage_recipe_workspace_idx").on(table.workspaceId),
  ],
);
