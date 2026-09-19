CREATE TABLE `areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer NOT NULL,
	`parent_id` integer,
	`area_id` integer,
	`stage_id` integer,
	`title` text NOT NULL,
	`description_md` text,
	`data` text NOT NULL,
	`priority` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`planned_date` text,
	`due_date` text,
	`completed_at` text,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `entry_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stage_id`) REFERENCES `stages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entry_tags` (
	`entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_id`)
);
--> statement-breakpoint
CREATE TABLE `entry_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '' NOT NULL,
	`fields` text NOT NULL,
	`progress_mode` text DEFAULT 'none' NOT NULL,
	`auto_retro` integer DEFAULT false NOT NULL,
	`show_on_board` integer DEFAULT false NOT NULL,
	`template` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_types_key_unique` ON `entry_types` (`key`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`target` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `retro_skills` (
	`retro_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`rating` integer NOT NULL,
	PRIMARY KEY(`retro_id`, `tag_id`)
);
--> statement-breakpoint
CREATE TABLE `retros` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`went_well` text,
	`went_wrong` text,
	`to_practice` text,
	`difficulty` integer,
	`extra` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer,
	`started_at` text NOT NULL,
	`ended_at` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_done` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `entry_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_name` text NOT NULL,
	`name` text NOT NULL,
	`color` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_group_name_name_unique` ON `tags` (`group_name`,`name`);