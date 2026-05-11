ALTER TABLE "sync_logs" ADD COLUMN "run_id" text;
--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_run_id_calendar_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."calendar_sync_runs"("id") ON DELETE cascade ON UPDATE no action;
