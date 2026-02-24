import { getDb } from "./db";
import { 
  iotOtaSchedules, 
  iotOtaScheduleRuns,
  iotOtaDeployments,
  iotOtaDeviceStatus,
  iotFirmwarePackages,
  iotDevices,
  type IotOtaSchedule,
  type InsertIotOtaSchedule,
  type IotOtaScheduleRun,
  type InsertIotOtaScheduleRun
} from "../drizzle/schema";
import { eq, and, lte, gte, desc, sql, inArray } from "drizzle-orm";

// Helper to calculate next run time
function calculateNextRunTime(schedule: IotOtaSchedule): Date | null {
  const now = new Date();
  const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
  
  switch (schedule.scheduleType) {
    case 'once':
      if (schedule.scheduledDate) {
        const scheduledDate = new Date(schedule.scheduledDate);
        scheduledDate.setHours(hours, minutes, 0, 0);
        return scheduledDate > now ? scheduledDate : null;
      }
      return null;
      
    case 'daily': {
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      return nextRun;
    }
    
    case 'weekly': {
      const daysOfWeek = (schedule.daysOfWeek as number[]) || [0];
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(nextRun);
        checkDate.setDate(checkDate.getDate() + i);
        if (daysOfWeek.includes(checkDate.getDay()) && checkDate > now) {
          return checkDate;
        }
      }
      // If no match found in current week, try next week
      const firstDay = new Date(nextRun);
      firstDay.setDate(firstDay.getDate() + 7);
      while (!daysOfWeek.includes(firstDay.getDay())) {
        firstDay.setDate(firstDay.getDate() + 1);
      }
      return firstDay;
    }
    
    case 'monthly': {
      const dayOfMonth = schedule.dayOfMonth || 1;
      const nextRun = new Date(now);
      nextRun.setDate(dayOfMonth);
      nextRun.setHours(hours, minutes, 0, 0);
      
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      return nextRun;
    }
    
    default:
      return null;
  }
}

// Check if current time is within off-peak hours
function isOffPeakTime(schedule: IotOtaSchedule): boolean {
  if (!schedule.offPeakOnly) return true;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = (schedule.offPeakStartTime || '22:00').split(':').map(Number);
  const [endHour, endMin] = (schedule.offPeakEndTime || '06:00').split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight off-peak (e.g., 22:00 - 06:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  return currentTime >= startTime && currentTime <= endTime;
}

export const scheduledOtaService = {
  // Create a new OTA schedule
  async createSchedule(data: InsertIotOtaSchedule): Promise<IotOtaSchedule> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const nextRunAt = calculateNextRunTime(data as IotOtaSchedule);
    
    const result = await db.insert(iotOtaSchedules).values({
      ...data,
      nextRunAt: nextRunAt?.toISOString().slice(0, 19).replace('T', ' ') || null,
    });
    
    const [schedule] = await db.select()
      .from(iotOtaSchedules)
      .where(eq(iotOtaSchedules.id, Number(result[0].insertId)));
    
    return schedule;
  },
  
  // Get all schedules with pagination
  async getSchedules(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const db = await getDb();
    if (!db) return { schedules: [], total: 0, page: 1, totalPages: 0 };
    
    const { status, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(iotOtaSchedules);
    
    if (status) {
      query = query.where(eq(iotOtaSchedules.status, status as any));
    }
    
    const schedules = await query
      .orderBy(desc(iotOtaSchedules.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(iotOtaSchedules)
      .where(status ? eq(iotOtaSchedules.status, status as any) : undefined);
    
    return {
      schedules,
      total: Number(count),
      page,
      totalPages: Math.ceil(Number(count) / limit),
    };
  },
  
  // Get schedule by ID with details
  async getScheduleById(id: number) {
    const db = await getDb();
    if (!db) return null;
    
    const [schedule] = await db.select()
      .from(iotOtaSchedules)
      .where(eq(iotOtaSchedules.id, id));
    
    if (!schedule) return null;
    
    // Get firmware package info
    const [firmware] = await db.select()
      .from(iotFirmwarePackages)
      .where(eq(iotFirmwarePackages.id, schedule.firmwarePackageId));
    
    // Get recent runs
    const runs = await db.select()
      .from(iotOtaScheduleRuns)
      .where(eq(iotOtaScheduleRuns.scheduleId, id))
      .orderBy(desc(iotOtaScheduleRuns.runStartedAt))
      .limit(10);
    
    return {
      ...schedule,
      firmware,
      recentRuns: runs,
    };
  },
  
  // Update schedule
  async updateSchedule(id: number, data: Partial<InsertIotOtaSchedule>): Promise<IotOtaSchedule | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [existing] = await db.select()
      .from(iotOtaSchedules)
      .where(eq(iotOtaSchedules.id, id));
    
    if (!existing) return null;
    
    const merged = { ...existing, ...data };
    const nextRunAt = calculateNextRunTime(merged as IotOtaSchedule);
    
    await db.update(iotOtaSchedules)
      .set({
        ...data,
        nextRunAt: nextRunAt?.toISOString().slice(0, 19).replace('T', ' ') || null,
      })
      .where(eq(iotOtaSchedules.id, id));
    
    const [updated] = await db.select()
      .from(iotOtaSchedules)
      .where(eq(iotOtaSchedules.id, id));
    
    return updated;
  },
  
  // Delete schedule
  async deleteSchedule(id: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Delete related runs first
    await db.delete(iotOtaScheduleRuns)
      .where(eq(iotOtaScheduleRuns.scheduleId, id));
    
    const result = await db.delete(iotOtaSchedules)
      .where(eq(iotOtaSchedules.id, id));
    
    return result[0].affectedRows > 0;
  },
  
  // Pause/Resume schedule
  async toggleScheduleStatus(id: number, status: 'active' | 'paused'): Promise<IotOtaSchedule | null> {
    return this.updateSchedule(id, { status });
  },
  
  // Get schedules due for execution
  async getDueSchedules(): Promise<IotOtaSchedule[]> {
    const db = await getDb();
    if (!db) return [];
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const schedules = await db.select()
      .from(iotOtaSchedules)
      .where(
        and(
          eq(iotOtaSchedules.status, 'active'),
          lte(iotOtaSchedules.nextRunAt, now)
        )
      );
    
    // Filter by off-peak hours
    return schedules.filter(s => isOffPeakTime(s));
  },
  
  // Execute a scheduled OTA deployment
  async executeSchedule(scheduleId: number): Promise<IotOtaScheduleRun | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule || schedule.status !== 'active') return null;
    
    // Check off-peak hours
    if (!isOffPeakTime(schedule)) {
      console.log(`[ScheduledOTA] Schedule ${scheduleId} skipped - not in off-peak hours`);
      return null;
    }
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Create run record
    const [runResult] = await db.insert(iotOtaScheduleRuns).values({
      scheduleId,
      runStartedAt: now,
      status: 'running',
      totalDevices: (schedule.targetDeviceIds as number[])?.length || 0,
    });
    
    const runId = Number(runResult.insertId);
    
    try {
      // Create OTA deployment
      const [deploymentResult] = await db.insert(iotOtaDeployments).values({
        name: `Scheduled: ${schedule.name}`,
        description: `Auto-generated from schedule #${scheduleId}`,
        firmwarePackageId: schedule.firmwarePackageId,
        deploymentType: 'scheduled',
        targetDeviceIds: schedule.targetDeviceIds,
        targetGroupIds: schedule.targetGroupIds,
        scheduledAt: now,
        totalDevices: (schedule.targetDeviceIds as number[])?.length || 0,
        status: 'in_progress',
        createdBy: schedule.createdBy,
      });
      
      const deploymentId = Number(deploymentResult.insertId);
      
      // Create device status records
      const deviceIds = schedule.targetDeviceIds as number[];
      if (deviceIds?.length > 0) {
        const deviceStatuses = deviceIds.map(deviceId => ({
          deploymentId,
          deviceId,
          targetVersion: schedule.firmware?.version || 'unknown',
          status: 'pending' as const,
          progress: 0,
        }));
        
        await db.insert(iotOtaDeviceStatus).values(deviceStatuses);
      }
      
      // Update run with deployment ID
      await db.update(iotOtaScheduleRuns)
        .set({ deploymentId })
        .where(eq(iotOtaScheduleRuns.id, runId));
      
      // Update schedule stats
      const nextRunAt = calculateNextRunTime(schedule);
      await db.update(iotOtaSchedules)
        .set({
          lastRunAt: now,
          nextRunAt: nextRunAt?.toISOString().slice(0, 19).replace('T', ' ') || null,
          totalRuns: sql`${iotOtaSchedules.totalRuns} + 1`,
        })
        .where(eq(iotOtaSchedules.id, scheduleId));
      
      // Mark as completed if 'once' type
      if (schedule.scheduleType === 'once') {
        await db.update(iotOtaSchedules)
          .set({ status: 'completed' })
          .where(eq(iotOtaSchedules.id, scheduleId));
      }
      
      const [run] = await db.select()
        .from(iotOtaScheduleRuns)
        .where(eq(iotOtaScheduleRuns.id, runId));
      
      return run;
      
    } catch (error) {
      // Mark run as failed
      await db.update(iotOtaScheduleRuns)
        .set({
          status: 'failed',
          runCompletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(iotOtaScheduleRuns.id, runId));
      
      // Update failed runs count
      await db.update(iotOtaSchedules)
        .set({
          failedRuns: sql`${iotOtaSchedules.failedRuns} + 1`,
        })
        .where(eq(iotOtaSchedules.id, scheduleId));
      
      throw error;
    }
  },
  
  // Get schedule runs
  async getScheduleRuns(scheduleId: number, limit = 20) {
    const db = await getDb();
    if (!db) return [];
    
    return db.select()
      .from(iotOtaScheduleRuns)
      .where(eq(iotOtaScheduleRuns.scheduleId, scheduleId))
      .orderBy(desc(iotOtaScheduleRuns.runStartedAt))
      .limit(limit);
  },
  
  // Process all due schedules (called by cron job)
  async processDueSchedules(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const dueSchedules = await this.getDueSchedules();
    let succeeded = 0;
    let failed = 0;
    
    for (const schedule of dueSchedules) {
      try {
        await this.executeSchedule(schedule.id);
        succeeded++;
      } catch (error) {
        console.error(`[ScheduledOTA] Failed to execute schedule ${schedule.id}:`, error);
        failed++;
      }
    }
    
    return {
      processed: dueSchedules.length,
      succeeded,
      failed,
    };
  },
  
  // Validate off-peak hours
  validateOffPeakHours(startTime: string, endTime: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(startTime) && timeRegex.test(endTime);
  },
  
  // Get recommended off-peak hours based on historical data
  async getRecommendedOffPeakHours(): Promise<{ startTime: string; endTime: string }> {
    // Default recommendation: 22:00 - 06:00
    // In a real implementation, this could analyze device activity patterns
    return {
      startTime: '22:00',
      endTime: '06:00',
    };
  },
};

export default scheduledOtaService;
