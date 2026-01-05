import { getDb } from "./db";
import {
  iotSmsConfig,
  iotPushConfig,
  iotTechnicianNotificationPrefs,
  iotWorkOrderNotifications,
  iotMaintenanceWorkOrders,
  iotTechnicians,
  users,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Types
interface NotificationPayload {
  workOrderId: number;
  technicianId: number;
  notificationType: 'new_work_order' | 'assigned' | 'status_change' | 'due_soon' | 'overdue' | 'comment' | 'escalation';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

interface SmsConfig {
  provider: 'twilio' | 'nexmo' | 'aws_sns';
  accountSid: string;
  authToken: string;
  fromNumber: string;
  maxSmsPerDay: number;
  maxSmsPerHour: number;
  cooldownMinutes: number;
  isEnabled: boolean;
}

interface PushConfig {
  provider: 'firebase' | 'onesignal' | 'pusher';
  projectId: string;
  serverKey: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  isEnabled: boolean;
}

interface TechnicianPrefs {
  pushEnabled: boolean;
  pushToken?: string;
  pushPlatform?: 'web' | 'android' | 'ios';
  smsEnabled: boolean;
  phoneNumber?: string;
  phoneCountryCode?: string;
  emailEnabled: boolean;
  email?: string;
  notifyNewWorkOrder: boolean;
  notifyAssigned: boolean;
  notifyStatusChange: boolean;
  notifyDueSoon: boolean;
  notifyOverdue: boolean;
  notifyComment: boolean;
  minPriorityForPush: 'low' | 'medium' | 'high' | 'critical';
  minPriorityForSms: 'low' | 'medium' | 'high' | 'critical';
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// Priority levels for comparison
const PRIORITY_LEVELS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Check if current time is within quiet hours
function isQuietHours(prefs: TechnicianPrefs): boolean {
  if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
}

// Check if notification type is enabled for technician
function isNotificationTypeEnabled(prefs: TechnicianPrefs, type: string): boolean {
  switch (type) {
    case 'new_work_order': return prefs.notifyNewWorkOrder;
    case 'assigned': return prefs.notifyAssigned;
    case 'status_change': return prefs.notifyStatusChange;
    case 'due_soon': return prefs.notifyDueSoon;
    case 'overdue': return prefs.notifyOverdue;
    case 'comment': return prefs.notifyComment;
    case 'escalation': return true; // Always notify for escalations
    default: return true;
  }
}

// Check if priority meets minimum threshold
function meetsPriorityThreshold(workOrderPriority: string, minPriority: string): boolean {
  const workOrderLevel = PRIORITY_LEVELS[workOrderPriority] || 1;
  const minLevel = PRIORITY_LEVELS[minPriority] || 1;
  return workOrderLevel >= minLevel;
}

// Send SMS via Twilio
async function sendTwilioSms(config: SmsConfig, to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Dynamic import to avoid issues if twilio is not installed
    const twilio = await import('twilio');
    const client = twilio.default(config.accountSid, config.authToken);
    
    const message = await client.messages.create({
      body,
      from: config.fromNumber,
      to,
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('[WorkOrderNotification] Twilio SMS error:', error);
    return { success: false, error: error.message };
  }
}

// Send Push via Firebase
async function sendFirebasePush(
  config: PushConfig, 
  token: string, 
  title: string, 
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Dynamic import
    const admin = await import('firebase-admin');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.vapidPrivateKey?.replace(/\\n/g, '\n'),
          clientEmail: `firebase-adminsdk@${config.projectId}.iam.gserviceaccount.com`,
        }),
      });
    }
    
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/badge.png',
        },
      },
    };
    
    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('[WorkOrderNotification] Firebase Push error:', error);
    return { success: false, error: error.message };
  }
}

// Main notification service
export const workOrderNotificationService = {
  // Get SMS config
  async getSmsConfig(): Promise<SmsConfig | null> {
    const db = await getDb();
    if (!db) return null;
    
    const [config] = await db.select().from(iotSmsConfig).limit(1);
    return config as SmsConfig | null;
  },
  
  // Get Push config
  async getPushConfig(): Promise<PushConfig | null> {
    const db = await getDb();
    if (!db) return null;
    
    const [config] = await db.select().from(iotPushConfig).limit(1);
    return config as PushConfig | null;
  },
  
  // Get technician notification preferences
  async getTechnicianPrefs(technicianId: number): Promise<TechnicianPrefs | null> {
    const db = await getDb();
    if (!db) return null;
    
    const [prefs] = await db.select()
      .from(iotTechnicianNotificationPrefs)
      .where(eq(iotTechnicianNotificationPrefs.technicianId, technicianId));
    
    if (!prefs) {
      // Return default preferences
      return {
        pushEnabled: true,
        smsEnabled: false,
        emailEnabled: true,
        notifyNewWorkOrder: true,
        notifyAssigned: true,
        notifyStatusChange: true,
        notifyDueSoon: true,
        notifyOverdue: true,
        notifyComment: false,
        minPriorityForPush: 'low',
        minPriorityForSms: 'high',
        quietHoursEnabled: false,
      };
    }
    
    return prefs as unknown as TechnicianPrefs;
  },
  
  // Record notification in database
  async recordNotification(
    workOrderId: number,
    technicianId: number,
    notificationType: string,
    channel: 'push' | 'sms' | 'email',
    title: string,
    message: string,
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    externalMessageId?: string,
    failureReason?: string,
    metadata?: Record<string, any>
  ) {
    const db = await getDb();
    if (!db) return null;
    
    const [result] = await db.insert(iotWorkOrderNotifications).values({
      workOrderId,
      technicianId,
      notificationType,
      channel,
      title,
      message,
      status,
      externalMessageId,
      failureReason,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
    
    return result.insertId;
  },
  
  // Send notification to technician
  async sendNotification(payload: NotificationPayload): Promise<{
    pushSent: boolean;
    smsSent: boolean;
    emailSent: boolean;
    errors: string[];
  }> {
    const result = {
      pushSent: false,
      smsSent: false,
      emailSent: false,
      errors: [] as string[],
    };
    
    const db = await getDb();
    if (!db) {
      result.errors.push('Database not available');
      return result;
    }
    
    // Get technician preferences
    const prefs = await this.getTechnicianPrefs(payload.technicianId);
    if (!prefs) {
      result.errors.push('Technician preferences not found');
      return result;
    }
    
    // Check if notification type is enabled
    if (!isNotificationTypeEnabled(prefs, payload.notificationType)) {
      console.log(`[WorkOrderNotification] Notification type ${payload.notificationType} disabled for technician ${payload.technicianId}`);
      return result;
    }
    
    // Check quiet hours
    if (isQuietHours(prefs)) {
      console.log(`[WorkOrderNotification] Quiet hours active for technician ${payload.technicianId}`);
      return result;
    }
    
    // Get work order for priority check
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, payload.workOrderId));
    
    const workOrderPriority = workOrder?.priority || 'medium';
    
    // Send Push notification
    if (prefs.pushEnabled && prefs.pushToken) {
      if (meetsPriorityThreshold(workOrderPriority, prefs.minPriorityForPush)) {
        const pushConfig = await this.getPushConfig();
        if (pushConfig?.isEnabled) {
          const pushResult = await sendFirebasePush(
            pushConfig,
            prefs.pushToken,
            payload.title,
            payload.message,
            {
              workOrderId: payload.workOrderId.toString(),
              notificationType: payload.notificationType,
            }
          );
          
          result.pushSent = pushResult.success;
          
          await this.recordNotification(
            payload.workOrderId,
            payload.technicianId,
            payload.notificationType,
            'push',
            payload.title,
            payload.message,
            pushResult.success ? 'sent' : 'failed',
            pushResult.messageId,
            pushResult.error,
            payload.metadata
          );
          
          if (!pushResult.success) {
            result.errors.push(`Push failed: ${pushResult.error}`);
          }
        } else {
          console.log('[WorkOrderNotification] Push notifications disabled in config');
        }
      }
    }
    
    // Send SMS notification
    if (prefs.smsEnabled && prefs.phoneNumber) {
      if (meetsPriorityThreshold(workOrderPriority, prefs.minPriorityForSms)) {
        const smsConfig = await this.getSmsConfig();
        if (smsConfig?.isEnabled) {
          const fullPhoneNumber = `${prefs.phoneCountryCode || '+84'}${prefs.phoneNumber}`;
          const smsResult = await sendTwilioSms(
            smsConfig,
            fullPhoneNumber,
            `${payload.title}\n\n${payload.message}`
          );
          
          result.smsSent = smsResult.success;
          
          await this.recordNotification(
            payload.workOrderId,
            payload.technicianId,
            payload.notificationType,
            'sms',
            payload.title,
            payload.message,
            smsResult.success ? 'sent' : 'failed',
            smsResult.messageId,
            smsResult.error,
            payload.metadata
          );
          
          if (!smsResult.success) {
            result.errors.push(`SMS failed: ${smsResult.error}`);
          }
        } else {
          console.log('[WorkOrderNotification] SMS notifications disabled in config');
        }
      }
    }
    
    return result;
  },
  
  // Send notification when work order is created
  async notifyNewWorkOrder(workOrderId: number, assignedTo?: number) {
    const db = await getDb();
    if (!db) return;
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, workOrderId));
    
    if (!workOrder) return;
    
    // If assigned, notify the assigned technician
    if (assignedTo) {
      await this.sendNotification({
        workOrderId,
        technicianId: assignedTo,
        notificationType: 'new_work_order',
        title: `Work Order mới: ${workOrder.workOrderNumber}`,
        message: `${workOrder.title}\nƯu tiên: ${workOrder.priority}\nLoại: ${workOrder.workOrderType}`,
        metadata: {
          workOrderNumber: workOrder.workOrderNumber,
          priority: workOrder.priority,
          workOrderType: workOrder.workOrderType,
        },
      });
    }
  },
  
  // Send notification when work order is assigned
  async notifyAssigned(workOrderId: number, technicianId: number) {
    const db = await getDb();
    if (!db) return;
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, workOrderId));
    
    if (!workOrder) return;
    
    await this.sendNotification({
      workOrderId,
      technicianId,
      notificationType: 'assigned',
      title: `Bạn được gán Work Order: ${workOrder.workOrderNumber}`,
      message: `${workOrder.title}\nƯu tiên: ${workOrder.priority}\nHạn: ${workOrder.dueDate || 'Không có'}`,
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        priority: workOrder.priority,
        dueDate: workOrder.dueDate,
      },
    });
  },
  
  // Send notification when work order status changes
  async notifyStatusChange(workOrderId: number, oldStatus: string, newStatus: string) {
    const db = await getDb();
    if (!db) return;
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, workOrderId));
    
    if (!workOrder || !workOrder.assignedTo) return;
    
    await this.sendNotification({
      workOrderId,
      technicianId: workOrder.assignedTo,
      notificationType: 'status_change',
      title: `Work Order ${workOrder.workOrderNumber} cập nhật`,
      message: `Trạng thái: ${oldStatus} → ${newStatus}`,
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        oldStatus,
        newStatus,
      },
    });
  },
  
  // Send notification when work order is due soon
  async notifyDueSoon(workOrderId: number) {
    const db = await getDb();
    if (!db) return;
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, workOrderId));
    
    if (!workOrder || !workOrder.assignedTo) return;
    
    await this.sendNotification({
      workOrderId,
      technicianId: workOrder.assignedTo,
      notificationType: 'due_soon',
      title: `Work Order ${workOrder.workOrderNumber} sắp đến hạn`,
      message: `${workOrder.title}\nHạn: ${workOrder.dueDate}`,
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        dueDate: workOrder.dueDate,
      },
    });
  },
  
  // Send notification when work order is overdue
  async notifyOverdue(workOrderId: number) {
    const db = await getDb();
    if (!db) return;
    
    const [workOrder] = await db.select()
      .from(iotMaintenanceWorkOrders)
      .where(eq(iotMaintenanceWorkOrders.id, workOrderId));
    
    if (!workOrder || !workOrder.assignedTo) return;
    
    await this.sendNotification({
      workOrderId,
      technicianId: workOrder.assignedTo,
      notificationType: 'overdue',
      title: `⚠️ Work Order ${workOrder.workOrderNumber} QUÁ HẠN`,
      message: `${workOrder.title}\nHạn: ${workOrder.dueDate}\nVui lòng xử lý ngay!`,
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        dueDate: workOrder.dueDate,
      },
    });
  },
  
  // Get notification history for a work order
  async getNotificationHistory(workOrderId: number) {
    const db = await getDb();
    if (!db) return [];
    
    const notifications = await db.select()
      .from(iotWorkOrderNotifications)
      .where(eq(iotWorkOrderNotifications.workOrderId, workOrderId))
      .orderBy(desc(iotWorkOrderNotifications.createdAt));
    
    return notifications;
  },
  
  // Test SMS configuration
  async testSmsConfig(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    const smsConfig = await this.getSmsConfig();
    if (!smsConfig) {
      return { success: false, error: 'SMS config not found' };
    }
    
    if (!smsConfig.isEnabled) {
      return { success: false, error: 'SMS is disabled in config' };
    }
    
    return sendTwilioSms(
      smsConfig,
      phoneNumber,
      'Test message from CPK/SPC Calculator - Work Order Notification System'
    );
  },
  
  // Test Push configuration
  async testPushConfig(token: string): Promise<{ success: boolean; error?: string }> {
    const pushConfig = await this.getPushConfig();
    if (!pushConfig) {
      return { success: false, error: 'Push config not found' };
    }
    
    if (!pushConfig.isEnabled) {
      return { success: false, error: 'Push is disabled in config' };
    }
    
    return sendFirebasePush(
      pushConfig,
      token,
      'Test Notification',
      'This is a test notification from CPK/SPC Calculator',
      { test: 'true' }
    );
  },
};

export default workOrderNotificationService;
