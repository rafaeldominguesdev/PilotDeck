CREATE TABLE "cardapio_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"cli" text,
	"model" text,
	"effort" text NOT NULL,
	CONSTRAINT "cardapio_entry_workspace_type" UNIQUE("workspace_id","activity_type")
);
--> statement-breakpoint
ALTER TABLE "workspace" ALTER COLUMN "cardapio" SET DEFAULT '{"bug":{"model":null,"modelTier":"mid","effort":"medium"},"feature":{"model":null,"modelTier":"mid","effort":"medium"},"rfc":{"model":null,"modelTier":"top","effort":"high"}}'::jsonb;--> statement-breakpoint
ALTER TABLE "cardapio_entry" ADD CONSTRAINT "cardapio_entry_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cardapio_entry_workspace_idx" ON "cardapio_entry" USING btree ("workspace_id");--> statement-breakpoint
INSERT INTO "cardapio_entry" ("workspace_id", "activity_type", "cli", "model", "effort")
SELECT w."id", t."activity_type", NULL, t."model", t."effort"
FROM "workspace" w
CROSS JOIN (
  VALUES
    ('bug', 'sonnet-5', 'medium'),
    ('feature', 'sonnet-5', 'medium'),
    ('rfc', 'opus-4-8', 'high'),
    ('architecture', 'opus-4-8', 'high'),
    ('mechanical', 'haiku-4', 'low')
) AS t("activity_type", "model", "effort");