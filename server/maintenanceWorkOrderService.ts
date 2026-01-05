import { getDb } from "./db";
import { 
  iotMaintenanceWorkOrders,
  iotWorkOrderTasks,
  iotWorkOrderComments,
  iotWorkOrderHistory,
  iotTechnicians,
  iotMaintenancePredictions,
  iotDevices,
  users,
  type IotMaintenanceWorkOrder,
  type InsertIotMaintenanceWorkOrder,
  type IotWorkOrderTask,
  type InsertIotWorkOrderTask,
  type IotTechnician,
  type InsertIotTechnician
} from "../drizzle/schema";
import { eq, and, desc, sql, inArray, like, or, gte, lte } from "drizzle-orm";

// Generate work order number
function generateWorkOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WO-${year}${month}${day}-${random}`;
}

export const maintenanceWorkOrderService = {
  // ==================== Work Orders ====================
  
  // Create work order
  async createWorkOrder(data: InsertIotMaintenanceWorkOrder): Promise<IotMaintenanceWorkOrder> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const workOrderNumber = generateWorkOrderNumber();
    
    const [result] = await db.insert(iotMaintenanceWorkOrders).values({
      ...data,
      workOrderNumber,
    });
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, Number(result.insertId)));
    
    // Log history
    await this.addHistory(workOrder.id, null, 'created', null, 'created', 'Work order created');
    
    return workOrder;
  },
  
  // Get work orders with filters
  async getWorkOrders(params: {
    status?: string;
    priority?: string;
    workOrderType?: string;
    assignedTo?: number;
    deviceId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { 
      status, priority, workOrderType, assignedTo, deviceId,
      search, startDate, endDate, page = 1, limit = 20 
    } = params;
    const offset = (page - 1) * limit;
    
    const conditions = [];
    
    if (status) conditions.push(eq(iotMaintenanceWorkOrders.status, status as any));
    if (priority) conditions.push(eq(iotMaintenanceWorkOrders.priority, priority as any));
    if (workOrderType) conditions.push(eq(iotMaintenanceWorkOrders.workOrderType, workOrderType as any));
    if (assignedTo) conditions.push(eq(iotMaintenanceWorkOrders.assignedTo, assignedTo));
    if (deviceId) conditions.push(eq(iotMaintenanceWorkOrders.deviceId, deviceId));
    if (search) {
      conditions.push(
        or(
          like(iotMaintenanceWorkOrders.workOrderNumber, `%${search}%`),
          like(iotMaintenanceWorkOrders.title, `%${search}%`)
        )
      );
    }
    if (startDate) conditions.push(gte(iotMaintenanceWorkOrders.createdAt, startDate));
    if (endDate) conditions.push(lte(iotMaintenanceWorkOrders.createdAt, endDate));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const workOrders = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(whereClause)
      .orderBy(desc(iotMaintenanceWorkOrders.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(iotMaintenanceWorkOrders)
      .where(whereClause);
    
    return {
      workOrders,
      total: Number(count),
      page,
      totalPages: Math.ceil(Number(count) / limit),
    };
  },
  
  // Get work order by ID with details
  async getWorkOrderById(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, id));
    
    if (!workOrder) return null;
    
    // Get device info
    const [device] = await db.select()
      .from(iotDevices)
      .where(eq(iotDevices.id, workOrder.deviceId));
    
    // Get tasks
    const tasks = await db.select()
      .from(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.workOrderId, id))
      .orderBy(iotWorkOrderTasks.taskNumber);
    
    // Get comments
    const comments = await db.select({
      comment: iotWorkOrderComments,
      user: users,
    })
      .from(iotWorkOrderComments)
      .leftJoin(users, eq(iotWorkOrderComments.userId, users.id))
      .where(eq(iotWorkOrderComments.workOrderId, id))
      .orderBy(desc(iotWorkOrderComments.createdAt));
    
    // Get history
    const history = await db.select()
      .from(iotWorkOrderHistory)
      .where(eq(iotWorkOrderHistory.workOrderId, id))
      .orderBy(desc(iotWorkOrderHistory.createdAt));
    
    // Get assigned technician
    let technician = null;
    if (workOrder.assignedTo) {
      const [tech] = await db.select()
        .from(iotTechnicians)
        .where(eq(iotTechnicians.userId, workOrder.assignedTo));
      technician = tech;
    }
    
    return {
      ...workOrder,
      device,
      tasks,
      comments: comments.map(c => ({ ...c.comment, user: c.user })),
      history,
      technician,
    };
  },
  
  // Update work order
  async updateWorkOrder(id: number, data: Partial<InsertIotMaintenanceWorkOrder>, userId?: number): Promise<IotMaintenanceWorkOrder | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [existing] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, id));
    
    if (!existing) return null;
    
    // Track status changes
    if (data.status && data.status !== existing.status) {
      await this.addHistory(id, userId, 'status_changed', existing.status, data.status, `Status changed from ${existing.status} to ${data.status}`);
      
      // Update timestamps based on status
      if (data.status === 'in_progress' && !existing.startedAt) {
        data.startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      } else if (data.status === 'completed' && !existing.completedAt) {
        data.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Calculate actual duration
        if (existing.startedAt) {
          const startTime = new Date(existing.startedAt).getTime();
          const endTime = new Date().getTime();
          data.actualDuration = Math.round((endTime - startTime) / 60000); // minutes
        }
      }
    }
    
    // Track assignment changes
    if (data.assignedTo && data.assignedTo !== existing.assignedTo) {
      await this.addHistory(id, userId, 'assigned', existing.assignedTo?.toString(), data.assignedTo.toString(), `Assigned to technician #${data.assignedTo}`);
      data.assignedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Update technician availability
      if (existing.assignedTo) {
        await this.updateTechnicianAvailability(existing.assignedTo, 'available');
      }
      await this.updateTechnicianAvailability(data.assignedTo, 'busy', id);
    }
    
    await db.update(iotMaintenanceWorkOrders)
      .set(data)
      .where(eq(iotMaintenanceWorkOrders.id, id));
    
    const [updated] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, id));
    
    return updated;
  },
  
  // Delete work order
  async deleteWorkOrder(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // Delete related records
    await db.delete(iotWorkOrderTasks).where(eq(iotWorkOrderTasks.workOrderId, id));
    await db.delete(iotWorkOrderComments).where(eq(iotWorkOrderComments.workOrderId, id));
    await db.delete(iotWorkOrderHistory).where(eq(iotWorkOrderHistory.workOrderId, id));
    
    const result = await db.delete(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, id));
    
    return result[0].affectedRows > 0;
  },
  
  // Add history entry
  async addHistory(workOrderId: number, userId: number | null | undefined, action: string, previousValue: string | null | undefined, newValue: string | null | undefined, description: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(iotWorkOrderHistory).values({
      workOrderId,
      userId: userId || null,
      action,
      previousValue: previousValue || null,
      newValue: newValue || null,
      description,
    });
  },
  
  // ==================== Tasks ====================
  
  // Add task to work order
  async addTask(data: InsertIotWorkOrderTask): Promise<IotWorkOrderTask> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // Get max task number
    const [maxTask] = await db.select({ maxNum: sql<number>`MAX(task_number)` })
      .from(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.workOrderId, data.workOrderId));
    
    const taskNumber = (maxTask?.maxNum || 0) + 1;
    
    const [result] = await db.insert(iotWorkOrderTasks).values({
      ...data,
      taskNumber,
    });
    
    const [task] = await db.select()
      .from(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.id, Number(result.insertId)));
    
    return task;
  },
  
  // Update task
  async updateTask(id: number, data: Partial<InsertIotWorkOrderTask>): Promise<IotWorkOrderTask | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(iotWorkOrderTasks)
      .set(data)
      .where(eq(iotWorkOrderTasks.id, id));
    
    const [task] = await db.select()
      .from(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.id, id));
    
    return task;
  },
  
  // Complete task
  async completeTask(id: number, userId: number, notes?: string): Promise<IotWorkOrderTask | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await db.update(iotWorkOrderTasks)
      .set({
        status: 'completed',
        completedBy: userId,
        completedAt: now,
        notes: notes || null,
      })
      .where(eq(iotWorkOrderTasks.id, id));
    
    const [task] = await db.select()
      .from(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.id, id));
    
    return task;
  },
  
  // Delete task
  async deleteTask(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.delete(iotWorkOrderTasks)
      .where(eq(iotWorkOrderTasks.id, id));
    
    return result[0].affectedRows > 0;
  },
  
  // ==================== Comments ====================
  
  // Add comment
  async addComment(workOrderId: number, userId: number, comment: string, isInternal = false, attachments?: any[]) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(iotWorkOrderComments).values({
      workOrderId,
      userId,
      comment,
      isInternal: isInternal ? 1 : 0,
      attachments: attachments || null,
    });
    
    const [newComment] = await db.select()
      .from(iotWorkOrderComments)
      .where(eq(iotWorkOrderComments.id, Number(result.insertId)));
    
    return newComment;
  },
  
  // ==================== Technicians ====================
  
  // Create technician profile
  async createTechnician(data: InsertIotTechnician): Promise<IotTechnician> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(iotTechnicians).values(data);
    
    const [technician] = await db.select()
      .from(iotTechnicians)
      .where(eq(iotTechnicians.id, Number(result.insertId)));
    
    return technician;
  },
  
  // Get all technicians
  async getTechnicians(params?: {
    availability?: string;
    department?: string;
    skill?: string;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conditions = [];
    
    if (params?.availability) {
      conditions.push(eq(iotTechnicians.availability, params.availability as any));
    }
    if (params?.department) {
      conditions.push(eq(iotTechnicians.department, params.department));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let technicians = await db.select()
      .from(iotTechnicians)
      .where(whereClause)
      .orderBy(iotTechnicians.rating);
    
    // Filter by skill if specified
    if (params?.skill) {
      technicians = technicians.filter(t => {
        const skills = t.skills as string[] || [];
        return skills.includes(params.skill!);
      });
    }
    
    return technicians;
  },
  
  // Get technician by user ID
  async getTechnicianByUserId(userId: number): Promise<IotTechnician | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [technician] = await db.select()
      .from(iotTechnicians)
      .where(eq(iotTechnicians.userId, userId));
    
    return technician || null;
  },
  
  // Update technician
  async updateTechnician(id: number, data: Partial<InsertIotTechnician>): Promise<IotTechnician | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(iotTechnicians)
      .set(data)
      .where(eq(iotTechnicians.id, id));
    
    const [technician] = await db.select()
      .from(iotTechnicians)
      .where(eq(iotTechnicians.id, id));
    
    return technician;
  },
  
  // Update technician availability
  async updateTechnicianAvailability(userId: number, availability: 'available' | 'busy' | 'on_leave' | 'unavailable', currentWorkOrderId?: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(iotTechnicians)
      .set({
        availability,
        currentWorkOrderId: currentWorkOrderId || null,
      })
      .where(eq(iotTechnicians.userId, userId));
  },
  
  // ==================== Auto-assignment ====================
  
  // Find best technician for work order based on skills
  async findBestTechnician(requiredSkills: string[]): Promise<IotTechnician | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const availableTechnicians = await this.getTechnicians({ availability: 'available' });
    
    if (availableTechnicians.length === 0) return null;
    
    // Score technicians based on skill match and rating
    const scored = availableTechnicians.map(tech => {
      const techSkills = tech.skills as string[] || [];
      const matchedSkills = requiredSkills.filter(s => techSkills.includes(s));
      const skillScore = matchedSkills.length / requiredSkills.length;
      const ratingScore = Number(tech.rating) / 5;
      const experienceScore = Math.min(tech.experienceYears || 0, 10) / 10;
      
      return {
        technician: tech,
        score: skillScore * 0.5 + ratingScore * 0.3 + experienceScore * 0.2,
      };
    });
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.technician || null;
  },
  
  // Auto-assign work order to best available technician
  async autoAssignWorkOrder(workOrderId: number): Promise<IotMaintenanceWorkOrder | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const workOrder = await this.getWorkOrderById(workOrderId);
    if (!workOrder || workOrder.assignedTo) return null;
    
    const requiredSkills = workOrder.requiredSkills as string[] || ['general'];
    const bestTechnician = await this.findBestTechnician(requiredSkills);
    
    if (!bestTechnician) return null;
    
    return this.updateWorkOrder(workOrderId, {
      assignedTo: bestTechnician.userId,
      status: 'assigned',
    });
  },
  
  // ==================== Predictive Integration ====================
  
  // Create work order from prediction
  async createFromPrediction(predictionId: number, createdBy?: number): Promise<IotMaintenanceWorkOrder | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [prediction] = await db.select()
      .from(iotMaintenancePredictions)
      .where(eq(iotMaintenancePredictions.id, predictionId));
    
    if (!prediction) return null;
    
    // Get device info
    const [device] = await db.select()
      .from(iotDevices)
      .where(eq(iotDevices.id, prediction.deviceId));
    
    if (!device) return null;
    
    // Determine priority based on severity
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };
    
    const priority = priorityMap[prediction.severity || 'medium'] || 'medium';
    
    // Create work order
    const workOrder = await this.createWorkOrder({
      title: `Predictive Maintenance: ${device.name}`,
      description: `Auto-generated work order based on AI prediction.\n\nPrediction Type: ${prediction.predictionType}\nConfidence: ${Number(prediction.confidenceScore) * 100}%\nPredicted Date: ${prediction.predictedDate}`,
      deviceId: prediction.deviceId,
      predictionId,
      workOrderType: 'predictive',
      priority,
      requiredSkills: ['general', 'predictive_maintenance'],
      dueDate: prediction.predictedDate,
      createdBy,
    });
    
    // Update prediction status
    await db.update(iotMaintenancePredictions)
      .set({ status: 'work_order_created' })
      .where(eq(iotMaintenancePredictions.id, predictionId));
    
    // Try to auto-assign
    await this.autoAssignWorkOrder(workOrder.id);
    
    return this.getWorkOrderById(workOrder.id) as Promise<IotMaintenanceWorkOrder>;
  },
  
  // ==================== Statistics ====================
  
  // Get work order statistics
  async getStatistics(params?: { startDate?: string; endDate?: string }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const conditions = [];
    if (params?.startDate) conditions.push(gte(iotMaintenanceWorkOrders.createdAt, params.startDate));
    if (params?.endDate) conditions.push(lte(iotMaintenanceWorkOrders.createdAt, params.endDate));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Total counts by status
    const statusCounts = await db.select({
      status: iotMaintenanceWorkOrders.status,
      count: sql<number>`count(*)`,
    })
      .from(iotMaintenanceWorkOrders)
      .where(whereClause)
      .groupBy(iotMaintenanceWorkOrders.status);
    
    // Total counts by type
    const typeCounts = await db.select({
      type: iotMaintenanceWorkOrders.workOrderType,
      count: sql<number>`count(*)`,
    })
      .from(iotMaintenanceWorkOrders)
      .where(whereClause)
      .groupBy(iotMaintenanceWorkOrders.workOrderType);
    
    // Average completion time
    const [avgTime] = await db.select({
      avgDuration: sql<number>`AVG(actual_duration)`,
    })
      .from(iotMaintenanceWorkOrders)
      .where(and(
        eq(iotMaintenanceWorkOrders.status, 'completed'),
        whereClause
      ));
    
    // Overdue count
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [{ overdueCount }] = await db.select({
      overdueCount: sql<number>`count(*)`,
    })
      .from(iotMaintenanceWorkOrders)
      .where(and(
        lte(iotMaintenanceWorkOrders.dueDate, now),
        inArray(iotMaintenanceWorkOrders.status, ['created', 'assigned', 'in_progress', 'on_hold'])
      ));
    
    return {
      byStatus: statusCounts,
      byType: typeCounts,
      avgCompletionTime: avgTime?.avgDuration || 0,
      overdueCount: Number(overdueCount),
    };
  },
};

export default maintenanceWorkOrderService;
