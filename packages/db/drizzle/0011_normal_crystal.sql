ALTER TABLE "cardapio_entry" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "cardapio_entry" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_token" ADD COLUMN "can_manage" boolean DEFAULT false NOT NULL;