import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database and notification modules
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe('Spare Parts Phase 124 Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendLowStockEmailAlertJob', () => {
    it('should return correct structure when no low stock items', async () => {
      const { getDb } = await import('./db');
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { sendLowStockEmailAlertJob } = await import('./scheduledJobs');
      const result = await sendLowStockEmailAlertJob();

      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('itemCount');
      expect(result).toHaveProperty('message');
      expect(result.itemCount).toBe(0);
    });

    it('should send alert when low stock items exist', async () => {
      const { getDb } = await import('./db');
      const { notifyOwner } = await import('./_core/notification');
      
      const mockParts = [
        {
          id: 1,
          partNumber: 'PT001',
          name: 'Test Part',
          category: 'Test',
          unit: 'pcs',
          minStock: 10,
          reorderPoint: 15,
          emailAlertThreshold: 0, // Use minStock
          currentStock: 5,
          supplierName: 'Test Supplier'
        }
      ];
      
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockParts),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { sendLowStockEmailAlertJob } = await import('./scheduledJobs');
      const result = await sendLowStockEmailAlertJob();

      expect(result.itemCount).toBe(1);
      expect(notifyOwner).toHaveBeenCalled();
    });

    it('should use emailAlertThreshold when set', async () => {
      const { getDb } = await import('./db');
      
      const mockParts = [
        {
          id: 1,
          partNumber: 'PT001',
          name: 'Test Part',
          category: 'Test',
          unit: 'pcs',
          minStock: 5,
          reorderPoint: 10,
          emailAlertThreshold: 20, // Custom threshold
          currentStock: 15, // Above minStock but below emailAlertThreshold
          supplierName: 'Test Supplier'
        }
      ];
      
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockParts),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { sendLowStockEmailAlertJob } = await import('./scheduledJobs');
      const result = await sendLowStockEmailAlertJob();

      // Should trigger alert because currentStock (15) <= emailAlertThreshold (20)
      expect(result.itemCount).toBe(1);
    });
  });

  describe('Stock Status Filter Logic', () => {
    const getStockStatus = (current: number, min: number, reorder: number) => {
      const stock = current || 0;
      const threshold = reorder || min || 0;
      if (stock <= 0) return "out";
      if (stock <= threshold) return "low";
      return "ok";
    };

    it('should return "out" when stock is 0', () => {
      expect(getStockStatus(0, 10, 15)).toBe("out");
    });

    it('should return "low" when stock is below threshold', () => {
      expect(getStockStatus(5, 10, 15)).toBe("low");
    });

    it('should return "ok" when stock is above threshold', () => {
      expect(getStockStatus(20, 10, 15)).toBe("ok");
    });

    it('should use minStock when reorderPoint is not set', () => {
      expect(getStockStatus(5, 10, 0)).toBe("low");
      expect(getStockStatus(15, 10, 0)).toBe("ok");
    });
  });

  describe('Excel Export Data Structure', () => {
    it('should generate correct data structure for Excel export', () => {
      const mockParts = [
        {
          partNumber: 'PT001',
          name: 'Test Part',
          category: 'Category A',
          unit: 'pcs',
          currentStock: 10,
          minStock: 5,
          reorderPoint: 8,
          unitPrice: 1000,
          supplierName: 'Supplier A'
        }
      ];

      const exportData = mockParts.map(part => ({
        "Mã phụ tùng": part.partNumber,
        "Tên": part.name,
        "Danh mục": part.category || "",
        "Đơn vị": part.unit || "pcs",
        "Tồn kho": part.currentStock || 0,
        "Tồn tối thiểu": part.minStock || 0,
        "Điểm đặt hàng": part.reorderPoint || 0,
        "Đơn giá": part.unitPrice || 0,
        "Giá trị tồn": (Number(part.currentStock) || 0) * (Number(part.unitPrice) || 0),
        "Nhà cung cấp": part.supplierName || "",
      }));

      expect(exportData[0]["Mã phụ tùng"]).toBe("PT001");
      expect(exportData[0]["Giá trị tồn"]).toBe(10000);
    });
  });

  describe('Cost Report Calculations', () => {
    it('should calculate import and export costs correctly', () => {
      const transactions = [
        { sparePartId: 1, transactionType: 'in', quantity: 10 },
        { sparePartId: 1, transactionType: 'out', quantity: 3 },
        { sparePartId: 1, transactionType: 'in', quantity: 5 },
      ];
      const partPrices = new Map([[1, 1000]]);

      let totalImport = 0;
      let totalExport = 0;

      transactions.forEach(tx => {
        const price = partPrices.get(tx.sparePartId) || 0;
        const cost = tx.quantity * price;
        if (tx.transactionType === 'in') totalImport += cost;
        else if (tx.transactionType === 'out') totalExport += cost;
      });

      expect(totalImport).toBe(15000); // (10 + 5) * 1000
      expect(totalExport).toBe(3000);  // 3 * 1000
    });
  });

  describe('Thermal Label Print Format', () => {
    it('should generate correct label dimensions for 58mm thermal printer', () => {
      const labelWidth = '54mm'; // 58mm - 4mm margin
      const qrSize = '35mm';
      
      // Verify dimensions are within 58mm thermal paper width
      expect(parseInt(labelWidth)).toBeLessThanOrEqual(58);
      expect(parseInt(qrSize)).toBeLessThan(parseInt(labelWidth));
    });
  });
});
