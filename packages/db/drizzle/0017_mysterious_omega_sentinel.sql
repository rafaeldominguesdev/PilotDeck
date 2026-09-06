ALTER TABLE "workspace" ADD COLUMN "update_mode" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "update_log" jsonb;--> statement-breakpoint
-- An instance that had the release check on keeps it on, as check-only. The
-- new automatic mode is never turned on by a migration: it is a decision.
UPDATE "workspace" SET "update_mode" = 'check' WHERE "update_check_enabled" = true;
