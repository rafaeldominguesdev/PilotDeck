CREATE TABLE "usage_recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"cli" text NOT NULL,
	"label" text NOT NULL,
	"yields" text NOT NULL,
	"instructions" text NOT NULL,
	"command" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usage_recipe_workspace_cli" UNIQUE("workspace_id","cli")
);
--> statement-breakpoint
ALTER TABLE "usage_recipe" ADD CONSTRAINT "usage_recipe_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_recipe_workspace_idx" ON "usage_recipe" USING btree ("workspace_id");