ALTER TABLE "reservations" DROP CONSTRAINT "reservations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;