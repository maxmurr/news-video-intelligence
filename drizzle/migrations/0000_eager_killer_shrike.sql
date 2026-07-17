CREATE TABLE `broadcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `broadcasts_filename_unique` ON `broadcasts` (`filename`);--> statement-breakpoint
CREATE TABLE `frames` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text NOT NULL,
	`idx` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`headline` text NOT NULL,
	`frame_time` text NOT NULL,
	`reason` text NOT NULL,
	`frame_url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`broadcast_id`) REFERENCES `broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `frames_broadcast_idx` ON `frames` (`broadcast_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `frames_broadcast_position` ON `frames` (`broadcast_id`,`idx`);--> statement-breakpoint
CREATE TABLE `headlines` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text NOT NULL,
	`idx` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`broadcast_id`) REFERENCES `broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `headlines_broadcast_idx` ON `headlines` (`broadcast_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `headlines_broadcast_position` ON `headlines` (`broadcast_id`,`idx`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text NOT NULL,
	`run_id` text,
	`started_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`broadcast_id`) REFERENCES `broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runs_broadcast_id_unique` ON `runs` (`broadcast_id`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text NOT NULL,
	`idx` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`broadcast_id`) REFERENCES `broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stories_broadcast_idx` ON `stories` (`broadcast_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stories_broadcast_position` ON `stories` (`broadcast_id`,`idx`);--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`broadcast_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`broadcast_id`) REFERENCES `broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transcripts_broadcast_id_unique` ON `transcripts` (`broadcast_id`);