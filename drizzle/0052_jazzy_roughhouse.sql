CREATE TABLE `user_prediction_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`configType` enum('oee','cpk','spc') NOT NULL,
	`configName` varchar(100) NOT NULL,
	`algorithm` enum('linear','moving_avg','exp_smoothing') NOT NULL DEFAULT 'linear',
	`predictionDays` int NOT NULL DEFAULT 14,
	`confidenceLevel` decimal(5,2) NOT NULL DEFAULT '95.00',
	`alertThreshold` decimal(5,2) NOT NULL DEFAULT '5.00',
	`movingAvgWindow` int DEFAULT 7,
	`smoothingFactor` decimal(3,2) DEFAULT '0.30',
	`historicalDays` int NOT NULL DEFAULT 30,
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_prediction_configs_id` PRIMARY KEY(`id`)
);
