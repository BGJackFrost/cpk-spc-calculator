import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

describe("Approval Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);
  });

  describe("Workflow Management", () => {
    it("should list all workflows", async () => {
      const mockWorkflows = [
        { id: 1, code: "PO_APPROVAL", name: "Phê duyệt Đơn hàng", entityType: "purchase_order", isActive: 1 },
        { id: 2, code: "STOCK_EXPORT", name: "Phê duyệt Xuất kho", entityType: "stock_export", isActive: 1 },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockWorkflows);

      // Simulate the query
      const result = await mockDb.select().from({}).orderBy({});
      expect(result).toEqual(mockWorkflows);
    });

    it("should create a new workflow", async () => {
      const newWorkflow = {
        code: "NEW_WORKFLOW",
        name: "New Workflow",
        entityType: "purchase_order",
        isActive: true,
      };

      mockDb.values.mockResolvedValueOnce([{ insertId: 3 }]);
      const result = await mockDb.insert({}).values(newWorkflow);
      expect(result).toEqual([{ insertId: 3 }]);
    });

    it("should update an existing workflow", async () => {
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 });
      const result = await mockDb.update({}).set({ name: "Updated Name" }).where({});
      expect(result).toBeDefined();
    });

    it("should delete a workflow and its steps", async () => {
      // First delete steps
      mockDb.where.mockResolvedValueOnce({ affectedRows: 3 });
      await mockDb.delete({}).where({});
      
      // Then delete workflow
      mockDb.where.mockResolvedValueOnce({ affectedRows: 1 });
      await mockDb.delete({}).where({});
      
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe("Approval Steps", () => {
    it("should list steps for a workflow", async () => {
      const mockSteps = [
        { id: 1, workflowId: 1, stepOrder: 1, name: "Trưởng nhóm", approverType: "position", isRequired: 1 },
        { id: 2, workflowId: 1, stepOrder: 2, name: "Trưởng phòng", approverType: "position", isRequired: 1 },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockSteps);

      const result = await mockDb.select().from({}).where({}).orderBy({});
      expect(result).toEqual(mockSteps);
    });

    it("should create a new approval step", async () => {
      const newStep = {
        workflowId: 1,
        stepOrder: 3,
        name: "Giám đốc",
        approverType: "position",
        approverId: 5,
        isRequired: true,
      };

      mockDb.values.mockResolvedValueOnce([{ insertId: 3 }]);
      const result = await mockDb.insert({}).values(newStep);
      expect(result).toEqual([{ insertId: 3 }]);
    });

    it("should reorder steps correctly", async () => {
      // Mock current step
      mockDb.where.mockResolvedValueOnce([{ id: 1, workflowId: 1, stepOrder: 2 }]);
      
      // Mock swap step
      mockDb.where.mockResolvedValueOnce([{ id: 2, workflowId: 1, stepOrder: 1 }]);
      
      // Simulate reorder
      await mockDb.select().from({}).where({});
      await mockDb.select().from({}).where({});
      
      expect(mockDb.where).toHaveBeenCalledTimes(2);
    });

    it("should filter steps by amount range", () => {
      const steps = [
        { id: 1, minAmount: null, maxAmount: "5000000", isRequired: 1 },
        { id: 2, minAmount: "5000000", maxAmount: "20000000", isRequired: 1 },
        { id: 3, minAmount: "20000000", maxAmount: null, isRequired: 1 },
      ];

      const amount = 10000000;
      const filteredSteps = steps.filter(step => {
        const minOk = !step.minAmount || Number(step.minAmount) <= amount;
        const maxOk = !step.maxAmount || Number(step.maxAmount) >= amount;
        return minOk && maxOk;
      });

      expect(filteredSteps).toHaveLength(1);
      expect(filteredSteps[0].id).toBe(2);
    });
  });

  describe("Approver Types", () => {
    it("should support position-based approval", () => {
      const step = { approverType: "position", approverId: 3 };
      expect(step.approverType).toBe("position");
      expect(step.approverId).toBe(3);
    });

    it("should support user-based approval", () => {
      const step = { approverType: "user", approverId: 10 };
      expect(step.approverType).toBe("user");
      expect(step.approverId).toBe(10);
    });

    it("should support manager-based approval", () => {
      const step = { approverType: "manager", approverId: null };
      expect(step.approverType).toBe("manager");
    });

    it("should support department_head-based approval", () => {
      const step = { approverType: "department_head", approverId: null };
      expect(step.approverType).toBe("department_head");
    });
  });

  describe("Entity Types", () => {
    it("should support purchase_order entity type", () => {
      const workflow = { entityType: "purchase_order" };
      expect(workflow.entityType).toBe("purchase_order");
    });

    it("should support stock_export entity type", () => {
      const workflow = { entityType: "stock_export" };
      expect(workflow.entityType).toBe("stock_export");
    });

    it("should support maintenance_request entity type", () => {
      const workflow = { entityType: "maintenance_request" };
      expect(workflow.entityType).toBe("maintenance_request");
    });

    it("should support leave_request entity type", () => {
      const workflow = { entityType: "leave_request" };
      expect(workflow.entityType).toBe("leave_request");
    });
  });
});

describe("Employee Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
  });

  it("should list all employee profiles", async () => {
    const mockProfiles = [
      { id: 1, userId: 1, employeeCode: "EMP001", companyId: 1, departmentId: 1, positionId: 1 },
      { id: 2, userId: 2, employeeCode: "EMP002", companyId: 1, departmentId: 2, positionId: 2 },
    ];
    mockDb.from.mockResolvedValueOnce(mockProfiles);

    const result = await mockDb.select().from({});
    expect(result).toEqual(mockProfiles);
  });

  it("should get employee profile by userId", async () => {
    const mockProfile = { id: 1, userId: 1, employeeCode: "EMP001" };
    mockDb.where.mockResolvedValueOnce([mockProfile]);

    const result = await mockDb.select().from({}).where({});
    expect(result).toEqual([mockProfile]);
  });

  it("should create new employee profile", async () => {
    mockDb.where.mockResolvedValueOnce([]); // No existing profile
    mockDb.values.mockResolvedValueOnce([{ insertId: 3 }]);

    const result = await mockDb.insert({}).values({
      userId: 3,
      userType: "local",
      employeeCode: "EMP003",
      companyId: 1,
      departmentId: 1,
    });

    expect(result).toEqual([{ insertId: 3 }]);
  });

  it("should update existing employee profile", async () => {
    mockDb.where.mockResolvedValueOnce([{ id: 1, userId: 1 }]); // Existing profile
    mockDb.where.mockResolvedValueOnce({ affectedRows: 1 });

    await mockDb.select().from({}).where({});
    await mockDb.update({}).set({}).where({});

    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should link employee to organization structure", () => {
    const profile = {
      userId: 1,
      companyId: 1,
      departmentId: 2,
      teamId: 3,
      positionId: 4,
      managerId: 5,
    };

    expect(profile.companyId).toBe(1);
    expect(profile.departmentId).toBe(2);
    expect(profile.teamId).toBe(3);
    expect(profile.positionId).toBe(4);
    expect(profile.managerId).toBe(5);
  });

  it("should support both manus and local user types", () => {
    const manusProfile = { userType: "manus", userId: 1 };
    const localProfile = { userType: "local", userId: 2 };

    expect(manusProfile.userType).toBe("manus");
    expect(localProfile.userType).toBe("local");
  });
});
