/**
 * MMS Enhancement Service
 * Task: MMS-01, MMS-02, MMS-03
 * Cung cấp các hàm nâng cao cho hệ thống MMS
 */

import { getDb } from "../db";
import { 
  workOrders, machines, spareParts, sparePartTransactions, 
  maintenanceSchedules, productionLines, realtimeAlerts 
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, asc, lt } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// Types
export interface WorkOrderFromAlarm {
  id: number;
  alarmId: number;
  machineId: number;
  machineName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
}

export interface SparePartAlert {
  id: number;
  partCode: string;
  partName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  lastUsedDate: Date | null;
  avgMonthlyUsage: number;
  daysUntilStockout: number;
  severity: "warning" | "critical";
}

export interface MaintenanceGanttItem {
  id: number;
  machineId: number;
  machineName: string;
  maintenanceType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  assignedTechnician?: string;
  status: "scheduled" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  progress: number;
}

// MMS-01: Tự động tạo work order từ alarm
export async function createWorkOrderFromAlarm(
  alarmId: number,
  machineId: number,
  alarmType: string,
  alarmMessage: string,
  severity: string
): Promise<WorkOrderFromAlarm | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Lấy thông tin máy
    const [machine] = await db.select().from(machines).where(eq(machines.id, machineId));
    if (!machine) return null;

    // Xác định priority dựa trên severity
    const priorityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
      info: "low",
      warning: "medium",
      error: "high",
      critical: "critical",
    };
    const priority = priorityMap[severity] || "medium";

    // Tạo work order
    const title = `[Auto] ${alarmType} - ${machine.name}`;
    const description = `Work order tự động tạo từ alarm:\n\nMáy: ${machine.name}\nLoại alarm: ${alarmType}\nNội dung: ${alarmMessage}\nMức độ: ${severity}\nThời gian: ${new Date().toLocaleString("vi-VN")}`;

    const [result] = await db
      .insert(workOrders)
      .values({
        machineId,
        title,
        description,
        priority,
        status: "pending",
        workOrderType: "corrective",
        estimatedDuration: priority === "critical" ? 60 : priority === "high" ? 120 : 240, // minutes
        createdAt: new Date(),
      })
      .$returningId();

    // Gửi thông báo
    await notifyOwner({
      title: `🔧 Work Order mới từ Alarm`,
      content: `Đã tự động tạo work order cho máy ${machine.name}.\n\nLoại: ${alarmType}\nMức độ: ${priority}\nID: #${result.id}`,
    });

    return {
      id: result.id,
      alarmId,
      machineId,
      machineName: machine.name,
      title,
      description,
      priority,
      status: "pending",
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("[MMS] Error creating work order from alarm:", error);
    return null;
  }
}

// MMS-02: Kiểm tra và cảnh báo tồn kho thấp
export async function checkLowStockAlerts(): Promise<SparePartAlert[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Lấy danh sách spare parts có tồn kho thấp
    const parts = await db
      .select({
        id: spareParts.id,
        partCode: spareParts.partCode,
        partName: spareParts.partName,
        currentStock: spareParts.currentStock,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        unitPrice: spareParts.unitPrice,
      })
      .from(spareParts)
      .where(sql`${spareParts.currentStock} <= ${spareParts.reorderPoint}`);

    const alerts: SparePartAlert[] = [];

    for (const part of parts) {
      // Tính toán usage trung bình trong 30 ngày qua
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageData = await db
        .select({
          totalUsed: sql<number>`SUM(CASE WHEN ${sparePartTransactions.transactionType} = 'out' THEN ${sparePartTransactions.quantity} ELSE 0 END)`,
          lastUsedDate: sql<Date>`MAX(${sparePartTransactions.transactionDate})`,
        })
        .from(sparePartTransactions)
        .where(and(
          eq(sparePartTransactions.sparePartId, part.id),
          gte(sparePartTransactions.transactionDate, thirtyDaysAgo)
        ));

      const totalUsed = Number(usageData[0]?.totalUsed) || 0;
      const avgMonthlyUsage = totalUsed;
      const avgDailyUsage = avgMonthlyUsage / 30;
      const daysUntilStockout = avgDailyUsage > 0 ? Math.floor(part.currentStock / avgDailyUsage) : 999;

      // Xác định severity
      const severity: "warning" | "critical" = 
        part.currentStock <= part.minStock ? "critical" : "warning";

      // Tính suggested order quantity (EOQ đơn giản)
      const suggestedOrderQty = Math.max(
        part.reorderPoint * 2 - part.currentStock,
        avgMonthlyUsage * 2
      );

      alerts.push({
        id: part.id,
        partCode: part.partCode,
        partName: part.partName,
        currentStock: part.currentStock,
        minStock: part.minStock,
        reorderPoint: part.reorderPoint,
        suggestedOrderQty: Math.ceil(suggestedOrderQty),
        lastUsedDate: usageData[0]?.lastUsedDate || null,
        avgMonthlyUsage,
        daysUntilStockout,
        severity,
      });
    }

    // Sắp xếp theo severity và daysUntilStockout
    alerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "critical" ? -1 : 1;
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return alerts;
  } catch (error) {
    console.error("[MMS] Error checking low stock alerts:", error);
    return [];
  }
}

// Gửi cảnh báo tồn kho thấp
export async function sendLowStockNotifications(): Promise<{ sent: number; alerts: SparePartAlert[] }> {
  const alerts = await checkLowStockAlerts();
  
  if (alerts.length === 0) {
    return { sent: 0, alerts: [] };
  }

  const criticalAlerts = alerts.filter(a => a.severity === "critical");
  const warningAlerts = alerts.filter(a => a.severity === "warning");

  let content = `📦 **Cảnh báo Tồn kho Phụ tùng**\n\n`;

  if (criticalAlerts.length > 0) {
    content += `🔴 **Nghiêm trọng (${criticalAlerts.length}):**\n`;
    criticalAlerts.slice(0, 5).forEach(a => {
      content += `- ${a.partName} (${a.partCode}): ${a.currentStock}/${a.minStock} - còn ~${a.daysUntilStockout} ngày\n`;
    });
    content += "\n";
  }

  if (warningAlerts.length > 0) {
    content += `🟡 **Cảnh báo (${warningAlerts.length}):**\n`;
    warningAlerts.slice(0, 5).forEach(a => {
      content += `- ${a.partName} (${a.partCode}): ${a.currentStock}/${a.reorderPoint}\n`;
    });
  }

  await notifyOwner({
    title: `📦 Cảnh báo Tồn kho: ${criticalAlerts.length} nghiêm trọng, ${warningAlerts.length} cảnh báo`,
    content,
  });

  return { sent: 1, alerts };
}

// MMS-03: Lấy dữ liệu cho biểu đồ Gantt bảo trì
export async function getMaintenanceGanttData(
  startDate: Date,
  endDate: Date,
  productionLineId?: number,
  machineId?: number
): Promise<MaintenanceGanttItem[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [
      gte(maintenanceSchedules.scheduledDate, startDate),
      lte(maintenanceSchedules.scheduledDate, endDate),
    ];

    if (machineId) {
      conditions.push(eq(maintenanceSchedules.machineId, machineId));
    }

    const schedules = await db
      .select({
        id: maintenanceSchedules.id,
        machineId: maintenanceSchedules.machineId,
        machineName: machines.name,
        maintenanceType: maintenanceSchedules.maintenanceType,
        scheduledDate: maintenanceSchedules.scheduledDate,
        estimatedDuration: maintenanceSchedules.estimatedDuration,
        actualStartTime: maintenanceSchedules.actualStartTime,
        actualEndTime: maintenanceSchedules.actualEndTime,
        assignedTo: maintenanceSchedules.assignedTo,
        status: maintenanceSchedules.status,
        priority: maintenanceSchedules.priority,
        completionPercentage: maintenanceSchedules.completionPercentage,
      })
      .from(maintenanceSchedules)
      .leftJoin(machines, eq(maintenanceSchedules.machineId, machines.id))
      .where(and(...conditions))
      .orderBy(asc(maintenanceSchedules.scheduledDate));

    // Filter by production line if specified
    let filteredSchedules = schedules;
    if (productionLineId) {
      const lineMachines = await db
        .select({ id: machines.id })
        .from(machines)
        .where(eq(machines.productionLineId, productionLineId));
      const machineIds = new Set(lineMachines.map(m => m.id));
      filteredSchedules = schedules.filter(s => s.machineId && machineIds.has(s.machineId));
    }

    return filteredSchedules.map(s => {
      const scheduledStart = new Date(s.scheduledDate);
      const scheduledEnd = new Date(scheduledStart.getTime() + (s.estimatedDuration || 60) * 60 * 1000);

      // Determine status
      let status: "scheduled" | "in_progress" | "completed" | "overdue" = "scheduled";
      if (s.status === "completed") {
        status = "completed";
      } else if (s.actualStartTime && !s.actualEndTime) {
        status = "in_progress";
      } else if (scheduledEnd < new Date() && s.status !== "completed") {
        status = "overdue";
      }

      return {
        id: s.id,
        machineId: s.machineId || 0,
        machineName: s.machineName || `Machine ${s.machineId}`,
        maintenanceType: s.maintenanceType || "general",
        scheduledStart,
        scheduledEnd,
        actualStart: s.actualStartTime || undefined,
        actualEnd: s.actualEndTime || undefined,
        assignedTechnician: s.assignedTo || undefined,
        status,
        priority: (s.priority as "low" | "medium" | "high") || "medium",
        progress: s.completionPercentage || 0,
      };
    });
  } catch (error) {
    console.error("[MMS] Error getting maintenance Gantt data:", error);
    return [];
  }
}

// Lấy thống kê bảo trì
export async function getMaintenanceStats(
  startDate: Date,
  endDate: Date,
  productionLineId?: number
): Promise<{
  totalScheduled: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  avgCompletionTime: number;
  upcomingCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalScheduled: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      upcomingCount: 0,
    };
  }

  try {
    const conditions = [
      gte(maintenanceSchedules.scheduledDate, startDate),
      lte(maintenanceSchedules.scheduledDate, endDate),
    ];

    const schedules = await db
      .select({
        id: maintenanceSchedules.id,
        machineId: maintenanceSchedules.machineId,
        status: maintenanceSchedules.status,
        scheduledDate: maintenanceSchedules.scheduledDate,
        estimatedDuration: maintenanceSchedules.estimatedDuration,
        actualStartTime: maintenanceSchedules.actualStartTime,
        actualEndTime: maintenanceSchedules.actualEndTime,
      })
      .from(maintenanceSchedules)
      .where(and(...conditions));

    // Filter by production line if specified
    let filteredSchedules = schedules;
    if (productionLineId) {
      const lineMachines = await db
        .select({ id: machines.id })
        .from(machines)
        .where(eq(machines.productionLineId, productionLineId));
      const machineIds = new Set(lineMachines.map(m => m.id));
      filteredSchedules = schedules.filter(s => s.machineId && machineIds.has(s.machineId));
    }

    const now = new Date();
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let totalCompletionTime = 0;
    let completedWithTime = 0;

    filteredSchedules.forEach(s => {
      if (s.status === "completed") {
        completed++;
        if (s.actualStartTime && s.actualEndTime) {
          totalCompletionTime += (new Date(s.actualEndTime).getTime() - new Date(s.actualStartTime).getTime()) / (1000 * 60);
          completedWithTime++;
        }
      } else if (s.actualStartTime && !s.actualEndTime) {
        inProgress++;
      } else {
        const scheduledEnd = new Date(s.scheduledDate);
        scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (s.estimatedDuration || 60));
        if (scheduledEnd < now) {
          overdue++;
        }
      }
    });

    // Count upcoming (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingCount = filteredSchedules.filter(s => {
      const scheduled = new Date(s.scheduledDate);
      return scheduled >= now && scheduled <= nextWeek && s.status !== "completed";
    }).length;

    return {
      totalScheduled: filteredSchedules.length,
      completed,
      inProgress,
      overdue,
      completionRate: filteredSchedules.length > 0 ? (completed / filteredSchedules.length) * 100 : 0,
      avgCompletionTime: completedWithTime > 0 ? totalCompletionTime / completedWithTime : 0,
      upcomingCount,
    };
  } catch (error) {
    console.error("[MMS] Error getting maintenance stats:", error);
    return {
      totalScheduled: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      completionRate: 0,
      avgCompletionTime: 0,
      upcomingCount: 0,
    };
  }
}
