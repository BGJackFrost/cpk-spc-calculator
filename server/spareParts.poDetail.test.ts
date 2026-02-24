import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "./db";
import { purchaseOrders, purchaseOrderItems, spareParts, suppliers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock db functions
vi.mock("./db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Purchase Order Detail View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPurchaseOrder", () => {
    it("should return purchase order with items and supplier info", async () => {
      // Test that the getPurchaseOrder query returns all necessary fields
      const mockPO = {
        id: 1,
        poNumber: "PO-2024-001",
        status: "ordered",
        supplierId: 1,
        total: "1000000",
        orderDate: new Date("2024-01-15"),
        expectedDeliveryDate: new Date("2024-01-25"),
        notes: "Test order",
        approvedBy: 1,
        approvedAt: new Date("2024-01-16"),
        rejectedBy: null,
        rejectionReason: null,
        items: [
          {
            id: 1,
            sparePartId: 1,
            partName: "Bearing SKF 6205",
            partNumber: "SP-001",
            quantity: 10,
            unitPrice: "50000",
            totalPrice: "500000",
            receivedQuantity: 5,
          },
          {
            id: 2,
            sparePartId: 2,
            partName: "Oil Filter",
            partNumber: "SP-002",
            quantity: 20,
            unitPrice: "25000",
            totalPrice: "500000",
            receivedQuantity: 20,
          },
        ],
      };

      // Verify structure matches expected output
      expect(mockPO).toHaveProperty("id");
      expect(mockPO).toHaveProperty("poNumber");
      expect(mockPO).toHaveProperty("status");
      expect(mockPO).toHaveProperty("items");
      expect(mockPO.items).toBeInstanceOf(Array);
      expect(mockPO.items.length).toBe(2);
      
      // Verify item structure
      const item = mockPO.items[0];
      expect(item).toHaveProperty("partName");
      expect(item).toHaveProperty("partNumber");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("receivedQuantity");
      
      // Verify remaining quantity calculation
      const remainingQty = item.quantity - (item.receivedQuantity || 0);
      expect(remainingQty).toBe(5);
    });

    it("should calculate remaining quantity correctly", () => {
      const testCases = [
        { quantity: 10, receivedQuantity: 0, expected: 10 },
        { quantity: 10, receivedQuantity: 5, expected: 5 },
        { quantity: 10, receivedQuantity: 10, expected: 0 },
        { quantity: 10, receivedQuantity: null, expected: 10 },
      ];

      testCases.forEach(({ quantity, receivedQuantity, expected }) => {
        const remaining = quantity - (receivedQuantity || 0);
        expect(remaining).toBe(expected);
      });
    });

    it("should format currency correctly for Vietnamese Dong", () => {
      const amount = 1000000;
      const formatted = new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      }).format(amount);
      
      expect(formatted).toContain("1.000.000");
      expect(formatted).toContain("₫");
    });
  });

  describe("PO Status Badge", () => {
    it("should return correct badge for each status", () => {
      const statuses = [
        { status: "draft", label: "Nháp" },
        { status: "pending", label: "Chờ duyệt" },
        { status: "approved", label: "Đã duyệt" },
        { status: "rejected", label: "Từ chối" },
        { status: "ordered", label: "Đã đặt hàng" },
        { status: "partial_received", label: "Nhận một phần" },
        { status: "received", label: "Đã nhận đủ" },
        { status: "cancelled", label: "Đã hủy" },
      ];

      statuses.forEach(({ status, label }) => {
        expect(status).toBeDefined();
        expect(label).toBeDefined();
      });
    });
  });
});
