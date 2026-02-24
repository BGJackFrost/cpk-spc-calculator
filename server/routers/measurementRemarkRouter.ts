import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { measurementRemarks, inspectionRemarks, machineMeasurementData, machineInspectionData } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================
// Measurement & Inspection Remarks Router
// Quản lý ghi chú cho các điểm đo và kết quả kiểm tra
// ============================================

export const measurementRemarkRouter = router({
  // ============ MEASUREMENT REMARKS ============
  
  // List remarks for a measurement
  listMeasurementRemarks: protectedProcedure
    .input(z.object({
      measurementId: z.number(),
      measurementType: z.enum(['machine_measurement', 'spc_analysis', 'inspection']),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const remarks = await db.select()
        .from(measurementRemarks)
        .where(and(
          eq(measurementRemarks.measurementId, input.measurementId),
          eq(measurementRemarks.measurementType, input.measurementType)
        ))
        .orderBy(desc(measurementRemarks.createdAt));
      
      return remarks;
    }),

  // Add remark to measurement
  addMeasurementRemark: protectedProcedure
    .input(z.object({
      measurementId: z.number(),
      measurementType: z.enum(['machine_measurement', 'spc_analysis', 'inspection']),
      remark: z.string().min(1),
      remarkType: z.enum(['note', 'issue', 'correction', 'observation', 'action']).default('note'),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
      imageUrls: z.array(z.string()).optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [result] = await db.insert(measurementRemarks).values({
        measurementId: input.measurementId,
        measurementType: input.measurementType,
        remark: input.remark,
        remarkType: input.remarkType,
        severity: input.severity,
        imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
        attachmentUrls: input.attachmentUrls ? JSON.stringify(input.attachmentUrls) : null,
        createdBy: ctx.user?.id || null,
        createdByName: ctx.user?.name || null,
      });
      
      // Also update the remark field in the measurement table if it's machine_measurement
      if (input.measurementType === 'machine_measurement') {
        await db.update(machineMeasurementData)
          .set({ remark: input.remark })
          .where(eq(machineMeasurementData.id, input.measurementId));
      }
      
      return { id: result.insertId, message: 'Remark added successfully' };
    }),

  // Update remark
  updateMeasurementRemark: protectedProcedure
    .input(z.object({
      id: z.number(),
      remark: z.string().min(1).optional(),
      remarkType: z.enum(['note', 'issue', 'correction', 'observation', 'action']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      imageUrls: z.array(z.string()).optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { id, ...updateData } = input;
      
      await db.update(measurementRemarks)
        .set({
          ...updateData,
          imageUrls: updateData.imageUrls ? JSON.stringify(updateData.imageUrls) : undefined,
          attachmentUrls: updateData.attachmentUrls ? JSON.stringify(updateData.attachmentUrls) : undefined,
        })
        .where(eq(measurementRemarks.id, id));
      
      return { success: true, message: 'Remark updated successfully' };
    }),

  // Delete remark
  deleteMeasurementRemark: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db.delete(measurementRemarks).where(eq(measurementRemarks.id, input.id));
      return { success: true, message: 'Remark deleted successfully' };
    }),

  // ============ INSPECTION REMARKS ============
  
  // List remarks for an inspection
  listInspectionRemarks: protectedProcedure
    .input(z.object({
      inspectionId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const remarks = await db.select()
        .from(inspectionRemarks)
        .where(eq(inspectionRemarks.inspectionId, input.inspectionId))
        .orderBy(desc(inspectionRemarks.createdAt));
      
      return remarks;
    }),

  // Add remark to inspection
  addInspectionRemark: protectedProcedure
    .input(z.object({
      inspectionId: z.number(),
      remark: z.string().min(1),
      remarkType: z.enum(['note', 'defect_detail', 'root_cause', 'corrective_action', 'observation']).default('note'),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
      defectCategory: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [result] = await db.insert(inspectionRemarks).values({
        inspectionId: input.inspectionId,
        remark: input.remark,
        remarkType: input.remarkType,
        severity: input.severity,
        defectCategory: input.defectCategory || null,
        imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
        attachmentUrls: input.attachmentUrls ? JSON.stringify(input.attachmentUrls) : null,
        createdBy: ctx.user?.id || null,
        createdByName: ctx.user?.name || null,
      });
      
      // Also update the remark field in the inspection table
      await db.update(machineInspectionData)
        .set({ remark: input.remark })
        .where(eq(machineInspectionData.id, input.inspectionId));
      
      return { id: result.insertId, message: 'Inspection remark added successfully' };
    }),

  // Update inspection remark
  updateInspectionRemark: protectedProcedure
    .input(z.object({
      id: z.number(),
      remark: z.string().min(1).optional(),
      remarkType: z.enum(['note', 'defect_detail', 'root_cause', 'corrective_action', 'observation']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      defectCategory: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { id, ...updateData } = input;
      
      await db.update(inspectionRemarks)
        .set({
          ...updateData,
          imageUrls: updateData.imageUrls ? JSON.stringify(updateData.imageUrls) : undefined,
          attachmentUrls: updateData.attachmentUrls ? JSON.stringify(updateData.attachmentUrls) : undefined,
        })
        .where(eq(inspectionRemarks.id, id));
      
      return { success: true, message: 'Inspection remark updated successfully' };
    }),

  // Delete inspection remark
  deleteInspectionRemark: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db.delete(inspectionRemarks).where(eq(inspectionRemarks.id, input.id));
      return { success: true, message: 'Inspection remark deleted successfully' };
    }),

  // ============ BULK OPERATIONS ============
  
  // Get all remarks for multiple measurements
  getBulkMeasurementRemarks: protectedProcedure
    .input(z.object({
      measurementIds: z.array(z.number()),
      measurementType: z.enum(['machine_measurement', 'spc_analysis', 'inspection']),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.measurementIds.length === 0) return [];
      
      const remarks = await db.select()
        .from(measurementRemarks)
        .where(and(
          sql`${measurementRemarks.measurementId} IN (${sql.join(input.measurementIds.map(id => sql`${id}`), sql`, `)})`,
          eq(measurementRemarks.measurementType, input.measurementType)
        ))
        .orderBy(desc(measurementRemarks.createdAt));
      
      return remarks;
    }),

  // Get remarks statistics
  getRemarkStatistics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { measurementRemarks: {}, inspectionRemarks: {} };
      
      const [measurementStats, inspectionStats] = await Promise.all([
        db.select({
          total: sql<number>`count(*)`,
          issues: sql<number>`sum(case when remark_type = 'issue' then 1 else 0 end)`,
          corrections: sql<number>`sum(case when remark_type = 'correction' then 1 else 0 end)`,
          critical: sql<number>`sum(case when severity = 'critical' then 1 else 0 end)`,
          warning: sql<number>`sum(case when severity = 'warning' then 1 else 0 end)`,
        }).from(measurementRemarks),
        db.select({
          total: sql<number>`count(*)`,
          defectDetails: sql<number>`sum(case when remark_type = 'defect_detail' then 1 else 0 end)`,
          rootCauses: sql<number>`sum(case when remark_type = 'root_cause' then 1 else 0 end)`,
          correctiveActions: sql<number>`sum(case when remark_type = 'corrective_action' then 1 else 0 end)`,
          critical: sql<number>`sum(case when severity = 'critical' then 1 else 0 end)`,
        }).from(inspectionRemarks),
      ]);
      
      return {
        measurementRemarks: measurementStats[0] || {},
        inspectionRemarks: inspectionStats[0] || {},
      };
    }),
});

export type MeasurementRemarkRouter = typeof measurementRemarkRouter;
