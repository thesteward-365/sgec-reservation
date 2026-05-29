CREATE TABLE "purposes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purposes_user_id_purpose_unique" UNIQUE("user_id","purpose")
);
--> statement-breakpoint
ALTER TABLE "purposes" ADD CONSTRAINT "purposes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;