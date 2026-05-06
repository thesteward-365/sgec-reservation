PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sync_logs`("id", "level", "message", "timestamp") SELECT "id", "level", "message", "timestamp" FROM `sync_logs`;--> statement-breakpoint
DROP TABLE `sync_logs`;--> statement-breakpoint
ALTER TABLE `__new_sync_logs` RENAME TO `sync_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `places` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `places` ADD `is_pinned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservation_histories` ADD `google_event_id` text;