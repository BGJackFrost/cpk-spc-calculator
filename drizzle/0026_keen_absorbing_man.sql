CREATE TABLE `custom_validation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`productId` int,
	`workstationId` int,
	`ruleType` enum('range_check','trend_check','pattern_check','comparison_check','formula_check','custom_script') NOT NULL DEFAULT 'range_check',
	`ruleConfig` text,
	`actionOnViolation` enum('warning','alert','reject','log_only') NOT NULL DEFAULT 'warning',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`violationMessage` text,
	`isActive` int NOT NULL DEFAULT 1,
	`priority` int NOT NULL DEFAULT 100,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_validation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validation_rule_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`productId` int,
	`workstationId` int,
	`machineId` int,
	`inputValue` varchar(500),
	`passed` int NOT NULL DEFAULT 1,
	`violationDetails` text,
	`actionTaken` varchar(100),
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`executedBy` int,
	CONSTRAINT `validation_rule_logs_id` PRIMARY KEY(`id`)
);
