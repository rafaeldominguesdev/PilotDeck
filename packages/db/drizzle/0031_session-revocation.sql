ALTER TABLE "user" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;