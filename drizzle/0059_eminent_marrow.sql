CREATE TABLE `custom_themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`primary_color` varchar(50) NOT NULL,
	`secondary_color` varchar(50) NOT NULL,
	`accent_color` varchar(50) NOT NULL,
	`background_color` varchar(50) NOT NULL,
	`foreground_color` varchar(50) NOT NULL,
	`muted_color` varchar(50),
	`muted_foreground_color` varchar(50),
	`light_variables` text,
	`dark_variables` text,
	`is_public` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_themes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_theme_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`theme_id` varchar(50) NOT NULL DEFAULT 'default-blue',
	`is_dark_mode` int NOT NULL DEFAULT 0,
	`custom_theme_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_theme_preferences_id` PRIMARY KEY(`id`)
);
