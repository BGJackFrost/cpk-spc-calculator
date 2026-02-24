import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { oeeRecords, workOrders, machines, maintenanceSchedules } from "../../drizzle/schema";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";

export const reportRouter = router({
  // Generate OEE Report Data
  generateOEEReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      machineId: z.number().optional(),
      format: z.enum(["json", "csv"]).default("json"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      let query = db!
        .select({
          id: oeeRecords.id,
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          recordDate: oeeRecords.recordDate,
          availability: oeeRecords.availability,
          performance: oeeRecords.performance,
          quality: oeeRecords.quality,
          oee: oeeRecords.oee,
          plannedProductionTime: oeeRecords.plannedProductionTime,
          actualRunTime: oeeRecords.actualRunTime,
          totalCount: oeeRecords.totalCount,
          goodCount: oeeRecords.goodCount,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(
          and(
            gte(oeeRecords.recordDate, new Date(input.startDate)),
            lte(oeeRecords.recordDate, new Date(input.endDate)),
            input.machineId ? eq(oeeRecords.machineId, input.machineId) : undefined
          )
        )
        .orderBy(desc(oeeRecords.recordDate));

      const records = await query;

      // Calculate summary
      const summary = {
        totalRecords: records.length,
        avgOEE: records.length > 0 ? records.reduce((sum, r) => sum + Number(r.oee || 0), 0) / records.length : 0,
        avgAvailability: records.length > 0 ? records.reduce((sum, r) => sum + Number(r.availability || 0), 0) / records.length : 0,
        avgPerformance: records.length > 0 ? records.reduce((sum, r) => sum + Number(r.performance || 0), 0) / records.length : 0,
        avgQuality: records.length > 0 ? records.reduce((sum, r) => sum + Number(r.quality || 0), 0) / records.length : 0,
        period: { start: input.startDate, end: input.endDate },
      };

      if (input.format === "csv") {
        const headers = ["ID", "Máy", "Ngày", "Availability", "Performance", "Quality", "OEE"];
        const rows = records.map(r => [
          r.id,
          r.machineName || "",
          r.recordDate ? new Date(r.recordDate).toISOString().split('T')[0] : "",
          r.availability || "",
          r.performance || "",
          r.quality || "",
          r.oee || "",
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        return { format: "csv", data: csv, summary };
      }

      return { format: "json", data: records, summary };
    }),

  // Generate Maintenance Report Data
  generateMaintenanceReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      machineId: z.number().optional(),
      type: z.enum(["all", "preventive", "corrective", "predictive"]).default("all"),
      format: z.enum(["json", "csv"]).default("json"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      let query = db!
        .select({
          id: workOrders.id,
          machineId: workOrders.machineId,
          machineName: machines.name,
          title: workOrders.title,
          description: workOrders.description,
          maintenanceTypeId: workOrders.maintenanceTypeId,
          priority: workOrders.priority,
          status: workOrders.status,
          scheduledDate: workOrders.scheduledStartAt,
          completedDate: workOrders.completedAt,
          // Note: duration fields may need to be added to schema
        })
        .from(workOrders)
        .leftJoin(machines, eq(workOrders.machineId, machines.id))
        .where(
          and(
            gte(workOrders.scheduledStartAt, new Date(input.startDate)),
            lte(workOrders.scheduledStartAt, new Date(input.endDate)),
            input.machineId ? eq(workOrders.machineId, input.machineId) : undefined,
            // Filter by type if needed
          )
        )
        .orderBy(desc(workOrders.scheduledStartAt));

      const records = await query;

      // Calculate summary
      const completed = records.filter(r => r.status === "completed");
      const summary = {
        totalWorkOrders: records.length,
        completed: completed.length,
        pending: records.filter(r => r.status === "pending").length,
        inProgress: records.filter(r => r.status === "in_progress").length,
        completionRate: records.length > 0 ? (completed.length / records.length) * 100 : 0,
        avgActualHours: 0,
        byType: {
          preventive: records.filter(r => r.maintenanceTypeId === 1).length,
          corrective: records.filter(r => r.maintenanceTypeId === 2).length,
          predictive: records.filter(r => r.maintenanceTypeId === 3).length,
        },
        period: { start: input.startDate, end: input.endDate },
      };

      if (input.format === "csv") {
        const headers = ["ID", "Máy", "Tiêu đề", "Loại", "Ưu tiên", "Trạng thái", "Ngày lên lịch", "Ngày hoàn thành", "Giờ dự kiến", "Giờ thực tế"];
        const rows = records.map(r => [
          r.id,
          r.machineName || "",
          r.title || "",
          r.maintenanceTypeId || "",
          r.priority || "",
          r.status || "",
          r.scheduledDate ? new Date(r.scheduledDate).toISOString().split('T')[0] : "",
          r.completedDate ? new Date(r.completedDate).toISOString().split('T')[0] : "",
          "",
          "",
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        return { format: "csv", data: csv, summary };
      }

      return { format: "json", data: records, summary };
    }),

  // Generate KPI Summary Report
  generateKPISummary: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Get OEE data
      const oeeData = await db!
        .select({
          avgOEE: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
          totalRecords: sql<number>`COUNT(*)`,
        })
        .from(oeeRecords)
        .where(
          and(
            gte(oeeRecords.recordDate, new Date(input.startDate)),
            lte(oeeRecords.recordDate, new Date(input.endDate))
          )
        );

      // Get maintenance data
      const maintenanceData = await db!
        .select({
          totalWorkOrders: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END)`,
          preventive: sql<number>`SUM(CASE WHEN ${workOrders.maintenanceTypeId} = 1 THEN 1 ELSE 0 END)`,
          corrective: sql<number>`SUM(CASE WHEN ${workOrders.maintenanceTypeId} = 2 THEN 1 ELSE 0 END)`,
          avgActualHours: sql<number>`0`,
        })
        .from(workOrders)
        .where(
          and(
            gte(workOrders.scheduledStartAt, new Date(input.startDate)),
            lte(workOrders.scheduledStartAt, new Date(input.endDate))
          )
        );

      // Get machine count
      const machineCount = await db!
        .select({ count: sql<number>`COUNT(*)` })
        .from(machines);

      return {
        period: { start: input.startDate, end: input.endDate },
        oee: {
          avgOEE: Number(oeeData[0]?.avgOEE || 0),
          avgAvailability: Number(oeeData[0]?.avgAvailability || 0),
          avgPerformance: Number(oeeData[0]?.avgPerformance || 0),
          avgQuality: Number(oeeData[0]?.avgQuality || 0),
          totalRecords: Number(oeeData[0]?.totalRecords || 0),
        },
        maintenance: {
          totalWorkOrders: Number(maintenanceData[0]?.totalWorkOrders || 0),
          completed: Number(maintenanceData[0]?.completed || 0),
          preventive: Number(maintenanceData[0]?.preventive || 0),
          corrective: Number(maintenanceData[0]?.corrective || 0),
          avgActualHours: Number(maintenanceData[0]?.avgActualHours || 0),
          completionRate: maintenanceData[0]?.totalWorkOrders 
            ? (Number(maintenanceData[0]?.completed || 0) / Number(maintenanceData[0]?.totalWorkOrders)) * 100 
            : 0,
          preventiveRatio: maintenanceData[0]?.totalWorkOrders
            ? (Number(maintenanceData[0]?.preventive || 0) / Number(maintenanceData[0]?.totalWorkOrders)) * 100
            : 0,
        },
        machines: {
          total: Number(machineCount[0]?.count || 0),
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  // Get CPK Trend Data over time
  getCpkTrend: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
      productionLineId: z.number().optional(),
      workshopId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [] };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      try {
        // Query CPK data from spc_analysis_history grouped by date
        let query = `
          SELECT 
            DATE(created_at) as date,
            AVG(cpk) as avgCpk,
            MIN(cpk) as minCpk,
            MAX(cpk) as maxCpk,
            COUNT(*) as count
          FROM spc_analysis_history
          WHERE created_at >= ?
            AND cpk IS NOT NULL
        `;
        const params: any[] = [startDate.toISOString().split('T')[0]];

        if (input.productionLineId) {
          query += ` AND production_line_id = ?`;
          params.push(input.productionLineId);
        }

        query += ` GROUP BY DATE(created_at) ORDER BY date ASC`;

        const [rows] = await db.execute(query, params);
        
        const data = (rows as any[]).map(row => ({
          date: row.date,
          avgCpk: parseFloat(row.avgCpk) || 0,
          minCpk: parseFloat(row.minCpk) || 0,
          maxCpk: parseFloat(row.maxCpk) || 0,
          count: parseInt(row.count) || 0,
        }));

        return { data };
      } catch (error) {
        console.error("[Report] Failed to get CPK trend:", error);
        return { data: [] };
      }
    }),
});
