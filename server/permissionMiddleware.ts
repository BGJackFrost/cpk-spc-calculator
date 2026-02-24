/**
 * Permission Middleware for tRPC
 * Provides permission checking functions with caching
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { rolePermissions, permissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Permission cache with 5-minute TTL
interface CacheEntry {
  permissions: string[];
  timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Permission constants for easy reference
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_CUSTOMIZE: "dashboard.customize",
  
  // Analysis
  ANALYSIS_VIEW: "analysis.view",
  ANALYSIS_EXECUTE: "analysis.execute",
  ANALYSIS_EXPORT: "analysis.export",
  
  // Products
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  
  // Specifications
  SPECIFICATIONS_VIEW: "specifications.view",
  SPECIFICATIONS_CREATE: "specifications.create",
  SPECIFICATIONS_EDIT: "specifications.edit",
  SPECIFICATIONS_DELETE: "specifications.delete",
  
  // Production Lines
  PRODUCTION_LINES_VIEW: "productionLines.view",
  PRODUCTION_LINES_CREATE: "productionLines.create",
  PRODUCTION_LINES_EDIT: "productionLines.edit",
  PRODUCTION_LINES_DELETE: "productionLines.delete",
  
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  
  // Roles & Permissions
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  
  // License
  LICENSE_VIEW: "license.view",
  LICENSE_MANAGE: "license.manage",
  
  // System
  SYSTEM_SETTINGS: "system.settings",
  SYSTEM_BACKUP: "system.backup",
  SYSTEM_AUDIT: "system.audit",
  
  // Database
  DATABASE_VIEW: "database.view",
  DATABASE_MANAGE: "database.manage",
  
  // Webhooks
  WEBHOOKS_VIEW: "webhooks.view",
  WEBHOOKS_MANAGE: "webhooks.manage",
  
  // Email
  EMAIL_VIEW: "email.view",
  EMAIL_MANAGE: "email.manage",
  
  // SPC Plans
  SPC_PLANS_VIEW: "spcPlans.view",
  SPC_PLANS_CREATE: "spcPlans.create",
  SPC_PLANS_EDIT: "spcPlans.edit",
  SPC_PLANS_DELETE: "spcPlans.delete",
  
  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
} as const;

/**
 * Get user permissions from database with caching
 */
async function getUserPermissions(userId: number, role: string): Promise<string[]> {
  const cacheKey = `${userId}-${role}`;
  const cached = permissionCache.get(cacheKey);
  
  // Return cached if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  // Admin has all permissions
  if (role === "admin") {
    const allPermissions = Object.values(PERMISSIONS);
    permissionCache.set(cacheKey, {
      permissions: allPermissions,
      timestamp: Date.now(),
    });
    return allPermissions;
  }
  
  // Fetch from database
  const db = await getDb();
  if (!db) {
    return [];
  }
  
  try {
    const results = await db
      .select({ code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.role, role as "admin" | "user" | "operator" | "viewer"));
    
    const userPermissions = results.map((r: { code: string }) => r.code);
    
    // Cache the results
    permissionCache.set(cacheKey, {
      permissions: userPermissions,
      timestamp: Date.now(),
    });
    
    return userPermissions;
  } catch (error) {
    console.error("[Permission] Error fetching permissions:", error);
    return [];
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: number,
  role: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, role);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: number,
  role: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, role);
  return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: number,
  role: string,
  requiredPermissions: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, role);
  return requiredPermissions.every((p) => permissions.includes(p));
}

/**
 * Require a specific permission - throws FORBIDDEN if not authorized
 */
export async function requirePermission(
  userId: number,
  role: string,
  permission: string
): Promise<void> {
  const allowed = await hasPermission(userId, role, permission);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${permission}`,
    });
  }
}

/**
 * Require any of the specified permissions - throws FORBIDDEN if none authorized
 */
export async function requireAnyPermission(
  userId: number,
  role: string,
  requiredPermissions: string[]
): Promise<void> {
  const allowed = await hasAnyPermission(userId, role, requiredPermissions);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: requires one of [${requiredPermissions.join(", ")}]`,
    });
  }
}

/**
 * Clear permission cache for a specific user or all users
 */
export function clearPermissionCache(userId?: number): void {
  if (userId) {
    // Clear cache entries for specific user
    const keys = Array.from(permissionCache.keys());
    for (const key of keys) {
      if (key.startsWith(`${userId}-`)) {
        permissionCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    permissionCache.clear();
  }
}
