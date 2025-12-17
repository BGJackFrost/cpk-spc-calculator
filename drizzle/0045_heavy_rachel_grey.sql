CREATE TABLE `role_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('production','quality','maintenance','management','system') NOT NULL DEFAULT 'production',
	`permissionIds` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_templates_code_unique` UNIQUE(`code`)
);
