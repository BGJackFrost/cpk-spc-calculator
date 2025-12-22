CREATE TABLE `user_quick_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`menu_id` varchar(100) NOT NULL,
	`menu_path` varchar(255) NOT NULL,
	`menu_label` varchar(100) NOT NULL,
	`menu_icon` varchar(50),
	`system_id` varchar(50),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_quick_access_id` PRIMARY KEY(`id`)
);
