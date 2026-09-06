import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { mcpToken } from "./mcp-token";
import { user } from "./user";
import { workspace } from "./workspace";

/**
 * One-time pairing codes: the human reads a short 6-digit code to the agent
 * instead of pasting the bearer token into a conversation. The agent
 * exchanges the code on the public pairing endpoint and receives the real
 * token; the code is consumed on first use and expires in minutes.
 */
export const pairingCode = pgTable("pairing_code", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  // The future bearer secret. Held in plaintext only for the code's short
  // TTL and blanked at exchange time; the mcp_token row stores just the hash.
  secret: text("secret").notNull(),
  label: text("label").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  tokenId: uuid("token_id").references(() => mcpToken.id, {
    onDelete: "set null",
  }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
