CREATE TABLE `machine_bom` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`sparePartId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`isRequired` int NOT NULL DEFAULT 1,
	`replacementInterval` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machine_bom_id` PRIMARY KEY(`id`)
);
