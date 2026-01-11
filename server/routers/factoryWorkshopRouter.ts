import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb, getCapacityPlans, createCapacityPlan, updateCapacityPlan, deleteCapacityPlan, getCapacityComparison, getCapacitySummaryByWorkshop } from "../db";
import { factories, workshops, productionLines, workshopProductionLines } from "../../drizzle/schema";
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

  // Seed sample data for factories and workshops
  seedSampleData: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const sampleFactories = [
        { code: "HN-F01", name: "Nhà máy Hà Nội", description: "Nhà máy sản xuất chính tại Hà Nội", address: "KCN Thăng Long", city: "Hà Nội", country: "Việt Nam", phone: "024-3333-4444", email: "hanoi@company.vn", managerName: "Nguyễn Văn A", managerPhone: "0912-345-678", managerEmail: "manager.hn@company.vn", capacity: 50000, status: "active" as const },
        { code: "HCM-F02", name: "Nhà máy Hồ Chí Minh", description: "Nhà máy sản xuất tại TP.HCM", address: "KCN Tân Bình", city: "TP.HCM", country: "Việt Nam", phone: "028-5555-6666", email: "hcm@company.vn", managerName: "Trần Văn B", managerPhone: "0923-456-789", managerEmail: "manager.hcm@company.vn", capacity: 40000, status: "active" as const },
        { code: "DN-F03", name: "Nhà máy Đà Nẵng", description: "Nhà máy sản xuất tại Đà Nẵng", address: "KCN Hòa Khánh", city: "Đà Nẵng", country: "Việt Nam", phone: "0236-7777-8888", email: "danang@company.vn", managerName: "Lê Văn C", managerPhone: "0934-567-890", managerEmail: "manager.dn@company.vn", capacity: 30000, status: "active" as const },
      ];

      const createdFactories = [];
      for (const factory of sampleFactories) {
        const existing = await db.select().from(factories).where(eq(factories.code, factory.code)).limit(1);
        if (existing.length === 0) {
          const [created] = await db.insert(factories).values(factory).$returningId();
          createdFactories.push({ ...factory, id: created.id });
        } else {
          createdFactories.push({ ...factory, id: existing[0].id });
        }
      }

      const sampleWorkshops = [
        { factoryId: createdFactories[0].id, code: "HN-SMT", name: "Xưởng SMT", description: "Xưởng gắn linh kiện bề mặt", building: "Tòa A", floor: "Tầng 1", area: 500, capacity: 20000, supervisorName: "Phạm Văn D", status: "active" as const },
        { factoryId: createdFactories[0].id, code: "HN-ASM", name: "Xưởng Lắp ráp", description: "Xưởng lắp ráp sản phẩm", building: "Tòa A", floor: "Tầng 2", area: 600, capacity: 15000, supervisorName: "Hoàng Văn E", status: "active" as const },
        { factoryId: createdFactories[0].id, code: "HN-QC", name: "Xưởng Kiểm tra", description: "Xưởng kiểm tra chất lượng", building: "Tòa B", floor: "Tầng 1", area: 300, capacity: 10000, supervisorName: "Vũ Văn F", status: "active" as const },
        { factoryId: createdFactories[0].id, code: "HN-PKG", name: "Xưởng Đóng gói", description: "Xưởng đóng gói sản phẩm", building: "Tòa B", floor: "Tầng 2", area: 400, capacity: 25000, supervisorName: "Đặng Văn G", status: "active" as const },
        { factoryId: createdFactories[1].id, code: "HCM-SMT", name: "Xưởng SMT", description: "Xưởng SMT tại HCM", building: "Nhà xưởng 1", floor: "Tầng trệt", area: 700, capacity: 18000, supervisorName: "Nguyễn Thị H", status: "active" as const },
        { factoryId: createdFactories[1].id, code: "HCM-ASM", name: "Xưởng Lắp ráp", description: "Xưởng lắp ráp tại HCM", building: "Nhà xưởng 1", floor: "Tầng 1", area: 550, capacity: 12000, supervisorName: "Trần Thị I", status: "active" as const },
        { factoryId: createdFactories[1].id, code: "HCM-TEST", name: "Xưởng Test", description: "Xưởng kiểm tra chức năng", building: "Nhà xưởng 2", floor: "Tầng trệt", area: 350, capacity: 8000, supervisorName: "Lê Thị K", status: "active" as const },
        { factoryId: createdFactories[1].id, code: "HCM-WH", name: "Kho thành phẩm", description: "Kho lưu trữ thành phẩm", building: "Nhà xưởng 3", floor: "Tầng trệt", area: 800, capacity: 30000, supervisorName: "Phạm Thị L", status: "active" as const },
        { factoryId: createdFactories[2].id, code: "DN-SMT", name: "Xưởng SMT", description: "Xưởng SMT tại Đà Nẵng", building: "Khu A", floor: "Tầng 1", area: 450, capacity: 12000, supervisorName: "Hoàng Thị M", status: "active" as const },
        { factoryId: createdFactories[2].id, code: "DN-ASM", name: "Xưởng Lắp ráp", description: "Xưởng lắp ráp tại Đà Nẵng", building: "Khu A", floor: "Tầng 2", area: 400, capacity: 10000, supervisorName: "Vũ Thị N", status: "active" as const },
        { factoryId: createdFactories[2].id, code: "DN-QC", name: "Xưởng QC", description: "Xưởng kiểm tra chất lượng", building: "Khu B", floor: "Tầng 1", area: 250, capacity: 8000, supervisorName: "Đặng Thị O", status: "active" as const },
        { factoryId: createdFactories[2].id, code: "DN-PKG", name: "Xưởng Đóng gói", description: "Xưởng đóng gói tại Đà Nẵng", building: "Khu B", floor: "Tầng 2", area: 300, capacity: 15000, supervisorName: "Bùi Văn P", status: "active" as const },
      ];

      let workshopsCreated = 0;
      for (const workshop of sampleWorkshops) {
        const existing = await db.select().from(workshops).where(eq(workshops.code, workshop.code)).limit(1);
        if (existing.length === 0) {
          await db.insert(workshops).values(workshop);
          workshopsCreated++;
        }
      }

      return {
        success: true,
        message: `Đã tạo ${createdFactories.length} nhà máy và ${workshopsCreated} xưởng mẫu`,
        factoriesCreated: createdFactories.length,
        workshopsCreated,
      };
    }),

  // ============ WORKSHOP PRODUCTION LINE ASSIGNMENT ============
  
  // Get production lines assigned to a workshop
  getWorkshopProductionLines: protectedProcedure
    .input(z.object({ workshopId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const assignments = await db.select({
        assignment: workshopProductionLines,
        productionLine: productionLines,
      })
        .from(workshopProductionLines)
        .leftJoin(productionLines, eq(workshopProductionLines.productionLineId, productionLines.id))
        .where(and(
          eq(workshopProductionLines.workshopId, input.workshopId),
          eq(workshopProductionLines.isActive, 1)
        ))
        .orderBy(productionLines.name);
      
      return assignments.map(a => ({
        ...a.assignment,
        productionLine: a.productionLine,
      }));
    }),

  // Get all production lines (for selection dropdown)
  getAllProductionLines: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
      excludeWorkshopId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const conditions = [eq(productionLines.isActive, 1)];
      if (input?.factoryId) {
        conditions.push(eq(productionLines.factoryId, input.factoryId));
      }
      
      const lines = await db.select()
        .from(productionLines)
        .where(and(...conditions))
        .orderBy(productionLines.name);
      
      return lines;
    }),

  // Assign production lines to workshop
  assignProductionLines: protectedProcedure
    .input(z.object({
      workshopId: z.number(),
      productionLineIds: z.array(z.number()),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Verify workshop exists
      const [workshop] = await db.select()
        .from(workshops)
        .where(eq(workshops.id, input.workshopId))
        .limit(1);
      
      if (!workshop) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workshop not found' });
      }
      
      // Get current assignments
      const currentAssignments = await db.select()
        .from(workshopProductionLines)
        .where(eq(workshopProductionLines.workshopId, input.workshopId));
      
      const currentLineIds = currentAssignments.map(a => a.productionLineId);
      
      // Lines to add
      const linesToAdd = input.productionLineIds.filter(id => !currentLineIds.includes(id));
      
      // Lines to remove (deactivate)
      const linesToRemove = currentLineIds.filter(id => !input.productionLineIds.includes(id));
      
      // Add new assignments
      for (const lineId of linesToAdd) {
        // Check if there's an inactive assignment to reactivate
        const [existing] = await db.select()
          .from(workshopProductionLines)
          .where(and(
            eq(workshopProductionLines.workshopId, input.workshopId),
            eq(workshopProductionLines.productionLineId, lineId)
          ))
          .limit(1);
        
        if (existing) {
          await db.update(workshopProductionLines)
            .set({ isActive: 1, notes: input.notes || null })
            .where(eq(workshopProductionLines.id, existing.id));
        } else {
          await db.insert(workshopProductionLines).values({
            workshopId: input.workshopId,
            productionLineId: lineId,
            assignedBy: ctx.user?.id || null,
            notes: input.notes || null,
          });
        }
      }
      
      // Deactivate removed assignments
      for (const lineId of linesToRemove) {
        await db.update(workshopProductionLines)
          .set({ isActive: 0 })
          .where(and(
            eq(workshopProductionLines.workshopId, input.workshopId),
            eq(workshopProductionLines.productionLineId, lineId)
          ));
      }
      
      return {
        success: true,
        message: `Đã cập nhật ${linesToAdd.length} dây chuyền mới, bỏ gán ${linesToRemove.length} dây chuyền`,
        added: linesToAdd.length,
        removed: linesToRemove.length,
      };
    }),

  // Remove a single production line from workshop
  removeProductionLineFromWorkshop: protectedProcedure
    .input(z.object({
      workshopId: z.number(),
      productionLineId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      await db.update(workshopProductionLines)
        .set({ isActive: 0 })
        .where(and(
          eq(workshopProductionLines.workshopId, input.workshopId),
          eq(workshopProductionLines.productionLineId, input.productionLineId)
        ));
      
      return { success: true, message: 'Đã bỏ gán dây chuyền khỏi xưởng' };
    }),

  // Get workshop capacity statistics (for dashboard)
  getCapacityStats: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { factories: [], workshops: [], totalCapacity: 0 };
      
      // Get factory stats
      const factoryConditions = [eq(factories.isActive, 1)];
      if (input?.factoryId) {
        factoryConditions.push(eq(factories.id, input.factoryId));
      }
      
      const factoryList = await db.select({
        id: factories.id,
        name: factories.name,
        code: factories.code,
        capacity: factories.capacity,
      })
        .from(factories)
        .where(and(...factoryConditions))
        .orderBy(factories.name);
      
      // Get workshop stats with production line counts
      const workshopConditions = [eq(workshops.isActive, 1)];
      if (input?.factoryId) {
        workshopConditions.push(eq(workshops.factoryId, input.factoryId));
      }
      
      const workshopList = await db.select({
        id: workshops.id,
        name: workshops.name,
        code: workshops.code,
        factoryId: workshops.factoryId,
        capacity: workshops.capacity,
        status: workshops.status,
      })
        .from(workshops)
        .where(and(...workshopConditions))
        .orderBy(workshops.name);
      
      // Get production line counts per workshop
      const lineCounts = await db.select({
        workshopId: workshopProductionLines.workshopId,
        count: sql<number>`count(*)`,
      })
        .from(workshopProductionLines)
        .where(eq(workshopProductionLines.isActive, 1))
        .groupBy(workshopProductionLines.workshopId);
      
      const lineCountMap = new Map(lineCounts.map(l => [l.workshopId, l.count]));
      
      const workshopsWithCounts = workshopList.map(w => ({
        ...w,
        productionLineCount: lineCountMap.get(w.id) || 0,
      }));
      
      const totalCapacity = workshopList.reduce((sum, w) => sum + (w.capacity || 0), 0);
      
      return {
        factories: factoryList,
        workshops: workshopsWithCounts,
        totalCapacity,
      };
    }),

  // ============ CAPACITY PLANS ============
  
  // List capacity plans
  listCapacityPlans: protectedProcedure
    .input(z.object({
      workshopId: z.number().optional(),
      productId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getCapacityPlans(input);
    }),

  // Create capacity plan
  createCapacityPlan: protectedProcedure
    .input(z.object({
      workshopId: z.number(),
      productId: z.number().optional(),
      planDate: z.string(),
      plannedCapacity: z.number().min(0),
      targetEfficiency: z.number().min(0).max(100).optional(),
      shiftType: z.enum(['morning', 'afternoon', 'night', 'full_day']).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createCapacityPlan({
        ...input,
        createdBy: ctx.user?.id,
      });
      if (!id) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create capacity plan' });
      }
      return { id, message: 'Capacity plan created successfully' };
    }),

  // Update capacity plan
  updateCapacityPlan: protectedProcedure
    .input(z.object({
      id: z.number(),
      plannedCapacity: z.number().min(0).optional(),
      actualCapacity: z.number().min(0).optional(),
      targetEfficiency: z.number().min(0).max(100).optional(),
      actualEfficiency: z.number().min(0).max(100).optional(),
      shiftType: z.enum(['morning', 'afternoon', 'night', 'full_day']).optional(),
      notes: z.string().optional(),
      status: z.enum(['draft', 'approved', 'in_progress', 'completed', 'cancelled']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const success = await updateCapacityPlan(id, {
        ...data,
        approvedBy: data.status === 'approved' ? ctx.user?.id : undefined,
      });
      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update capacity plan' });
      }
      return { success: true, message: 'Capacity plan updated successfully' };
    }),

  // Delete capacity plan
  deleteCapacityPlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteCapacityPlan(input.id);
      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete capacity plan' });
      }
      return { success: true, message: 'Capacity plan deleted successfully' };
    }),

  // Get capacity comparison data
  getCapacityComparison: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
      workshopId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getCapacityComparison(input);
    }),

  // Get capacity summary by workshop
  getCapacitySummary: protectedProcedure
    .input(z.object({
      factoryId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getCapacitySummaryByWorkshop(input);
    }),
});

export type FactoryWorkshopRouter = typeof factoryWorkshopRouter;