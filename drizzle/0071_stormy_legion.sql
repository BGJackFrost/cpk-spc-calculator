CREATE TABLE `kpi_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`production_line_id` int NOT NULL,
	`cpk_warning` decimal(5,3) NOT NULL DEFAULT '1.33',
	`cpk_critical` decimal(5,3) NOT NULL DEFAULT '1.00',
	`oee_warning` decimal(5,2) NOT NULL DEFAULT '75.00',
	`oee_critical` decimal(5,2) NOT NULL DEFAULT '60.00',
	`defect_rate_warning` decimal(5,2) NOT NULL DEFAULT '2.00',
	`defect_rate_critical` decimal(5,2) NOT NULL DEFAULT '5.00',
	`weekly_decline_threshold` decimal(5,2) NOT NULL DEFAULT '-5.00',
	`email_alert_enabled` int NOT NULL DEFAULT 1,
	`alert_emails` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_report_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduled_report_id` int NOT NULL,
	`report_name` varchar(255) NOT NULL,
	`report_type` varchar(50) NOT NULL,
	`frequency` varchar(20) NOT NULL,
	`recipients` text NOT NULL,
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`report_data` text,
	`file_url` varchar(500),
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kpi_report_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_kpi_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`day_of_week` int,
	`day_of_month` int,
	`time_of_day` varchar(5) NOT NULL DEFAULT '08:00',
	`production_line_ids` text,
	`report_type` enum('shift_summary','kpi_comparison','trend_analysis','full_report') NOT NULL DEFAULT 'shift_summary',
	`include_charts` int NOT NULL DEFAULT 1,
	`include_details` int NOT NULL DEFAULT 1,
	`recipients` text NOT NULL,
	`cc_recipients` text,
	`is_enabled` int NOT NULL DEFAULT 1,
	`last_sent_at` timestamp,
	`last_status` enum('success','failed','pending'),
	`last_error` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_kpi_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_kpi_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`production_line_id` int NOT NULL,
	`week_number` int NOT NULL,
	`year` int NOT NULL,
	`week_start_date` timestamp NOT NULL,
	`week_end_date` timestamp NOT NULL,
	`avg_cpk` decimal(6,4),
	`min_cpk` decimal(6,4),
	`max_cpk` decimal(6,4),
	`avg_oee` decimal(5,2),
	`min_oee` decimal(5,2),
	`max_oee` decimal(5,2),
	`avg_defect_rate` decimal(5,2),
	`total_samples` int NOT NULL DEFAULT 0,
	`total_defects` int NOT NULL DEFAULT 0,
	`shift_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_kpi_snapshots_id` PRIMARY KEY(`id`)
);
