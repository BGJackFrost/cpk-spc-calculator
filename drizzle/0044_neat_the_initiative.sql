CREATE TABLE `po_receiving_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`purchaseOrderItemId` int NOT NULL,
	`sparePartId` int NOT NULL,
	`quantityReceived` int NOT NULL,
	`receivedBy` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`batchNumber` varchar(100),
	`qualityStatus` enum('good','damaged','rejected') DEFAULT 'good',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `po_receiving_history_id` PRIMARY KEY(`id`)
);
