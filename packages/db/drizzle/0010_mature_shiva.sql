CREATE TABLE "pairing_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"secret" text NOT NULL,
	"label" text NOT NULL,
	"created_by_user_id" uuid,
	"token_id" uuid,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pairing_code" ADD CONSTRAINT "pairing_code_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_code" ADD CONSTRAINT "pairing_code_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_code" ADD CONSTRAINT "pairing_code_token_id_mcp_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."mcp_token"("id") ON DELETE set null ON UPDATE no action;