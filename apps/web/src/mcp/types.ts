import type { Database } from "@pilotdeck/db";

export type AuthContext = {
  tokenId: string;
  workspaceId: string;
  tokenLabel: string;
  /**
   * Token may change the workspace configuration (harness policy, executors).
   * Off unless the owner ticked it in Settings; absent means off.
   */
  canManage?: boolean;
};

/** Postgres or PGlite drizzle client — the query surface the tools use. */
export type McpDatabase = Pick<
  Database,
  "select" | "insert" | "update" | "delete" | "transaction"
>;
