import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function createTables() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available");
      process.exit(1);
    }
    // Create ntf_alert_config table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ntf_alert_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        warningThreshold DECIMAL(5,2) DEFAULT 20.00,
        criticalThreshold DECIMAL(5,2) DEFAULT 30.00,
        alertEmails TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        checkIntervalMinutes INT DEFAULT 60,
        cooldownMinutes INT DEFAULT 120,
        lastAlertAt TIMESTAMP NULL,
        lastAlertNtfRate DECIMAL(5,2),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created ntf_alert_config table");

    // Create ntf_alert_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ntf_alert_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ntfRate DECIMAL(5,2) NOT NULL,
        totalDefects INT NOT NULL,
        ntfCount INT NOT NULL,
        realNgCount INT NOT NULL,
        pendingCount INT NOT NULL,
        alertType ENUM('warning', 'critical') NOT NULL,
        emailSent BOOLEAN DEFAULT FALSE,
        emailSentAt TIMESTAMP NULL,
        emailRecipients TEXT,
        periodStart TIMESTAMP NOT NULL,
        periodEnd TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created ntf_alert_history table");

    // Create ntf_report_schedule table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ntf_report_schedule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        reportType ENUM('daily', 'weekly', 'monthly') NOT NULL,
        sendHour INT DEFAULT 8,
        sendDay INT,
        recipients TEXT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        lastSentAt TIMESTAMP NULL,
        lastSentStatus ENUM('success', 'failed'),
        lastSentError TEXT,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created ntf_report_schedule table");

    // Insert default config if not exists
    const existing = await db.execute(sql`SELECT id FROM ntf_alert_config LIMIT 1`);
    if (existing[0].length === 0) {
      await db.execute(sql`
        INSERT INTO ntf_alert_config (warningThreshold, criticalThreshold, enabled)
        VALUES (20.00, 30.00, TRUE)
      `);
      console.log("Inserted default NTF alert config");
    }

    console.log("All NTF tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTables();
