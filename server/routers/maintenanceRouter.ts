import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { checkPermission, MODULE_CODES } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { 
  maintenanceTypes, maintenanceSchedules, workOrders, workOrderParts,
  technicians, maintenanceHistory, machines,
  spareParts, sparePartsInventory, sparePartsStockMovements
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, asc, or } from "drizzle-orm";

export const maintenanceRouter = router({
  // Maintenance Types
  listTypes: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(maintenanceTypes).where(eq(maintenanceTypes.isActive, 1)).orderBy(maintenanceTypes.name);
  }),

  createType: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string(),
      category: z.enum(["corrective", "preventive", "predictive", "condition_based"]),
      description: z.string().optional(),
      estimatedDuration: z.number().optional(),
      requiredSkills: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(maintenanceTypes).values(input).$returningId();
      return { id: result.id };
    }),

  updateType: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      category: z.enum(["corrective", "preventive", "predictive", "condition_based"]).optional(),
      description: z.string().optional(),
      estimatedDuration: z.number().optional(),
      requiredSkills: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(maintenanceTypes).set(data).where(eq(maintenanceTypes.id, id));
      return { success: true };
    }),

  deleteType: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(maintenanceTypes).set({ isActive: 0 }).where(eq(maintenanceTypes.id, input.id));
      return { success: true };
    }),

  // Maintenance Schedules
  listSchedules: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) {
        conditions.push(eq(maintenanceSchedules.machineId, input.machineId));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(maintenanceSchedules.isActive, input.isActive ? 1 : 0));
      }

      return db
        .select({
          id: maintenanceSchedules.id,
          machineId: maintenanceSchedules.machineId,
          machineName: machines.name,
          maintenanceTypeId: maintenanceSchedules.maintenanceTypeId,
          typeName: maintenanceTypes.name,
          name: maintenanceSchedules.name,
          description: maintenanceSchedules.description,
          frequency: maintenanceSchedules.frequency,
          customIntervalDays: maintenanceSchedules.customIntervalDays,
          lastPerformedAt: maintenanceSchedules.lastPerformedAt,
          nextDueAt: maintenanceSchedules.nextDueAt,
          estimatedDuration: maintenanceSchedules.estimatedDuration,
          priority: maintenanceSchedules.priority,
          isActive: maintenanceSchedules.isActive,
        })
        .from(maintenanceSchedules)
        .leftJoin(machines, eq(maintenanceSchedules.machineId, machines.id))
        .leftJoin(maintenanceTypes, eq(maintenanceSchedules.maintenanceTypeId, maintenanceTypes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(maintenanceSchedules.nextDueAt);
    }),

  createSchedule: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      maintenanceTypeId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "custom"]),
      customIntervalDays: z.number().optional(),
      nextDueAt: z.string(),
      estimatedDuration: z.number().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.MAINTENANCE, "create", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền tạo lịch bảo trì");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(maintenanceSchedules).values({
        ...input,
        nextDueAt: new Date(input.nextDueAt),
      }).$returningId();
      return { id: result.id };
    }),

  updateSchedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "biannually", "annually", "custom"]).optional(),
      customIntervalDays: z.number().optional(),
      nextDueAt: z.string().optional(),
      estimatedDuration: z.number().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.MAINTENANCE, "edit", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền sửa lịch bảo trì");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, nextDueAt, isActive, ...data } = input;
      await db.update(maintenanceSchedules).set({
        ...data,
        nextDueAt: nextDueAt ? new Date(nextDueAt) : undefined,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
      }).where(eq(maintenanceSchedules.id, id));
      return { success: true };
    }),

  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.MAINTENANCE, "delete", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền xóa lịch bảo trì");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(maintenanceSchedules).set({ isActive: 0 }).where(eq(maintenanceSchedules.id, input.id));
      return { success: true };
    }),

  // Work Orders
  listWorkOrders: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      status: z.enum(["pending", "assigned", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      assignedTo: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) conditions.push(eq(workOrders.machineId, input.machineId));
      if (input.status) conditions.push(eq(workOrders.status, input.status));
      if (input.priority) conditions.push(eq(workOrders.priority, input.priority));
      if (input.assignedTo) conditions.push(eq(workOrders.assignedTo, input.assignedTo));
      if (input.startDate) conditions.push(gte(workOrders.reportedAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(workOrders.reportedAt, new Date(input.endDate)));

      return db
        .select({
          id: workOrders.id,
          workOrderNumber: workOrders.workOrderNumber,
          machineId: workOrders.machineId,
          machineName: machines.name,
          maintenanceTypeId: workOrders.maintenanceTypeId,
          typeName: maintenanceTypes.name,
          typeCategory: maintenanceTypes.category,
          title: workOrders.title,
          description: workOrders.description,
          priority: workOrders.priority,
          status: workOrders.status,
          assignedTo: workOrders.assignedTo,
          technicianName: technicians.name,
          scheduledStartAt: workOrders.scheduledStartAt,
          actualStartAt: workOrders.actualStartAt,
          completedAt: workOrders.completedAt,
          laborHours: workOrders.laborHours,
          reportedAt: workOrders.reportedAt,
        })
        .from(workOrders)
        .leftJoin(machines, eq(workOrders.machineId, machines.id))
        .leftJoin(maintenanceTypes, eq(workOrders.maintenanceTypeId, maintenanceTypes.id))
        .leftJoin(technicians, eq(workOrders.assignedTo, technicians.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(workOrders.reportedAt))
        .limit(input.limit);
    }),

  getWorkOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [order] = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, input.id));
      return order || null;
    }),

  createWorkOrder: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      maintenanceTypeId: z.number(),
      scheduleId: z.number().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      assignedTo: z.number().optional(),
      scheduledStartAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.WORK_ORDERS, "create", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền tạo lệnh công việc");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate work order number
      const now = new Date();
      const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await db.select({ count: sql<number>`COUNT(*)` })
        .from(workOrders)
        .where(sql`${workOrders.workOrderNumber} LIKE ${prefix + '%'}`);
      const workOrderNumber = `${prefix}-${String((count[0]?.count || 0) + 1).padStart(4, '0')}`;

      const [result] = await db.insert(workOrders).values({
        workOrderNumber,
        machineId: input.machineId,
        maintenanceTypeId: input.maintenanceTypeId,
        scheduleId: input.scheduleId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: "pending",
        assignedTo: input.assignedTo,
        scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
        reportedBy: ctx.user?.id,
      }).$returningId();

      return { id: result.id, workOrderNumber };
    }),

  updateWorkOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      status: z.enum(["pending", "assigned", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      assignedTo: z.number().optional(),
      scheduledStartAt: z.string().optional(),
      actualStartAt: z.string().optional(),
      completedAt: z.string().optional(),
      laborHours: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.WORK_ORDERS, "edit", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền sửa lệnh công việc");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, scheduledStartAt, actualStartAt, completedAt, laborHours, ...data } = input;
      
      await db.update(workOrders).set({
        ...data,
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : undefined,
        actualStartAt: actualStartAt ? new Date(actualStartAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        laborHours: laborHours ? String(laborHours) : undefined,
        updatedAt: new Date(),
      }).where(eq(workOrders.id, id));

      return { success: true };
    }),

  startWorkOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(workOrders).set({
        status: "in_progress",
        actualStartAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(workOrders.id, input.id));

      return { success: true };
    }),

  completeWorkOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
      laborHours: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db.select().from(workOrders).where(eq(workOrders.id, input.id));
      if (!order) throw new Error("Work order not found");

      const now = new Date();

      await db.update(workOrders).set({
        status: "completed",
        completedAt: now,
        completedBy: ctx.user?.id,
        laborHours: input.laborHours ? String(input.laborHours) : undefined,
        notes: input.notes,
        updatedAt: now,
      }).where(eq(workOrders.id, input.id));

      // Log to maintenance history
      await db.insert(maintenanceHistory).values({
        machineId: order.machineId,
        workOrderId: order.id,
        action: "Completed",
        performedAt: now,
        performedBy: ctx.user?.id,
        notes: input.notes,
      });

      // Auto export spare parts used in work order
      const usedParts = await db.select().from(workOrderParts).where(eq(workOrderParts.workOrderId, input.id));
      for (const part of usedParts) {
        // Get current inventory
        const [inventory] = await db
          .select()
          .from(sparePartsInventory)
          .where(eq(sparePartsInventory.sparePartId, part.sparePartId))
          .limit(1);

        if (inventory) {
          const currentQty = Number(inventory.quantity) || 0;
          const usedQty = Number(part.quantity) || 0;
          const newQty = Math.max(0, currentQty - usedQty);

          // Get part info for price
          const [partInfo] = await db
            .select()
            .from(spareParts)
            .where(eq(spareParts.id, part.sparePartId))
            .limit(1);

          const unitPrice = Number(partInfo?.unitPrice) || 0;

          // Update inventory
          await db.update(sparePartsInventory).set({
            quantity: newQty,
            updatedAt: now,
          }).where(eq(sparePartsInventory.id, inventory.id));

          // Record stock movement
          await db.insert(sparePartsStockMovements).values({
            sparePartId: part.sparePartId,
            movementType: "work_order_out",
            quantity: usedQty,
            beforeQuantity: currentQty,
            afterQuantity: newQty,
            unitCost: String(unitPrice),
            totalCost: String(usedQty * unitPrice),
            referenceType: "work_order",
            referenceNumber: `WO-${order.workOrderNumber}`,
            reason: `Auto export for completed work order #${order.workOrderNumber}`,
            performedBy: ctx.user?.id || 0,
          });
        }
      }

      // Update schedule if this was a scheduled maintenance
      if (order.scheduleId) {
        const [schedule] = await db.select().from(maintenanceSchedules).where(eq(maintenanceSchedules.id, order.scheduleId));
        if (schedule) {
          const nextDue = new Date(now);
          const intervalDays = schedule.customIntervalDays || 30;
          switch (schedule.frequency) {
            case 'daily': nextDue.setDate(nextDue.getDate() + 1); break;
            case 'weekly': nextDue.setDate(nextDue.getDate() + 7); break;
            case 'biweekly': nextDue.setDate(nextDue.getDate() + 14); break;
            case 'monthly': nextDue.setMonth(nextDue.getMonth() + 1); break;
            case 'quarterly': nextDue.setMonth(nextDue.getMonth() + 3); break;
            case 'biannually': nextDue.setMonth(nextDue.getMonth() + 6); break;
            case 'annually': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
            case 'custom': nextDue.setDate(nextDue.getDate() + intervalDays); break;
          }
          await db.update(maintenanceSchedules).set({
            lastPerformedAt: now,
            nextDueAt: nextDue,
          }).where(eq(maintenanceSchedules.id, order.scheduleId));
        }
      }

      return { success: true };
    }),

  cancelWorkOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(workOrders).set({
        status: "cancelled",
        notes: input.reason,
        updatedAt: new Date(),
      }).where(eq(workOrders.id, input.id));

      return { success: true };
    }),

  // Delete work order (only for pending/cancelled orders)
  deleteWorkOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      force: z.boolean().optional(), // Admin only: force delete even if in_progress/completed
    }))
    .mutation(async ({ input, ctx }) => {
      // Permission check
      const permResult = await checkPermission(String(ctx.user.id), MODULE_CODES.WORK_ORDERS, "delete", ctx.user.role === "admin");
      if (!permResult.hasPermission) {
        throw new Error(permResult.reason || "Không có quyền xóa lệnh công việc");
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the work order
      const [order] = await db.select().from(workOrders).where(eq(workOrders.id, input.id));
      if (!order) throw new Error("Work order not found");

      // Check if can delete
      const allowedStatuses = ["pending", "cancelled"];
      if (!allowedStatuses.includes(order.status || "") && !input.force) {
        throw new Error(`Cannot delete work order with status '${order.status}'. Only pending or cancelled orders can be deleted. Use force=true for admin override.`);
      }

      // Only admin can force delete
      if (input.force && ctx.user?.role !== "admin") {
        throw new Error("Only admin can force delete work orders");
      }

      // Delete related records first
      try {
        // Delete work order parts
        await db.delete(workOrderParts).where(eq(workOrderParts.workOrderId, input.id));
        
        // Delete maintenance history
        await db.delete(maintenanceHistory).where(eq(maintenanceHistory.workOrderId, input.id));
        
        // Note: scheduledMaintenanceTasks table was removed, skip this step
        
        // Delete the work order
        await db.delete(workOrders).where(eq(workOrders.id, input.id));
        
        console.log(`[Maintenance] Deleted work order ${input.id} successfully`);
        return { success: true, deletedId: input.id };
      } catch (error) {
        console.error(`[Maintenance] Error deleting work order ${input.id}:`, error);
        throw new Error(`Failed to delete work order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Technicians
  listTechnicians: publicProcedure
    .input(z.object({ isActive: z.boolean().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.isActive !== undefined) {
        conditions.push(eq(technicians.isActive, input.isActive ? 1 : 0));
      }

      return db.select().from(technicians)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(technicians.name);
    }),

  createTechnician: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      name: z.string(),
      employeeCode: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      specialty: z.string().optional(),
      certifications: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(technicians).values(input).$returningId();
      return { id: result.id };
    }),

  updateTechnician: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      specialty: z.string().optional(),
      certifications: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, isActive, ...data } = input;
      await db.update(technicians).set({
        ...data,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
      }).where(eq(technicians.id, id));
      return { success: true };
    }),

  // Maintenance History
  listHistory: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) conditions.push(eq(maintenanceHistory.machineId, input.machineId));
      if (input.startDate) conditions.push(gte(maintenanceHistory.performedAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(maintenanceHistory.performedAt, new Date(input.endDate)));

      return db
        .select({
          id: maintenanceHistory.id,
          machineId: maintenanceHistory.machineId,
          machineName: machines.name,
          workOrderId: maintenanceHistory.workOrderId,
          action: maintenanceHistory.action,
          performedAt: maintenanceHistory.performedAt,
          notes: maintenanceHistory.notes,
        })
        .from(maintenanceHistory)
        .leftJoin(machines, eq(maintenanceHistory.machineId, machines.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(maintenanceHistory.performedAt))
        .limit(input.limit);
    }),

  // Statistics
  getStats: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Work order stats
      const woStats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          pending: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'pending' THEN 1 ELSE 0 END)`,
          inProgress: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'in_progress' THEN 1 ELSE 0 END)`,
          completed: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'completed' THEN 1 ELSE 0 END)`,
          cancelled: sql<number>`SUM(CASE WHEN ${workOrders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
        })
        .from(workOrders)
        .where(gte(workOrders.reportedAt, startDate));

      // MTTR (Mean Time To Repair)
      const mttrResult = await db
        .select({
          avgDuration: sql<number>`AVG(${workOrders.laborHours})`,
        })
        .from(workOrders)
        .where(and(
          gte(workOrders.reportedAt, startDate),
          eq(workOrders.status, "completed")
        ));

      // Overdue work orders
      const now = new Date();
      const overdueResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workOrders)
        .where(and(
          or(eq(workOrders.status, "pending"), eq(workOrders.status, "in_progress")),
          lte(workOrders.scheduledStartAt, now)
        ));

      return {
        ...woStats[0],
        mttr: mttrResult[0]?.avgDuration || 0,
        overdue: overdueResult[0]?.count || 0,
      };
    }),

  getTrend: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return db
        .select({
          date: sql<string>`DATE(${maintenanceHistory.performedAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(maintenanceHistory)
        .where(gte(maintenanceHistory.performedAt, startDate))
        .groupBy(sql`DATE(${maintenanceHistory.performedAt})`)
        .orderBy(sql`DATE(${maintenanceHistory.performedAt})`);
    }),

  getTypeDistribution: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return db
        .select({
          action: maintenanceHistory.action,
          count: sql<number>`COUNT(*)`,
        })
        .from(maintenanceHistory)
        .where(gte(maintenanceHistory.performedAt, startDate))
        .groupBy(maintenanceHistory.action);
    }),

  // Get upcoming scheduled maintenance
  getUpcomingSchedules: publicProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + input.days);

      return db
        .select({
          id: maintenanceSchedules.id,
          machineId: maintenanceSchedules.machineId,
          machineName: machines.name,
          name: maintenanceSchedules.name,
          typeName: maintenanceTypes.name,
          nextDueAt: maintenanceSchedules.nextDueAt,
          frequency: maintenanceSchedules.frequency,
          priority: maintenanceSchedules.priority,
        })
        .from(maintenanceSchedules)
        .leftJoin(machines, eq(maintenanceSchedules.machineId, machines.id))
        .leftJoin(maintenanceTypes, eq(maintenanceSchedules.maintenanceTypeId, maintenanceTypes.id))
        .where(and(
          eq(maintenanceSchedules.isActive, 1),
          lte(maintenanceSchedules.nextDueAt, endDate)
        ))
        .orderBy(maintenanceSchedules.nextDueAt);
    }),
});
