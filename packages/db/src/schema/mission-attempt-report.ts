import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { UsageSegment } from "../domain/usage";
import { missionAttemptCheckpointEnum } from "./enums";
import { missionAttempt } from "./mission-attempt";

/** Immutable cumulative checkpoint history for a mission attempt. */
export const missionAttemptReport = pgTable(
  "mission_attempt_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionAttemptId: uuid("mission_attempt_id")
      .notNull()
      .references(() => missionAttempt.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    checkpoint: missionAttemptCheckpointEnum("checkpoint")
      .notNull()
      .default("rodada"),
    /** Snapshot cumulative from the start, never a delta. */
    usageSegments: jsonb("usage_segments").$type<UsageSegment[]>(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    tokensCache: integer("tokens_cache"),
    durationMs: integer("duration_ms"),
    turns: integer("turns"),
    estimated: boolean("estimated").notNull().default(false),
    /** Result fields are meaningful only for the final checkpoint. */
    result: text("result"),
    resultNote: text("result_note"),
  },
  (table) => [
    index("mission_attempt_report_attempt_idx").on(table.missionAttemptId),
    unique("mission_attempt_report_attempt_sequence_uq").on(
      table.missionAttemptId,
      table.sequence,
    ),
    check("mission_attempt_report_sequence_ck", sql`${table.sequence} > 0`),
    check(
      "mission_attempt_report_final_result_ck",
      sql`${table.checkpoint} = 'final' OR (${table.result} IS NULL AND ${table.resultNote} IS NULL)`,
    ),
  ],
);
