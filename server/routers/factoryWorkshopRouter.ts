import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { factories, workshops, productionLines } from "../../drizzle/schema";
import { eq, desc, and, like, sql, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ============================================
// Factory & Workshop Router
// Quản lý cấu trúc phân cấp: Factory → Workshop → ProductionLine → Workstation → Machine
// ============================================

export const factoryWorkshopRouter = router({
  // ============ FACTORY CRUD ============
  
  // List all factories
  listFactories: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      
      const { search, status, page = 1, pageSize = 20 } = input || {};
      
      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(factories.name, `%${search}%`),
            like(factories.code, `%${search}%`),
            like(factories.city, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(factories.status, status));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const [data, countResult] = await Promise.all([
        db.select()
          .from(factories)
          .where(whereClause)
          .orderBy(desc(factories.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ count: sql<number>`count(*)` })
          .from(factories)
          .where(whereClause)
      ]);
      
      return {
        data,
        total: countResult[0]?.count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize)
      };
    }),

  // Get factory by ID
  getFactory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [factory] = await db.select()
        .from(factories)
        .where(eq(factories.id, input.id))
        .limit(1);
      
      if (!factory) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Factory not found' });
      }
      
      // Get workshops count
      const [workshopCount] = await db.select({ count: sql<number>`count(*)` })
        .from(workshops)
        .where(eq(workshops.factoryId, input.id));
      
      // Get production lines count
      const [lineCount] = await db.select({ count: sql<number>`count(*)` })
        .from(productionLines)
        .where(eq(productionLines.factoryId, input.id));
      
      return {
        ...factory,
        workshopCount: workshopCount?.count || 0,
        productionLineCount: lineCount?.count || 0
      };
    }),

  // Create factory
  createFactory: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      timezone: z.string().default('Asia/Ho_Chi_Minh'),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal('')),
      logoUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      capacity: z.number().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Check if code already exists
      const [existing] = await db.select()
        .from(factories)
        .where(eq(factories.code, input.code))
        .limit(1);
      
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Factory code already exists' });
      }
      
      const [result] = await db.insert(factories).values({
        ...input,
        contactEmail: input.contactEmail || null,
        latitude: input.latitude?.toString() || null,
        longitude: input.longitude?.toString() || null,
        createdBy: ctx.user?.id || null,
      });
      
      return { id: result.insertId, message: 'Factory created successfully' };
    }),

  // Update factory
  updateFactory: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      timezone: z.string().optional(),
      contactPerson: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal('')),
      logoUrl: z.string().optional(),
      imageUrl: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      capacity: z.number().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { id, ...updateData } = input;
      
      // Check if factory exists
      const [existing] = await db.select()
        .from(factories)
        .where(eq(factories.id, id))
        .limit(1);
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Factory not found' });
      }
      
      // Check code uniqueness if updating code
      if (updateData.code && updateData.code !== existing.code) {
        const [codeExists] = await db.select()
          .from(factories)
          .where(eq(factories.code, updateData.code))
          .limit(1);
        
        if (codeExists) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Factory code already exists' });
        }
      }
      
      await db.update(factories)
        .set({
          ...updateData,
          contactEmail: updateData.contactEmail || null,
          latitude: updateData.latitude?.toString() || undefined,
          longitude: updateData.longitude?.toString() || undefined,
        })
        .where(eq(factories.id, id));
      
      return { success: true, message: 'Factory updated successfully' };
    }),

  // Delete factory
  deleteFactory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Check if factory has workshops
      const [workshopCount] = await db.select({ count: sql<number>`count(*)` })
        .from(workshops)
        .where(eq(workshops.factoryId, input.id));
      
      if ((workshopCount?.count || 0) > 0) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: 'Cannot delete factory with existing workshops. Please delete workshops first.' 
        });
      }
      
      await db.delete(factories).where(eq(factories.id, input.id));
      
      return { success: true, message: 'Factory deleted successfully' };
    }),

  // ============ WORKSHOP CRUD ============
  
  // List workshops
  listWorkshops: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
      search: z.string().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      
      const { factoryId, search, status, page = 1, pageSize = 20 } = input || {};
      
      const conditions = [];
      if (factoryId) {
        conditions.push(eq(workshops.factoryId, factoryId));
      }
      if (search) {
        conditions.push(
          or(
            like(workshops.name, `%${search}%`),
            like(workshops.code, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(workshops.status, status));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const [data, countResult] = await Promise.all([
        db.select({
          workshop: workshops,
          factoryName: factories.name,
          factoryCode: factories.code,
        })
          .from(workshops)
          .leftJoin(factories, eq(workshops.factoryId, factories.id))
          .where(whereClause)
          .orderBy(desc(workshops.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ count: sql<number>`count(*)` })
          .from(workshops)
          .where(whereClause)
      ]);
      
      return {
        data: data.map(d => ({
          ...d.workshop,
          factoryName: d.factoryName,
          factoryCode: d.factoryCode,
        })),
        total: countResult[0]?.count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((countResult[0]?.count || 0) / pageSize)
      };
    }),

  // Get workshop by ID
  getWorkshop: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [result] = await db.select({
        workshop: workshops,
        factoryName: factories.name,
        factoryCode: factories.code,
      })
        .from(workshops)
        .leftJoin(factories, eq(workshops.factoryId, factories.id))
        .where(eq(workshops.id, input.id))
        .limit(1);
      
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workshop not found' });
      }
      
      // Get production lines count
      const [lineCount] = await db.select({ count: sql<number>`count(*)` })
        .from(productionLines)
        .where(eq(productionLines.workshopId, input.id));
      
      return {
        ...result.workshop,
        factoryName: result.factoryName,
        factoryCode: result.factoryCode,
        productionLineCount: lineCount?.count || 0
      };
    }),

  // Create workshop
  createWorkshop: protectedProcedure
    .input(z.object({
      factoryId: z.number(),
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      floor: z.string().optional(),
      building: z.string().optional(),
      area: z.number().optional(),
      areaUnit: z.string().default('m2'),
      capacity: z.number().optional(),
      managerName: z.string().optional(),
      managerPhone: z.string().optional(),
      managerEmail: z.string().email().optional().or(z.literal('')),
      imageUrl: z.string().optional(),
      floorPlanUrl: z.string().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Check if factory exists
      const [factory] = await db.select()
        .from(factories)
        .where(eq(factories.id, input.factoryId))
        .limit(1);
      
      if (!factory) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Factory not found' });
      }
      
      // Check if code already exists in this factory
      const [existing] = await db.select()
        .from(workshops)
        .where(and(
          eq(workshops.factoryId, input.factoryId),
          eq(workshops.code, input.code)
        ))
        .limit(1);
      
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Workshop code already exists in this factory' });
      }
      
      const [result] = await db.insert(workshops).values({
        ...input,
        managerEmail: input.managerEmail || null,
        area: input.area?.toString() || null,
        createdBy: ctx.user?.id || null,
      });
      
      return { id: result.insertId, message: 'Workshop created successfully' };
    }),

  // Update workshop
  updateWorkshop: protectedProcedure
    .input(z.object({
      id: z.number(),
      factoryId: z.number().optional(),
      code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      floor: z.string().optional(),
      building: z.string().optional(),
      area: z.number().optional(),
      areaUnit: z.string().optional(),
      capacity: z.number().optional(),
      managerName: z.string().optional(),
      managerPhone: z.string().optional(),
      managerEmail: z.string().email().optional().or(z.literal('')),
      imageUrl: z.string().optional(),
      floorPlanUrl: z.string().optional(),
      status: z.enum(['active', 'inactive', 'maintenance']).optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { id, ...updateData } = input;
      
      // Check if workshop exists
      const [existing] = await db.select()
        .from(workshops)
        .where(eq(workshops.id, id))
        .limit(1);
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workshop not found' });
      }
      
      await db.update(workshops)
        .set({
          ...updateData,
          managerEmail: updateData.managerEmail || null,
          area: updateData.area?.toString() || undefined,
        })
        .where(eq(workshops.id, id));
      
      return { success: true, message: 'Workshop updated successfully' };
    }),

  // Delete workshop
  deleteWorkshop: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Check if workshop has production lines
      const [lineCount] = await db.select({ count: sql<number>`count(*)` })
        .from(productionLines)
        .where(eq(productionLines.workshopId, input.id));
      
      if ((lineCount?.count || 0) > 0) {
        throw new TRPCError({ 
          code: 'PRECONDITION_FAILED', 
          message: 'Cannot delete workshop with existing production lines. Please reassign or delete production lines first.' 
        });
      }
      
      await db.delete(workshops).where(eq(workshops.id, input.id));
      
      return { success: true, message: 'Workshop deleted successfully' };
    }),

  // ============ HIERARCHY QUERIES ============
  
  // Get full hierarchy: Factory → Workshop → ProductionLine
  getHierarchy: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const { factoryId, includeInactive = false } = input || {};
      
      // Get factories
      const factoryConditions = [];
      if (factoryId) {
        factoryConditions.push(eq(factories.id, factoryId));
      }
      if (!includeInactive) {
        factoryConditions.push(eq(factories.isActive, 1));
      }
      
      const factoryList = await db.select()
        .from(factories)
        .where(factoryConditions.length > 0 ? and(...factoryConditions) : undefined)
        .orderBy(factories.name);
      
      // Get workshops for these factories
      const workshopConditions = [];
      if (factoryId) {
        workshopConditions.push(eq(workshops.factoryId, factoryId));
      }
      if (!includeInactive) {
        workshopConditions.push(eq(workshops.isActive, 1));
      }
      
      const workshopList = await db.select()
        .from(workshops)
        .where(workshopConditions.length > 0 ? and(...workshopConditions) : undefined)
        .orderBy(workshops.name);
      
      // Get production lines
      const lineConditions = [];
      if (!includeInactive) {
        lineConditions.push(eq(productionLines.isActive, 1));
      }
      
      const lineList = await db.select()
        .from(productionLines)
        .where(lineConditions.length > 0 ? and(...lineConditions) : undefined)
        .orderBy(productionLines.name);
      
      // Build hierarchy
      const hierarchy = factoryList.map(factory => ({
        ...factory,
        workshops: workshopList
          .filter(w => w.factoryId === factory.id)
          .map(workshop => ({
            ...workshop,
            productionLines: lineList.filter(l => l.workshopId === workshop.id)
          }))
      }));
      
      return hierarchy;
    }),

  // Get dropdown options for factory/workshop selection
  getDropdownOptions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { factories: [], workshops: [] };
      
      const [factoryList, workshopList] = await Promise.all([
        db.select({
          id: factories.id,
          code: factories.code,
          name: factories.name,
        })
          .from(factories)
          .where(eq(factories.isActive, 1))
          .orderBy(factories.name),
        db.select({
          id: workshops.id,
          factoryId: workshops.factoryId,
          code: workshops.code,
          name: workshops.name,
        })
          .from(workshops)
          .where(eq(workshops.isActive, 1))
          .orderBy(workshops.name),
      ]);
      
      return {
        factories: factoryList,
        workshops: workshopList,
      };
    }),

  // Update production line factory/workshop assignment
  assignProductionLine: protectedProcedure
    .input(z.object({
      productionLineId: z.number(),
      factoryId: z.number().nullable(),
      workshopId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { productionLineId, factoryId, workshopId } = input;
      
      // Validate workshop belongs to factory if both provided
      if (factoryId && workshopId) {
        const [workshop] = await db.select()
          .from(workshops)
          .where(and(
            eq(workshops.id, workshopId),
            eq(workshops.factoryId, factoryId)
          ))
          .limit(1);
        
        if (!workshop) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Workshop does not belong to the selected factory' 
          });
        }
      }
      
      await db.update(productionLines)
        .set({ factoryId, workshopId })
        .where(eq(productionLines.id, productionLineId));
      
      return { success: true, message: 'Production line assignment updated' };
    }),

  // Get statistics for dashboard
  getStatistics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return {
        factories: { total: 0, active: 0 },
        workshops: { total: 0, active: 0 },
        productionLines: { total: 0, active: 0, assigned: 0 },
      };
      
      const [factoryStats, workshopStats, lineStats] = await Promise.all([
        db.select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when is_active = 1 then 1 else 0 end)`,
        }).from(factories),
        db.select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when is_active = 1 then 1 else 0 end)`,
        }).from(workshops),
        db.select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when is_active = 1 then 1 else 0 end)`,
          assigned: sql<number>`sum(case when factory_id is not null then 1 else 0 end)`,
        }).from(productionLines),
      ]);
      
      return {
        factories: {
          total: factoryStats[0]?.total || 0,
          active: factoryStats[0]?.active || 0,
        },
        workshops: {
          total: workshopStats[0]?.total || 0,
          active: workshopStats[0]?.active || 0,
        },
        productionLines: {
          total: lineStats[0]?.total || 0,
          active: lineStats[0]?.active || 0,
          assigned: lineStats[0]?.assigned || 0,
        },
      };
    }),
});

export type FactoryWorkshopRouter = typeof factoryWorkshopRouter;
