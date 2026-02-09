/**
 * Work Order Notification Scheduler Service
 * Handles scheduled notifications for work orders that are due soon or overdue
 */

import { getDb } from '../db';
import { 
  iotMaintenanceWorkOrders, 
  iotTechnicians,
  iotTechnicianNotificationPrefs,
  iotWorkOrderNotifications
} from '../../drizzle/schema';
import { eq, and, lte, gte, inArray, isNull, sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { sendSmsNotification } from './smsNotificationService';
import { 
  initializeFirebase, 
  sendToDevice, 
  isFirebaseInitialized,
  type FirebaseConfig 
} from './firebaseAdminService';

// Types
export interface WorkOrderNotificationResult {
  dueSoon: {
    checked: number;
    notified: number;
    errors: number;
  };
  overdue: {
    checked: number;
    notified: number;
    errors: number;
  };
  timestamp: Date;
}

// Configuration
const DUE_SOON_HOURS = 24; // Notify 24 hours before due
const OVERDUE_CHECK_INTERVAL = 60; // Check every 60 minutes

/**
 * Initialize Firebase from environment variables
 */
async function ensureFirebaseInitialized(): Promise<boolean> {
  if (isFirebaseInitialized()) {
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.log('[WorkOrderNotification] Firebase credentials not configured');
    return false;
  }

  try {
    const config: FirebaseConfig = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
    return await initializeFirebase(config);
  } catch (error) {
    console.error('[WorkOrderNotification] Failed to initialize Firebase:', error);
    return false;
  }
}

/**
 * Get work orders that are due soon (within 24 hours)
 */
async function getWorkOrdersDueSoon(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();
    const dueSoonTime = new Date(now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000);

    const workOrders = await db
      .select()
      .from(iotMaintenanceWorkOrders)
      .where(
        and(
          inArray(iotMaintenanceWorkOrders.status, ['created', 'assigned', 'in_progress']),
          gte(iotMaintenanceWorkOrders.scheduledStartAt, now),
          lte(iotMaintenanceWorkOrders.scheduledStartAt, dueSoonTime)
        )
      );

    return workOrders;
  } catch (error) {
    console.error('[WorkOrderNotification] Error getting due soon work orders:', error);
    return [];
  }
}

/**
 * Get work orders that are overdue
 */
async function getOverdueWorkOrders(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();

    const workOrders = await db
      .select()
      .from(iotMaintenanceWorkOrders)
      .where(
        and(
          inArray(iotMaintenanceWorkOrders.status, ['created', 'assigned', 'in_progress', 'on_hold']),
          lte(iotMaintenanceWorkOrders.scheduledStartAt, now)
        )
      );

    return workOrders;
  } catch (error) {
    console.error('[WorkOrderNotification] Error getting overdue work orders:', error);
    return [];
  }
}

/**
 * Get technician notification preferences
 */
async function getTechnicianPrefs(technicianId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const prefs = await db
      .select()
      .from(iotTechnicianNotificationPrefs)
      .where(eq(iotTechnicianNotificationPrefs.technicianId, technicianId))
      .limit(1);

    return prefs[0] || null;
  } catch (error) {
    console.error('[WorkOrderNotification] Error getting technician prefs:', error);
    return null;
  }
}

/**
 * Get technician details
 */
async function getTechnician(technicianId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const technicians = await db
      .select()
      .from(iotTechnicians)
      .where(eq(iotTechnicians.id, technicianId))
      .limit(1);

    return technicians[0] || null;
  } catch (error) {
    console.error('[WorkOrderNotification] Error getting technician:', error);
    return null;
  }
}

/**
 * Log notification to database
 */
async function logNotification(
  workOrderId: number,
  technicianId: number,
  notificationType: 'due_soon' | 'overdue',
  channel: 'push' | 'sms' | 'email',
  title: string,
  message: string,
  status: 'pending' | 'sent' | 'delivered' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(iotWorkOrderNotifications).values({
      workOrderId,
      technicianId,
      notificationType,
      channel,
      title,
      message,
      status,
      errorMessage: errorMessage || null,
      sentAt: status === 'sent' || status === 'delivered' ? new Date() : null,
    });
  } catch (error) {
    console.error('[WorkOrderNotification] Error logging notification:', error);
  }
}

/**
 * Check if notification was already sent today for this work order
 */
async function wasNotificationSentToday(
  workOrderId: number,
  notificationType: 'due_soon' | 'overdue'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = await db
      .select()
      .from(iotWorkOrderNotifications)
      .where(
        and(
          eq(iotWorkOrderNotifications.workOrderId, workOrderId),
          eq(iotWorkOrderNotifications.notificationType, notificationType),
          inArray(iotWorkOrderNotifications.status, ['sent', 'delivered']),
          gte(iotWorkOrderNotifications.sentAt, today)
        )
      )
      .limit(1);

    return notifications.length > 0;
  } catch (error) {
    console.error('[WorkOrderNotification] Error checking notification history:', error);
    return false;
  }
}

/**
 * Send notification to technician via configured channels
 */
async function sendNotificationToTechnician(
  workOrder: any,
  technician: any,
  prefs: any,
  notificationType: 'due_soon' | 'overdue'
): Promise<{ push: boolean; sms: boolean; email: boolean }> {
  const result = { push: false, sms: false, email: false };

  const title = notificationType === 'due_soon'
    ? `⏰ Work Order sắp đến hạn: ${workOrder.workOrderNumber}`
    : `🚨 Work Order quá hạn: ${workOrder.workOrderNumber}`;

  const scheduledDate = workOrder.scheduledStartAt 
    ? new Date(workOrder.scheduledStartAt).toLocaleString('vi-VN')
    : 'Không xác định';

  const message = notificationType === 'due_soon'
    ? `Work Order "${workOrder.title}" sẽ đến hạn vào ${scheduledDate}. Vui lòng hoàn thành trước thời hạn.`
    : `Work Order "${workOrder.title}" đã quá hạn (dự kiến: ${scheduledDate}). Vui lòng xử lý ngay!`;

  // Check if notification preferences allow this type
  const shouldNotifyDueSoon = prefs?.notifyDueSoon ?? true;
  const shouldNotifyOverdue = prefs?.notifyOverdue ?? true;

  if (notificationType === 'due_soon' && !shouldNotifyDueSoon) {
    console.log(`[WorkOrderNotification] Technician ${technician.id} disabled due_soon notifications`);
    return result;
  }

  if (notificationType === 'overdue' && !shouldNotifyOverdue) {
    console.log(`[WorkOrderNotification] Technician ${technician.id} disabled overdue notifications`);
    return result;
  }

  // Send Push Notification
  if (prefs?.pushEnabled && prefs?.fcmToken) {
    try {
      await ensureFirebaseInitialized();
      if (isFirebaseInitialized()) {
        const pushResult = await sendToDevice(prefs.fcmToken, {
          title,
          body: message,
          data: {
            type: 'work_order_notification',
            workOrderId: workOrder.id.toString(),
            notificationType,
          },
          priority: notificationType === 'overdue' ? 'high' : 'normal',
        });

        result.push = pushResult.success;
        await logNotification(
          workOrder.id,
          technician.id,
          notificationType,
          'push',
          title,
          message,
          pushResult.success ? 'sent' : 'failed',
          pushResult.success ? undefined : 'Push notification failed'
        );
      }
    } catch (error) {
      console.error('[WorkOrderNotification] Push notification error:', error);
      await logNotification(
        workOrder.id,
        technician.id,
        notificationType,
        'push',
        title,
        message,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Send SMS Notification
  if (prefs?.smsEnabled && technician.phone) {
    try {
      const smsResult = await sendSmsNotification(technician.phone, message);
      result.sms = smsResult.success;
      await logNotification(
        workOrder.id,
        technician.id,
        notificationType,
        'sms',
        title,
        message,
        smsResult.success ? 'sent' : 'failed',
        smsResult.success ? undefined : smsResult.error
      );
    } catch (error) {
      console.error('[WorkOrderNotification] SMS notification error:', error);
      await logNotification(
        workOrder.id,
        technician.id,
        notificationType,
        'sms',
        title,
        message,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  return result;
}

/**
 * Process work orders due soon and send notifications
 */
async function processWorkOrdersDueSoon(): Promise<{ checked: number; notified: number; errors: number }> {
  const result = { checked: 0, notified: 0, errors: 0 };

  try {
    const workOrders = await getWorkOrdersDueSoon();
    result.checked = workOrders.length;

    console.log(`[WorkOrderNotification] Found ${workOrders.length} work orders due soon`);

    for (const workOrder of workOrders) {
      try {
        // Skip if notification already sent today
        if (await wasNotificationSentToday(workOrder.id, 'due_soon')) {
          console.log(`[WorkOrderNotification] Skipping WO ${workOrder.workOrderNumber} - already notified today`);
          continue;
        }

        // Get assigned technician
        if (!workOrder.assignedTo) {
          console.log(`[WorkOrderNotification] WO ${workOrder.workOrderNumber} has no assigned technician`);
          continue;
        }

        const technician = await getTechnician(workOrder.assignedTo);
        if (!technician) {
          console.log(`[WorkOrderNotification] Technician ${workOrder.assignedTo} not found`);
          continue;
        }

        const prefs = await getTechnicianPrefs(technician.id);
        const notifyResult = await sendNotificationToTechnician(workOrder, technician, prefs, 'due_soon');

        if (notifyResult.push || notifyResult.sms || notifyResult.email) {
          result.notified++;
          console.log(`[WorkOrderNotification] Notified technician ${technician.name} for WO ${workOrder.workOrderNumber}`);
        }
      } catch (error) {
        result.errors++;
        console.error(`[WorkOrderNotification] Error processing WO ${workOrder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[WorkOrderNotification] Error processing due soon work orders:', error);
  }

  return result;
}

/**
 * Process overdue work orders and send notifications
 */
async function processOverdueWorkOrders(): Promise<{ checked: number; notified: number; errors: number }> {
  const result = { checked: 0, notified: 0, errors: 0 };

  try {
    const workOrders = await getOverdueWorkOrders();
    result.checked = workOrders.length;

    console.log(`[WorkOrderNotification] Found ${workOrders.length} overdue work orders`);

    for (const workOrder of workOrders) {
      try {
        // Skip if notification already sent today
        if (await wasNotificationSentToday(workOrder.id, 'overdue')) {
          console.log(`[WorkOrderNotification] Skipping WO ${workOrder.workOrderNumber} - already notified today`);
          continue;
        }

        // Get assigned technician
        if (!workOrder.assignedTo) {
          // Notify owner if no technician assigned
          await notifyOwner({
            title: `🚨 Work Order quá hạn chưa được gán: ${workOrder.workOrderNumber}`,
            content: `Work Order "${workOrder.title}" đã quá hạn nhưng chưa được gán cho kỹ thuật viên nào.`,
          });
          result.notified++;
          continue;
        }

        const technician = await getTechnician(workOrder.assignedTo);
        if (!technician) {
          console.log(`[WorkOrderNotification] Technician ${workOrder.assignedTo} not found`);
          continue;
        }

        const prefs = await getTechnicianPrefs(technician.id);
        const notifyResult = await sendNotificationToTechnician(workOrder, technician, prefs, 'overdue');

        if (notifyResult.push || notifyResult.sms || notifyResult.email) {
          result.notified++;
          console.log(`[WorkOrderNotification] Notified technician ${technician.name} for overdue WO ${workOrder.workOrderNumber}`);
        }

        // Also notify owner for overdue work orders
        await notifyOwner({
          title: `🚨 Work Order quá hạn: ${workOrder.workOrderNumber}`,
          content: `Work Order "${workOrder.title}" đã quá hạn. Kỹ thuật viên: ${technician.name}`,
        });
      } catch (error) {
        result.errors++;
        console.error(`[WorkOrderNotification] Error processing overdue WO ${workOrder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[WorkOrderNotification] Error processing overdue work orders:', error);
  }

  return result;
}

/**
 * Main function to check and send work order notifications
 */
export async function checkWorkOrderNotifications(): Promise<WorkOrderNotificationResult> {
  console.log('[WorkOrderNotification] Starting work order notification check...');

  const dueSoonResult = await processWorkOrdersDueSoon();
  const overdueResult = await processOverdueWorkOrders();

  const result: WorkOrderNotificationResult = {
    dueSoon: dueSoonResult,
    overdue: overdueResult,
    timestamp: new Date(),
  };

  console.log(`[WorkOrderNotification] Check completed:
    - Due Soon: ${dueSoonResult.checked} checked, ${dueSoonResult.notified} notified, ${dueSoonResult.errors} errors
    - Overdue: ${overdueResult.checked} checked, ${overdueResult.notified} notified, ${overdueResult.errors} errors`);

  return result;
}

/**
 * Manually trigger work order notification check (for testing)
 */
export async function triggerWorkOrderNotificationCheck(): Promise<WorkOrderNotificationResult> {
  return await checkWorkOrderNotifications();
}

export default {
  checkWorkOrderNotifications,
  triggerWorkOrderNotificationCheck,
};
