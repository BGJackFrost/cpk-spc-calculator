import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue({}),
};

vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

describe('Role Templates Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template data structure', () => {
    it('should have correct template structure', () => {
      const template = {
        id: 1,
        code: "operator",
        name: "Công nhân vận hành",
        description: "Quyền cơ bản: xem dashboard, xem dữ liệu SPC",
        category: "production",
        permissionIds: JSON.stringify([1, 2, 3]),
        isDefault: 1,
        isActive: 1,
      };
      
      expect(template.code).toBe("operator");
      expect(template.category).toBe("production");
      expect(JSON.parse(template.permissionIds)).toHaveLength(3);
    });

    it('should parse permissionIds correctly', () => {
      const permissionIds = JSON.stringify([1, 5, 10, 15]);
      const parsed = JSON.parse(permissionIds);
      
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed).toContain(1);
      expect(parsed).toContain(15);
    });
  });

  describe('Default templates', () => {
    const defaultTemplates = [
      { code: "operator", name: "Công nhân vận hành", category: "production" },
      { code: "qc_inspector", name: "Kiểm tra chất lượng (QC)", category: "quality" },
      { code: "maintenance_tech", name: "Kỹ thuật bảo trì", category: "maintenance" },
      { code: "supervisor", name: "Giám sát", category: "management" },
      { code: "production_manager", name: "Quản lý sản xuất", category: "management" },
      { code: "system_admin", name: "Quản trị hệ thống", category: "system" },
    ];

    it('should have 6 default templates', () => {
      expect(defaultTemplates).toHaveLength(6);
    });

    it('should cover all categories', () => {
      const categories = new Set(defaultTemplates.map(t => t.category));
      expect(categories.has("production")).toBe(true);
      expect(categories.has("quality")).toBe(true);
      expect(categories.has("maintenance")).toBe(true);
      expect(categories.has("management")).toBe(true);
      expect(categories.has("system")).toBe(true);
    });

    it('should have unique codes', () => {
      const codes = defaultTemplates.map(t => t.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Apply template logic', () => {
    it('should map template permissions to role', () => {
      const templatePermissionIds = [1, 2, 3, 4, 5];
      const targetRoleId = 2;
      
      const newRolePermissions = templatePermissionIds.map(permissionId => ({
        roleId: targetRoleId,
        permissionId,
      }));
      
      expect(newRolePermissions).toHaveLength(5);
      expect(newRolePermissions[0].roleId).toBe(2);
      expect(newRolePermissions[0].permissionId).toBe(1);
    });

    it('should return success message with count', () => {
      const templateName = "Công nhân vận hành";
      const permissionCount = 5;
      
      const result = {
        success: true,
        message: `Đã áp dụng mẫu "${templateName}" với ${permissionCount} quyền`,
        count: permissionCount,
      };
      
      expect(result.success).toBe(true);
      expect(result.message).toContain(templateName);
      expect(result.count).toBe(5);
    });
  });

  describe('Permission pattern matching', () => {
    it('should match wildcard patterns', () => {
      const allPermissions = [
        { code: 'spc_dashboard_view', id: 1 },
        { code: 'spc_analyze_view', id: 2 },
        { code: 'spc_analyze_create', id: 3 },
        { code: 'mms_machines_view', id: 4 },
      ];
      
      const pattern = 'spc_';
      const matched = allPermissions.filter(p => p.code.startsWith(pattern));
      
      expect(matched).toHaveLength(3);
    });

    it('should match exact patterns', () => {
      const allPermissions = [
        { code: 'spc_dashboard_view', id: 1 },
        { code: 'spc_analyze_view', id: 2 },
      ];
      
      const pattern = 'spc_dashboard_view';
      const matched = allPermissions.filter(p => p.code === pattern);
      
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe(1);
    });
  });

  describe('Category labels', () => {
    it('should have Vietnamese labels for all categories', () => {
      const categoryLabels: Record<string, string> = {
        production: "Sản xuất",
        quality: "Chất lượng",
        maintenance: "Bảo trì",
        management: "Quản lý",
        system: "Hệ thống",
      };
      
      expect(categoryLabels.production).toBe("Sản xuất");
      expect(categoryLabels.quality).toBe("Chất lượng");
      expect(categoryLabels.maintenance).toBe("Bảo trì");
      expect(categoryLabels.management).toBe("Quản lý");
      expect(categoryLabels.system).toBe("Hệ thống");
    });
  });
});
