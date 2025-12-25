CREATE TABLE `video_tutorials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`youtube_url` varchar(500) NOT NULL,
	`youtube_id` varchar(50) NOT NULL,
	`thumbnail_url` varchar(500),
	`duration` varchar(20),
	`category` varchar(100) NOT NULL,
	`level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`view_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_tutorials_id` PRIMARY KEY(`id`)
);
