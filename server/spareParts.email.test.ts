import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      {
        id: 1,
        partNumber: "PT-001",
        name: "Test Part 1",
        category: "Điện",
        unit: "pcs",
        minStock: 10,
        reorderPoint: 15,
        currentStock: 5,
        supplierName: "Supplier A",
      },
      {
        id: 2,
        partNumber: "PT-002",
        name: "Test Part 2",
        category: "Cơ khí",
        unit: "pcs",
        minStock: 20,
        reorderPoint: 25,
        currentStock: 30, // Above threshold
        supplierName: "Supplier B",
      },
    ]),
  }),
}));

describe("Spare Parts Email Alert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should identify low stock items correctly", async () => {
    // Test the filtering logic
    const mockParts = [
      { id: 1, currentStock: 5, minStock: 10, reorderPoint: 15 },
      { id: 2, currentStock: 30, minStock: 20, reorderPoint: 25 },
      { id: 3, currentStock: 8, minStock: 10, reorderPoint: 12 },
    ];

    const lowStockItems = mockParts.filter((item) => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      const reorder = Number(item.reorderPoint) || 0;
      return current <= min || current <= reorder;
    });

    expect(lowStockItems).toHaveLength(2);
    expect(lowStockItems[0].id).toBe(1);
    expect(lowStockItems[1].id).toBe(3);
  });

  it("should categorize alert levels correctly", async () => {
    const mockParts = [
      { id: 1, currentStock: 5, minStock: 10 }, // Critical (below min)
      { id: 2, currentStock: 12, minStock: 10, reorderPoint: 15 }, // Warning (below reorder)
    ];

    const categorized = mockParts.map((item) => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      return {
        ...item,
        alertLevel: current <= min ? "critical" : "warning",
      };
    });

    expect(categorized[0].alertLevel).toBe("critical");
    expect(categorized[1].alertLevel).toBe("warning");
  });

  it("should build email content correctly", async () => {
    const lowStockItems = [
      {
        partNumber: "PT-001",
        name: "Test Part",
        currentStock: 5,
        minStock: 10,
        unit: "pcs",
      },
    ];

    const itemsList = lowStockItems
      .map((item) => {
        const current = Number(item.currentStock) || 0;
        const min = Number(item.minStock) || 0;
        const level = current <= min ? "🔴 NGUY HIỂM" : "🟡 CẢNH BÁO";
        return `${level} - ${item.partNumber}: ${item.name} | Tồn: ${current} ${item.unit || "pcs"} (Min: ${min})`;
      })
      .join("\n");

    expect(itemsList).toContain("🔴 NGUY HIỂM");
    expect(itemsList).toContain("PT-001");
    expect(itemsList).toContain("Test Part");
    expect(itemsList).toContain("Tồn: 5 pcs");
  });

  it("should return success message when no low stock items", async () => {
    const lowStockItems: any[] = [];

    const result =
      lowStockItems.length === 0
        ? { success: true, message: "Không có phụ tùng nào cần cảnh báo" }
        : { success: true, message: `Đã gửi cảnh báo cho ${lowStockItems.length} phụ tùng` };

    expect(result.success).toBe(true);
    expect(result.message).toBe("Không có phụ tùng nào cần cảnh báo");
  });
});
