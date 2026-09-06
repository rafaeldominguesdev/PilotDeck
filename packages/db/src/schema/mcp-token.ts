import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { workspace } from "./workspace";

export const mcpToken = pgTable(
  "mcp_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    hash: text("hash").notNull(),
    tokenPrefix: text("token_prefix"),
    /**
     * Lets this token change the workspace configuration over MCP (harness
     * policy, executors). OFF by default: a worker token claims and delivers
     * cards, it does not get to promote itself to a better model.
     */
    canManage: boolean("can_manage").notNull().default(false),
    revoked: boolean("revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("mcp_token_workspace_label").on(table.workspaceId, table.label),
    index("mcp_token_hash_idx").on(table.hash),
  ],
);
