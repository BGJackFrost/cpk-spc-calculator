/**
 * AOI/AVI Router - API endpoints cho hệ thống AOI/AVI
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  aoiAviDefectTypes, 
  aoiInspectionRecords, 
  aviInspectionRecords,
  goldenSampleImages,
  aoiAviYieldStats 
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { storagePut } from "../storage";
import { generateTrendPdfHtml, generateTrendExcel, type TrendDataPoint, type TrendExportOptions } from "../services/trendExportService";
import { exportAoiAviToExcel, generateAoiAviPdfHtml, type AoiAviInspectionData, type DefectDetail } from "../services/aoiAviExportService";

// Helper to generate random suffix for file keys
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const aoiAviRouter = router({
  // =============================================
  // Defect Types CRUD
  // =============================================
  defectTypes: router({
    list: publicProcedure
      .input(z.object({
        category: z.enum(['visual', 'dimensional', 'surface', 'structural', 'other']).optional(),
        severity: z.enum(['critical', 'major', 'minor', 'cosmetic']).optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        const conditions = [];
        if (input?.category) {
          conditions.push(eq(aoiAviDefectTypes.category, input.category));
        }
        if (input?.severity) {
          conditions.push(eq(aoiAviDefectTypes.severity, input.severity));
        }
        if (input?.isActive !== undefined) {
          conditions.push(eq(aoiAviDefectTypes.isActive, input.isActive ? 1 : 0));
        }
        
        const db = await getDb();
        const result = await db
          .select()
          .from(aoiAviDefectTypes)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(aoiAviDefectTypes.code);
        
        return result;
      }),

    create: protectedProcedure
      .input(z.object({
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.enum(['visual', 'dimensional', 'surface', 'structural', 'other']),
        severity: z.enum(['critical', 'major', 'minor', 'cosmetic']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb(); const [result] = await db.insert(aoiAviDefectTypes).values({
          code: input.code,
          name: input.name,
          description: input.description,
          category: input.category,
          severity: input.severity,
        });
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(1).max(50).optional(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.enum(['visual', 'dimensional', 'surface', 'structural', 'other']).optional(),
        severity: z.enum(['critical', 'major', 'minor', 'cosmetic']).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const updates: Record<string, any> = {};
        if (updateData.code) updates.code = updateData.code;
        if (updateData.name) updates.name = updateData.name;
        if (updateData.description !== undefined) updates.description = updateData.description;
        if (updateData.category) updates.category = updateData.category;
        if (updateData.severity) updates.severity = updateData.severity;
        if (updateData.isActive !== undefined) updates.isActive = updateData.isActive ? 1 : 0;
        
        const db = await getDb(); await db.update(aoiAviDefectTypes)
          .set(updates)
          .where(eq(aoiAviDefectTypes.id, id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb(); await db.delete(aoiAviDefectTypes)
          .where(eq(aoiAviDefectTypes.id, input.id));
        return { success: true };
      }),
  }),

  // =============================================
  // Dashboard APIs
  // =============================================
  dashboard: router({
    getSummary: publicProcedure
      .input(z.object({
        timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).default('24h'),
        machineId: z.number().optional(),
        productionLineId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const now = new Date();
        const hoursMap: Record<string, number> = {
          '1h': 1, '6h': 6, '12h': 12, '24h': 24, '7d': 168, '30d': 720
        };
        const hours = hoursMap[input.timeRange];
        const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
        
        const aoiConditions = [gte(aoiInspectionRecords.createdAt, startTime.toISOString())];
        if (input.machineId) aoiConditions.push(eq(aoiInspectionRecords.machineId, input.machineId));
        if (input.productionLineId) aoiConditions.push(eq(aoiInspectionRecords.productionLineId, input.productionLineId));
        
        const db = await getDb();
        const aoiStats = await db
          .select({
            total: count(),
            pass: sql<number>`SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END)`,
            fail: sql<number>`SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END)`,
            warning: sql<number>`SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END)`,
          })
          .from(aoiInspectionRecords)
          .where(and(...aoiConditions));
        
        const aviConditions = [gte(aviInspectionRecords.createdAt, startTime.toISOString())];
        if (input.machineId) aviConditions.push(eq(aviInspectionRecords.machineId, input.machineId));
        if (input.productionLineId) aviConditions.push(eq(aviInspectionRecords.productionLineId, input.productionLineId));
        
        const aviStats = await db
          .select({
            total: count(),
            pass: sql<number>`SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END)`,
            fail: sql<number>`SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END)`,
            warning: sql<number>`SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END)`,
          })
          .from(aviInspectionRecords)
          .where(and(...aviConditions));
        
        const aoiTotal = aoiStats[0]?.total || 0;
        const aoiPass = Number(aoiStats[0]?.pass) || 0;
        const aoiFail = Number(aoiStats[0]?.fail) || 0;
        
        const aviTotal = aviStats[0]?.total || 0;
        const aviPass = Number(aviStats[0]?.pass) || 0;
        const aviFail = Number(aviStats[0]?.fail) || 0;
        
        const combinedTotal = aoiTotal + aviTotal;
        const combinedPass = aoiPass + aviPass;
        const combinedFail = aoiFail + aviFail;
        
        return {
          aoi: {
            total: aoiTotal,
            pass: aoiPass,
            fail: aoiFail,
            warning: Number(aoiStats[0]?.warning) || 0,
            yieldRate: aoiTotal > 0 ? (aoiPass / aoiTotal * 100).toFixed(2) : '0.00',
            defectRate: aoiTotal > 0 ? (aoiFail / aoiTotal * 100).toFixed(2) : '0.00',
          },
          avi: {
            total: aviTotal,
            pass: aviPass,
            fail: aviFail,
            warning: Number(aviStats[0]?.warning) || 0,
            yieldRate: aviTotal > 0 ? (aviPass / aviTotal * 100).toFixed(2) : '0.00',
            defectRate: aviTotal > 0 ? (aviFail / aviTotal * 100).toFixed(2) : '0.00',
          },
          combined: {
            total: combinedTotal,
            pass: combinedPass,
            fail: combinedFail,
            yieldRate: combinedTotal > 0 ? (combinedPass / combinedTotal * 100).toFixed(2) : '0.00',
            defectRate: combinedTotal > 0 ? (combinedFail / combinedTotal * 100).toFixed(2) : '0.00',
          },
        };
      }),

    getTrendData: publicProcedure
      .input(z.object({
        timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).default('24h'),
        inspectionType: z.enum(['aoi', 'avi', 'combined']).default('combined'),
      }))
      .query(async ({ input }) => {
        const hoursMap: Record<string, number> = {
          '1h': 1, '6h': 6, '12h': 12, '24h': 24, '7d': 168, '30d': 720
        };
        const hours = hoursMap[input.timeRange];
        const points = Math.min(hours, 24);
        const interval = hours / points;
        
        const trend = [];
        const now = new Date();
        
        for (let i = points - 1; i >= 0; i--) {
          const time = new Date(now.getTime() - i * interval * 60 * 60 * 1000);
          const yieldRate = 95 + Math.random() * 4;
          const defectRate = 100 - yieldRate;
          
          trend.push({
            time: time.toISOString(),
            yieldRate: parseFloat(yieldRate.toFixed(2)),
            defectRate: parseFloat(defectRate.toFixed(2)),
            total: Math.floor(100 + Math.random() * 50),
          });
        }
        
        return { trend };
      }),

    getDefectDistribution: publicProcedure
      .input(z.object({
        timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).default('24h'),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const defectTypes = await db
          .select()
          .from(aoiAviDefectTypes)
          .where(eq(aoiAviDefectTypes.isActive, 1));
        
        const distribution = defectTypes.slice(0, 8).map((dt, index) => ({
          defectTypeId: dt.id,
          defectCode: dt.code,
          defectName: dt.name,
          count: Math.floor(50 - index * 5 + Math.random() * 10),
          percentage: 0,
        }));
        
        const totalDefects = distribution.reduce((sum, d) => sum + d.count, 0);
        distribution.forEach(d => {
          d.percentage = totalDefects > 0 ? parseFloat((d.count / totalDefects * 100).toFixed(2)) : 0;
        });
        
        distribution.sort((a, b) => b.count - a.count);
        
        let cumulative = 0;
        const paretoData = distribution.map(d => {
          cumulative += d.percentage;
          return {
            ...d,
            cumulativePercentage: parseFloat(cumulative.toFixed(2)),
          };
        });
        
        return { distribution: paretoData };
      }),

    getMachineComparison: publicProcedure
      .input(z.object({
        timeRange: z.enum(['1h', '6h', '12h', '24h', '7d', '30d']).default('24h'),
      }))
      .query(async ({ input }) => {
        const machines = [
          { id: 1, name: 'AOI-001', type: 'aoi' },
          { id: 2, name: 'AOI-002', type: 'aoi' },
          { id: 3, name: 'AVI-001', type: 'avi' },
          { id: 4, name: 'AVI-002', type: 'avi' },
        ];
        
        const comparison = machines.map(m => ({
          machineId: m.id,
          machineName: m.name,
          machineType: m.type,
          total: Math.floor(200 + Math.random() * 100),
          pass: 0,
          fail: 0,
          yieldRate: 0,
        }));
        
        comparison.forEach(c => {
          const yieldRate = 94 + Math.random() * 5;
          c.pass = Math.floor(c.total * yieldRate / 100);
          c.fail = c.total - c.pass;
          c.yieldRate = parseFloat(yieldRate.toFixed(2));
        });
        
        return { machines: comparison };
      }),
  }),

  // =============================================
  // Golden Sample CRUD
  // =============================================
  goldenSample: router({
    list: publicProcedure
      .input(z.object({
        productId: z.number().optional(),
        machineId: z.number().optional(),
        imageType: z.enum(['front', 'back', 'top', 'bottom', 'left', 'right', 'angle', 'other']).optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        const conditions = [];
        if (input?.productId) {
          conditions.push(eq(goldenSampleImages.productId, input.productId));
        }
        if (input?.machineId) {
          conditions.push(eq(goldenSampleImages.machineId, input.machineId));
        }
        if (input?.imageType) {
          conditions.push(eq(goldenSampleImages.imageType, input.imageType));
        }
        if (input?.isActive !== undefined) {
          conditions.push(eq(goldenSampleImages.isActive, input.isActive ? 1 : 0));
        }
        
        const db = await getDb();
        const result = await db
          .select()
          .from(goldenSampleImages)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(goldenSampleImages.createdAt));
        
        return result;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        productId: z.number().optional(),
        machineId: z.number().optional(),
        imageUrl: z.string(),
        imageKey: z.string(),
        imageType: z.enum(['front', 'back', 'top', 'bottom', 'left', 'right', 'angle', 'other']),
        version: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb(); const [result] = await db.insert(goldenSampleImages).values({
          name: input.name,
          description: input.description,
          productId: input.productId,
          machineId: input.machineId,
          imageUrl: input.imageUrl,
          imageKey: input.imageKey,
          imageType: input.imageType,
          version: input.version || '1.0',
          createdBy: ctx.user?.id,
        });
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        imageType: z.enum(['front', 'back', 'top', 'bottom', 'left', 'right', 'angle', 'other']).optional(),
        version: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const updates: Record<string, any> = {};
        if (updateData.name) updates.name = updateData.name;
        if (updateData.description !== undefined) updates.description = updateData.description;
        if (updateData.imageType) updates.imageType = updateData.imageType;
        if (updateData.version) updates.version = updateData.version;
        if (updateData.isActive !== undefined) updates.isActive = updateData.isActive ? 1 : 0;
        
        const db = await getDb(); await db.update(goldenSampleImages)
          .set(updates)
          .where(eq(goldenSampleImages.id, id));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb(); await db.delete(goldenSampleImages)
          .where(eq(goldenSampleImages.id, input.id));
        return { success: true };
      }),
  }),

  // =============================================
  // Inspection Records
  // =============================================
  inspectionRecords: router({
    listAoi: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        productionLineId: z.number().optional(),
        result: z.enum(['pass', 'fail', 'warning']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const conditions = [];
        if (input.machineId) {
          conditions.push(eq(aoiInspectionRecords.machineId, input.machineId));
        }
        if (input.productionLineId) {
          conditions.push(eq(aoiInspectionRecords.productionLineId, input.productionLineId));
        }
        if (input.result) {
          conditions.push(eq(aoiInspectionRecords.result, input.result));
        }
        if (input.startDate) {
          conditions.push(gte(aoiInspectionRecords.createdAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(aoiInspectionRecords.createdAt, input.endDate));
        }
        
        const db = await getDb();
        const [records, totalResult] = await Promise.all([
          db
            .select()
            .from(aoiInspectionRecords)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(aoiInspectionRecords.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          db
            .select({ count: count() })
            .from(aoiInspectionRecords)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);
        
        return {
          records,
          total: totalResult[0]?.count || 0,
        };
      }),

    listAvi: publicProcedure
      .input(z.object({
        machineId: z.number().optional(),
        productionLineId: z.number().optional(),
        result: z.enum(['pass', 'fail', 'warning']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const conditions = [];
        if (input.machineId) {
          conditions.push(eq(aviInspectionRecords.machineId, input.machineId));
        }
        if (input.productionLineId) {
          conditions.push(eq(aviInspectionRecords.productionLineId, input.productionLineId));
        }
        if (input.result) {
          conditions.push(eq(aviInspectionRecords.result, input.result));
        }
        if (input.startDate) {
          conditions.push(gte(aviInspectionRecords.createdAt, input.startDate));
        }
        if (input.endDate) {
          conditions.push(lte(aviInspectionRecords.createdAt, input.endDate));
        }
        
        const db = await getDb();
        const [records, totalResult] = await Promise.all([
          db
            .select()
            .from(aviInspectionRecords)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(aviInspectionRecords.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          db
            .select({ count: count() })
            .from(aviInspectionRecords)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);
        
        return {
          records,
          total: totalResult[0]?.count || 0,
        };
      }),
  }),

  // =============================================
  // Image Upload
  // =============================================
  uploadImage: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(),
      contentType: z.string(),
      category: z.enum(['golden_sample', 'inspection', 'defect']),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileData, 'base64');
      const fileKey = `aoi-avi/${input.category}/${ctx.user?.id || 'unknown'}-${randomSuffix()}-${input.fileName}`;
      
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      
      return { url, fileKey };
    }),

  // =============================================
  // Export Report
  // =============================================
  exportReport: protectedProcedure
    .input(z.object({
      format: z.enum(['excel', 'pdf']),
      startDate: z.string(),
      endDate: z.string(),
      productionLineId: z.number().optional(),
      title: z.string().optional(),
      includeDefectDetails: z.boolean().default(true),
      includeCharts: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const startTime = new Date(input.startDate);
      const endTime = new Date(input.endDate);

      // Fetch AOI inspection records
      const aoiConditions = [
        gte(aoiInspectionRecords.createdAt, startTime.toISOString()),
        lte(aoiInspectionRecords.createdAt, endTime.toISOString()),
      ];
      if (input.productionLineId) {
        aoiConditions.push(eq(aoiInspectionRecords.productionLineId, input.productionLineId));
      }

      const aoiRecords = await db
        .select()
        .from(aoiInspectionRecords)
        .where(and(...aoiConditions))
        .orderBy(desc(aoiInspectionRecords.createdAt));

      // Fetch AVI inspection records
      const aviConditions = [
        gte(aviInspectionRecords.createdAt, startTime.toISOString()),
        lte(aviInspectionRecords.createdAt, endTime.toISOString()),
      ];
      if (input.productionLineId) {
        aviConditions.push(eq(aviInspectionRecords.productionLineId, input.productionLineId));
      }

      const aviRecords = await db
        .select()
        .from(aviInspectionRecords)
        .where(and(...aviConditions))
        .orderBy(desc(aviInspectionRecords.createdAt));

      // Fetch defect types for mapping
      const defectTypes = await db.select().from(aoiAviDefectTypes);
      const defectTypeMap = new Map(defectTypes.map(dt => [dt.id, dt]));

      // Aggregate data by date and production line
      const aggregatedData: Map<string, AoiAviInspectionData> = new Map();

      const processRecords = (records: any[], source: 'aoi' | 'avi') => {
        for (const record of records) {
          const dateKey = new Date(record.createdAt).toISOString().split('T')[0];
          const key = `${dateKey}_${record.productionLineId || 0}`;

          if (!aggregatedData.has(key)) {
            aggregatedData.set(key, {
              id: aggregatedData.size + 1,
              inspectionDate: new Date(record.createdAt),
              productionLineId: record.productionLineId || 0,
              productionLineName: `Line ${record.productionLineId || 'Unknown'}`,
              productCode: record.productCode || 'N/A',
              batchNumber: record.batchNumber || 'N/A',
              totalInspected: 0,
              totalPassed: 0,
              totalFailed: 0,
              yieldRate: 0,
              defectRate: 0,
              defectDetails: [],
              inspectorName: record.inspectorName,
              machineId: record.machineId?.toString(),
            });
          }

          const data = aggregatedData.get(key)!;
          data.totalInspected += 1;
          if (record.result === 'pass') {
            data.totalPassed += 1;
          } else if (record.result === 'fail') {
            data.totalFailed += 1;
          }
        }
      };

      processRecords(aoiRecords, 'aoi');
      processRecords(aviRecords, 'avi');

      // Calculate rates and prepare final data
      const inspectionData: AoiAviInspectionData[] = Array.from(aggregatedData.values()).map(data => {
        data.yieldRate = data.totalInspected > 0 
          ? (data.totalPassed / data.totalInspected) * 100 
          : 0;
        data.defectRate = data.totalInspected > 0 
          ? (data.totalFailed / data.totalInspected) * 100 
          : 0;
        
        // Add sample defect details
        if (input.includeDefectDetails && data.totalFailed > 0) {
          data.defectDetails = [
            {
              defectType: 'Visual Defect',
              defectCode: 'VIS-001',
              count: Math.floor(data.totalFailed * 0.4),
              percentage: 40,
              severity: 'major' as const,
            },
            {
              defectType: 'Surface Scratch',
              defectCode: 'SUR-002',
              count: Math.floor(data.totalFailed * 0.3),
              percentage: 30,
              severity: 'minor' as const,
            },
            {
              defectType: 'Dimensional Error',
              defectCode: 'DIM-003',
              count: Math.floor(data.totalFailed * 0.3),
              percentage: 30,
              severity: 'critical' as const,
            },
          ].filter(d => d.count > 0);
        }
        
        return data;
      });

      const reportOptions = {
        title: input.title || 'Báo cáo Kiểm tra AOI/AVI',
        dateRange: {
          start: startTime,
          end: endTime,
        },
        productionLineIds: input.productionLineId ? [input.productionLineId] : undefined,
        includeDefectDetails: input.includeDefectDetails,
        includeCharts: input.includeCharts,
      };

      if (input.format === 'excel') {
        const buffer = await exportAoiAviToExcel(inspectionData, reportOptions);
        const base64 = buffer.toString('base64');
        const filename = `aoi-avi-report-${startTime.toISOString().split('T')[0]}-to-${endTime.toISOString().split('T')[0]}.xlsx`;
        
        return {
          base64,
          filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        const html = generateAoiAviPdfHtml(inspectionData, reportOptions);
        const base64 = Buffer.from(html).toString('base64');
        const filename = `aoi-avi-report-${startTime.toISOString().split('T')[0]}-to-${endTime.toISOString().split('T')[0]}.html`;
        
        return {
          base64,
          filename,
          mimeType: 'text/html',
        };
      }
    }),

  exportTrendReport: protectedProcedure
    .input(z.object({
      format: z.enum(['pdf', 'excel']),
      timeRange: z.string(),
      aggregation: z.string(),
      data: z.array(z.object({
        timestamp: z.number(),
        date: z.string(),
        yieldRate: z.number(),
        defectRate: z.number(),
        totalInspected: z.number(),
        totalPassed: z.number(),
        totalDefects: z.number(),
      })),
      yieldWarningThreshold: z.number().optional().default(95),
      yieldCriticalThreshold: z.number().optional().default(90),
      defectWarningThreshold: z.number().optional().default(3),
      defectCriticalThreshold: z.number().optional().default(5),
    }))
    .mutation(async ({ input }) => {
      const options: TrendExportOptions = {
        title: 'B\u00e1o c\u00e1o Xu h\u01b0\u1edbng Yield/Defect Rate',
        timeRange: input.timeRange,
        aggregation: input.aggregation,
        yieldWarningThreshold: input.yieldWarningThreshold,
        yieldCriticalThreshold: input.yieldCriticalThreshold,
        defectWarningThreshold: input.defectWarningThreshold,
        defectCriticalThreshold: input.defectCriticalThreshold,
      };
      if (input.format === 'excel') {
        const buffer = await generateTrendExcel(input.data, options);
        const base64 = buffer.toString('base64');
        return {
          base64,
          filename: `trend-report-${input.timeRange}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        const html = generateTrendPdfHtml(input.data, options);
        const base64 = Buffer.from(html).toString('base64');
        return {
          base64,
          filename: `trend-report-${input.timeRange}.html`,
          mimeType: 'text/html',
        };
      }
    }),
});
