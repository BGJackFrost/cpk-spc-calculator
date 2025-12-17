import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { userDashboardConfigs } from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
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

// Production Line Router
export const productionLineRouter = router({
  list: protectedProcedure.query(async () => {
    return await getProductionLines();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductionLineById(input.id);
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
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteProductionLine(input.id);
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

// Workstation Router
export const workstationRouter = router({
  listAll: protectedProcedure.query(async () => {
    const { getAllWorkstations } = await import("./db");
    return await getAllWorkstations();
  }),

  listByLine: protectedProcedure
    .input(z.object({ productionLineId: z.number() }))
    .query(async ({ input }) => {
      return await getWorkstationsByLine(input.productionLineId);
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
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteWorkstation(input.id);
      return { success: true };
    }),
});

// Machine Router
export const machineRouter = router({
  listAll: protectedProcedure.query(async () => {
    const { getAllMachines } = await import("./db");
    return await getAllMachines();
  }),

  listByWorkstation: protectedProcedure
    .input(z.object({ workstationId: z.number() }))
    .query(async ({ input }) => {
      return await getMachinesByWorkstation(input.workstationId);
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
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Admin access required");
      }
      await deleteMachine(input.id);
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
});
