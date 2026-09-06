ALTER TABLE "execution_attempt" ADD COLUMN "delivery_unverified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "delivery_verification" text;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "delivery_warning" text;--> statement-breakpoint
ALTER TABLE "handoff" ADD COLUMN "commit_hash" text;--> statement-breakpoint
ALTER TABLE "handoff" ADD COLUMN "delivery_unverified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "handoff" ADD COLUMN "delivery_verification" text;--> statement-breakpoint
ALTER TABLE "handoff" ADD COLUMN "delivery_warning" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "commit_hash" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "delivery_unverified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "delivery_verification" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "delivery_warning" text;