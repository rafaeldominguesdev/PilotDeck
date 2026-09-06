ALTER TABLE "workspace" ADD COLUMN "github_token" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "context_source" jsonb;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "latest_prerelease" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "context_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "project_context_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_ref" text NOT NULL,
	"version" text,
	"prerelease" boolean DEFAULT false NOT NULL,
	"summary" text,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_context_audit_source_ref" UNIQUE("project_id","source","source_ref")
);
--> statement-breakpoint
ALTER TABLE "project_context_audit" ADD CONSTRAINT "project_context_audit_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_context_audit_project_idx" ON "project_context_audit" USING btree ("project_id","created_at");
