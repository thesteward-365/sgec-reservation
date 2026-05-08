PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_external_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`google_event_id` text NOT NULL,
	`title` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`description` text,
	`synced_at` integer DEFAULT ((strftime('%s', 'now') * 1000)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_external_events`("id", "google_event_id", "title", "start_time", "end_time", "description", "synced_at") SELECT "id", "google_event_id", "title", "start_time", "end_time", "description", "synced_at" FROM `external_events`;--> statement-breakpoint
DROP TABLE `external_events`;--> statement-breakpoint
ALTER TABLE `__new_external_events` RENAME TO `external_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `external_events_google_event_id_unique` ON `external_events` (`google_event_id`);--> statement-breakpoint
CREATE TABLE `__new_reservation_histories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reservation_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`actor_user_name` text NOT NULL,
	`action_type` text DEFAULT 'updated' NOT NULL,
	`changes` text NOT NULL,
	`google_event_id` text,
	`created_at` integer DEFAULT ((strftime('%s', 'now') * 1000)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_reservation_histories`("id", "reservation_id", "actor_user_id", "actor_user_name", "action_type", "changes", "google_event_id", "created_at") SELECT "id", "reservation_id", "actor_user_id", "actor_user_name", "action_type", "changes", "google_event_id", "created_at" FROM `reservation_histories`;--> statement-breakpoint
DROP TABLE `reservation_histories`;--> statement-breakpoint
ALTER TABLE `__new_reservation_histories` RENAME TO `reservation_histories`;--> statement-breakpoint
CREATE TABLE `__new_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`place_id` integer NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`purpose` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`google_event_id` text,
	`created_at` integer DEFAULT ((strftime('%s', 'now') * 1000)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reservations`("id", "user_id", "place_id", "start_time", "end_time", "purpose", "status", "google_event_id", "created_at") SELECT "id", "user_id", "place_id", "start_time", "end_time", "purpose", "status", "google_event_id", "created_at" FROM `reservations`;--> statement-breakpoint
DROP TABLE `reservations`;--> statement-breakpoint
ALTER TABLE `__new_reservations` RENAME TO `reservations`;--> statement-breakpoint
CREATE TABLE `__new_sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`timestamp` integer DEFAULT ((strftime('%s', 'now') * 1000)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sync_logs`("id", "level", "message", "timestamp") SELECT "id", "level", "message", "timestamp" FROM `sync_logs`;--> statement-breakpoint
DROP TABLE `sync_logs`;--> statement-breakpoint
ALTER TABLE `__new_sync_logs` RENAME TO `sync_logs`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT ((strftime('%s', 'now') * 1000)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "phone_number", "role", "status", "created_at") SELECT "id", "name", "phone_number", "role", "status", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_unique` ON `users` (`phone_number`);