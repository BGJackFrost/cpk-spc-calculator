ALTER TABLE `purchase_orders` ADD `rejectedBy` int;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `exportPurpose` enum('repair','borrow','destroy','normal') DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `borrowerName` varchar(255);--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `borrowerDepartment` varchar(255);--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `expectedReturnDate` timestamp;--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `actualReturnDate` timestamp;--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `returnedQuantity` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `returnStatus` enum('pending','partial','completed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `spare_parts_transactions` ADD `relatedTransactionId` int;