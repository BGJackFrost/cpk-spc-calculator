import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { systemModules, modulePermissions, roleModulePermissions, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Cache for permissions to avoid repeated DB queries
const permissionCache = new Map<string, { permissions: Set<string>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type ActionType = "view" | "create" | "edit" | "delete" | "export" | "import" | "approve" | "manage";

interface PermissionCheckResult {
  hasPermission: boolean;
  reason?: string;
}

/**
 * Get user's permissions from database with caching
 */
export async function getUserPermissions(userId: string, roleId?: number): Promise<Set<string>> {
  const cacheKey = `${userId}-${roleId || "default"}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  const db = await getDb();
  if (!db) return new Set();
  
  // Get user's role if not provided
  let userRoleId = roleId;
  if (!userRoleId) {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.openId, userId));
    // For now, we'll use role name to find roleId
    // This should be improved when role table is properly linked
    userRoleId = user?.role === "admin" ? 1 : 2; // Assuming 1=admin, 2=user
  }
  
  // Get all permissions for this role
  // First get role permission IDs
  const rolePerms = await db.select({
    permissionId: roleModulePermissions.permissionId,
  }).from(roleModulePermissions).where(eq(roleModulePermissions.roleId, userRoleId));
  
  const permissionIds = rolePerms.map(rp => rp.permissionId);
  if (permissionIds.length === 0) {
    permissionCache.set(cacheKey, { permissions: new Set(), timestamp: Date.now() });
    return new Set();
  }
  
  // Get module permissions
  const perms = await db.select({
    moduleId: modulePermissions.moduleId,
    actionType: modulePermissions.actionType,
  }).from(modulePermissions);
  
  // Get modules
  const modules = await db.select({
    id: systemModules.id,
    code: systemModules.code,
  }).from(systemModules);
  
  const moduleMap = new Map(modules.map(m => [m.id, m.code]));
  
  // Build permissions
  const rolePermissions = perms
    .filter(p => permissionIds.includes(p.moduleId))
    .map(p => ({
      moduleCode: moduleMap.get(p.moduleId) || '',
      actionType: p.actionType,
    }));
  
  const permissions = new Set<string>();
  for (const perm of rolePermissions) {
    permissions.add(`${perm.moduleCode}:${perm.actionType}`);
  }
  
  // Cache the result
  permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });
  
  return permissions;
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  userId: string,
  moduleCode: string,
  action: ActionType,
  isAdmin: boolean = false
): Promise<PermissionCheckResult> {
  // Admin always has permission
  if (isAdmin) {
    return { hasPermission: true };
  }
  
  const permissions = await getUserPermissions(userId);
  const permissionKey = `${moduleCode}:${action}`;
  
  // Check direct permission
  if (permissions.has(permissionKey)) {
    return { hasPermission: true };
  }
  
  // Check manage permission (manage includes all actions)
  if (permissions.has(`${moduleCode}:manage`)) {
    return { hasPermission: true };
  }
  
  return {
    hasPermission: false,
    reason: `Không có quyền ${action} cho module ${moduleCode}`,
  };
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId?: string) {
  if (userId) {
    // Clear specific user's cache
    const keysToDelete: string[] = [];
    permissionCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => permissionCache.delete(key));
  } else {
    // Clear all cache
    permissionCache.clear();
  }
}

/**
 * Create a tRPC middleware that checks permission
 */
export function createPermissionMiddleware(moduleCode: string, action: ActionType) {
  return async ({ ctx, next }: { ctx: { user: { id: string; role: string } }; next: () => Promise<any> }) => {
    const isAdmin = ctx.user.role === "admin";
    const result = await checkPermission(ctx.user.id, moduleCode, action, isAdmin);
    
    if (!result.hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: result.reason || "Bạn không có quyền thực hiện thao tác này",
      });
    }
    
    return next();
  };
}

/**
 * Module codes for the system
 */
export const MODULE_CODES = {
  // MMS
  MACHINES: "machines",
  MAINTENANCE: "maintenance",
  SPARE_PARTS: "spare_parts",
  WORK_ORDERS: "work_orders",
  
  // SPC
  SPC_ANALYSIS: "spc_analysis",
  SPC_PLANS: "spc_plans",
  PRODUCTS: "products",
  SPECIFICATIONS: "specifications",
  
  // System
  USERS: "users",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  ORGANIZATION: "organization",
  APPROVAL: "approval",
  
  // Common
  REPORTS: "reports",
  DASHBOARD: "dashboard",
  SETTINGS: "settings",
} as const;
