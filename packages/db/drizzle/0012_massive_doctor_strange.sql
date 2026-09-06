CREATE TABLE "model_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"model" text NOT NULL,
	"label" text NOT NULL,
	"input_per_mtok" numeric(12, 6) NOT NULL,
	"output_per_mtok" numeric(12, 6) NOT NULL,
	"cache_per_mtok" numeric(12, 6) NOT NULL,
	"seeded_at" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_price_workspace_model" UNIQUE("workspace_id","model")
);
--> statement-breakpoint
ALTER TABLE "model_price" ADD CONSTRAINT "model_price_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_price_workspace_idx" ON "model_price" USING btree ("workspace_id");