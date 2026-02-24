/**
 * License Server Database Module
 * Manages a separate database connection for License Server functionality
 * This database is independent from the main SPC/CPK Calculator database
 */

import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  mysqlTable, 
  int, 
  varchar, 
  text, 
  timestamp, 
  mysqlEnum,
  bigint,
  decimal
} from "drizzle-orm/mysql-core";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// License Server Schema - stored in separate database
export const licenseServerLicenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  licenseKey: varchar("license_key", { length: 64 }).notNull().unique(),
  licenseType: mysqlEnum("license_type", ["trial", "standard", "professional", "enterprise"]).notNull().default("trial"),
  companyName: varchar("company_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  maxUsers: int("max_users").default(1),
  maxDevices: int("max_devices").default(1),
  features: text("features"), // JSON string of enabled features
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: int("is_active").notNull().default(1),
  isRevoked: int("is_revoked").notNull().default(0),
  revokeReason: text("revoke_reason"),
  notes: text("notes"),
  price: decimal("price", { precision: 15, scale: 2 }), // Giá tiền license
  currency: varchar("currency", { length: 3 }).default("VND"), // Mã tiền tệ
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const licenseServerCustomers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  notes: text("notes"),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const licenseServerActivations = mysqlTable("activations", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  deviceInfo: text("device_info"), // JSON with OS, hostname, etc.
  ipAddress: varchar("ip_address", { length: 45 }),
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  isActive: int("is_active").notNull().default(1),
  deactivatedAt: timestamp("deactivated_at"),
  deactivateReason: text("deactivate_reason"),
});

export const licenseServerHeartbeats = mysqlTable("heartbeats", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id").notNull(),
  activationId: int("activation_id").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: mysqlEnum("status", ["online", "offline", "warning"]).default("online"),
  metadata: text("metadata"), // JSON with additional info
});

export const licenseServerAuditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("license_id"),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  performedBy: varchar("performed_by", { length: 255 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Connection management
let licenseDbConnection: mysql.Pool | null = null;
let licenseDb: MySql2Database | null = null;

interface LicenseDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Initialize License Server database connection
 */
export async function initLicenseServerDb(config: LicenseDbConfig): Promise<boolean> {
  try {
    // Close existing connection if any
    if (licenseDbConnection) {
      await licenseDbConnection.end();
    }

    // Create new connection pool
    licenseDbConnection = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    const connection = await licenseDbConnection.getConnection();
    await connection.ping();
    connection.release();

    // Initialize drizzle
    licenseDb = drizzle(licenseDbConnection);

    console.log("[LicenseServerDb] Connected successfully to License Server database");
    return true;
  } catch (error) {
    console.error("[LicenseServerDb] Connection failed:", error);
    licenseDbConnection = null;
    licenseDb = null;
    return false;
  }
}

/**
 * Get License Server database instance
 */
export function getLicenseDb(): MySql2Database | null {
  return licenseDb;
}

/**
 * Check if License Server database is connected
 */
export function isLicenseDbConnected(): boolean {
  return licenseDb !== null;
}

/**
 * Close License Server database connection
 */
export async function closeLicenseServerDb(): Promise<void> {
  if (licenseDbConnection) {
    await licenseDbConnection.end();
    licenseDbConnection = null;
    licenseDb = null;
    console.log("[LicenseServerDb] Connection closed");
  }
}

/**
 * Initialize License Server database schema
 */
export async function initLicenseServerSchema(): Promise<boolean> {
  if (!licenseDbConnection) {
    console.error("[LicenseServerDb] Cannot init schema - not connected");
    return false;
  }

  try {
    const connection = await licenseDbConnection.getConnection();

    // Create tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(64) NOT NULL UNIQUE,
        license_type ENUM('trial', 'standard', 'professional', 'enterprise') NOT NULL DEFAULT 'trial',
        company_name VARCHAR(255),
        contact_email VARCHAR(320),
        contact_phone VARCHAR(50),
        max_users INT DEFAULT 1,
        max_devices INT DEFAULT 1,
        features TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NULL,
        is_active INT NOT NULL DEFAULT 1,
        is_revoked INT NOT NULL DEFAULT 0,
        revoke_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_license_key (license_key),
        INDEX idx_company_name (company_name),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        contact_email VARCHAR(320),
        contact_phone VARCHAR(50),
        address TEXT,
        industry VARCHAR(100),
        notes TEXT,
        is_active INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_company_name (company_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        device_info TEXT,
        ip_address VARCHAR(45),
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_active INT NOT NULL DEFAULT 1,
        deactivated_at TIMESTAMP NULL,
        deactivate_reason TEXT,
        INDEX idx_license_id (license_id),
        INDEX idx_device_id (device_id),
        INDEX idx_is_active (is_active),
        UNIQUE KEY unique_license_device (license_id, device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS heartbeats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        activation_id INT NOT NULL,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status ENUM('online', 'offline', 'warning') DEFAULT 'online',
        metadata TEXT,
        INDEX idx_license_id (license_id),
        INDEX idx_activation_id (activation_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_license_id (license_id),
        INDEX idx_action (action),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    console.log("[LicenseServerDb] Schema initialized successfully");
    return true;
  } catch (error) {
    console.error("[LicenseServerDb] Schema initialization failed:", error);
    return false;
  }
}

// ============ License Server API Functions ============

/**
 * Validate a license key
 */
export async function validateLicense(licenseKey: string, deviceId: string): Promise<{
  valid: boolean;
  license?: any;
  error?: string;
}> {
  const db = getLicenseDb();
  if (!db) {
    return { valid: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { valid: false, error: "License key not found" };
    }

    if (license.isRevoked === 1) {
      return { valid: false, error: "License has been revoked", license };
    }

    if (license.isActive !== 1) {
      return { valid: false, error: "License is not active", license };
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return { valid: false, error: "License has expired", license };
    }

    // Check device activation count
    const activations = await db
      .select()
      .from(licenseServerActivations)
      .where(and(
        eq(licenseServerActivations.licenseId, license.id),
        eq(licenseServerActivations.isActive, 1)
      ));

    const currentDeviceActivation = activations.find(a => a.deviceId === deviceId);
    
    if (!currentDeviceActivation && activations.length >= (license.maxDevices || 1)) {
      return { 
        valid: false, 
        error: `Maximum devices (${license.maxDevices}) reached`,
        license 
      };
    }

    return { valid: true, license };
  } catch (error) {
    console.error("[LicenseServerDb] Validate error:", error);
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * Activate a license on a device
 */
export async function activateLicense(
  licenseKey: string, 
  deviceId: string, 
  deviceName?: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{
  success: boolean;
  activationId?: number;
  license?: any;
  error?: string;
}> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    // Validate first
    const validation = await validateLicense(licenseKey, deviceId);
    if (!validation.valid) {
      return { success: false, error: validation.error, license: validation.license };
    }

    const license = validation.license;

    // Check if already activated on this device
    const [existingActivation] = await db
      .select()
      .from(licenseServerActivations)
      .where(and(
        eq(licenseServerActivations.licenseId, license.id),
        eq(licenseServerActivations.deviceId, deviceId)
      ));

    if (existingActivation) {
      // Reactivate if deactivated
      if (existingActivation.isActive !== 1) {
        await db
          .update(licenseServerActivations)
          .set({ 
            isActive: 1, 
            lastSeenAt: new Date(),
            deactivatedAt: null,
            deactivateReason: null
          })
          .where(eq(licenseServerActivations.id, existingActivation.id));
      } else {
        // Update last seen
        await db
          .update(licenseServerActivations)
          .set({ lastSeenAt: new Date() })
          .where(eq(licenseServerActivations.id, existingActivation.id));
      }

      // Log activation
      await db.insert(licenseServerAuditLogs).values({
        licenseId: license.id,
        action: "reactivate",
        details: JSON.stringify({ deviceId, deviceName }),
        ipAddress
      });

      return { success: true, activationId: existingActivation.id, license };
    }

    // Create new activation
    const [result] = await db.insert(licenseServerActivations).values({
      licenseId: license.id,
      deviceId,
      deviceName,
      deviceInfo,
      ipAddress
    });

    // Log activation
    await db.insert(licenseServerAuditLogs).values({
      licenseId: license.id,
      action: "activate",
      details: JSON.stringify({ deviceId, deviceName }),
      ipAddress
    });

    return { success: true, activationId: result.insertId, license };
  } catch (error) {
    console.error("[LicenseServerDb] Activate error:", error);
    return { success: false, error: "Activation failed" };
  }
}

/**
 * Record heartbeat from client
 */
export async function recordHeartbeat(
  licenseKey: string,
  deviceId: string,
  ipAddress?: string,
  metadata?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    // Find license and activation
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { success: false, error: "License not found" };
    }

    const [activation] = await db
      .select()
      .from(licenseServerActivations)
      .where(and(
        eq(licenseServerActivations.licenseId, license.id),
        eq(licenseServerActivations.deviceId, deviceId),
        eq(licenseServerActivations.isActive, 1)
      ));

    if (!activation) {
      return { success: false, error: "Activation not found" };
    }

    // Record heartbeat
    await db.insert(licenseServerHeartbeats).values({
      licenseId: license.id,
      activationId: activation.id,
      ipAddress,
      metadata
    });

    // Update last seen
    await db
      .update(licenseServerActivations)
      .set({ lastSeenAt: new Date() })
      .where(eq(licenseServerActivations.id, activation.id));

    return { success: true };
  } catch (error) {
    console.error("[LicenseServerDb] Heartbeat error:", error);
    return { success: false, error: "Heartbeat failed" };
  }
}

/**
 * Deactivate a license on a device
 */
export async function deactivateLicense(
  licenseKey: string,
  deviceId: string,
  reason?: string,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { success: false, error: "License not found" };
    }

    await db
      .update(licenseServerActivations)
      .set({ 
        isActive: 0, 
        deactivatedAt: new Date(),
        deactivateReason: reason
      })
      .where(and(
        eq(licenseServerActivations.licenseId, license.id),
        eq(licenseServerActivations.deviceId, deviceId)
      ));

    // Log deactivation
    await db.insert(licenseServerAuditLogs).values({
      licenseId: license.id,
      action: "deactivate",
      details: JSON.stringify({ deviceId, reason }),
      ipAddress
    });

    return { success: true };
  } catch (error) {
    console.error("[LicenseServerDb] Deactivate error:", error);
    return { success: false, error: "Deactivation failed" };
  }
}

/**
 * Get license status
 */
export async function getLicenseStatus(licenseKey: string): Promise<{
  found: boolean;
  license?: any;
  activations?: any[];
  error?: string;
}> {
  const db = getLicenseDb();
  if (!db) {
    return { found: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { found: false, error: "License not found" };
    }

    const activations = await db
      .select()
      .from(licenseServerActivations)
      .where(eq(licenseServerActivations.licenseId, license.id));

    return { found: true, license, activations };
  } catch (error) {
    console.error("[LicenseServerDb] Get status error:", error);
    return { found: false, error: "Failed to get status" };
  }
}

/**
 * Create a new license
 */
export async function createLicenseInServer(data: {
  licenseKey: string;
  licenseType: "trial" | "standard" | "professional" | "enterprise";
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxUsers?: number;
  maxDevices?: number;
  features?: string;
  expiresAt?: Date;
  notes?: string;
  price?: number;
  currency?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    const insertData = {
      ...data,
      price: data.price !== undefined ? String(data.price) : undefined,
    };
    const [result] = await db.insert(licenseServerLicenses).values(insertData);
    
    // Log creation
    await db.insert(licenseServerAuditLogs).values({
      licenseId: result.insertId,
      action: "create",
      details: JSON.stringify({ licenseKey: data.licenseKey, type: data.licenseType })
    });

    return { success: true, id: result.insertId };
  } catch (error: any) {
    console.error("[LicenseServerDb] Create license error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return { success: false, error: "License key already exists" };
    }
    return { success: false, error: "Failed to create license" };
  }
}

/**
 * List all licenses in server
 */
export async function listLicensesInServer(): Promise<any[]> {
  const db = getLicenseDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(licenseServerLicenses)
      .orderBy(desc(licenseServerLicenses.createdAt));
  } catch (error) {
    console.error("[LicenseServerDb] List licenses error:", error);
    return [];
  }
}

/**
 * List all customers in server
 */
export async function listCustomersInServer(): Promise<any[]> {
  const db = getLicenseDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(licenseServerCustomers)
      .orderBy(licenseServerCustomers.companyName);
  } catch (error) {
    console.error("[LicenseServerDb] List customers error:", error);
    return [];
  }
}

/**
 * Get server statistics
 */
export async function getLicenseServerStats(): Promise<{
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalActivations: number;
  activeActivations: number;
  totalCustomers: number;
}> {
  const db = getLicenseDb();
  if (!db) {
    return {
      totalLicenses: 0,
      activeLicenses: 0,
      expiredLicenses: 0,
      totalActivations: 0,
      activeActivations: 0,
      totalCustomers: 0
    };
  }

  try {
    const licenses = await db.select().from(licenseServerLicenses);
    const activations = await db.select().from(licenseServerActivations);
    const customers = await db.select().from(licenseServerCustomers);

    const now = new Date();
    const activeLicenses = licenses.filter(l => 
      l.isActive === 1 && 
      l.isRevoked !== 1 && 
      (!l.expiresAt || new Date(l.expiresAt) > now)
    );
    const expiredLicenses = licenses.filter(l => 
      l.expiresAt && new Date(l.expiresAt) <= now
    );
    const activeActivations = activations.filter(a => a.isActive === 1);

    return {
      totalLicenses: licenses.length,
      activeLicenses: activeLicenses.length,
      expiredLicenses: expiredLicenses.length,
      totalActivations: activations.length,
      activeActivations: activeActivations.length,
      totalCustomers: customers.length
    };
  } catch (error) {
    console.error("[LicenseServerDb] Get stats error:", error);
    return {
      totalLicenses: 0,
      activeLicenses: 0,
      expiredLicenses: 0,
      totalActivations: 0,
      activeActivations: 0,
      totalCustomers: 0
    };
  }
}


/**
 * Revoke a license
 */
export async function revokeLicense(
  licenseKey: string,
  reason?: string,
  revokedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { success: false, error: "License not found" };
    }

    if (license.isRevoked === 1) {
      return { success: false, error: "License is already revoked" };
    }

    // Revoke the license
    await db
      .update(licenseServerLicenses)
      .set({ 
        isRevoked: 1, 
        isActive: 0,
        revokeReason: reason || "Revoked by administrator"
      })
      .where(eq(licenseServerLicenses.id, license.id));

    // Deactivate all activations
    await db
      .update(licenseServerActivations)
      .set({ 
        isActive: 0, 
        deactivatedAt: new Date(),
        deactivateReason: "License revoked"
      })
      .where(eq(licenseServerActivations.licenseId, license.id));

    // Log the revocation
    await db.insert(licenseServerAuditLogs).values({
      licenseId: license.id,
      action: "revoke",
      details: JSON.stringify({ reason, revokedBy }),
      performedBy: revokedBy
    });

    return { success: true };
  } catch (error) {
    console.error("[LicenseServerDb] Revoke error:", error);
    return { success: false, error: "Revocation failed" };
  }
}

/**
 * Check if a license is revoked
 */
export async function checkLicenseRevoked(licenseKey: string): Promise<{
  revoked: boolean;
  reason?: string;
  revokedAt?: Date;
  error?: string;
}> {
  const db = getLicenseDb();
  if (!db) {
    return { revoked: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { revoked: false, error: "License not found" };
    }

    return {
      revoked: license.isRevoked === 1,
      reason: license.revokeReason || undefined,
      revokedAt: license.isRevoked === 1 ? license.updatedAt : undefined
    };
  } catch (error) {
    console.error("[LicenseServerDb] Check revoked error:", error);
    return { revoked: false, error: "Check failed" };
  }
}

/**
 * Restore a revoked license
 */
export async function restoreLicense(
  licenseKey: string,
  restoredBy?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getLicenseDb();
  if (!db) {
    return { success: false, error: "License Server not connected" };
  }

  try {
    const [license] = await db
      .select()
      .from(licenseServerLicenses)
      .where(eq(licenseServerLicenses.licenseKey, licenseKey));

    if (!license) {
      return { success: false, error: "License not found" };
    }

    if (license.isRevoked !== 1) {
      return { success: false, error: "License is not revoked" };
    }

    // Restore the license
    await db
      .update(licenseServerLicenses)
      .set({ 
        isRevoked: 0, 
        isActive: 1,
        revokeReason: null
      })
      .where(eq(licenseServerLicenses.id, license.id));

    // Log the restoration
    await db.insert(licenseServerAuditLogs).values({
      licenseId: license.id,
      action: "restore",
      details: JSON.stringify({ restoredBy }),
      performedBy: restoredBy
    });

    return { success: true };
  } catch (error) {
    console.error("[LicenseServerDb] Restore error:", error);
    return { success: false, error: "Restoration failed" };
  }
}
