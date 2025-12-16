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
