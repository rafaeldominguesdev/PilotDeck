import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { project } from "./project";

/** Immutable record of every source-driven or manual context update. */
export const projectContextAudit = pgTable(
  "project_context_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    /** Release id/tag or context-file reference used for idempotency. */
    sourceRef: text("source_ref").notNull(),
    version: text("version"),
    prerelease: boolean("prerelease").notNull().default(false),
    summary: text("summary"),
    /** Workspace token label, webhook actor, or `human`. */
    actor: text("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("project_context_audit_source_ref").on(
      table.projectId,
      table.source,
      table.sourceRef,
    ),
    index("project_context_audit_project_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);
