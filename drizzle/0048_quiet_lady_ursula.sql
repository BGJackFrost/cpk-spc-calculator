ALTER TABLE `spc_defect_records` ADD `verificationStatus` enum('pending','real_ng','ntf') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `spc_defect_records` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `spc_defect_records` ADD `verifiedBy` int;--> statement-breakpoint
ALTER TABLE `spc_defect_records` ADD `verificationNotes` text;--> statement-breakpoint
ALTER TABLE `spc_defect_records` ADD `ntfReason` varchar(200);