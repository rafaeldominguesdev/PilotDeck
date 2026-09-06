CREATE TYPE "public"."execution_mode" AS ENUM('solo', 'team');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('ativa', 'pausada', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."reviewer_kind" AS ENUM('human', 'agent', 'workspace_queue');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('urgente', 'alta', 'media', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('aberto', 'em_execucao', 'feito', 'validado');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('feature', 'bug', 'rfc');--> statement-breakpoint
CREATE TABLE "execution_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"executor" text,
	"model" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"tokens_in" integer,
	"tokens_out" integer,
	"tokens_cache" integer,
	"cost_usd" numeric(12, 6),
	"duration_ms" integer,
	"turns" integer,
	"result" text,
	"result_note" text
);
--> statement-breakpoint
CREATE TABLE "handoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"attempt_id" uuid,
	"summary" text NOT NULL,
	"evidences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artifacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"branch" text,
	"pr_url" text,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" text NOT NULL,
	"hash" text NOT NULL,
	"token_prefix" text,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_token_workspace_label" UNIQUE("workspace_id","label")
);
--> statement-breakpoint
CREATE TABLE "mission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"status" "mission_status" DEFAULT 'ativa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"repo_url" text,
	"id_prefix" text NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_workspace_prefix" UNIQUE("workspace_id","id_prefix")
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"mission_id" uuid,
	"parent_id" uuid,
	"short_id" text NOT NULL,
	"title" text NOT NULL,
	"o_que" text DEFAULT '' NOT NULL,
	"por_que" text DEFAULT '' NOT NULL,
	"como_confirmo" text DEFAULT '' NOT NULL,
	"tipo" "task_type" DEFAULT 'feature' NOT NULL,
	"status" "task_status" DEFAULT 'aberto' NOT NULL,
	"revisado" boolean DEFAULT false NOT NULL,
	"priority" "task_priority" DEFAULT 'media' NOT NULL,
	"devolve_para_kind" "reviewer_kind" DEFAULT 'workspace_queue' NOT NULL,
	"devolve_para_user_id" uuid,
	"devolve_para_agent_ref" text,
	"harness" jsonb,
	"branch" text,
	"pr_url" text,
	"origin" jsonb,
	"mode" "execution_mode" DEFAULT 'solo' NOT NULL,
	"telemetry_incomplete" boolean DEFAULT false NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_executor" text,
	"claimed_by_token_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_agent_ref" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"executors" jsonb DEFAULT '[{"id":"overclock","label":"Overclock","enabled":false,"models":[]},{"id":"claude-code","label":"Claude Code","enabled":false,"models":[]},{"id":"codex","label":"Codex","enabled":false,"models":[]},{"id":"gemini-cli","label":"Gemini CLI","enabled":false,"models":[]},{"id":"cursor","label":"Cursor","enabled":false,"models":[]},{"id":"aider","label":"Aider","enabled":false,"models":[]},{"id":"generic-mcp","label":"Outro (MCP genérico)","enabled":false,"models":[]}]'::jsonb NOT NULL,
	"cardapio" jsonb DEFAULT '{"bug":{"model":null,"modelTier":"mid","effort":"medium","skills":["fix"],"agent":null},"feature":{"model":null,"modelTier":"mid","effort":"medium","skills":[],"agent":null},"rfc":{"model":null,"modelTier":"top","effort":"high","skills":[],"agent":null}}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD CONSTRAINT "execution_attempt_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoff" ADD CONSTRAINT "handoff_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoff" ADD CONSTRAINT "handoff_attempt_id_execution_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."execution_attempt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_token" ADD CONSTRAINT "mcp_token_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_token" ADD CONSTRAINT "mcp_token_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission" ADD CONSTRAINT "mission_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_id_task_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_devolve_para_user_id_user_id_fk" FOREIGN KEY ("devolve_para_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_claimed_by_token_id_mcp_token_id_fk" FOREIGN KEY ("claimed_by_token_id") REFERENCES "public"."mcp_token"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "execution_attempt_task_idx" ON "execution_attempt" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "handoff_task_idx" ON "handoff" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "mcp_token_hash_idx" ON "mcp_token" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "task" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "task" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_parent_idx" ON "task" USING btree ("parent_id");