ALTER TABLE `spc_sampling_plans` ADD `alertThresholdId` int;--> statement-breakpoint
ALTER TABLE `spc_sampling_plans` ADD `cpkAlertEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `spc_sampling_plans` ADD `cpkUpperLimit` varchar(20);--> statement-breakpoint
ALTER TABLE `spc_sampling_plans` ADD `cpkLowerLimit` varchar(20);