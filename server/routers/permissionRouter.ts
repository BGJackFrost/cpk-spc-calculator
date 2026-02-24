import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { systemModules, modulePermissions, roleModulePermissions, roleTemplates } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// Default modules to initialize
const DEFAULT_MODULES = [
  // MMS - Maintenance Management System
  { code: "mms_dashboard", name: "Dashboard MMS", systemType: "mms", icon: "LayoutDashboard", path: "/mms-dashboard", sortOrder: 1 },
  { code: "mms_machines", name: "Quản lý Máy móc", systemType: "mms", icon: "Settings", path: "/machines", sortOrder: 2 },
  { code: "mms_machine_types", name: "Loại Máy", systemType: "mms", icon: "Layers", path: "/machine-types", sortOrder: 3 },
  { code: "mms_fixtures", name: "Fixture", systemType: "mms", icon: "Tool", path: "/fixtures", sortOrder: 4 },
  { code: "mms_maintenance", name: "Bảo trì", systemType: "mms", icon: "Wrench", path: "/maintenance", sortOrder: 5 },
  { code: "mms_maintenance_schedule", name: "Lịch Bảo trì", systemType: "mms", icon: "Calendar", path: "/maintenance-schedule", sortOrder: 6 },
  { code: "mms_spare_parts", name: "Phụ tùng", systemType: "mms", icon: "Package", path: "/spare-parts", sortOrder: 7 },
  { code: "mms_suppliers", name: "Nhà cung cấp", systemType: "mms", icon: "Truck", path: "/suppliers", sortOrder: 8 },
  { code: "mms_work_orders", name: "Lệnh công việc", systemType: "mms", icon: "ClipboardList", path: "/work-orders", sortOrder: 9 },
  
  // SPC - Statistical Process Control
  { code: "spc_dashboard", name: "Dashboard SPC", systemType: "spc", icon: "BarChart3", path: "/", sortOrder: 1 },
  { code: "spc_analyze", name: "Phân tích SPC/CPK", systemType: "spc", icon: "LineChart", path: "/analyze", sortOrder: 2 },
  { code: "spc_realtime", name: "Realtime Dashboard", systemType: "spc", icon: "Activity", path: "/realtime", sortOrder: 3 },
  { code: "spc_history", name: "Lịch sử Phân tích", systemType: "spc", icon: "History", path: "/history", sortOrder: 4 },
  { code: "spc_plans", name: "Kế hoạch SPC", systemType: "spc", icon: "CalendarCheck", path: "/spc-plans", sortOrder: 5 },
  { code: "spc_reports", name: "Báo cáo SPC", systemType: "spc", icon: "FileText", path: "/spc-report", sortOrder: 6 },
  { code: "spc_products", name: "Sản phẩm", systemType: "spc", icon: "Box", path: "/products", sortOrder: 7 },
  { code: "spc_production_lines", name: "Dây chuyền", systemType: "spc", icon: "Factory", path: "/production-lines", sortOrder: 8 },
  { code: "spc_workstations", name: "Công trạm", systemType: "spc", icon: "Monitor", path: "/workstations", sortOrder: 9 },
  { code: "spc_defects", name: "Quản lý Lỗi", systemType: "spc", icon: "AlertTriangle", path: "/defects", sortOrder: 10 },
  
  // System - Quản trị hệ thống
  { code: "sys_users", name: "Quản lý Người dùng", systemType: "system", icon: "Users", path: "/users", sortOrder: 1 },
  { code: "sys_roles", name: "Vai trò & Quyền", systemType: "system", icon: "Shield", path: "/permissions", sortOrder: 2 },
  { code: "sys_organization", name: "Cấu trúc Tổ chức", systemType: "system", icon: "Building2", path: "/organization", sortOrder: 3 },
  { code: "sys_approval", name: "Quy trình Phê duyệt", systemType: "system", icon: "GitBranch", path: "/approval-workflow", sortOrder: 4 },
  { code: "sys_settings", name: "Cài đặt Hệ thống", systemType: "system", icon: "Settings2", path: "/settings", sortOrder: 5 },
  { code: "sys_audit_logs", name: "Nhật ký Hoạt động", systemType: "system", icon: "FileSearch", path: "/audit-logs", sortOrder: 6 },
  { code: "sys_database", name: "Kết nối Database", systemType: "system", icon: "Database", path: "/database-config", sortOrder: 7 },
];

// Default permissions for each module
const DEFAULT_PERMISSIONS = [
  { actionType: "view", name: "Xem" },
  { actionType: "create", name: "Tạo mới" },
  { actionType: "edit", name: "Chỉnh sửa" },
  { actionType: "delete", name: "Xóa" },
  { actionType: "export", name: "Xuất dữ liệu" },
  { actionType: "import", name: "Nhập dữ liệu" },
  { actionType: "approve", name: "Phê duyệt" },
  { actionType: "manage", name: "Quản lý" },
];

export const permissionRouter = router({
  // ===== SYSTEM MODULES =====
  listModules: protectedProcedure
    .input(z.object({
      systemType: z.enum(["mms", "spc", "system", "common"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(systemModules);
      if (input?.systemType) {
        query = query.where(eq(systemModules.systemType, input.systemType)) as typeof query;
      }
      
      return await query.orderBy(systemModules.systemType, systemModules.sortOrder);
    }),

  getModule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [module] = await db.select().from(systemModules).where(eq(systemModules.id, input.id));
      return module || null;
    }),

  createModule: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      systemType: z.enum(["mms", "spc", "system", "common"]),
      parentId: z.number().optional(),
      icon: z.string().optional(),
      path: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(systemModules).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        systemType: input.systemType,
        parentId: input.parentId || null,
        icon: input.icon || null,
        path: input.path || null,
        sortOrder: input.sortOrder || 0,
        isActive: 1,
      });
      
      return { id: result.insertId };
    }),

  updateModule: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      systemType: z.enum(["mms", "spc", "system", "common"]).optional(),
      parentId: z.number().nullable().optional(),
      icon: z.string().optional(),
      path: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const updateData: Record<string, unknown> = {};
      if (input.code !== undefined) updateData.code = input.code;
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.systemType !== undefined) updateData.systemType = input.systemType;
      if (input.parentId !== undefined) updateData.parentId = input.parentId;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.path !== undefined) updateData.path = input.path;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      
      await db.update(systemModules).set(updateData).where(eq(systemModules.id, input.id));
      return { success: true };
    }),

  deleteModule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Delete related permissions first
      await db.delete(modulePermissions).where(eq(modulePermissions.moduleId, input.id));
      // Delete module
      await db.delete(systemModules).where(eq(systemModules.id, input.id));
      return { success: true };
    }),

  // ===== MODULE PERMISSIONS =====
  listPermissions: protectedProcedure
    .input(z.object({
      moduleId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select().from(modulePermissions);
      if (input?.moduleId) {
        query = query.where(eq(modulePermissions.moduleId, input.moduleId)) as typeof query;
      }
      
      return await query;
    }),

  createPermission: protectedProcedure
    .input(z.object({
      moduleId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      actionType: z.enum(["view", "create", "edit", "delete", "export", "import", "approve", "manage"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(modulePermissions).values({
        moduleId: input.moduleId,
        code: input.code,
        name: input.name,
        description: input.description || null,
        actionType: input.actionType,
        isActive: 1,
      });
      
      return { id: result.insertId };
    }),

  updatePermission: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      actionType: z.enum(["view", "create", "edit", "delete", "export", "import", "approve", "manage"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const updateData: Record<string, unknown> = {};
      if (input.code !== undefined) updateData.code = input.code;
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.actionType !== undefined) updateData.actionType = input.actionType;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      
      await db.update(modulePermissions).set(updateData).where(eq(modulePermissions.id, input.id));
      return { success: true };
    }),

  deletePermission: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Delete related role permissions first
      await db.delete(roleModulePermissions).where(eq(roleModulePermissions.permissionId, input.id));
      // Delete permission
      await db.delete(modulePermissions).where(eq(modulePermissions.id, input.id));
      return { success: true };
    }),

  // ===== ROLE MODULE PERMISSIONS =====
  getRolePermissions: protectedProcedure
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select({
        id: roleModulePermissions.id,
        roleId: roleModulePermissions.roleId,
        permissionId: roleModulePermissions.permissionId,
      }).from(roleModulePermissions)
        .where(eq(roleModulePermissions.roleId, input.roleId));
    }),

  setRolePermissions: protectedProcedure
    .input(z.object({
      roleId: z.number(),
      permissionIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Delete existing permissions for this role
      await db.delete(roleModulePermissions).where(eq(roleModulePermissions.roleId, input.roleId));
      
      // Insert new permissions
      if (input.permissionIds.length > 0) {
        await db.insert(roleModulePermissions).values(
          input.permissionIds.map(permissionId => ({
            roleId: input.roleId,
            permissionId,
          }))
        );
      }
      
      return { success: true };
    }),

  // Copy permissions from one role to another
  copyRolePermissions: protectedProcedure
    .input(z.object({
      sourceRoleId: z.number(),
      targetRoleId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get source role permissions
      const sourcePermissions = await db.select()
        .from(roleModulePermissions)
        .where(eq(roleModulePermissions.roleId, input.sourceRoleId));
      
      if (sourcePermissions.length === 0) {
        return { success: false, message: "Vai trò nguồn không có quyền nào", count: 0 };
      }
      
      // Delete existing permissions for target role
      await db.delete(roleModulePermissions).where(eq(roleModulePermissions.roleId, input.targetRoleId));
      
      // Copy permissions to target role
      await db.insert(roleModulePermissions).values(
        sourcePermissions.map(p => ({
          roleId: input.targetRoleId,
          permissionId: p.permissionId,
        }))
      );
      
      return { success: true, message: `Đã sao chép ${sourcePermissions.length} quyền`, count: sourcePermissions.length };
    }),

  // ===== INITIALIZATION =====
  initializeDefaultModules: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Check if modules already exist
    const existingModules = await db.select().from(systemModules);
    if (existingModules.length > 0) {
      return { success: true, message: "Modules already initialized", count: existingModules.length };
    }
    
    // Insert default modules
    for (const module of DEFAULT_MODULES) {
      const [result] = await db.insert(systemModules).values({
        code: module.code,
        name: module.name,
        systemType: module.systemType as "mms" | "spc" | "system" | "common",
        icon: module.icon,
        path: module.path,
        sortOrder: module.sortOrder,
        isActive: 1,
      });
      
      // Create default permissions for this module
      for (const perm of DEFAULT_PERMISSIONS) {
        await db.insert(modulePermissions).values({
          moduleId: result.insertId,
          code: `${module.code}_${perm.actionType}`,
          name: perm.name,
          actionType: perm.actionType as "view" | "create" | "edit" | "delete" | "export" | "import" | "approve" | "manage",
          isActive: 1,
        });
      }
    }
    
    return { success: true, message: "Initialized default modules", count: DEFAULT_MODULES.length };
  }),

  // Get modules with permissions grouped by system type
  getModulesWithPermissions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { mms: [], spc: [], system: [], common: [] };
    
    const modules = await db.select().from(systemModules).where(eq(systemModules.isActive, 1)).orderBy(systemModules.sortOrder);
    const permissions = await db.select().from(modulePermissions).where(eq(modulePermissions.isActive, 1));
    
    const result: Record<string, Array<{
      id: number;
      code: string;
      name: string;
      icon: string | null;
      path: string | null;
      permissions: Array<{
        id: number;
        code: string;
        name: string;
        actionType: string;
      }>;
    }>> = { mms: [], spc: [], system: [], common: [] };
    
    for (const module of modules) {
      const modulePerms = permissions.filter(p => p.moduleId === module.id);
      const moduleData = {
        id: module.id,
        code: module.code,
        name: module.name,
        icon: module.icon,
        path: module.path,
        permissions: modulePerms.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          actionType: p.actionType,
        })),
      };
      
      if (module.systemType in result) {
        result[module.systemType].push(moduleData);
      }
    }
    
    return result;
  }),

  // Check if user has permission
  checkPermission: protectedProcedure
    .input(z.object({
      permissionCode: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return false;
      
      // Admin always has permission
      if (ctx.user?.role === "admin") return true;
      
      // Get user's role - for now, check by role name
      // TODO: Add roleId to user table for proper role-based permissions
      const userRole = ctx.user?.role;
      if (!userRole || userRole === "user") return false;
      
      // Find permission by code
      const [permission] = await db.select().from(modulePermissions)
        .where(eq(modulePermissions.code, input.permissionCode));
      
      if (!permission) return false;
      
      // For now, return true for admin role
      // TODO: Implement proper role-based permission check when roleId is added to users
      return true;
    }),

  // ===== ROLE TEMPLATES =====
  listRoleTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    return await db.select().from(roleTemplates).where(eq(roleTemplates.isActive, 1));
  }),

  getRoleTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [template] = await db.select().from(roleTemplates).where(eq(roleTemplates.id, input.id));
      return template || null;
    }),

  createRoleTemplate: protectedProcedure
    .input(z.object({
      code: z.string(),
      name: z.string(),
      description: z.string().optional(),
      category: z.enum(["production", "quality", "maintenance", "management", "system"]),
      permissionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.insert(roleTemplates).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        category: input.category,
        permissionIds: JSON.stringify(input.permissionIds),
        isDefault: 0,
        createdBy: ctx.user?.id || null,
      });
      
      return { success: true };
    }),

  updateRoleTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(["production", "quality", "maintenance", "management", "system"]).optional(),
      permissionIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.category) updates.category = input.category;
      if (input.permissionIds) updates.permissionIds = JSON.stringify(input.permissionIds);
      
      await db.update(roleTemplates).set(updates).where(eq(roleTemplates.id, input.id));
      
      return { success: true };
    }),

  deleteRoleTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Soft delete
      await db.update(roleTemplates).set({ isActive: 0 }).where(eq(roleTemplates.id, input.id));
      
      return { success: true };
    }),

  applyRoleTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      roleId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get template
      const [template] = await db.select().from(roleTemplates).where(eq(roleTemplates.id, input.templateId));
      if (!template) throw new Error("Template not found");
      
      const permissionIds: number[] = JSON.parse(template.permissionIds);
      
      // Delete existing permissions for this role
      await db.delete(roleModulePermissions).where(eq(roleModulePermissions.roleId, input.roleId));
      
      // Insert new permissions from template
      if (permissionIds.length > 0) {
        await db.insert(roleModulePermissions).values(
          permissionIds.map(permissionId => ({
            roleId: input.roleId,
            permissionId,
          }))
        );
      }
      
      return { success: true, message: `Đã áp dụng mẫu "${template.name}" với ${permissionIds.length} quyền`, count: permissionIds.length };
    }),

  initializeDefaultTemplates: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Check if templates already exist
    const existing = await db.select().from(roleTemplates);
    if (existing.length > 0) {
      return { success: true, message: "Mẫu vai trò đã được khởi tạo", count: existing.length };
    }
    
    // Get all permissions for mapping
    const allPermissions = await db.select().from(modulePermissions).where(eq(modulePermissions.isActive, 1));
    const permByCode = new Map(allPermissions.map(p => [p.code, p.id]));
    
    // Helper to get permission IDs by patterns
    const getPermIds = (patterns: string[]): number[] => {
      const ids: number[] = [];
      for (const pattern of patterns) {
        if (pattern.endsWith('_*')) {
          // Wildcard: all permissions for a module
          const prefix = pattern.slice(0, -1);
          allPermissions.filter(p => p.code.startsWith(prefix)).forEach(p => ids.push(p.id));
        } else {
          const id = permByCode.get(pattern);
          if (id) ids.push(id);
        }
      }
      // Remove duplicates
      const uniqueIds: number[] = [];
      for (const id of ids) {
        if (!uniqueIds.includes(id)) uniqueIds.push(id);
      }
      return uniqueIds;
    };
    
    // Default templates
    const templates = [
      {
        code: "operator",
        name: "Công nhân vận hành",
        description: "Quyền cơ bản: xem dashboard, xem dữ liệu SPC",
        category: "production" as const,
        patterns: ["spc_dashboard_view", "spc_analyze_view", "spc_realtime_view", "spc_history_view"],
      },
      {
        code: "qc_inspector",
        name: "Kiểm tra chất lượng (QC)",
        description: "Xem + tạo phân tích SPC, quản lý lỗi",
        category: "quality" as const,
        patterns: ["spc_dashboard_view", "spc_analyze_*", "spc_history_*", "spc_defects_*", "spc_reports_view", "spc_reports_export"],
      },
      {
        code: "maintenance_tech",
        name: "Kỹ thuật bảo trì",
        description: "Quản lý máy móc, bảo trì, phụ tùng",
        category: "maintenance" as const,
        patterns: ["mms_dashboard_view", "mms_machines_*", "mms_machine_types_*", "mms_fixtures_*", "mms_maintenance_*", "mms_maintenance_schedule_*", "mms_spare_parts_*", "mms_work_orders_*"],
      },
      {
        code: "supervisor",
        name: "Giám sát",
        description: "Xem tất cả + phê duyệt",
        category: "management" as const,
        patterns: ["spc_*", "mms_dashboard_view", "mms_machines_view", "mms_maintenance_view", "mms_spare_parts_view", "mms_work_orders_*", "sys_approval_*"],
      },
      {
        code: "production_manager",
        name: "Quản lý sản xuất",
        description: "Full quyền SPC + MMS",
        category: "management" as const,
        patterns: ["spc_*", "mms_*"],
      },
      {
        code: "system_admin",
        name: "Quản trị hệ thống",
        description: "Full quyền hệ thống",
        category: "system" as const,
        patterns: ["sys_*"],
      },
    ];
    
    for (const t of templates) {
      const permIds = getPermIds(t.patterns);
      await db.insert(roleTemplates).values({
        code: t.code,
        name: t.name,
        description: t.description,
        category: t.category,
        permissionIds: JSON.stringify(permIds),
        isDefault: 1,
        createdBy: null,
      });
    }
    
    return { success: true, message: `Đã khởi tạo ${templates.length} mẫu vai trò`, count: templates.length };
  }),
});
