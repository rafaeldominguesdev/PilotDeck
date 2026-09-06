import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  DeliveryVerification,
  HandoffArtifact,
  HandoffEvidence,
  UsageReport,
} from "../types";
import { executionAttempt } from "./execution-attempt";
import { task } from "./task";

export const handoff = pgTable(
  "handoff",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  attemptId: uuid("attempt_id").references(() => executionAttempt.id, {
    onDelete: "set null",
  }),
  summary: text("summary").notNull(),
  evidences: jsonb("evidences")
    .$type<HandoffEvidence[]>()
    .notNull()
    .default([]),
  artifacts: jsonb("artifacts")
    .$type<HandoffArtifact[]>()
    .notNull()
    .default([]),
  howToVerify: text("how_to_verify"),
  branch: text("branch"),
  prUrl: text("pr_url"),
  commitHash: text("commit_hash"),
  deliveryUnverified: boolean("delivery_unverified").notNull().default(false),
  deliveryVerification: text("delivery_verification").$type<DeliveryVerification>(),
  deliveryWarning: text("delivery_warning"),
  usage: jsonb("usage").$type<UsageReport>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  },
  (table) => [index("handoff_task_idx").on(table.taskId)],
);
