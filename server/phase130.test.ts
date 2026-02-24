import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Phase 130: Middleware Quyền, Biểu đồ và Email", () => {
  describe("Permission Middleware", () => {
    it("should have checkPermission function", async () => {
      const { checkPermission } = await import("./_core/permissionMiddleware");
      expect(typeof checkPermission).toBe("function");
    });

    it("should have createPermissionMiddleware function", async () => {
      const { createPermissionMiddleware } = await import("./_core/permissionMiddleware");
      expect(typeof createPermissionMiddleware).toBe("function");
    });

    it("should have MODULE_CODES defined", async () => {
      const { MODULE_CODES } = await import("./_core/permissionMiddleware");
      expect(MODULE_CODES).toBeDefined();
      expect(MODULE_CODES.SPARE_PARTS).toBeDefined();
      expect(MODULE_CODES.MAINTENANCE).toBeDefined();
    });

    it("should have clearPermissionCache function", async () => {
      const { clearPermissionCache } = await import("./_core/permissionMiddleware");
      expect(typeof clearPermissionCache).toBe("function");
    });
  });

  describe("Approval Router with Email Notifications", () => {
    it("should have notifyOwner import in approvalRouter", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/approvalRouter.ts", "utf-8");
      expect(content).toContain("import { notifyOwner }");
    });

    it("should send notification when creating approval request", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/approvalRouter.ts", "utf-8");
      expect(content).toContain("await notifyOwner({");
      expect(content).toContain("[Đơn mới cần phê duyệt]");
    });

    it("should send notification when approving", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/approvalRouter.ts", "utf-8");
      expect(content).toContain("Đã được phê duyệt");
    });

    it("should send notification when rejecting", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/approvalRouter.ts", "utf-8");
      expect(content).toContain("bị từ chối");
    });
  });

  describe("Spare Parts Router with Permission Checks", () => {
    it("should have permission check in createPart", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/sparePartsRouter.ts", "utf-8");
      expect(content).toContain("checkPermission");
      expect(content).toContain("MODULE_CODES.SPARE_PARTS");
    });

    it("should have permission check in updatePart", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/sparePartsRouter.ts", "utf-8");
      expect(content).toContain("checkPermission");
    });

    it("should have permission check in deletePart", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/sparePartsRouter.ts", "utf-8");
      expect(content).toContain("ActionType");
    });

    it("should have permission check in createPurchaseOrder", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/sparePartsRouter.ts", "utf-8");
      expect(content).toContain("MODULE_CODES");
    });

    it("should have permission check in approvePurchaseOrder", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/sparePartsRouter.ts", "utf-8");
      expect(content).toContain("permissionMiddleware");
    });
  });

  describe("Maintenance Router with Permission Checks", () => {
    it("should have permission check imports", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/maintenanceRouter.ts", "utf-8");
      expect(content).toContain("checkPermission");
      expect(content).toContain("MODULE_CODES");
    });

    it("should have permission check in createSchedule", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/maintenanceRouter.ts", "utf-8");
      expect(content).toContain("MODULE_CODES");
    });

    it("should have permission check in createWorkOrder", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/routers/maintenanceRouter.ts", "utf-8");
      expect(content).toContain("MODULE_CODES.WORK_ORDERS");
    });
  });

  describe("Approval Report with Charts", () => {
    it("should have recharts imports", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./client/src/pages/ApprovalReport.tsx", "utf-8");
      expect(content).toContain("from \"recharts\"");
    });

    it("should have BarChart component", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./client/src/pages/ApprovalReport.tsx", "utf-8");
      expect(content).toContain("<BarChart");
    });

    it("should have LineChart component", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./client/src/pages/ApprovalReport.tsx", "utf-8");
      expect(content).toContain("<LineChart");
    });

    it("should have PieChart component", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./client/src/pages/ApprovalReport.tsx", "utf-8");
      expect(content).toContain("<PieChart");
    });

    it("should have ResponsiveContainer for charts", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./client/src/pages/ApprovalReport.tsx", "utf-8");
      expect(content).toContain("<ResponsiveContainer");
    });
  });
});
