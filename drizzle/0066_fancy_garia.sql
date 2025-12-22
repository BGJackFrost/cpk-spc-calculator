CREATE TABLE `user_quick_access_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(50) DEFAULT 'Folder',
	`color` varchar(20) DEFAULT 'blue',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_expanded` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_quick_access_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_quick_access` ADD `category_id` int;