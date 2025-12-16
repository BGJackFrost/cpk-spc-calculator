import { getDb } from "../db";
import { rateLimitConfig, rateLimitConfigHistory, rateLimitRoleConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Cache for config values
let configCache: Map<string, string> = new Map();
let roleConfigCache: Map<string, any> = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

// Load config from database
export async function loadConfig(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    const configs = await db.select().from(rateLimitConfig);
    configCache.clear();
    for (const config of configs) {
      configCache.set(config.configKey, config.configValue);
    }
    
    const roleConfigs = await db.select().from(rateLimitRoleConfig);
    roleConfigCache.clear();
    for (const rc of roleConfigs) {
      roleConfigCache.set(rc.role, rc);
    }
    
    lastCacheUpdate = Date.now();
    console.log("[RateLimitConfig] Loaded config from database");
  } catch (error) {
    console.error("[RateLimitConfig] Failed to load config:", error);
  }
}

// Get config value
export async function getConfigValue(key: string, defaultValue: string = ""): Promise<string> {
  // Check cache freshness
  if (Date.now() - lastCacheUpdate > CACHE_TTL) {
    await loadConfig();
  }
  
  return configCache.get(key) || defaultValue;
}

// Get boolean config
export async function getBooleanConfig(key: string, defaultValue: boolean = false): Promise<boolean> {
  const value = await getConfigValue(key, String(defaultValue));
  return value === "true" || value === "1";
}

// Get number config
export async function getNumberConfig(key: string, defaultValue: number = 0): Promise<number> {
  const value = await getConfigValue(key, String(defaultValue));
  return parseInt(value, 10) || defaultValue;
}

// Set config value with history
export async function setConfigValue(
  key: string, 
  value: string, 
  userId: number, 
  userName: string,
  reason?: string,
  ipAddress?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Get old value
    const oldConfig = await db.select().from(rateLimitConfig).where(eq(rateLimitConfig.configKey, key));
    const oldValue = oldConfig[0]?.configValue || null;
    
    // Update or insert config
    if (oldConfig.length > 0) {
      await db.update(rateLimitConfig)
        .set({ configValue: value, updatedBy: userId })
        .where(eq(rateLimitConfig.configKey, key));
    } else {
      await db.insert(rateLimitConfig).values({
        configKey: key,
        configValue: value,
        updatedBy: userId,
      });
    }
    
    // Log history
    await db.insert(rateLimitConfigHistory).values({
      configKey: key,
      oldValue,
      newValue: value,
      changedBy: userId,
      changedByName: userName,
      changeReason: reason,
      ipAddress,
    });
    
    // Update cache
    configCache.set(key, value);
    
    console.log(`[RateLimitConfig] Config "${key}" changed from "${oldValue}" to "${value}" by ${userName}`);
    return true;
  } catch (error) {
    console.error("[RateLimitConfig] Failed to set config:", error);
    return false;
  }
}

// Get all configs
export async function getAllConfigs(): Promise<Array<{key: string, value: string, description: string | null}>> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const configs = await db.select().from(rateLimitConfig);
    return configs.map(c => ({
      key: c.configKey,
      value: c.configValue,
      description: c.description,
    }));
  } catch (error) {
    console.error("[RateLimitConfig] Failed to get all configs:", error);
    return [];
  }
}

// Get config history
export async function getConfigHistory(limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const history = await db.select()
      .from(rateLimitConfigHistory)
      .orderBy(rateLimitConfigHistory.createdAt)
      .limit(limit);
    return history.reverse();
  } catch (error) {
    console.error("[RateLimitConfig] Failed to get config history:", error);
    return [];
  }
}

// Get role config
export async function getRoleConfig(role: string): Promise<any | null> {
  // Check cache freshness
  if (Date.now() - lastCacheUpdate > CACHE_TTL) {
    await loadConfig();
  }
  
  return roleConfigCache.get(role) || null;
}

// Get all role configs
export async function getAllRoleConfigs(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db.select().from(rateLimitRoleConfig);
  } catch (error) {
    console.error("[RateLimitConfig] Failed to get role configs:", error);
    return [];
  }
}

// Update role config
export async function updateRoleConfig(
  role: string,
  config: {
    maxRequests?: number;
    maxAuthRequests?: number;
    maxExportRequests?: number;
    windowMs?: number;
    description?: string;
  },
  userId: number,
  userName: string,
  ipAddress?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Get old config
    const oldConfig = await db.select().from(rateLimitRoleConfig).where(eq(rateLimitRoleConfig.role, role as any));
    
    if (oldConfig.length === 0) {
      return false;
    }
    
    // Update config
    await db.update(rateLimitRoleConfig)
      .set({
        ...config,
        updatedBy: userId,
      })
      .where(eq(rateLimitRoleConfig.role, role as any));
    
    // Log history
    await db.insert(rateLimitConfigHistory).values({
      configKey: `role_${role}`,
      oldValue: JSON.stringify(oldConfig[0]),
      newValue: JSON.stringify({ ...oldConfig[0], ...config }),
      changedBy: userId,
      changedByName: userName,
      changeReason: `Updated role config for ${role}`,
      ipAddress,
    });
    
    // Invalidate cache
    lastCacheUpdate = 0;
    
    console.log(`[RateLimitConfig] Role config "${role}" updated by ${userName}`);
    return true;
  } catch (error) {
    console.error("[RateLimitConfig] Failed to update role config:", error);
    return false;
  }
}

// Initialize - load config on startup
loadConfig().catch(console.error);
