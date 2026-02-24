CREATE TABLE `export_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exportType` varchar(20) NOT NULL,
	`productCode` varchar(100),
	`stationName` varchar(255),
	`analysisType` varchar(50),
	`startDate` timestamp,
	`endDate` timestamp,
	`sampleCount` int,
	`mean` int,
	`cpk` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text,
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `export_history_id` PRIMARY KEY(`id`)
);
