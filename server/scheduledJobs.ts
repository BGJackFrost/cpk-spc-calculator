/**
 * Scheduled Jobs Module
 * Handles automated tasks like license expiry checks
 */

import cron from 'node-cron';
import { getLicensesExpiringSoon, getExpiredLicenses, getDb } from './db';
import { generateShiftReport, sendShiftReportEmail, getCurrentShift } from './services/shiftReportService';
import { realtimeAlerts, machines, machineOnlineStatus } from '../drizzle/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { triggerWebhooks } from './webhookService';
import { notifyOwner } from './_core/notification';
import { processWebhookRetries, getRetryStats } from './webhookService';
import { sendEmail } from './emailService';
import { spareParts, sparePartsInventory, suppliers } from '../drizzle/schema';

// Track if jobs are already initialized
let jobsInitialized = false;

/**
 * Send license renewal email notifications
 */
async function sendLicenseRenewalEmails(): Promise<{ sent: number; failed: number }> {
  console.log('[ScheduledJob] Sending license renewal emails...');
  
  let sent = 0;
  let failed = 0;
  
  try {
    // Get licenses expiring in 30 days
    const expiringSoon30 = await getLicensesExpiringSoon(30);
    // Get licenses expiring in 7 days
    const expiringSoon7 = await getLicensesExpiringSoon(7);
    
    // Send urgent emails for licenses expiring in 7 days
    for (const license of expiringSoon7) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 7 && daysLeft > 0 && license.contactEmail) {
        const result = await sendEmail(
          license.contactEmail,
          `⚠️ Cảnh báo: License SPC/CPK Calculator sẽ hết hạn trong ${daysLeft} ngày`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">⚠️ License sắp hết hạn!</h2>
              <p>Kính gửi <strong>${license.companyName || 'Quý khách'}</strong>,</p>
              <p>License <strong>${license.licenseType?.toUpperCase()}</strong> của bạn sẽ hết hạn trong <strong style="color: #dc2626;">${daysLeft} ngày</strong>.</p>
              <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>License Key:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseKey}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Loại:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseType?.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ngày hết hạn:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}</td></tr>
              </table>
              <p>Vui lòng liên hệ để gia hạn license trước khi hết hạn để tránh gián đoạn dịch vụ.</p>
              <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
            </div>
          `
        );
        
        if (result.success) sent++;
        else failed++;
      }
    }
    
    // Send warning emails for licenses expiring in 30 days (but not in 7-day window)
    for (const license of expiringSoon30) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 7 && daysLeft <= 30 && license.contactEmail) {
        const result = await sendEmail(
          license.contactEmail,
          `📅 Nhắc nhở: License SPC/CPK Calculator sẽ hết hạn trong ${daysLeft} ngày`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">📅 Nhắc nhở gia hạn License</h2>
              <p>Kính gửi <strong>${license.companyName || 'Quý khách'}</strong>,</p>
              <p>License <strong>${license.licenseType?.toUpperCase()}</strong> của bạn sẽ hết hạn trong <strong style="color: #f59e0b;">${daysLeft} ngày</strong>.</p>
              <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>License Key:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseKey}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Loại:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseType?.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ngày hết hạn:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}</td></tr>
              </table>
              <p>Hãy cân nhắc gia hạn sớm để đảm bảo dịch vụ không bị gián đoạn.</p>
              <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
            </div>
          `
        );
        
        if (result.success) sent++;
        else failed++;
      }
    }
    
    console.log(`[ScheduledJob] License renewal emails: sent=${sent}, failed=${failed}`);
    
  } catch (error) {
    console.error('[ScheduledJob] Error sending license renewal emails:', error);
  }
  
  return { sent, failed };
}

/**
 * Check license expiry and send notifications
 */
async function checkLicenseExpiry(): Promise<void> {
  console.log('[ScheduledJob] Running license expiry check...');
  
  try {
    // Get licenses expiring in 30 days
    const expiringSoon30 = await getLicensesExpiringSoon(30);
    // Get licenses expiring in 7 days
    const expiringSoon7 = await getLicensesExpiringSoon(7);
    // Get already expired licenses
    const expired = await getExpiredLicenses();
    
    let notificationsSent = 0;
    
    // Send notifications for licenses expiring in 7 days (urgent)
    for (const license of expiringSoon7) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 7 && daysLeft > 0) {
        const success = await notifyOwner({
          title: `⚠️ License sắp hết hạn trong ${daysLeft} ngày`,
          content: `License ${license.licenseType?.toUpperCase()} cho ${license.companyName || 'N/A'} sẽ hết hạn vào ${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}. Vui lòng gia hạn để tránh gián đoạn dịch vụ.`
        });
        
        // Send webhook notification
        await triggerWebhooks('license_expiring', {
          companyName: license.companyName || 'N/A',
          licenseType: license.licenseType?.toUpperCase() || 'N/A',
          licenseKey: license.licenseKey,
          expiresAt: new Date(license.expiresAt!).toLocaleDateString('vi-VN'),
          daysLeft,
          severity: 'warning'
        });
        
        if (success) notificationsSent++;
      }
    }
    
    // Send notifications for licenses expiring in 30 days (warning)
    for (const license of expiringSoon30) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Only notify for 30-day warning if not already in 7-day window
      if (daysLeft > 7 && daysLeft <= 30) {
        const success = await notifyOwner({
          title: `📋 License sẽ hết hạn trong ${daysLeft} ngày`,
          content: `License ${license.licenseType?.toUpperCase()} cho ${license.companyName || 'N/A'} sẽ hết hạn vào ${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}. Hãy cân nhắc gia hạn sớm.`
        });
        
        if (success) notificationsSent++;
      }
    }
    
    // Send notifications for expired licenses
    for (const license of expired) {
      const success = await notifyOwner({
        title: `🚨 License đã hết hạn`,
        content: `License ${license.licenseType?.toUpperCase()} cho ${license.companyName || 'N/A'} đã hết hạn vào ${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}. Vui lòng gia hạn ngay để tiếp tục sử dụng dịch vụ.`
      });
      
      // Send webhook notification
      await triggerWebhooks('license_expired', {
        companyName: license.companyName || 'N/A',
        licenseType: license.licenseType?.toUpperCase() || 'N/A',
        licenseKey: license.licenseKey,
        expiresAt: new Date(license.expiresAt!).toLocaleDateString('vi-VN'),
        severity: 'critical'
      });
      
      if (success) notificationsSent++;
    }
    
    // Log the check result
    console.log(`[ScheduledJob] License expiry check logged: expiring30=${expiringSoon30.length}, expiring7=${expiringSoon7.length}, expired=${expired.length}, notifications=${notificationsSent}`);
    
    console.log(`[ScheduledJob] License check complete. Expiring soon (30d): ${expiringSoon30.length}, (7d): ${expiringSoon7.length}, Expired: ${expired.length}, Notifications sent: ${notificationsSent}`);
    
  } catch (error) {
    console.error('[ScheduledJob] Error checking license expiry:', error);
    
    // Log the error
    console.error(`[ScheduledJob] License expiry check error logged: ${String(error)}`);
  }
}

/**
 * Initialize all scheduled jobs
 */
export function initScheduledJobs(): void {
  if (jobsInitialized) {
    console.log('[ScheduledJob] Jobs already initialized, skipping...');
    return;
  }
  
  console.log('[ScheduledJob] Initializing scheduled jobs...');
  
  // License expiry check - runs daily at 8:00 AM
  // Cron format: second minute hour day-of-month month day-of-week
  cron.schedule('0 0 8 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Daily license expiry check');
    await checkLicenseExpiry();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: License expiry check at 8:00 AM daily (Asia/Ho_Chi_Minh)');
  
  // License renewal email - runs daily at 9:00 AM
  cron.schedule('0 0 9 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Daily license renewal email');
    await sendLicenseRenewalEmails();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: License renewal email at 9:00 AM daily (Asia/Ho_Chi_Minh)');
  
  // Webhook retry processor - runs every minute
  cron.schedule('0 * * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Webhook retry processor');
    await processWebhookRetries();
  });
  
  console.log('[ScheduledJob] Scheduled: Webhook retry processor every minute');
  
  // Shift report - runs at end of each shift (6:00, 14:00, 22:00)
  // Morning shift ends at 14:00
  cron.schedule('0 0 14 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Morning shift report');
    await generateAndSendShiftReport('morning');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  // Afternoon shift ends at 22:00
  cron.schedule('0 0 22 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Afternoon shift report');
    await generateAndSendShiftReport('afternoon');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  // Night shift ends at 6:00
  cron.schedule('0 0 6 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Night shift report');
    await generateAndSendShiftReport('night');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Shift reports at 6:00, 14:00, 22:00 (Asia/Ho_Chi_Minh)');
  
  // Alert check - runs every 5 minutes
  cron.schedule('0 */5 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Alert check');
    await checkAndSendAlerts();
  });
  
  console.log('[ScheduledJob] Scheduled: Alert check every 5 minutes');
  
  // Data cleanup - runs daily at 2:00 AM
  cron.schedule('0 0 2 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Data cleanup');
    await cleanupOldData();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Data cleanup at 2:00 AM daily (Asia/Ho_Chi_Minh)');
  
  // Low stock check - runs daily at 7:00 AM
  cron.schedule('0 0 7 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Low stock check');
    await checkLowStock();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Low stock check at 7:00 AM daily (Asia/Ho_Chi_Minh)');
  
  // NTF rate check - runs every hour
  cron.schedule('0 0 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: NTF rate check');
    await checkNtfRateJob();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF rate check every hour (Asia/Ho_Chi_Minh)');
  
  // NTF daily report - runs at 8:00 AM daily
  cron.schedule('0 0 8 * * *', async () => {
    console.log('[ScheduledJob] Triggered: NTF daily report');
    await sendNtfScheduledReports('daily');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF daily report at 8:00 AM (Asia/Ho_Chi_Minh)');
  
  // NTF weekly report - runs at 8:00 AM every Monday
  cron.schedule('0 0 8 * * 1', async () => {
    console.log('[ScheduledJob] Triggered: NTF weekly report');
    await sendNtfScheduledReports('weekly');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF weekly report at 8:00 AM Monday (Asia/Ho_Chi_Minh)');
  
  // NTF monthly report - runs at 8:00 AM on 1st of each month
  cron.schedule('0 0 8 1 * *', async () => {
    console.log('[ScheduledJob] Triggered: NTF monthly report');
    await sendNtfScheduledReports('monthly');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF monthly report at 8:00 AM on 1st (Asia/Ho_Chi_Minh)');
  
  // NTF monthly management report - runs at 9:00 AM on 1st of each month
  cron.schedule('0 0 9 1 * *', async () => {
    console.log('[ScheduledJob] Triggered: NTF monthly management report');
    await sendNtfMonthlyManagementReport();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF monthly management report at 9:00 AM on 1st (Asia/Ho_Chi_Minh)');
  
  jobsInitialized = true;
  console.log('[ScheduledJob] All scheduled jobs initialized successfully');
}

/**
 * Manually trigger license expiry check (for testing or on-demand)
 */
export async function triggerLicenseExpiryCheck(): Promise<{
  expiringSoon30: number;
  expiringSoon7: number;
  expired: number;
}> {
  const expiringSoon30 = await getLicensesExpiringSoon(30);
  const expiringSoon7 = await getLicensesExpiringSoon(7);
  const expired = await getExpiredLicenses();
  
  await checkLicenseExpiry();
  
  return {
    expiringSoon30: expiringSoon30.length,
    expiringSoon7: expiringSoon7.length,
    expired: expired.length
  };
}

/**
 * Manually trigger license renewal emails (for testing or on-demand)
 */
export async function triggerLicenseRenewalEmails(): Promise<{ sent: number; failed: number }> {
  return sendLicenseRenewalEmails();
}

/**
 * Generate and send shift report
 */
async function generateAndSendShiftReport(shiftType: 'morning' | 'afternoon' | 'night'): Promise<void> {
  try {
    const today = new Date();
    // For night shift, the report date is the previous day
    const reportDate = shiftType === 'night' 
      ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
      : today;
    
    console.log(`[ScheduledJob] Generating ${shiftType} shift report for ${reportDate.toLocaleDateString('vi-VN')}`);
    
    // Generate report for all production lines
    const reportId = await generateShiftReport(reportDate, shiftType);
    
    if (reportId) {
      console.log(`[ScheduledJob] Shift report generated with ID: ${reportId}`);
      
      // Get supervisor emails from database
      const db = await getDb();
      if (db) {
        // For now, notify owner
        await notifyOwner({
          title: `📊 Báo cáo ca ${shiftType === 'morning' ? 'sáng' : shiftType === 'afternoon' ? 'chiều' : 'đêm'} - ${reportDate.toLocaleDateString('vi-VN')}`,
          content: `Báo cáo ca làm việc đã được tạo tự động. Vui lòng kiểm tra trong hệ thống.`
        });
      }
    }
  } catch (error) {
    console.error(`[ScheduledJob] Error generating ${shiftType} shift report:`, error);
  }
}

/**
 * Check machine alerts and send notifications
 */
async function checkAndSendAlerts(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Get recent unacknowledged alerts
    const recentAlerts = await db
      .select()
      .from(realtimeAlerts)
      .where(
        and(
          sql`${realtimeAlerts.acknowledgedAt} IS NULL`,
          gte(realtimeAlerts.createdAt, fiveMinutesAgo)
        )
      )
      .orderBy(desc(realtimeAlerts.createdAt))
      .limit(10);
    
    if (recentAlerts.length > 0) {
      // Group alerts by severity
      const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = recentAlerts.filter(a => a.severity === 'warning');
      
      if (criticalAlerts.length > 0) {
        await notifyOwner({
          title: `🚨 ${criticalAlerts.length} cảnh báo nghiêm trọng!`,
          content: `Có ${criticalAlerts.length} cảnh báo nghiêm trọng cần xử lý ngay:\n${criticalAlerts.map(a => `- ${a.alertType}: ${a.message}`).join('\n')}`
        });
        
        // Trigger webhooks for critical alerts
        for (const alert of criticalAlerts) {
          await triggerWebhooks('cpk_alert', {
            alertId: alert.id,
            machineId: alert.machineId,
            alertType: alert.alertType,
            severity: alert.severity,
            message: alert.message || '',
            createdAt: alert.createdAt
          });
        }
      }
      
      console.log(`[ScheduledJob] Alert check: ${criticalAlerts.length} critical, ${warningAlerts.length} warning`);
    }
  } catch (error) {
    console.error('[ScheduledJob] Error checking alerts:', error);
  }
}

/**
 * Cleanup old data (logs, temp files, old records)
 */
async function cleanupOldData(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    // Cleanup old acknowledged alerts (older than 30 days)
    const alertsDeleted = await db
      .delete(realtimeAlerts)
      .where(
        and(
          sql`${realtimeAlerts.acknowledgedAt} IS NOT NULL`,
          lte(realtimeAlerts.createdAt, thirtyDaysAgo)
        )
      );
    
    console.log(`[ScheduledJob] Data cleanup completed: alerts cleaned up`);
    
    // Notify about cleanup
    await notifyOwner({
      title: '🧹 Dọn dẹp dữ liệu hoàn tất',
      content: `Hệ thống đã tự động dọn dẹp dữ liệu cũ (cảnh báo đã xử lý trên 30 ngày).`
    });
    
  } catch (error) {
    console.error('[ScheduledJob] Error cleaning up data:', error);
  }
}

/**
 * Manually trigger shift report (for testing)
 */
export async function triggerShiftReport(shiftType: 'morning' | 'afternoon' | 'night'): Promise<number | null> {
  const today = new Date();
  return generateShiftReport(today, shiftType);
}

/**
 * Manually trigger alert check (for testing)
 */
export async function triggerAlertCheck(): Promise<void> {
  await checkAndSendAlerts();
}

/**
 * Manually trigger data cleanup (for testing)
 */
export async function triggerDataCleanup(): Promise<void> {
  await cleanupOldData();
}

/**
 * Check low stock and send notifications
 */
async function checkLowStock(): Promise<void> {
  console.log('[ScheduledJob] Checking low stock levels...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available');
      return;
    }

    // Get all active parts with inventory
    const parts = await db
      .select({
        id: spareParts.id,
        partNumber: spareParts.partNumber,
        name: spareParts.name,
        category: spareParts.category,
        unit: spareParts.unit,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        currentStock: sparePartsInventory.quantity,
        supplierName: suppliers.name,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
      .where(eq(spareParts.isActive, 1));

    // Filter low stock items
    const lowStockItems = parts.filter(item => {
      const current = Number(item.currentStock) || 0;
      const min = Number(item.minStock) || 0;
      const reorder = Number(item.reorderPoint) || 0;
      return current <= min || current <= reorder;
    });

    if (lowStockItems.length === 0) {
      console.log('[ScheduledJob] No low stock items found');
      return;
    }

    // Categorize by severity
    const critical = lowStockItems.filter(item => 
      Number(item.currentStock || 0) <= Number(item.minStock || 0)
    );
    const warning = lowStockItems.filter(item => 
      Number(item.currentStock || 0) > Number(item.minStock || 0) &&
      Number(item.currentStock || 0) <= Number(item.reorderPoint || 0)
    );

    // Build notification content
    let content = `**Báo cáo tồn kho thấp - ${new Date().toLocaleDateString('vi-VN')}**\n\n`;
    
    if (critical.length > 0) {
      content += `🔴 **NGHIÊM TRỌNG (${critical.length} mục):**\n`;
      critical.forEach(item => {
        content += `- ${item.partNumber}: ${item.name} - Tồn: ${item.currentStock || 0} ${item.unit} (Min: ${item.minStock})\n`;
      });
      content += '\n';
    }

    if (warning.length > 0) {
      content += `🟡 **CẢNH BÁO (${warning.length} mục):**\n`;
      warning.forEach(item => {
        content += `- ${item.partNumber}: ${item.name} - Tồn: ${item.currentStock || 0} ${item.unit} (Reorder: ${item.reorderPoint})\n`;
      });
    }

    // Send notification to owner
    await notifyOwner({
      title: `⚠️ Cảnh báo tồn kho thấp: ${critical.length} nghiêm trọng, ${warning.length} cảnh báo`,
      content,
    });

    console.log(`[ScheduledJob] Low stock notification sent: ${critical.length} critical, ${warning.length} warning`);
    
  } catch (error) {
    console.error('[ScheduledJob] Error checking low stock:', error);
  }
}

/**
 * Manually trigger low stock check (for testing)
 */
export async function triggerLowStockCheck(): Promise<void> {
  await checkLowStock();
}

/**
 * Send low stock email alert to owner
 * Uses emailAlertThreshold if set, otherwise uses minStock
 */
export async function sendLowStockEmailAlertJob(): Promise<{ sent: boolean; itemCount: number; message: string }> {
  console.log('[ScheduledJob] Sending low stock email alert...');
  
  try {
    const db = await getDb();
    if (!db) {
      return { sent: false, itemCount: 0, message: 'Database not available' };
    }

    // Get all active parts with inventory
    const parts = await db
      .select({
        id: spareParts.id,
        partNumber: spareParts.partNumber,
        name: spareParts.name,
        category: spareParts.category,
        unit: spareParts.unit,
        minStock: spareParts.minStock,
        reorderPoint: spareParts.reorderPoint,
        emailAlertThreshold: spareParts.emailAlertThreshold,
        currentStock: sparePartsInventory.quantity,
        supplierName: suppliers.name,
      })
      .from(spareParts)
      .leftJoin(sparePartsInventory, eq(spareParts.id, sparePartsInventory.sparePartId))
      .leftJoin(suppliers, eq(spareParts.supplierId, suppliers.id))
      .where(eq(spareParts.isActive, 1));

    // Filter items that need email alert
    // Use emailAlertThreshold if set, otherwise use minStock
    const alertItems = parts.filter(item => {
      const current = Number(item.currentStock) || 0;
      const threshold = Number(item.emailAlertThreshold) || Number(item.minStock) || 0;
      return current <= threshold && threshold > 0;
    });

    if (alertItems.length === 0) {
      return { sent: false, itemCount: 0, message: 'Không có phụ tùng nào cần cảnh báo' };
    }

    // Build email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #dc2626;">\u26a0\ufe0f Cảnh báo tồn kho thấp - ${new Date().toLocaleDateString('vi-VN')}</h2>
        <p>Có <strong>${alertItems.length}</strong> phụ tùng cần bổ sung:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Mã PT</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tên</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Danh mục</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Tồn hiện tại</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Ngưỡng cảnh báo</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">NCC</th>
            </tr>
          </thead>
          <tbody>
            ${alertItems.map(item => {
              const threshold = Number(item.emailAlertThreshold) || Number(item.minStock) || 0;
              const current = Number(item.currentStock) || 0;
              const bgColor = current <= 0 ? '#fee2e2' : current <= threshold * 0.5 ? '#fef3c7' : '#fff';
              return `
                <tr style="background: ${bgColor};">
                  <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.partNumber}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.category || '-'}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${current <= 0 ? '#dc2626' : '#f59e0b'};">${current} ${item.unit}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${threshold} ${item.unit}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.supplierName || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
      </div>
    `;

    // Send notification to owner
    const result = await notifyOwner({
      title: `\u26a0\ufe0f Cảnh báo tồn kho: ${alertItems.length} phụ tùng cần bổ sung`,
      content: emailHtml,
    });

    console.log(`[ScheduledJob] Low stock email alert sent: ${alertItems.length} items`);
    return { 
      sent: result, 
      itemCount: alertItems.length, 
      message: `\u0110ã gửi cảnh báo cho ${alertItems.length} phụ tùng` 
    };
    
  } catch (error) {
    console.error('[ScheduledJob] Error sending low stock email:', error);
    return { sent: false, itemCount: 0, message: 'Lỗi khi gửi email: ' + String(error) };
  }
}


/**
 * Check NTF rate and send alerts if threshold exceeded
 */
export async function checkNtfRateJob(): Promise<{ 
  checked: boolean; 
  ntfRate: number; 
  alertSent: boolean; 
  message: string 
}> {
  console.log('[ScheduledJob] Running NTF rate check...');
  
  try {
    const db = await getDb();
    if (!db) {
      return { checked: false, ntfRate: 0, alertSent: false, message: 'Database not available' };
    }
    
    // Get NTF alert config
    const configResult = await db.execute(sql`SELECT * FROM ntf_alert_config LIMIT 1`);
    const config = ((configResult as unknown as any[])[0] as any[])[0];
    
    if (!config || !config.enabled) {
      return { checked: true, ntfRate: 0, alertSent: false, message: 'NTF alert is disabled' };
    }
    
    // Check cooldown
    if (config.lastAlertAt) {
      const lastAlert = new Date(config.lastAlertAt);
      const cooldownMs = (config.cooldownMinutes || 120) * 60 * 1000;
      if (Date.now() - lastAlert.getTime() < cooldownMs) {
        return { checked: true, ntfRate: 0, alertSent: false, message: 'Still in cooldown period' };
      }
    }
    
    // Calculate NTF rate for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
        SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
        SUM(CASE WHEN verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
      FROM spc_defect_records
      WHERE createdAt >= ${sevenDaysAgo.toISOString()}
    `);
    
    const stats = ((statsResult as unknown as any[])[0] as any[])[0];
    const total = Number(stats?.total) || 0;
    const ntfCount = Number(stats?.ntfCount) || 0;
    const realNgCount = Number(stats?.realNgCount) || 0;
    const pendingCount = Number(stats?.pendingCount) || 0;
    
    if (total === 0) {
      return { checked: true, ntfRate: 0, alertSent: false, message: 'No defect records found' };
    }
    
    const ntfRate = (ntfCount / total) * 100;
    const warningThreshold = Number(config.warningThreshold) || 20;
    const criticalThreshold = Number(config.criticalThreshold) || 30;
    
    // Determine alert type
    let alertType: 'warning' | 'critical' | null = null;
    if (ntfRate >= criticalThreshold) {
      alertType = 'critical';
    } else if (ntfRate >= warningThreshold) {
      alertType = 'warning';
    }
    
    if (!alertType) {
      return { checked: true, ntfRate, alertSent: false, message: `NTF rate ${ntfRate.toFixed(1)}% is below threshold` };
    }
    
    // Save alert history
    const now = new Date();
    await db.execute(sql`
      INSERT INTO ntf_alert_history (ntfRate, totalDefects, ntfCount, realNgCount, pendingCount, alertType, periodStart, periodEnd)
      VALUES (${ntfRate}, ${total}, ${ntfCount}, ${realNgCount}, ${pendingCount}, ${alertType}, ${sevenDaysAgo.toISOString()}, ${now.toISOString()})
    `);
    
    // Send email alert
    const alertEmails = config.alertEmails ? JSON.parse(config.alertEmails) : [];
    let emailSent = false;
    
    if (alertEmails.length > 0) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${alertType === 'critical' ? '#dc2626' : '#f59e0b'};">
            ${alertType === 'critical' ? '🚨 CẢNH BÁO NGHIÊM TRỌNG' : '⚠️ Cảnh báo'}: Tỉ lệ NTF cao
          </h2>
          <p>Tỉ lệ NTF (Not True Fail) trong 7 ngày qua đã vượt ngưỡng ${alertType === 'critical' ? 'nghiêm trọng' : 'cảnh báo'}.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background: ${alertType === 'critical' ? '#fee2e2' : '#fef3c7'};">
              <td style="padding: 12px; border: 1px solid #ddd;"><strong>Tỉ lệ NTF hiện tại:</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 24px; font-weight: bold; color: ${alertType === 'critical' ? '#dc2626' : '#f59e0b'};">${ntfRate.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Ngưỡng cảnh báo:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${warningThreshold}%</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">Ngưỡng nghiêm trọng:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${criticalThreshold}%</td>
            </tr>
          </table>
          
          <h3>Thống kê chi tiết (7 ngày qua):</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Tổng số lỗi:</td><td style="padding: 8px; border: 1px solid #ddd;">${total}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Lỗi thực (Real NG):</td><td style="padding: 8px; border: 1px solid #ddd;">${realNgCount}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Không phải lỗi (NTF):</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626; font-weight: bold;">${ntfCount}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;">Chưa xác nhận:</td><td style="padding: 8px; border: 1px solid #ddd;">${pendingCount}</td></tr>
          </table>
          
          <p><strong>Khuyến nghị:</strong></p>
          <ul>
            <li>Kiểm tra lại các cảm biến và thiết bị đo</li>
            <li>Rà soát quy trình kiểm tra chất lượng</li>
            <li>Đào tạo lại nhân viên về phân loại lỗi</li>
          </ul>
          
          <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
        </div>
      `;
      
      for (const email of alertEmails) {
        await sendEmail(
          email,
          `${alertType === 'critical' ? '🚨' : '⚠️'} Cảnh báo NTF: Tỉ lệ ${ntfRate.toFixed(1)}% vượt ngưỡng`,
          emailHtml
        );
      }
      emailSent = true;
      
      // Update alert history with email sent
      await db.execute(sql`
        UPDATE ntf_alert_history 
        SET emailSent = TRUE, emailSentAt = NOW(), emailRecipients = ${JSON.stringify(alertEmails)}
        WHERE id = (SELECT MAX(id) FROM ntf_alert_history)
      `);
    }
    
    // Update last alert time
    await db.execute(sql`
      UPDATE ntf_alert_config 
      SET lastAlertAt = NOW(), lastAlertNtfRate = ${ntfRate}
      WHERE id = ${config.id}
    `);
    
    // Notify owner
    await notifyOwner({
      title: `${alertType === 'critical' ? '🚨' : '⚠️'} Cảnh báo NTF: ${ntfRate.toFixed(1)}%`,
      content: `Tỉ lệ NTF trong 7 ngày qua là ${ntfRate.toFixed(1)}%, vượt ngưỡng ${alertType === 'critical' ? 'nghiêm trọng' : 'cảnh báo'} (${alertType === 'critical' ? criticalThreshold : warningThreshold}%). Tổng lỗi: ${total}, NTF: ${ntfCount}, Real NG: ${realNgCount}.`
    });
    
    console.log(`[ScheduledJob] NTF alert sent: rate=${ntfRate.toFixed(1)}%, type=${alertType}`);
    
    return { 
      checked: true, 
      ntfRate, 
      alertSent: emailSent, 
      message: `NTF rate ${ntfRate.toFixed(1)}% - ${alertType} alert sent` 
    };
    
  } catch (error) {
    console.error('[ScheduledJob] Error checking NTF rate:', error);
    return { checked: false, ntfRate: 0, alertSent: false, message: 'Error: ' + String(error) };
  }
}


/**
 * Send NTF scheduled reports based on report type
 */
export async function sendNtfScheduledReports(reportType: 'daily' | 'weekly' | 'monthly'): Promise<{
  sent: number;
  failed: number;
  message: string;
}> {
  console.log(`[ScheduledJob] Sending NTF ${reportType} reports...`);
  
  let sent = 0;
  let failed = 0;
  
  try {
    const db = await getDb();
    if (!db) {
      return { sent: 0, failed: 0, message: 'Database not available' };
    }
    
    // Get enabled schedules for this report type
    const schedulesResult = await db.execute(sql`
      SELECT * FROM ntf_report_schedule 
      WHERE reportType = ${reportType} AND enabled = TRUE
    `);
    const schedules = (schedulesResult as unknown as any[])[0] as any[];
    
    if (schedules.length === 0) {
      return { sent: 0, failed: 0, message: `No enabled ${reportType} schedules found` };
    }
    
    // Calculate date range based on report type
    const endDate = new Date();
    const startDate = new Date();
    
    if (reportType === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (reportType === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Get NTF statistics for the period
    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
        SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
        SUM(CASE WHEN verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
      FROM spc_defect_records
      WHERE createdAt >= ${startDate.toISOString()} AND createdAt <= ${endDate.toISOString()}
    `);
    
    const stats = ((statsResult as unknown as any[])[0] as any[])[0];
    const total = Number(stats?.total) || 0;
    const ntfCount = Number(stats?.ntfCount) || 0;
    const realNgCount = Number(stats?.realNgCount) || 0;
    const pendingCount = Number(stats?.pendingCount) || 0;
    const ntfRate = total > 0 ? (ntfCount / total) * 100 : 0;
    
    // Get top NTF reasons
    const reasonsResult = await db.execute(sql`
      SELECT ntfReason, COUNT(*) as count
      FROM spc_defect_records
      WHERE verificationStatus = 'ntf' 
        AND createdAt >= ${startDate.toISOString()} 
        AND createdAt <= ${endDate.toISOString()}
        AND ntfReason IS NOT NULL
      GROUP BY ntfReason
      ORDER BY count DESC
      LIMIT 5
    `);
    const topReasons = (reasonsResult as unknown as any[])[0] as any[];
    
    // Generate email HTML
    const reportTitle = reportType === 'daily' ? 'Hàng ngày' : reportType === 'weekly' ? 'Hàng tuần' : 'Hàng tháng';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1e40af;">📊 Báo cáo NTF ${reportTitle}</h2>
        <p>Khoảng thời gian: <strong>${startDate.toLocaleDateString('vi-VN')}</strong> - <strong>${endDate.toLocaleDateString('vi-VN')}</strong></p>
        
        <h3>Tổng quan</h3>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: ${ntfRate >= 30 ? '#fee2e2' : ntfRate >= 20 ? '#fef3c7' : '#dcfce7'};">
            <td style="padding: 15px; border: 1px solid #ddd; font-size: 18px;"><strong>Tỉ lệ NTF:</strong></td>
            <td style="padding: 15px; border: 1px solid #ddd; font-size: 24px; font-weight: bold; color: ${ntfRate >= 30 ? '#dc2626' : ntfRate >= 20 ? '#f59e0b' : '#16a34a'};">${ntfRate.toFixed(1)}%</td>
          </tr>
        </table>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Chỉ số</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Số lượng</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Tỉ lệ</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Tổng số lỗi phát hiện</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${total}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">100%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Lỗi thực (Real NG)</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${realNgCount}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${total > 0 ? ((realNgCount / total) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr style="background: #fef3c7;">
            <td style="padding: 8px; border: 1px solid #ddd;">Không phải lỗi (NTF)</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #dc2626;">${ntfCount}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; color: #dc2626;">${ntfRate.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Chưa xác nhận</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${pendingCount}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${total > 0 ? ((pendingCount / total) * 100).toFixed(1) : 0}%</td>
          </tr>
        </table>
        
        ${topReasons.length > 0 ? `
          <h3>Top nguyên nhân NTF</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nguyên nhân</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Số lượng</th>
            </tr>
            ${topReasons.map((r: any) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${getNtfReasonLabel(r.ntfReason)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${r.count}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        <h3>Khuyến nghị</h3>
        <ul>
          ${ntfRate >= 30 ? '<li style="color: #dc2626;"><strong>Cảnh báo:</strong> Tỉ lệ NTF vượt ngưỡng nghiêm trọng (30%). Cần kiểm tra ngay hệ thống phát hiện lỗi.</li>' : ''}
          ${ntfRate >= 20 && ntfRate < 30 ? '<li style="color: #f59e0b;"><strong>Lưu ý:</strong> Tỉ lệ NTF vượt ngưỡng cảnh báo (20%). Cần theo dõi và cải thiện.</li>' : ''}
          ${pendingCount > 0 ? `<li>Còn ${pendingCount} lỗi chưa được xác nhận. Vui lòng xác nhận để có số liệu chính xác.</li>` : ''}
          <li>Rà soát các cảm biến và thiết bị đo có tỉ lệ NTF cao</li>
          <li>Đào tạo nhân viên về phân loại lỗi chính xác</li>
        </ul>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Báo cáo này được gửi tự động từ hệ thống SPC/CPK Calculator.<br>
          Thời gian tạo: ${new Date().toLocaleString('vi-VN')}
        </p>
      </div>
    `;
    
    // Send to each schedule's recipients
    for (const schedule of schedules) {
      try {
        const recipients = schedule.recipients ? JSON.parse(schedule.recipients) : [];
        
        for (const email of recipients) {
          await sendEmail(
            email,
            `📊 Báo cáo NTF ${reportTitle} - ${new Date().toLocaleDateString('vi-VN')}`,
            emailHtml
          );
        }
        
        // Update last sent status
        await db.execute(sql`
          UPDATE ntf_report_schedule 
          SET lastSentAt = NOW(), lastSentStatus = 'success', lastSentError = NULL
          WHERE id = ${schedule.id}
        `);
        
        sent++;
      } catch (err) {
        // Update with error
        await db.execute(sql`
          UPDATE ntf_report_schedule 
          SET lastSentAt = NOW(), lastSentStatus = 'failed', lastSentError = ${String(err)}
          WHERE id = ${schedule.id}
        `);
        
        failed++;
      }
    }
    
    console.log(`[ScheduledJob] NTF ${reportType} reports: sent=${sent}, failed=${failed}`);
    return { sent, failed, message: `Sent ${sent} reports, ${failed} failed` };
    
  } catch (error) {
    console.error(`[ScheduledJob] Error sending NTF ${reportType} reports:`, error);
    return { sent: 0, failed: 0, message: 'Error: ' + String(error) };
  }
}

/**
 * Get human-readable label for NTF reason
 */
function getNtfReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'sensor_error': 'Lỗi cảm biến',
    'false_detection': 'Phát hiện sai',
    'calibration_issue': 'Vấn đề hiệu chuẩn',
    'environmental_factor': 'Yếu tố môi trường',
    'operator_error': 'Lỗi vận hành',
    'software_bug': 'Lỗi phần mềm',
    'other': 'Khác',
  };
  return labels[reason] || reason;
}


/**
 * Send comprehensive monthly NTF management report
 * Includes: NTF summary, trend analysis, supplier comparison, product analysis, recommendations
 */
async function sendNtfMonthlyManagementReport(): Promise<{ sent: number; failed: number; message: string }> {
  console.log('[ScheduledJob] Generating monthly NTF management report...');
  
  try {
    const db = await getDb();
    if (!db) {
      return { sent: 0, failed: 0, message: 'Database not available' };
    }
    
    // Get last month's date range
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    
    // Get NTF stats for last month
    const lastMonthStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
        SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
      FROM spc_defect_records
      WHERE createdAt >= '${lastMonth.toISOString()}' AND createdAt <= '${lastMonthEnd.toISOString()}'
    `));
    
    // Get NTF stats for previous month (for comparison)
    const prevMonthStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records
      WHERE createdAt >= '${prevMonth.toISOString()}' AND createdAt <= '${prevMonthEnd.toISOString()}'
    `));
    
    // Get top NTF reasons
    const topReasons = await db.execute(sql.raw(`
      SELECT ntfReason, COUNT(*) as count
      FROM spc_defect_records
      WHERE createdAt >= '${lastMonth.toISOString()}' AND createdAt <= '${lastMonthEnd.toISOString()}'
        AND verificationStatus = 'ntf' AND ntfReason IS NOT NULL
      GROUP BY ntfReason
      ORDER BY count DESC
      LIMIT 5
    `));
    
    // Get top suppliers by NTF
    const topSuppliers = await db.execute(sql.raw(`
      SELECT 
        s.name as supplierName,
        COUNT(*) as total,
        SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records d
      LEFT JOIN materials m ON d.materialId = m.id
      LEFT JOIN suppliers s ON m.supplierId = s.id
      WHERE d.createdAt >= '${lastMonth.toISOString()}' AND d.createdAt <= '${lastMonthEnd.toISOString()}'
      GROUP BY s.id, s.name
      HAVING total > 0
      ORDER BY (ntfCount / total) DESC
      LIMIT 5
    `));
    
    // Get top products by NTF
    const topProducts = await db.execute(sql.raw(`
      SELECT 
        p.name as productName,
        COUNT(*) as total,
        SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records d
      LEFT JOIN products p ON d.productId = p.id
      WHERE d.createdAt >= '${lastMonth.toISOString()}' AND d.createdAt <= '${lastMonthEnd.toISOString()}'
      GROUP BY p.id, p.name
      HAVING total > 0
      ORDER BY (ntfCount / total) DESC
      LIMIT 5
    `));
    
    // Get weekly trend
    const weeklyTrend = await db.execute(sql.raw(`
      SELECT 
        WEEK(createdAt) as week,
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records
      WHERE createdAt >= '${lastMonth.toISOString()}' AND createdAt <= '${lastMonthEnd.toISOString()}'
      GROUP BY WEEK(createdAt)
      ORDER BY week
    `));
    
    // Get management emails from config
    const configResult = await db.execute(sql.raw(`
      SELECT configValue FROM ntf_alert_config WHERE configKey = 'management_emails' LIMIT 1
    `));
    
    const lastStats = ((lastMonthStats as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0, realNgCount: 0 };
    const prevStats = ((prevMonthStats as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0 };
    const reasons = ((topReasons as unknown as any[])[0] as any[]) || [];
    const suppliers = ((topSuppliers as unknown as any[])[0] as any[]) || [];
    const products = ((topProducts as unknown as any[])[0] as any[]) || [];
    const trends = ((weeklyTrend as unknown as any[])[0] as any[]) || [];
    const config = ((configResult as unknown as any[])[0] as any[])[0];
    
    const total = Number(lastStats.total);
    const ntfCount = Number(lastStats.ntfCount);
    const realNgCount = Number(lastStats.realNgCount);
    const ntfRate = total > 0 ? (ntfCount / total) * 100 : 0;
    
    const prevTotal = Number(prevStats.total);
    const prevNtfCount = Number(prevStats.ntfCount);
    const prevNtfRate = prevTotal > 0 ? (prevNtfCount / prevTotal) * 100 : 0;
    const ntfRateChange = ntfRate - prevNtfRate;
    
    // Get management emails
    let managementEmails: string[] = [];
    if (config?.configValue) {
      try {
        managementEmails = JSON.parse(config.configValue);
      } catch {}
    }
    
    // Also get from alert emails
    const alertEmailsResult = await db.execute(sql.raw(`
      SELECT configValue FROM ntf_alert_config WHERE configKey = 'alert_emails' LIMIT 1
    `));
    const alertConfig = ((alertEmailsResult as unknown as any[])[0] as any[])[0];
    if (alertConfig?.configValue) {
      try {
        const alertEmails = JSON.parse(alertConfig.configValue);
        managementEmails = [...new Set([...managementEmails, ...alertEmails])];
      } catch {}
    }
    
    if (managementEmails.length === 0) {
      console.log('[ScheduledJob] No management emails configured for monthly report');
      return { sent: 0, failed: 0, message: 'No management emails configured' };
    }
    
    const monthName = lastMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    
    // Generate email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">📊 Báo cáo NTF Tháng ${monthName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Báo cáo tổng hợp cho ban quản lý</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <!-- Summary Cards -->
          <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 150px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #64748b; font-size: 12px;">Tổng lỗi phát hiện</div>
              <div style="font-size: 24px; font-weight: bold; color: #1e293b;">${total.toLocaleString()}</div>
            </div>
            <div style="flex: 1; min-width: 150px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #64748b; font-size: 12px;">NTF (Không phải lỗi)</div>
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${ntfCount.toLocaleString()}</div>
            </div>
            <div style="flex: 1; min-width: 150px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #64748b; font-size: 12px;">NTF Rate</div>
              <div style="font-size: 24px; font-weight: bold; color: ${ntfRate >= 30 ? '#dc2626' : ntfRate >= 20 ? '#f59e0b' : '#22c55e'};">${ntfRate.toFixed(1)}%</div>
              <div style="font-size: 12px; color: ${ntfRateChange > 0 ? '#dc2626' : '#22c55e'};">
                ${ntfRateChange > 0 ? '↑' : '↓'} ${Math.abs(ntfRateChange).toFixed(1)}% so với tháng trước
              </div>
            </div>
            <div style="flex: 1; min-width: 150px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="color: #64748b; font-size: 12px;">Real NG</div>
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${realNgCount.toLocaleString()}</div>
            </div>
          </div>
          
          <!-- Top NTF Reasons -->
          ${reasons.length > 0 ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">🔍 Top nguyên nhân NTF</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Nguyên nhân</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Số lượng</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Tỷ lệ</th>
                </tr>
                ${reasons.map((r: any) => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${getNtfReasonLabel(r.ntfReason)}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${Number(r.count).toLocaleString()}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${ntfCount > 0 ? ((Number(r.count) / ntfCount) * 100).toFixed(1) : 0}%</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}
          
          <!-- Top Suppliers -->
          ${suppliers.length > 0 ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">🏭 NTF theo Nhà cung cấp</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Nhà cung cấp</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Tổng lỗi</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">NTF</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">NTF Rate</th>
                </tr>
                ${suppliers.map((s: any) => {
                  const sTotal = Number(s.total);
                  const sNtf = Number(s.ntfCount);
                  const sRate = sTotal > 0 ? (sNtf / sTotal) * 100 : 0;
                  return `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${s.supplierName || 'Không xác định'}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${sTotal.toLocaleString()}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${sNtf.toLocaleString()}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${sRate >= 30 ? '#dc2626' : sRate >= 20 ? '#f59e0b' : '#22c55e'}; font-weight: bold;">${sRate.toFixed(1)}%</td>
                    </tr>
                  `;
                }).join('')}
              </table>
            </div>
          ` : ''}
          
          <!-- Top Products -->
          ${products.length > 0 ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h3 style="margin: 0 0 15px 0; color: #1e293b;">📦 NTF theo Sản phẩm</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Tổng lỗi</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">NTF</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">NTF Rate</th>
                </tr>
                ${products.map((p: any) => {
                  const pTotal = Number(p.total);
                  const pNtf = Number(p.ntfCount);
                  const pRate = pTotal > 0 ? (pNtf / pTotal) * 100 : 0;
                  return `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.productName || 'Không xác định'}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${pTotal.toLocaleString()}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${pNtf.toLocaleString()}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${pRate >= 30 ? '#dc2626' : pRate >= 20 ? '#f59e0b' : '#22c55e'}; font-weight: bold;">${pRate.toFixed(1)}%</td>
                    </tr>
                  `;
                }).join('')}
              </table>
            </div>
          ` : ''}
          
          <!-- Recommendations -->
          <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">💡 Khuyến nghị</h3>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              ${ntfRate >= 30 ? '<li style="color: #dc2626; margin-bottom: 8px;"><strong>Cảnh báo nghiêm trọng:</strong> NTF rate vượt 30%. Cần rà soát toàn bộ hệ thống phát hiện lỗi.</li>' : ''}
              ${ntfRateChange > 5 ? '<li style="color: #f59e0b; margin-bottom: 8px;"><strong>Xu hướng tăng:</strong> NTF rate tăng đáng kể so với tháng trước. Cần điều tra nguyên nhân.</li>' : ''}
              ${suppliers.length > 0 && Number(suppliers[0].ntfCount) / Number(suppliers[0].total) > 0.3 ? `<li style="margin-bottom: 8px;">Nhà cung cấp <strong>${suppliers[0].supplierName}</strong> có NTF rate cao. Cần đánh giá lại chất lượng nguyên vật liệu.</li>` : ''}
              <li style="margin-bottom: 8px;">Tập trung cải thiện các nguyên nhân NTF hàng đầu để giảm tỷ lệ phát hiện sai.</li>
              <li style="margin-bottom: 8px;">Xem xét cập nhật tiêu chuẩn kiểm tra cho các sản phẩm có NTF rate cao.</li>
              <li>Đào tạo định kỳ cho nhân viên về phân loại lỗi chính xác.</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #1e293b; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="margin: 0; font-size: 12px; opacity: 0.8;">
            Báo cáo này được gửi tự động từ hệ thống SPC/CPK Calculator<br>
            Thời gian tạo: ${new Date().toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    `;
    
    // Send to management emails
    let sent = 0;
    let failed = 0;
    
    for (const email of managementEmails) {
      try {
        await sendEmail(
          email,
          `📊 Báo cáo NTF Tháng ${monthName} - Tổng hợp cho Ban quản lý`,
          emailHtml
        );
        sent++;
      } catch (err) {
        console.error(`[ScheduledJob] Failed to send monthly report to ${email}:`, err);
        failed++;
      }
    }
    
    console.log(`[ScheduledJob] Monthly NTF management report: sent=${sent}, failed=${failed}`);
    return { sent, failed, message: `Sent to ${sent} recipients, ${failed} failed` };
    
  } catch (error) {
    console.error('[ScheduledJob] Error generating monthly NTF management report:', error);
    return { sent: 0, failed: 0, message: 'Error: ' + String(error) };
  }
}

/**
 * Manually trigger monthly NTF management report (for testing)
 */
export async function triggerMonthlyNtfManagementReport(): Promise<{ sent: number; failed: number; message: string }> {
  return await sendNtfMonthlyManagementReport();
}
