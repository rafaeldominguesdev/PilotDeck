CREATE TYPE "public"."mission_attempt_checkpoint" AS ENUM('rodada', 'final');--> statement-breakpoint
CREATE TYPE "public"."mission_attempt_status" AS ENUM('aberto', 'sucesso', 'abandonado');--> statement-breakpoint
CREATE TABLE "mission_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"project_id" uuid,
	"executor" text,
	"model" text,
	"model_source" text,
	"session_id" text NOT NULL,
	"transcript" jsonb,
	"status" "mission_attempt_status" DEFAULT 'aberto' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"usage_segments" jsonb,
	"tokens_in" integer,
	"tokens_out" integer,
	"tokens_cache" integer,
	"reported_cost_usd" numeric(12, 6),
	"cost_usd" numeric(12, 6),
	"cost_source" text,
	"cost_status" text,
	"cost_unpriced_models" jsonb,
	"cost_breakdown" jsonb,
	"duration_ms" integer,
	"server_duration_ms" integer,
	"turns" integer,
	"usage_estimated" boolean DEFAULT false NOT NULL,
	"usage_suspect" boolean DEFAULT false NOT NULL,
	"usage_suspect_reason" text,
	"result" text,
	"result_note" text,
	"last_report_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mission_attempt_status_finished_ck" CHECK (("mission_attempt"."status" = 'aberto' AND "mission_attempt"."finished_at" IS NULL) OR ("mission_attempt"."status" <> 'aberto' AND "mission_attempt"."finished_at" IS NOT NULL)),
	CONSTRAINT "mission_attempt_suspect_reason_ck" CHECK ("mission_attempt"."usage_suspect" = false OR "mission_attempt"."usage_suspect_reason" IS NOT NULL),
	CONSTRAINT "mission_attempt_last_report_sequence_ck" CHECK ("mission_attempt"."last_report_sequence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mission_attempt_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_attempt_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checkpoint" "mission_attempt_checkpoint" DEFAULT 'rodada' NOT NULL,
	"usage_segments" jsonb,
	"tokens_in" integer,
	"tokens_out" integer,
	"tokens_cache" integer,
	"duration_ms" integer,
	"turns" integer,
	"estimated" boolean DEFAULT false NOT NULL,
	"result" text,
	"result_note" text,
	CONSTRAINT "mission_attempt_report_attempt_sequence_uq" UNIQUE("mission_attempt_id","sequence"),
	CONSTRAINT "mission_attempt_report_sequence_ck" CHECK ("mission_attempt_report"."sequence" > 0),
	CONSTRAINT "mission_attempt_report_final_result_ck" CHECK ("mission_attempt_report"."checkpoint" = 'final' OR ("mission_attempt_report"."result" IS NULL AND "mission_attempt_report"."result_note" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "mission_attempt" ADD CONSTRAINT "mission_attempt_mission_id_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_attempt" ADD CONSTRAINT "mission_attempt_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_attempt_report" ADD CONSTRAINT "mission_attempt_report_mission_attempt_id_mission_attempt_id_fk" FOREIGN KEY ("mission_attempt_id") REFERENCES "public"."mission_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mission_attempt_mission_idx" ON "mission_attempt" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_attempt_project_idx" ON "mission_attempt" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "mission_attempt_session_idx" ON "mission_attempt" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_attempt_open_mission_uidx" ON "mission_attempt" USING btree ("mission_id") WHERE "mission_attempt"."status" = 'aberto';--> statement-breakpoint
CREATE INDEX "mission_attempt_report_attempt_idx" ON "mission_attempt_report" USING btree ("mission_attempt_id");
