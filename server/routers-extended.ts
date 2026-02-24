import { protectedProcedure, adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { userDashboardConfigs, productionLines, products, spcAnalysisHistory } from "../drizzle/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  createProductionLine,
  getProductionLines,
  getProductionLineById,
  updateProductionLine,
  deleteProductionLine,
  createWorkstation,
  getWorkstationsByLine,
  updateWorkstation,
  deleteWorkstation,
  createMachine,
  getMachinesByWorkstation,
  updateMachine,
  deleteMachine,
  getSpcRulesConfig,
  upsertSpcRulesConfig,
  getSamplingConfigs,
  getSamplingConfigById,
  createSamplingConfig,
  updateSamplingConfig,
  deleteSamplingConfig,
  getDashboardConfig,
  upsertDashboardConfig,
  getDashboardLineSelections,
  setDashboardLineSelections,
} from "./db";

// Production Line Router (with caching)
export const productionLineRouter = router({
  list: protectedProcedure.query(async () => {
    const { getCachedProductionLines } = await import('./services/cachedQueries');
    return await getCachedProductionLines();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getCachedProductionLineById } = await import('./services/cachedQueries');
      return await getCachedProductionLineById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      description: z.string().optional(),
      location: z.string().optional(),
      imageUrl: z.string().optional(),
      productId: z.number().optional(),
      processTemplateId: z.number().optional(),
      supervisorId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const id = await createProductionLine({
        ...input,
        createdBy: ctx.user.id,
      });
      const { invalidateProductionLineCache } = await import('./services/cachedQueries');
      invalidateProductionLineCache();
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      imageUrl: z.string().optional(),
      productId: z.number().optional(),
      processTemplateId: z.number().optional(),
      supervisorId: z.number().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const { id, ...data } = input;
      await updateProductionLine(id, data);
      const { invalidateProductionLineCache } = await import('./services/cachedQueries');
      invalidateProductionLineCache();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteProductionLine(input.id);
      const { invalidateProductionLineCache } = await import('./services/cachedQueries');
      invalidateProductionLineCache();
      return { success: true };
    }),

  listMachines: protectedProcedure
    .input(z.object({ lineId: z.number() }))
    .query(async ({ input }) => {
      const { getProductionLineMachines } = await import("./db");
      return await getProductionLineMachines(input.lineId);
    }),

  addMachine: protectedProcedure
    .input(z.object({ lineId: z.number(), machineId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Admin access required");
      const { addProductionLineMachine } = await import("./db");
      await addProductionLineMachine(input.lineId, input.machineId, ctx.user.id);
      return { success: true };
    }),

  removeMachine: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Admin access required");
      const { removeProductionLineMachine } = await import("./db");
      await removeProductionLineMachine(input.id);
      return { success: true };
    }),
});

// Workstation Router (with caching)
export const workstationRouter = router({
  listAll: protectedProcedure.query(async () => {
    const { getCachedWorkstations } = await import('./services/cachedQueries');
    return await getCachedWorkstations();
  }),

  listByLine: protectedProcedure
    .input(z.object({ productionLineId: z.number() }))
    .query(async ({ input }) => {
      const { getCachedWorkstationsByLine } = await import('./services/cachedQueries');
      return await getCachedWorkstationsByLine(input.productionLineId);
    }),

  create: protectedProcedure
    .input(z.object({
      productionLineId: z.number(),
      name: z.string().min(1),
      code: z.string().min(1),
      description: z.string().optional(),
      sequenceOrder: z.number().optional(),
      cycleTime: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const id = await createWorkstation(input);
      const { invalidateWorkstationCache } = await import('./services/cachedQueries');
      invalidateWorkstationCache();
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      sequenceOrder: z.number().optional(),
      cycleTime: z.number().optional(),
      imageUrl: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const { id, ...data } = input;
      await updateWorkstation(id, data);
      const { invalidateWorkstationCache } = await import('./services/cachedQueries');
      invalidateWorkstationCache();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteWorkstation(input.id);
      const { invalidateWorkstationCache } = await import('./services/cachedQueries');
      invalidateWorkstationCache();
      return { success: true };
    }),
});

// Machine Router (with caching)
export const machineRouter = router({
  list: protectedProcedure.query(async () => {
    const { getCachedMachines } = await import('./services/cachedQueries');
    return await getCachedMachines();
  }),

  listAll: protectedProcedure.query(async () => {
    const { getCachedMachines } = await import('./services/cachedQueries');
    return await getCachedMachines();
  }),

  listByWorkstation: protectedProcedure
    .input(z.object({ workstationId: z.number() }))
    .query(async ({ input }) => {
      const { getCachedMachinesByWorkstation } = await import('./services/cachedQueries');
      return await getCachedMachinesByWorkstation(input.workstationId);
    }),

  create: protectedProcedure
    .input(z.object({
      workstationId: z.number(),
      name: z.string().min(1),
      code: z.string().min(1),
      machineTypeId: z.number().optional(),
      machineType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      installDate: z.date().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const id = await createMachine(input);
      const { invalidateMachineCache } = await import('./services/cachedQueries');
      invalidateMachineCache();
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      machineTypeId: z.number().nullable().optional(),
      machineType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      imageUrl: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const { id, ...data } = input;
      await updateMachine(id, data);
      const { invalidateMachineCache } = await import('./services/cachedQueries');
      invalidateMachineCache();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteMachine(input.id);
      const { invalidateMachineCache } = await import('./services/cachedQueries');
      invalidateMachineCache();
      return { success: true };
    }),

  // BOM (Bill of Materials) endpoints
  getBom: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom, spareParts } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const bomItems = await db.select({
        id: machineBom.id,
        machineId: machineBom.machineId,
        sparePartId: machineBom.sparePartId,
        quantity: machineBom.quantity,
        isRequired: machineBom.isRequired,
        replacementInterval: machineBom.replacementInterval,
        notes: machineBom.notes,
        sparePartCode: spareParts.partNumber,
        sparePartName: spareParts.name,
        sparePartUnit: spareParts.unit,
        minStock: spareParts.minStock,
        unitPrice: spareParts.unitPrice,
      })
      .from(machineBom)
      .leftJoin(spareParts, eq(machineBom.sparePartId, spareParts.id))
      .where(eq(machineBom.machineId, input.machineId));
      
      // Get current stock from inventory
      const { sparePartsInventory } = await import("../drizzle/schema");
      const inventoryData = await db.select().from(sparePartsInventory);
      const inventoryMap = new Map(inventoryData.map(inv => [inv.sparePartId, inv.quantity]));
      
      return bomItems.map(item => ({
        ...item,
        currentStock: inventoryMap.get(item.sparePartId) || 0,
      }));
    }),

  addBomItem: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      sparePartId: z.number(),
      quantity: z.number().min(1).default(1),
      isRequired: z.number().default(1),
      replacementInterval: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "manager") {
        throw new Error("Admin or Manager access required");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom } = await import("../drizzle/schema");
      
      const result = await db.insert(machineBom).values(input);
      return { id: Number(result[0].insertId) };
    }),

  updateBomItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.number().min(1).optional(),
      isRequired: z.number().optional(),
      replacementInterval: z.number().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "manager") {
        throw new Error("Admin or Manager access required");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const { id, ...data } = input;
      await db.update(machineBom).set(data).where(eq(machineBom.id, id));
      return { success: true };
    }),

  deleteBomItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "manager") {
        throw new Error("Admin or Manager access required");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(machineBom).where(eq(machineBom.id, input.id));
      return { success: true };
    }),

  getBomSummary: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom, spareParts, sparePartsInventory } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      // Get BOM items with inventory
      const bomItems = await db.select({
        sparePartId: machineBom.sparePartId,
        quantity: machineBom.quantity,
        isRequired: machineBom.isRequired,
        minStock: spareParts.minStock,
        unitPrice: spareParts.unitPrice,
      })
      .from(machineBom)
      .leftJoin(spareParts, eq(machineBom.sparePartId, spareParts.id))
      .where(eq(machineBom.machineId, input.machineId));
      
      // Get inventory data
      const inventoryData = await db.select().from(sparePartsInventory);
      const inventoryMap = new Map(inventoryData.map(inv => [inv.sparePartId, inv.quantity || 0]));
      
      let totalItems = bomItems.length;
      let requiredItems = 0;
      let lowStockItems = 0;
      let totalValue = 0;
      
      bomItems.forEach(item => {
        if (item.isRequired === 1) requiredItems++;
        const currentStock = inventoryMap.get(item.sparePartId) || 0;
        if (currentStock < (item.minStock || 0)) lowStockItems++;
        totalValue += item.quantity * Number(item.unitPrice || 0);
      });
      
      return { totalItems, requiredItems, lowStockItems, totalValue };
    }),

  exportBomExcel: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom, spareParts, machines, sparePartsInventory } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      // Get machine info
      const machineInfo = await db.select().from(machines).where(eq(machines.id, input.machineId));
      if (!machineInfo.length) throw new Error("Machine not found");
      
      // Get BOM items with spare part details
      const bomItems = await db.select({
        id: machineBom.id,
        sparePartId: machineBom.sparePartId,
        quantity: machineBom.quantity,
        isRequired: machineBom.isRequired,
        replacementInterval: machineBom.replacementInterval,
        notes: machineBom.notes,
        partNumber: spareParts.partNumber,
        partName: spareParts.name,
        category: spareParts.category,
        unitPrice: spareParts.unitPrice,
        unit: spareParts.unit,
        minStock: spareParts.minStock,
      })
      .from(machineBom)
      .leftJoin(spareParts, eq(machineBom.sparePartId, spareParts.id))
      .where(eq(machineBom.machineId, input.machineId));
      
      // Get inventory
      const inventory = await db.select().from(sparePartsInventory);
      const inventoryMap = new Map(inventory.map(i => [i.sparePartId, i.quantity]));
      
      // Generate Excel using xlsx
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet("BOM");
      
      // Header info
      worksheet.addRow([`BOM - ${machineInfo[0].name} (${machineInfo[0].code})`]);
      worksheet.addRow([`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`]);
      worksheet.addRow([]);
      
      // Column headers
      worksheet.addRow(["STT", "Mã phụ tùng", "Tên phụ tùng", "Danh mục", "Số lượng cần", "Đơn vị", "Tồn kho", "Bắt buộc", "Chu kỳ thay thế", "Đơn giá", "Thành tiền", "Ghi chú"]);
      
      // Style header row
      const headerRow = worksheet.getRow(4);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      
      // Data rows
      let totalValue = 0;
      bomItems.forEach((item, index) => {
        const currentStock = inventoryMap.get(item.sparePartId) || 0;
        const itemTotal = item.quantity * Number(item.unitPrice || 0);
        totalValue += itemTotal;
        
        const row = worksheet.addRow([
          index + 1,
          item.partNumber || "",
          item.partName || "",
          item.category || "",
          item.quantity,
          item.unit || "Cái",
          currentStock,
          item.isRequired === 1 ? "Có" : "Không",
          item.replacementInterval ? `${item.replacementInterval} ngày` : "-",
          Number(item.unitPrice || 0).toLocaleString("vi-VN"),
          itemTotal.toLocaleString("vi-VN"),
          item.notes || "",
        ]);
        
        // Highlight low stock
        if (currentStock < item.quantity) {
          row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCCCC" } };
        }
      });
      
      // Total row
      worksheet.addRow([]);
      const totalRow = worksheet.addRow(["", "", "", "", "", "", "", "", "", "Tổng cộng:", totalValue.toLocaleString("vi-VN") + " VNĐ", ""]);
      totalRow.font = { bold: true };
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      
      return {
        filename: `BOM_${machineInfo[0].code}_${new Date().toISOString().split("T")[0]}.xlsx`,
        data: base64,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }),

  exportBomPdf: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { machineBom, spareParts, machines, sparePartsInventory } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      // Get machine info
      const machineInfo = await db.select().from(machines).where(eq(machines.id, input.machineId));
      if (!machineInfo.length) throw new Error("Machine not found");
      
      // Get BOM items
      const bomItems = await db.select({
        id: machineBom.id,
        sparePartId: machineBom.sparePartId,
        quantity: machineBom.quantity,
        isRequired: machineBom.isRequired,
        replacementInterval: machineBom.replacementInterval,
        notes: machineBom.notes,
        partNumber: spareParts.partNumber,
        partName: spareParts.name,
        category: spareParts.category,
        unitPrice: spareParts.unitPrice,
        unit: spareParts.unit,
      })
      .from(machineBom)
      .leftJoin(spareParts, eq(machineBom.sparePartId, spareParts.id))
      .where(eq(machineBom.machineId, input.machineId));
      
      // Get inventory
      const inventory = await db.select().from(sparePartsInventory);
      const inventoryMap = new Map(inventory.map(i => [i.sparePartId, i.quantity]));
      
      // Generate HTML for PDF
      let totalValue = 0;
      const tableRows = bomItems.map((item, index) => {
        const currentStock = inventoryMap.get(item.sparePartId) || 0;
        const itemTotal = item.quantity * Number(item.unitPrice || 0);
        totalValue += itemTotal;
        const lowStock = currentStock < item.quantity;
        
        return `
          <tr style="${lowStock ? "background-color: #ffcccc;" : ""}">
            <td>${index + 1}</td>
            <td>${item.partNumber || "-"}</td>
            <td>${item.partName || "-"}</td>
            <td>${item.quantity}</td>
            <td>${item.unit || "Cái"}</td>
            <td>${currentStock}</td>
            <td>${item.isRequired === 1 ? "Có" : "Không"}</td>
            <td>${Number(item.unitPrice || 0).toLocaleString("vi-VN")}</td>
            <td>${itemTotal.toLocaleString("vi-VN")}</td>
          </tr>
        `;
      }).join("");
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .info { margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #007bff; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total { font-weight: bold; text-align: right; margin-top: 20px; font-size: 14px; }
            .footer { margin-top: 30px; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <h1>DANH SÁCH PHỤ TÙNG (BOM)</h1>
          <div class="info">
            <p><strong>Máy:</strong> ${machineInfo[0].name} (${machineInfo[0].code})</p>
            <p><strong>Ngày xuất:</strong> ${new Date().toLocaleDateString("vi-VN")}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã PT</th>
                <th>Tên phụ tùng</th>
                <th>SL cần</th>
                <th>ĐVT</th>
                <th>Tồn kho</th>
                <th>Bắt buộc</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <p class="total">Tổng giá trị: ${totalValue.toLocaleString("vi-VN")} VNĐ</p>
          <div class="footer">
            <p>* Các dòng nền đỏ: Tồn kho thấp hơn số lượng cần</p>
            <p>Xuất bởi Hệ thống CPK/SPC</p>
          </div>
        </body>
        </html>
      `;
      
      return {
        filename: `BOM_${machineInfo[0].code}_${new Date().toISOString().split("T")[0]}.html`,
        data: Buffer.from(html).toString("base64"),
        mimeType: "text/html",
        html: html,
      };
    }),
});

// SPC Rules Router
export const spcRulesRouter = router({
  get: protectedProcedure
    .input(z.object({ mappingId: z.number().optional() }))
    .query(async ({ input }) => {
      return await getSpcRulesConfig(input.mappingId);
    }),

  upsert: protectedProcedure
    .input(z.object({
      mappingId: z.number().optional(),
      rule1Enabled: z.number().optional(),
      rule2Enabled: z.number().optional(),
      rule3Enabled: z.number().optional(),
      rule4Enabled: z.number().optional(),
      rule5Enabled: z.number().optional(),
      rule6Enabled: z.number().optional(),
      rule7Enabled: z.number().optional(),
      rule8Enabled: z.number().optional(),
      caRulesEnabled: z.number().optional(),
      caThreshold: z.number().optional(),
      cpkExcellent: z.number().optional(),
      cpkGood: z.number().optional(),
      cpkAcceptable: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const id = await upsertSpcRulesConfig(input);
      return { id, success: true };
    }),
});

// Sampling Config Router
export const samplingRouter = router({
  list: protectedProcedure.query(async () => {
    return await getSamplingConfigs();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getSamplingConfigById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      mappingId: z.number().optional(),
      name: z.string().min(1),
      timeUnit: z.enum(["year", "month", "week", "day", "hour", "minute", "second"]),
      sampleSize: z.number().default(5),
      subgroupSize: z.number().default(5),
      intervalValue: z.number().default(30),
      intervalUnit: z.enum(["year", "month", "week", "day", "hour", "minute", "second"]),
      autoSampling: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const id = await createSamplingConfig(input);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      timeUnit: z.enum(["year", "month", "week", "day", "hour", "minute", "second"]).optional(),
      sampleSize: z.number().optional(),
      subgroupSize: z.number().optional(),
      intervalValue: z.number().optional(),
      intervalUnit: z.enum(["year", "month", "week", "day", "hour", "minute", "second"]).optional(),
      autoSampling: z.number().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const { id, ...data } = input;
      await updateSamplingConfig(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteSamplingConfig(input.id);
      return { success: true };
    }),
});

// Dashboard Router
export const dashboardRouter = router({
  // Public stats for landing page (no auth required)
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalProductionLines: 0,
        totalProducts: 0,
        totalAnalyses: 0,
      };
    }
    try {
      const [linesResult, productsResult, analysesResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(productionLines),
        db.select({ count: sql<number>`count(*)` }).from(products),
        db.select({ count: sql<number>`count(*)` }).from(spcAnalysisHistory),
      ]);
      return {
        totalProductionLines: Number(linesResult[0]?.count || 0),
        totalProducts: Number(productsResult[0]?.count || 0),
        totalAnalyses: Number(analysesResult[0]?.count || 0),
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalProductionLines: 0,
        totalProducts: 0,
        totalAnalyses: 0,
      };
    }
  }),

  getConfig: protectedProcedure.query(async ({ ctx }) => {
    return await getDashboardConfig(ctx.user?.id || 0);
  }),

  upsertConfig: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      displayCount: z.number().optional(),
      refreshInterval: z.number().optional(),
      layout: z.enum(["grid", "list"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await upsertDashboardConfig({
        userId: ctx.user?.id || 0,
        name: input.name || "Default Dashboard",
        displayCount: input.displayCount || 4,
        refreshInterval: input.refreshInterval || 30,
        layout: input.layout || "grid",
      });
      return { id, success: true };
    }),

  getLineSelections: protectedProcedure
    .input(z.object({ dashboardConfigId: z.number() }))
    .query(async ({ input }) => {
      return await getDashboardLineSelections(input.dashboardConfigId);
    }),

  setLineSelections: protectedProcedure
    .input(z.object({
      dashboardConfigId: z.number(),
      selections: z.array(z.object({
        productionLineId: z.number(),
        displayOrder: z.number(),
        showXbarChart: z.number().optional(),
        showRChart: z.number().optional(),
        showCpk: z.number().optional(),
        showMean: z.number().optional(),
        showUclLcl: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      const selectionsWithDashboardId = input.selections.map(s => ({
        dashboardConfigId: input.dashboardConfigId,
        ...s,
      }));
      await setDashboardLineSelections(input.dashboardConfigId, selectionsWithDashboardId);
      return { success: true };
    }),

  // Lấy dữ liệu realtime cho SPC Plan
  getRealtimeData: protectedProcedure
    .input(z.object({
      planId: z.number(),
    }))
    .query(async ({ input }) => {
      // Lấy lịch sử phân tích gần nhất cho plan này
      const { getRecentAnalysisForPlan } = await import("./db");
      const recentAnalysis = await getRecentAnalysisForPlan(input.planId, 20);
      
      if (recentAnalysis.length === 0) {
        return {
          hasData: false,
          data: [],
          cpk: null,
          mean: null,
          ucl: null,
          lcl: null,
          usl: null,
          lsl: null,
        };
      }

      // Lấy phân tích mới nhất
      const latest = recentAnalysis[0];
      
      // Chuyển dữ liệu thành format cho chart
      const chartData = recentAnalysis.map((a: { id: number; mean: number | null; createdAt: Date }, index: number) => ({
        index: recentAnalysis.length - index,
        value: a.mean ? a.mean / 1000 : 0,
        timestamp: a.createdAt,
      })).reverse();

      return {
        hasData: true,
        data: chartData,
        cpk: latest.cpk ? latest.cpk / 1000 : null,
        mean: latest.mean ? latest.mean / 1000 : null,
        ucl: latest.ucl ? latest.ucl / 1000 : null,
        lcl: latest.lcl ? latest.lcl / 1000 : null,
        usl: latest.usl,
        lsl: latest.lsl,
        sampleCount: latest.sampleCount,
        stdDev: latest.stdDev ? latest.stdDev / 1000 : null,
        lastUpdated: latest.createdAt,
      };
    }),

  // API: Lấy dữ liệu so sánh hiệu suất các dây chuyền
  getLinePerformanceComparison: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { lines: [], avgOee: 0, avgCpk: 0 };
      }

      try {
        // Lấy danh sách dây chuyền
        const lines = await db.select().from(productionLines).limit(20);
        
        // Tạo dữ liệu mẫu cho mỗi dây chuyền
        const lineData = lines.map((line, index) => {
          // Tạo dữ liệu ngẫu nhiên nhưng nhất quán theo id
          const seed = line.id * 17 + index;
          const oee = 65 + (seed % 30);
          const cpk = 0.8 + ((seed % 100) / 100) * 1.2;
          const availability = 70 + (seed % 25);
          const performance = 75 + (seed % 20);
          const quality = 90 + (seed % 10);
          const defectRate = Math.max(0, 5 - (seed % 5));
          
          return {
            id: line.id,
            name: line.name,
            avgOee: oee,
            avgCpk: cpk,
            availability,
            performance,
            quality,
            avgDefectRate: defectRate,
            totalOutput: 1000 + (seed % 5000),
            efficiency: oee,
          };
        });

        const avgOee = lineData.reduce((sum, l) => sum + l.avgOee, 0) / (lineData.length || 1);
        const avgCpk = lineData.reduce((sum, l) => sum + l.avgCpk, 0) / (lineData.length || 1);

        return { lines: lineData, avgOee, avgCpk };
      } catch (error) {
        console.error('Error getting line performance:', error);
        return { lines: [], avgOee: 0, avgCpk: 0 };
      }
    }),

  // API: Lấy xu hướng hiệu suất theo thời gian
  getLinePerformanceTrend: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { trends: [] };
      }

      try {
        const lines = await db.select().from(productionLines).limit(5);
        const trends: any[] = [];

        for (let i = 0; i < input.days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (input.days - 1 - i));
          const dateStr = date.toISOString().split('T')[0];
          
          const dataPoint: any = { date: dateStr };
          lines.forEach((line, idx) => {
            // Tạo dữ liệu xu hướng ngẫu nhiên nhưng nhất quán
            const seed = line.id * 17 + i * 7 + idx;
            dataPoint[line.name] = 70 + (seed % 25) + Math.sin(i / 3) * 5;
          });
          trends.push(dataPoint);
        }

        return { trends };
      } catch (error) {
        console.error('Error getting line trend:', error);
        return { trends: [] };
      }
    }),
});

// Dashboard Config Router - Cấu hình widget cho user
export const dashboardConfigRouter = router({
  // Lấy cấu hình dashboard của user
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [
      { widgetKey: "mapping_count", isVisible: 1, displayOrder: 0 },
      { widgetKey: "recent_analysis", isVisible: 1, displayOrder: 1 },
      { widgetKey: "cpk_alerts", isVisible: 1, displayOrder: 2 },
      { widgetKey: "system_status", isVisible: 1, displayOrder: 3 },
      { widgetKey: "quick_actions", isVisible: 1, displayOrder: 4 },
    ];
    
    const configs = await db.select()
      .from(userDashboardConfigs)
      .where(eq(userDashboardConfigs.userId, ctx.user.id))
      .orderBy(asc(userDashboardConfigs.displayOrder));
    
    // Nếu chưa có config, trả về default
    if (configs.length === 0) {
      return [
        { widgetKey: "mapping_count", isVisible: 1, displayOrder: 0 },
        { widgetKey: "recent_analysis", isVisible: 1, displayOrder: 1 },
        { widgetKey: "cpk_alerts", isVisible: 1, displayOrder: 2 },
        { widgetKey: "system_status", isVisible: 1, displayOrder: 3 },
        { widgetKey: "quick_actions", isVisible: 1, displayOrder: 4 },
      ];
    }
    return configs;
  }),

  // Cập nhật cấu hình widget
  update: protectedProcedure
    .input(z.object({
      widgets: z.array(z.object({
        widgetKey: z.string(),
        isVisible: z.number(),
        displayOrder: z.number(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Xóa config cũ và thêm mới
      await db.delete(userDashboardConfigs)
        .where(eq(userDashboardConfigs.userId, ctx.user.id));
      
      for (const widget of input.widgets) {
        await db.insert(userDashboardConfigs).values({
          userId: ctx.user.id,
          widgetKey: widget.widgetKey,
          isVisible: widget.isVisible,
          displayOrder: widget.displayOrder,
        });
      }
      
      return { success: true };
    }),

  // Toggle visibility của một widget
  toggleWidget: protectedProcedure
    .input(z.object({
      widgetKey: z.string(),
      isVisible: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Kiểm tra xem đã có config chưa
      const existing = await db.select()
        .from(userDashboardConfigs)
        .where(and(
          eq(userDashboardConfigs.userId, ctx.user.id),
          eq(userDashboardConfigs.widgetKey, input.widgetKey)
        ));
      
      if (existing.length > 0) {
        await db.update(userDashboardConfigs)
          .set({ isVisible: input.isVisible ? 1 : 0 })
          .where(and(
            eq(userDashboardConfigs.userId, ctx.user.id),
            eq(userDashboardConfigs.widgetKey, input.widgetKey)
          ));
      } else {
        await db.insert(userDashboardConfigs).values({
          userId: ctx.user.id,
          widgetKey: input.widgetKey,
          isVisible: input.isVisible ? 1 : 0,
          displayOrder: 99,
        });
      }
      
      return { success: true };
    }),
});

// Report Router - Báo cáo tổng hợp SPC
export const reportRouter = router({
  // Xuất báo cáo Excel
  exportExcel: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { getSpcAnalysisReport } = await import("./db");
      const data = await getSpcAnalysisReport(input.startDate, input.endDate);
      
      // Transform data for Excel
      const excelData = data.map(d => ({
        'Ngày': new Date(d.createdAt).toLocaleString('vi-VN'),
        'Mã sản phẩm': d.productCode,
        'Trạm': d.stationName,
        'Số mẫu': d.sampleCount,
        'Mean': d.mean ? (d.mean / 1000).toFixed(4) : '',
        'Std Dev': d.stdDev ? (d.stdDev / 1000).toFixed(4) : '',
        'Cp': d.cp ? (d.cp / 1000).toFixed(3) : '',
        'Cpk': d.cpk ? (d.cpk / 1000).toFixed(3) : '',
        'UCL': d.ucl ? (d.ucl / 1000).toFixed(4) : '',
        'LCL': d.lcl ? (d.lcl / 1000).toFixed(4) : '',
        'USL': d.usl?.toString() || '',
        'LSL': d.lsl?.toString() || '',
        'Cảnh báo': d.alertTriggered ? 'Có' : 'Không',
      }));
      
      return { data: excelData };
    }),

  // Lấy trend CPK theo ngày
  getCpkTrend: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const { getCpkTrendByDay } = await import("./db");
      return await getCpkTrendByDay(input.days);
    }),

  // Lấy báo cáo SPC theo khoảng thời gian
  getSpcReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { getSpcAnalysisReport } = await import("./db");
      const data = await getSpcAnalysisReport(input.startDate, input.endDate, input.productionLineId);
      
      // Tính toán thống kê tổng hợp
      const totalSamples = data.length;
      const cpkValues = data.filter(d => d.cpk).map(d => (d.cpk || 0) / 1000);
      const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;
      const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : 0;
      const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : 0;
      const violationCount = cpkValues.filter(c => c < 1.0).length;
      const warningCount = cpkValues.filter(c => c >= 1.0 && c < 1.33).length;
      const goodCount = cpkValues.filter(c => c >= 1.33).length;
      
      // Group by ca làm việc (sáng: 6-14, chiều: 14-22, tối: 22-6)
      const byShift: Record<string, number[]> = { morning: [], afternoon: [], night: [] };
      for (const d of data) {
        const hour = new Date(d.createdAt).getHours();
        const cpk = d.cpk ? d.cpk / 1000 : null;
        if (cpk !== null) {
          if (hour >= 6 && hour < 14) byShift.morning.push(cpk);
          else if (hour >= 14 && hour < 22) byShift.afternoon.push(cpk);
          else byShift.night.push(cpk);
        }
      }
      
      const shiftStats = {
        morning: {
          count: byShift.morning.length,
          avgCpk: byShift.morning.length > 0 ? byShift.morning.reduce((a, b) => a + b, 0) / byShift.morning.length : 0,
        },
        afternoon: {
          count: byShift.afternoon.length,
          avgCpk: byShift.afternoon.length > 0 ? byShift.afternoon.reduce((a, b) => a + b, 0) / byShift.afternoon.length : 0,
        },
        night: {
          count: byShift.night.length,
          avgCpk: byShift.night.length > 0 ? byShift.night.reduce((a, b) => a + b, 0) / byShift.night.length : 0,
        },
      };
      
      return {
        summary: {
          totalSamples,
          avgCpk,
          minCpk,
          maxCpk,
          violationCount,
          warningCount,
          goodCount,
        },
        shiftStats,
        data: data.map(d => ({
          ...d,
          cpk: d.cpk ? d.cpk / 1000 : null,
          mean: d.mean ? d.mean / 1000 : null,
          stdDev: d.stdDev ? d.stdDev / 1000 : null,
          ucl: d.ucl ? d.ucl / 1000 : null,
          lcl: d.lcl ? d.lcl / 1000 : null,
        })),
      };
    }),

  // Xuất báo cáo PDF với biểu đồ thực tế
  exportPdfWithCharts: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      productionLineId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getSpcAnalysisReport, getCpkTrendByDay } = await import("./db");
      const { generateAndUploadSpcReport } = await import("./services/pdfReportGenerator");
      
      // Lấy dữ liệu báo cáo
      const data = await getSpcAnalysisReport(input.startDate, input.endDate, input.productionLineId);
      
      // Tính số ngày
      const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Lấy trend CPK
      const cpkTrend = await getCpkTrendByDay(days);
      
      // Tính toán thống kê
      const cpkValues = data.filter(d => d.cpk).map(d => (d.cpk || 0) / 1000);
      const totalSamples = data.length;
      const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;
      const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : 0;
      const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : 0;
      const violationCount = cpkValues.filter(c => c < 1.0).length;
      const warningCount = cpkValues.filter(c => c >= 1.0 && c < 1.33).length;
      const goodCount = cpkValues.filter(c => c >= 1.33).length;
      
      // Group by ca làm việc
      const byShift: Record<string, number[]> = { morning: [], afternoon: [], night: [] };
      for (const d of data) {
        const hour = new Date(d.createdAt).getHours();
        const cpk = d.cpk ? d.cpk / 1000 : null;
        if (cpk !== null) {
          if (hour >= 6 && hour < 14) byShift.morning.push(cpk);
          else if (hour >= 14 && hour < 22) byShift.afternoon.push(cpk);
          else byShift.night.push(cpk);
        }
      }
      
      const shiftStats = {
        morning: {
          count: byShift.morning.length,
          avgCpk: byShift.morning.length > 0 ? byShift.morning.reduce((a, b) => a + b, 0) / byShift.morning.length : 0,
        },
        afternoon: {
          count: byShift.afternoon.length,
          avgCpk: byShift.afternoon.length > 0 ? byShift.afternoon.reduce((a, b) => a + b, 0) / byShift.afternoon.length : 0,
        },
        night: {
          count: byShift.night.length,
          avgCpk: byShift.night.length > 0 ? byShift.night.reduce((a, b) => a + b, 0) / byShift.night.length : 0,
        },
      };
      
      // Format date range string
      const dateRangeStr = `${input.startDate.toLocaleDateString('vi-VN')} - ${input.endDate.toLocaleDateString('vi-VN')}`;
      
      // Generate PDF
      const result = await generateAndUploadSpcReport({
        title: 'BÁO CÁO TỔNG HỢP SPC',
        dateRange: dateRangeStr,
        generatedAt: new Date(),
        summary: {
          totalSamples,
          avgCpk,
          minCpk,
          maxCpk,
          violationCount,
          warningCount,
          goodCount,
        },
        shiftStats,
        cpkTrend: cpkTrend.map(t => ({
          date: t.date,
          cpk: t.avgCpk,
        })),
      }, ctx.user.id);
      
      return result;
    }),
});
