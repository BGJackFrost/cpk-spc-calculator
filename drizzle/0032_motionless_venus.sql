CREATE TABLE `machine_sensors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`sensorTypeId` int NOT NULL,
	`sensorCode` varchar(100) NOT NULL,
	`location` varchar(255),
	`installDate` timestamp,
	`calibrationDate` timestamp,
	`nextCalibrationDate` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `machine_sensors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`machineId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`performedBy` int,
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`maintenanceTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`frequency` enum('daily','weekly','biweekly','monthly','quarterly','biannually','annually','custom') NOT NULL,
	`customIntervalDays` int,
	`lastPerformedAt` timestamp,
	`nextDueAt` timestamp,
	`estimatedDuration` int,
	`assignedTechnicianId` int,
	`checklist` json,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`category` enum('corrective','preventive','predictive','condition_based') NOT NULL,
	`description` text,
	`defaultPriority` enum('low','medium','high','critical') DEFAULT 'medium',
	`estimatedDuration` int,
	`color` varchar(20) DEFAULT '#3b82f6',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mms_dashboard_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`widgetType` varchar(100) NOT NULL,
	`title` varchar(255),
	`config` json,
	`position` int DEFAULT 0,
	`width` int DEFAULT 1,
	`height` int DEFAULT 1,
	`isVisible` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mms_dashboard_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_loss_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`type` enum('availability','performance','quality') NOT NULL,
	`description` text,
	`color` varchar(20) DEFAULT '#6b7280',
	`sortOrder` int DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_loss_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_loss_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`oeeRecordId` int NOT NULL,
	`lossCategoryId` int NOT NULL,
	`durationMinutes` int NOT NULL,
	`quantity` int DEFAULT 0,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oee_loss_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`productionLineId` int,
	`shiftId` int,
	`recordDate` timestamp NOT NULL,
	`plannedProductionTime` int NOT NULL,
	`actualRunTime` int NOT NULL,
	`downtime` int DEFAULT 0,
	`idealCycleTime` decimal(10,4),
	`totalCount` int DEFAULT 0,
	`goodCount` int DEFAULT 0,
	`defectCount` int DEFAULT 0,
	`availability` decimal(5,2),
	`performance` decimal(5,2),
	`quality` decimal(5,2),
	`oee` decimal(5,2),
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oee_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oee_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int,
	`productionLineId` int,
	`targetOee` decimal(5,2) DEFAULT '85.00',
	`targetAvailability` decimal(5,2) DEFAULT '90.00',
	`targetPerformance` decimal(5,2) DEFAULT '95.00',
	`targetQuality` decimal(5,2) DEFAULT '99.00',
	`effectiveFrom` timestamp NOT NULL,
	`effectiveTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oee_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prediction_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`machineTypeId` int,
	`modelType` enum('rul','anomaly','failure','degradation') NOT NULL,
	`description` text,
	`inputFeatures` json,
	`modelParameters` json,
	`accuracy` decimal(5,2),
	`lastTrainedAt` timestamp,
	`trainingDataCount` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prediction_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`modelId` int NOT NULL,
	`predictionType` enum('rul','failure_probability','anomaly_score','health_index') NOT NULL,
	`predictedValue` decimal(12,4),
	`confidence` decimal(5,2),
	`estimatedFailureDate` timestamp,
	`remainingUsefulLife` int,
	`severity` enum('low','medium','high','critical') DEFAULT 'low',
	`isAcknowledged` int DEFAULT 0,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`sparePartId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2),
	`totalPrice` decimal(12,2),
	`receivedQuantity` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNumber` varchar(50) NOT NULL,
	`supplierId` int NOT NULL,
	`status` enum('draft','pending','approved','ordered','partial_received','received','cancelled') DEFAULT 'draft',
	`orderDate` timestamp,
	`expectedDeliveryDate` timestamp,
	`actualDeliveryDate` timestamp,
	`subtotal` decimal(14,2),
	`tax` decimal(14,2),
	`shipping` decimal(14,2),
	`total` decimal(14,2),
	`notes` text,
	`createdBy` int,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensor_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensorId` int NOT NULL,
	`machineId` int NOT NULL,
	`value` decimal(12,4) NOT NULL,
	`status` enum('normal','warning','critical') DEFAULT 'normal',
	`recordedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensor_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensor_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`unit` varchar(50),
	`description` text,
	`minValue` decimal(12,4),
	`maxValue` decimal(12,4),
	`warningThreshold` decimal(12,4),
	`criticalThreshold` decimal(12,4),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensor_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spare_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partNumber` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`machineTypeId` int,
	`supplierId` int,
	`specifications` text,
	`unit` varchar(50) DEFAULT 'pcs',
	`unitPrice` decimal(12,2),
	`currency` varchar(10) DEFAULT 'VND',
	`minStock` int DEFAULT 0,
	`maxStock` int,
	`reorderPoint` int,
	`reorderQuantity` int,
	`warehouseLocation` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spare_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spare_parts_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sparePartId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reservedQuantity` int DEFAULT 0,
	`availableQuantity` int DEFAULT 0,
	`lastStockCheck` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spare_parts_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spare_parts_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sparePartId` int NOT NULL,
	`transactionType` enum('in','out','adjustment','return') NOT NULL,
	`quantity` int NOT NULL,
	`workOrderId` int,
	`purchaseOrderId` int,
	`unitCost` decimal(12,2),
	`totalCost` decimal(12,2),
	`reason` text,
	`performedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spare_parts_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`contactPerson` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`website` varchar(255),
	`paymentTerms` varchar(100),
	`leadTimeDays` int,
	`rating` int DEFAULT 3,
	`notes` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`employeeCode` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`specialization` varchar(255),
	`skillLevel` enum('junior','intermediate','senior','expert') DEFAULT 'intermediate',
	`isAvailable` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technicians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_order_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`sparePartId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitCost` decimal(12,2),
	`totalCost` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_order_parts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderNumber` varchar(50) NOT NULL,
	`machineId` int NOT NULL,
	`maintenanceTypeId` int NOT NULL,
	`scheduleId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`status` enum('pending','assigned','in_progress','on_hold','completed','cancelled') DEFAULT 'pending',
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	`scheduledStartAt` timestamp,
	`actualStartAt` timestamp,
	`completedAt` timestamp,
	`reportedBy` int,
	`assignedTo` int,
	`completedBy` int,
	`laborHours` decimal(6,2),
	`laborCost` decimal(12,2),
	`partsCost` decimal(12,2),
	`totalCost` decimal(12,2),
	`rootCause` text,
	`actionTaken` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
