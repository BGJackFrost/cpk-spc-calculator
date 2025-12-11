import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
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
      machineType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      installDate: z.date().optional(),
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
      machineType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
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
