ALTER TABLE `licenses` ADD `licenseStatus` enum('pending','active','expired','revoked') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `licenses` ADD `hardwareFingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `licenses` ADD `offlineLicenseFile` text;--> statement-breakpoint
ALTER TABLE `licenses` ADD `activationMode` enum('online','offline','hybrid') DEFAULT 'online';--> statement-breakpoint
ALTER TABLE `licenses` ADD `lastValidatedAt` timestamp;