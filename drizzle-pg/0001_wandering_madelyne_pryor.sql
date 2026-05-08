ALTER TABLE "calendar_settings" ALTER COLUMN "google_token_expiry" SET DATA TYPE timestamp with time zone USING to_timestamp("google_token_expiry");--> statement-breakpoint
ALTER TABLE "external_events" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone USING to_timestamp("start_time");--> statement-breakpoint
ALTER TABLE "external_events" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone USING to_timestamp("end_time");--> statement-breakpoint
ALTER TABLE "external_events" ALTER COLUMN "synced_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "external_events" ALTER COLUMN "synced_at" SET DATA TYPE timestamp with time zone USING to_timestamp("synced_at");--> statement-breakpoint
ALTER TABLE "external_events" ALTER COLUMN "synced_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "places" ALTER COLUMN "is_pinned" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "places" ALTER COLUMN "is_pinned" SET DATA TYPE boolean USING "is_pinned" <> 0;--> statement-breakpoint
ALTER TABLE "places" ALTER COLUMN "is_pinned" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "reservation_histories" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservation_histories" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING to_timestamp("created_at");--> statement-breakpoint
ALTER TABLE "reservation_histories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "start_time" SET DATA TYPE timestamp with time zone USING to_timestamp("start_time");--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "end_time" SET DATA TYPE timestamp with time zone USING to_timestamp("end_time");--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING to_timestamp("created_at");--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sync_logs" ALTER COLUMN "timestamp" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sync_logs" ALTER COLUMN "timestamp" SET DATA TYPE timestamp with time zone USING to_timestamp("timestamp");--> statement-breakpoint
ALTER TABLE "sync_logs" ALTER COLUMN "timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING to_timestamp("created_at");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();
