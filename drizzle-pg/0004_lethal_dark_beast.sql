CREATE TYPE "public"."sync_action" AS ENUM('created', 'updated', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sync_calendar_status" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."sync_category" AS ENUM('reservation', 'event');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('success', 'partial', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."sync_trigger" AS ENUM('manual', 'system');--> statement-breakpoint
CREATE TABLE "calendar_sync_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"category" "sync_category" NOT NULL,
	"action" "sync_action" NOT NULL,
	"status" "sync_run_status" NOT NULL,
	"reservation_id" integer,
	"external_event_id" text,
	"title" text NOT NULL,
	"payload" text,
	"error_message" text,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"triggered_by" "sync_trigger" DEFAULT 'manual' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "sync_run_status" DEFAULT 'success' NOT NULL,
	"reservation_sync_status" "sync_calendar_status" NOT NULL,
	"event_sync_status" "sync_calendar_status" NOT NULL,
	"reservation_created_count" integer DEFAULT 0 NOT NULL,
	"reservation_updated_count" integer DEFAULT 0 NOT NULL,
	"reservation_deleted_count" integer DEFAULT 0 NOT NULL,
	"event_pulled_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error_summary" text
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "calendar_sync_items" ADD CONSTRAINT "calendar_sync_items_run_id_calendar_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."calendar_sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_run_id_calendar_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."calendar_sync_runs"("id") ON DELETE cascade ON UPDATE no action;