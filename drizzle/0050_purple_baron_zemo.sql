ALTER TABLE `licenses` ADD `price` decimal(15,2);--> statement-breakpoint
ALTER TABLE `licenses` ADD `currency` varchar(3) DEFAULT 'VND';