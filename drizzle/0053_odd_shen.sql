CREATE TABLE `oee_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int,
	`productionLineId` int,
	`targetOee` decimal(5,2) NOT NULL DEFAULT '85.00',
	`warningThreshold` decimal(5,2) NOT NULL DEFAULT '80.00',
	`criticalThreshold` decimal(5,2) NOT NULL DEFAULT '70.00',
	`dropAlertThreshold` decimal(5,2) NOT NULL DEFAULT '5.00',
	`relativeDropThreshold` decimal(5,2) NOT NULL DEFAULT '10.00',
	`availabilityTarget` decimal(5,2) DEFAULT '90.00',
	`performanceTarget` decimal(5,2) DEFAULT '95.00',
	`qualityTarget` decimal(5,2) DEFAULT '99.00',
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oee_alert_thresholds_id` PRIMARY KEY(`id`)
);
