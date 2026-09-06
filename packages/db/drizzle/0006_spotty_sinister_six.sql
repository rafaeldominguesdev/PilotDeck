ALTER TABLE "execution_attempt" ADD COLUMN "server_duration_ms" integer;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "usage_estimated" boolean DEFAULT false NOT NULL;