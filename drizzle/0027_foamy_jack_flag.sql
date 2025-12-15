CREATE TABLE `license_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`address` text,
	`industry` varchar(100),
	`notes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_heartbeats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseKey` varchar(255) NOT NULL,
	`hardwareFingerprint` varchar(64),
	`hostname` varchar(255),
	`platform` varchar(100),
	`activeUsers` int,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `license_heartbeats_id` PRIMARY KEY(`id`)
);
