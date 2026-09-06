ALTER TABLE "execution_attempt" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "usage_suspect" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "usage_suspect_reason" text;--> statement-breakpoint
UPDATE "execution_attempt"
SET "session_id" = COALESCE(
  "transcript"->>'sessionId',
  substring("executor" from '"session_id"[[:space:]]*:[[:space:]]*"([^"]+)"')
)
WHERE "session_id" IS NULL;
--> statement-breakpoint
UPDATE "execution_attempt" current_attempt
SET
  "usage_suspect" = true,
  "usage_suspect_reason" = COALESCE(
    current_attempt."usage_suspect_reason",
    'session_reused: this executor session already delivered another card'
  )
WHERE current_attempt."session_id" IS NOT NULL
  AND current_attempt."finished_at" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "execution_attempt" prior_attempt
    WHERE prior_attempt."session_id" = current_attempt."session_id"
      AND prior_attempt."task_id" <> current_attempt."task_id"
      AND prior_attempt."finished_at" IS NOT NULL
      AND prior_attempt."started_at" < current_attempt."started_at"
  );
