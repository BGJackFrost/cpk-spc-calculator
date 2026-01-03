/**
 * Scheduled Jobs Module
 * Handles automated tasks like license expiry checks
 */

import cron from 'node-cron';
import { getLicensesExpiringSoon, getExpiredLicenses, getDb } from './db';
import { generateShiftReport, sendShiftReportEmail, getCurrentShift } from './services/shiftReportService';
import { realtimeAlerts, machines, machineOnlineStatus, oeeRecords, oeeTargets, emailNotificationSettings, scheduledReports, scheduledReportLogs, oeeAlertThresholds, spcAnalysisHistory, productionLines, oeeAlertConfigs, oeeAlertHistory, oeeReportSchedules, oeeReportHistory, machineOeeData, machineApiKeys } from '../drizzle/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { triggerWebhooks } from './webhookService';
import { notifyOwner } from './_core/notification';
import { processWebhookRetries, getRetryStats } from './webhookService';
import { runScheduledRetrainCheck, getRetrainStats } from './services/autoRetrainService';
import { runScheduledDriftCheck } from './services/scheduledDriftCheckService';
import { sendEmail } from './emailService';
import { spareParts, sparePartsInventory, suppliers, licenseNotificationLogs } from '../drizzle/schema';
import { sendWeeklyAccuracyReport, triggerWeeklyAccuracyReport } from './services/weeklyAccuracyReportService';
import { cacheAlertService } from './services/cacheAlertService';
import { cacheReportService } from './services/cacheReportService';
import { cacheWarmingService } from './services/cacheWarmingService';

// Track if jobs are already initialized
let jobsInitialized = false;

/**
 * Log license notification to database
 */
async function logLicenseNotification(
  licenseId: number,
  licenseKey: string,
  notificationType: '7_days_warning' | '30_days_warning' | 'expired' | 'activated' | 'deactivated',
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' | 'pending',
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(licenseNotificationLogs).values({
      licenseId,
      licenseKey,
      notificationType,
      recipientEmail,
      subject,
      status,
      errorMessage: errorMessage || null,
      sentAt: status === 'sent' ? new Date() : null,
    });
  } catch (error) {
    console.error('[ScheduledJob] Error logging license notification:', error);
  }
}

/**
 * Check if notification was already sent today for this license
 */
async function wasNotificationSentToday(
  licenseKey: string,
  notificationType: '7_days_warning' | '30_days_warning' | 'expired'
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const logs = await db.select()
      .from(licenseNotificationLogs)
      .where(
        and(
          eq(licenseNotificationLogs.licenseKey, licenseKey),
          eq(licenseNotificationLogs.notificationType, notificationType),
          eq(licenseNotificationLogs.status, 'sent'),
          gte(licenseNotificationLogs.sentAt, today)
        )
      )
      .limit(1);
    
    return logs.length > 0;
  } catch (error) {
    console.error('[ScheduledJob] Error checking notification history:', error);
    return false;
  }
}

/**
 * Send license renewal email notifications
 */
async function sendLicenseRenewalEmails(): Promise<{ sent: number; failed: number; skipped: number }> {
  console.log('[ScheduledJob] Sending license renewal emails...');
  
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  
  try {
    // Get licenses expiring in 30 days
    const expiringSoon30 = await getLicensesExpiringSoon(30);
    // Get licenses expiring in 7 days
    const expiringSoon7 = await getLicensesExpiringSoon(7);
    // Get expired licenses
    const expiredLicenses = await getExpiredLicenses();
    
    // Send urgent emails for licenses expiring in 7 days
    for (const license of expiringSoon7) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 7 && daysLeft > 0 && license.contactEmail) {
        // Check if already sent today
        const alreadySent = await wasNotificationSentToday(license.licenseKey, '7_days_warning');
        if (alreadySent) {
          skipped++;
          continue;
        }
        
        const subject = `⚠️ Cảnh báo: License SPC/CPK Calculator sẽ hết hạn trong ${daysLeft} ngày`;
        const result = await sendEmail(
          license.contactEmail,
          subject,
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
        
        // Log to database
        await logLicenseNotification(
          license.id,
          license.licenseKey,
          '7_days_warning',
          license.contactEmail,
          subject,
          result.success ? 'sent' : 'failed',
          result.success ? undefined : result.error
        );
        
        if (result.success) sent++;
        else failed++;
      }
    }
    
    // Send warning emails for licenses expiring in 30 days (but not in 7-day window)
    for (const license of expiringSoon30) {
      const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 7 && daysLeft <= 30 && license.contactEmail) {
        // Check if already sent today
        const alreadySent = await wasNotificationSentToday(license.licenseKey, '30_days_warning');
        if (alreadySent) {
          skipped++;
          continue;
        }
        
        const subject = `📅 Nhắc nhở: License SPC/CPK Calculator sẽ hết hạn trong ${daysLeft} ngày`;
        const result = await sendEmail(
          license.contactEmail,
          subject,
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
        
        // Log to database
        await logLicenseNotification(
          license.id,
          license.licenseKey,
          '30_days_warning',
          license.contactEmail,
          subject,
          result.success ? 'sent' : 'failed',
          result.success ? undefined : result.error
        );
        
        if (result.success) sent++;
        else failed++;
      }
    }
    
    // Send expired notification emails
    for (const license of expiredLicenses) {
      if (license.contactEmail) {
        // Check if already sent today
        const alreadySent = await wasNotificationSentToday(license.licenseKey, 'expired');
        if (alreadySent) {
          skipped++;
          continue;
        }
        
        const subject = `🚨 License SPC/CPK Calculator đã hết hạn`;
        const result = await sendEmail(
          license.contactEmail,
          subject,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">🚨 License đã hết hạn!</h2>
              <p>Kính gửi <strong>${license.companyName || 'Quý khách'}</strong>,</p>
              <p>License <strong>${license.licenseType?.toUpperCase()}</strong> của bạn đã hết hạn vào ngày <strong style="color: #dc2626;">${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}</strong>.</p>
              <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>License Key:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseKey}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Loại:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${license.licenseType?.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ngày hết hạn:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(license.expiresAt!).toLocaleDateString('vi-VN')}</td></tr>
              </table>
              <p style="color: #dc2626;"><strong>Vui lòng gia hạn license ngay để tiếp tục sử dụng dịch vụ.</strong></p>
              <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
            </div>
          `
        );
        
        // Log to database
        await logLicenseNotification(
          license.id,
          license.licenseKey,
          'expired',
          license.contactEmail,
          subject,
          result.success ? 'sent' : 'failed',
          result.success ? undefined : result.error
        );
        
        if (result.success) sent++;
        else failed++;
      }
    }
    
    console.log(`[ScheduledJob] License renewal emails: sent=${sent}, failed=${failed}, skipped=${skipped}`);
    
  } catch (error) {
    console.error('[ScheduledJob] Error sending license renewal emails:', error);
  }
  
  return { sent, failed, skipped };
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
  
  // NTF PowerPoint report - runs at 10:00 AM on 1st of each month
  cron.schedule('0 0 10 1 * *', async () => {
    console.log('[ScheduledJob] Triggered: NTF PowerPoint report');
    await sendNtfPowerPointReport();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: NTF PowerPoint report at 10:00 AM on 1st (Asia/Ho_Chi_Minh)');
  
  // OEE daily alert - runs at 8:30 AM daily
  cron.schedule('0 30 8 * * *', async () => {
    console.log('[ScheduledJob] Triggered: OEE daily alert check');
    await checkOeeAndSendAlerts('daily');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: OEE daily alert at 8:30 AM (Asia/Ho_Chi_Minh)');
  
  // OEE weekly alert - runs at 9:00 AM every Monday
  cron.schedule('0 0 9 * * 1', async () => {
    console.log('[ScheduledJob] Triggered: OEE weekly alert check');
    await checkOeeAndSendAlerts('weekly');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: OEE weekly alert at 9:00 AM Monday (Asia/Ho_Chi_Minh)');
  
  // Scheduled reports processor - runs every minute to check for due reports
  cron.schedule('0 * * * * *', async () => {
    await processScheduledReports();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Report processor every minute (Asia/Ho_Chi_Minh)');
  
  // Machine Integration OEE Alert check - runs daily at 7:00 AM
  cron.schedule('0 0 7 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Machine Integration OEE alert check');
    await checkMachineOeeAlerts();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Machine Integration OEE alert at 7:00 AM daily (Asia/Ho_Chi_Minh)');
  
  // Machine Integration OEE Report processor - runs every hour
  cron.schedule('0 0 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Machine Integration OEE report processor');
    await processMachineOeeReports();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Machine Integration OEE report processor every hour (Asia/Ho_Chi_Minh)');
  
  // KPI decline alert check - runs daily at 8:00 AM
  cron.schedule('0 0 8 * * *', async () => {
    console.log('[ScheduledJob] Triggered: KPI decline alert check');
    await checkKPIDeclineAlerts();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: KPI decline alert check at 8:00 AM (Asia/Ho_Chi_Minh)');
  
  // Scheduled KPI reports processor - runs every minute to check for due reports
  cron.schedule('0 * * * * *', async () => {
    await processScheduledKpiReports();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: KPI report processor every minute (Asia/Ho_Chi_Minh)');
  
  // Performance drop alert check - runs every 30 minutes
  cron.schedule('0 */30 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Performance drop alert check');
    await checkPerformanceDropAlerts();
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Performance drop alert check every 30 minutes (Asia/Ho_Chi_Minh)');
  
  // Auto-retrain ML models check - runs every 6 hours
  cron.schedule('0 0 */6 * * *', async () => {
    console.log('[ScheduledJob] Triggered: Auto-retrain ML models check');
    try {
      const result = await runScheduledRetrainCheck();
      console.log(`[ScheduledJob] Auto-retrain check completed: ${result.checked} models checked, ${result.retrained} retrained, ${result.failed} failed`);
    } catch (error) {
      console.error('[ScheduledJob] Error in auto-retrain check:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Auto-retrain ML models check every 6 hours (Asia/Ho_Chi_Minh)');
  
  // Scheduled drift check - runs every hour
  cron.schedule('0 0 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Scheduled drift check');
    try {
      const result = await runScheduledDriftCheck();
      console.log(`[ScheduledJob] Drift check completed: ${result.modelsChecked} models checked, ${result.alertsCreated} alerts created`);
    } catch (error) {
      console.error('[ScheduledJob] Error in scheduled drift check:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Drift check every hour (Asia/Ho_Chi_Minh)');
  
  // Weekly accuracy report - runs every Monday at 8:00 AM
  cron.schedule('0 0 8 * * 1', async () => {
    console.log('[ScheduledJob] Triggered: Weekly accuracy report');
    try {
      const result = await sendWeeklyAccuracyReport();
      console.log(`[ScheduledJob] Weekly accuracy report: sent=${result.sent}, failed=${result.failed}`);
    } catch (error) {
      console.error('[ScheduledJob] Error sending weekly accuracy report:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Weekly accuracy report at 8:00 AM every Monday (Asia/Ho_Chi_Minh)');
  
  // Cache alert check - runs every 5 minutes
  cron.schedule('0 */5 * * * *', async () => {
    try {
      const result = await cacheAlertService.checkAndAlert();
      if (result.alertSent) {
        console.log(`[ScheduledJob] Cache alert sent: ${result.message}`);
      }
    } catch (error) {
      console.error('[ScheduledJob] Error checking cache alerts:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Cache alert check every 5 minutes (Asia/Ho_Chi_Minh)');
  
  // Cache report processing - runs every minute to check scheduled reports
  cron.schedule('0 * * * * *', async () => {
    try {
      const result = await cacheReportService.processScheduledReports();
      if (result.sent > 0) {
        console.log(`[ScheduledJob] Cache reports sent: ${result.sent}/${result.processed}`);
      }
    } catch (error) {
      console.error('[ScheduledJob] Error processing cache reports:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Cache report processing every minute (Asia/Ho_Chi_Minh)');
  
  // Escalation check - runs every 5 minutes
  cron.schedule('0 */5 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Escalation check');
    try {
      const { processEscalations, getEscalationConfig } = await import('./services/alertEscalationService');
      const config = await getEscalationConfig();
      
      if (!config.enabled) {
        console.log('[ScheduledJob] Escalation is disabled, skipping check');
        return;
      }
      
      const result = await processEscalations();
      console.log(`[ScheduledJob] Escalation check completed: processed=${result.processed}, escalated=${result.escalated}, errors=${result.errors}`);
      
      // Notify owner if there are critical escalations
      if (result.escalated > 0) {
        try {
          await notifyOwner({
            title: `⚠️ Escalation Alert: ${result.escalated} alerts escalated`,
            content: `Có ${result.escalated} cảnh báo đã được leo thang. Vui lòng kiểm tra hệ thống.`,
          });
        } catch (notifyError) {
          console.error('[ScheduledJob] Error notifying owner about escalations:', notifyError);
        }
      }
    } catch (error) {
      console.error('[ScheduledJob] Error during escalation check:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Escalation check every 5 minutes (Asia/Ho_Chi_Minh)');
  
  // Webhook failure escalation check - runs every 5 minutes
  cron.schedule('0 */5 * * * *', async () => {
    console.log('[ScheduledJob] Triggered: Webhook failure escalation check');
    try {
      const { runWebhookEscalationCheck } = await import('./services/webhookEscalationCronService');
      const result = await runWebhookEscalationCheck();
      
      if (result.escalated > 0) {
        console.log(`[ScheduledJob] Webhook escalation: ${result.escalated} webhooks escalated`);
      }
    } catch (error) {
      console.error('[ScheduledJob] Error during webhook failure escalation check:', error);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
  
  console.log('[ScheduledJob] Scheduled: Webhook failure escalation check every 5 minutes (Asia/Ho_Chi_Minh)');
  
  // Cache warming on startup
  setTimeout(async () => {
    try {
      console.log('[ScheduledJob] Starting initial cache warming...');
      const result = await cacheWarmingService.warmAllCaches({ onlyHighPriority: true });
      console.log(`[ScheduledJob] Initial cache warming complete: ${result.success}/${result.total} succeeded in ${result.duration}ms`);
    } catch (error) {
      console.error('[ScheduledJob] Error during initial cache warming:', error);
    }
  }, 5000); // Wait 5 seconds after startup
  
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
        managementEmails = Array.from(new Set([...managementEmails, ...alertEmails]));
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


/**
 * Send NTF PowerPoint report via email
 */
async function sendNtfPowerPointReport(): Promise<{ sent: number; failed: number; message: string }> {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available for PowerPoint report');
      return { sent: 0, failed: 0, message: 'Database not available' };
    }
    
    // Get management emails from NTF alert config
    const configResult = await db.execute(sql.raw(`
      SELECT alertEmails FROM ntf_alert_config WHERE id = 1
    `));
    const config = ((configResult as unknown as any[])[0] as any[])[0];
    const managementEmails = config?.alertEmails ? JSON.parse(config.alertEmails) : [];
    
    if (managementEmails.length === 0) {
      console.log('[ScheduledJob] No management emails configured for PowerPoint report');
      return { sent: 0, failed: 0, message: 'No emails configured' };
    }
    
    const currentYear = new Date().getFullYear();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const monthName = lastMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    
    // Get YTD data
    const ytdResult = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records
      WHERE YEAR(createdAt) = ${currentYear}
    `));
    
    // Get quarterly data
    const quarterlyResult = await db.execute(sql.raw(`
      SELECT 
        QUARTER(createdAt) as quarter,
        COUNT(*) as total,
        SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
      FROM spc_defect_records
      WHERE YEAR(createdAt) = ${currentYear}
      GROUP BY QUARTER(createdAt)
      ORDER BY quarter
    `));
    
    const ytd = ((ytdResult as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0 };
    const quarterly = ((quarterlyResult as unknown as any[])[0] as any[]).map((q: any) => ({
      quarter: `Q${q.quarter}`,
      total: Number(q.total),
      ntfCount: Number(q.ntfCount),
      ntfRate: q.total > 0 ? (Number(q.ntfCount) / Number(q.total)) * 100 : 0,
    }));
    
    const ytdTotal = Number(ytd.total);
    const ytdNtf = Number(ytd.ntfCount);
    const ytdNtfRate = ytdTotal > 0 ? (ytdNtf / ytdTotal) * 100 : 0;
    
    // Create email with PowerPoint data summary
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Báo cáo NTF PowerPoint - ${monthName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Dữ liệu tổng hợp cho presentation</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">📈 Tổng quan YTD ${currentYear}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Chỉ số</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Giá trị</th>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">Tổng lỗi phát hiện</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">${ytdTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">NTF (Không phải lỗi)</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">${ytdNtf.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">NTF Rate</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: ${ytdNtfRate >= 30 ? '#dc2626' : ytdNtfRate >= 20 ? '#f59e0b' : '#22c55e'};">${ytdNtfRate.toFixed(1)}%</td>
            </tr>
          </table>
          
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">📊 Theo Quý</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Quý</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Tổng lỗi</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">NTF</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">NTF Rate</th>
            </tr>
            ${quarterly.map(q => `
              <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">${q.quarter}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${q.total.toLocaleString()}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${q.ntfCount.toLocaleString()}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: ${q.ntfRate >= 30 ? '#dc2626' : q.ntfRate >= 20 ? '#f59e0b' : '#22c55e'};">${q.ntfRate.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </table>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e3a8a;">
              <strong>💡 Hướng dẫn:</strong> Để tạo file PowerPoint đầy đủ với biểu đồ, vui lòng truy cập 
              <strong>Dashboard CEO</strong> trong hệ thống và sử dụng nút <strong>Export PowerPoint</strong>.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
          <p>Báo cáo này được gửi tự động từ hệ thống SPC/CPK Calculator</p>
          <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>
    `;
    
    let sent = 0;
    let failed = 0;
    
    for (const email of managementEmails) {
      try {
        await sendEmail(
          email,
          `📊 Báo cáo NTF PowerPoint - ${monthName}`,
          emailHtml
        );
        sent++;
      } catch (err) {
        console.error(`[ScheduledJob] Failed to send PowerPoint report to ${email}:`, err);
        failed++;
      }
    }
    
    console.log(`[ScheduledJob] NTF PowerPoint report: sent=${sent}, failed=${failed}`);
    return { sent, failed, message: `Sent to ${sent} recipients, ${failed} failed` };
    
  } catch (error) {
    console.error('[ScheduledJob] Error sending NTF PowerPoint report:', error);
    return { sent: 0, failed: 0, message: 'Error: ' + String(error) };
  }
}

/**
 * Manually trigger NTF PowerPoint report (for testing)
 */
export async function triggerNtfPowerPointReport(): Promise<{ sent: number; failed: number; message: string }> {
  return await sendNtfPowerPointReport();
}


/**
 * Check OEE and send alerts for machines with significant OEE drops
 * Compares current period OEE with previous period
 */
export async function checkOeeAndSendAlerts(period: 'daily' | 'weekly' = 'daily'): Promise<{ sent: number; failed: number; alerts: number; message: string }> {
  console.log(`[ScheduledJob] Checking OEE alerts for ${period} period...`);
  
  try {
    const db = await getDb();
    if (!db) {
      return { sent: 0, failed: 0, alerts: 0, message: 'Database not available' };
    }
    
    // Calculate date ranges based on period
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
    
    if (period === 'daily') {
      // Current: yesterday, Previous: day before yesterday
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 1);
    } else {
      // Current: last 7 days, Previous: 7 days before that
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 7);
    }
    
    // Get OEE data for current period by machine
    const currentOeeResult = await db
      .select({
        machineId: oeeRecords.machineId,
        machineName: machines.name,
        avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
        avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
        avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
      })
      .from(oeeRecords)
      .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
      .where(and(
        gte(oeeRecords.recordDate, currentStart),
        lte(oeeRecords.recordDate, currentEnd)
      ))
      .groupBy(oeeRecords.machineId, machines.name);
    
    // Get OEE data for previous period by machine
    const previousOeeResult = await db
      .select({
        machineId: oeeRecords.machineId,
        avgOee: sql<number>`AVG(${oeeRecords.oee})`,
      })
      .from(oeeRecords)
      .where(and(
        gte(oeeRecords.recordDate, previousStart),
        lte(oeeRecords.recordDate, previousEnd)
      ))
      .groupBy(oeeRecords.machineId);
    
    // Create lookup for previous OEE
    const previousOeeMap = new Map<number, number>();
    for (const row of previousOeeResult) {
      if (row.machineId) {
        previousOeeMap.set(row.machineId, Number(row.avgOee) || 0);
      }
    }
    
    // Get OEE targets
    const targets = await db.select().from(oeeTargets);
    const targetMap = new Map<number, number>();
    for (const t of targets) {
      if (t.machineId) {
        targetMap.set(t.machineId, Number(t.targetOee) || 85);
      }
    }
    const defaultTarget = 85;
    
    // Find machines with significant OEE drops
    const alerts: Array<{
      machineId: number;
      machineName: string;
      currentOee: number;
      previousOee: number;
      targetOee: number;
      change: number;
      changePercent: number;
      severity: 'high' | 'medium' | 'low';
    }> = [];
    
    for (const current of currentOeeResult) {
      if (!current.machineId) continue;
      
      const currentOee = Number(current.avgOee) || 0;
      const previousOee = previousOeeMap.get(current.machineId) || currentOee;
      const targetOee = targetMap.get(current.machineId) || defaultTarget;
      const change = currentOee - previousOee;
      const changePercent = previousOee > 0 ? (change / previousOee) * 100 : 0;
      
      // Alert conditions:
      // 1. OEE dropped more than 5% absolute
      // 2. OEE is below target
      // 3. OEE dropped more than 10% relative
      const shouldAlert = 
        change <= -5 || // Dropped 5+ points
        (currentOee < targetOee && change < 0) || // Below target and dropping
        changePercent <= -10; // Dropped 10%+ relative
      
      if (shouldAlert) {
        let severity: 'high' | 'medium' | 'low' = 'low';
        if (change <= -10 || currentOee < targetOee - 10) {
          severity = 'high';
        } else if (change <= -5 || currentOee < targetOee) {
          severity = 'medium';
        }
        
        alerts.push({
          machineId: current.machineId,
          machineName: current.machineName || `Machine ${current.machineId}`,
          currentOee,
          previousOee,
          targetOee,
          change,
          changePercent,
          severity,
        });
      }
    }
    
    if (alerts.length === 0) {
      console.log('[ScheduledJob] No OEE alerts to send');
      return { sent: 0, failed: 0, alerts: 0, message: 'No alerts needed' };
    }
    
    // Sort alerts by severity and change
    alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.change - b.change;
    });
    
    // Get email recipients from email notification settings
    const emailSettings = await db.select().from(emailNotificationSettings).limit(1);
    let recipients: string[] = [];
    
    if (emailSettings.length > 0 && emailSettings[0].email) {
      // Use email field directly as recipient
      recipients = [emailSettings[0].email];
    }
    
    // Fallback to owner notification if no recipients configured
    if (recipients.length === 0) {
      console.log('[ScheduledJob] No OEE alert recipients configured, sending to owner');
      await notifyOwner({
        title: `⚠️ Cảnh báo OEE ${period === 'daily' ? 'hàng ngày' : 'hàng tuần'}: ${alerts.length} máy có OEE giảm`,
        content: `Phát hiện ${alerts.length} máy có OEE giảm đáng kể:\n${alerts.slice(0, 5).map(a => 
          `- ${a.machineName}: ${a.currentOee.toFixed(1)}% (${a.change >= 0 ? '+' : ''}${a.change.toFixed(1)}%)`
        ).join('\n')}`,
      });
      return { sent: 1, failed: 0, alerts: alerts.length, message: 'Sent to owner' };
    }
    
    // Generate email HTML
    const periodLabel = period === 'daily' ? 'hôm qua' : '7 ngày qua';
    const previousPeriodLabel = period === 'daily' ? 'hôm kia' : '7 ngày trước đó';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">⚠️ Cảnh báo OEE ${period === 'daily' ? 'Hàng ngày' : 'Hàng tuần'}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Phát hiện ${alerts.length} máy có OEE giảm đáng kể</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">📊 Tổng quan</h3>
            <p style="margin: 5px 0;"><strong>Kỳ hiện tại:</strong> ${periodLabel}</p>
            <p style="margin: 5px 0;"><strong>So sánh với:</strong> ${previousPeriodLabel}</p>
            <p style="margin: 5px 0;"><strong>Số máy cảnh báo:</strong> ${alerts.length}</p>
            <p style="margin: 5px 0;"><strong>Mức độ cao:</strong> ${alerts.filter(a => a.severity === 'high').length}</p>
            <p style="margin: 5px 0;"><strong>Mức độ trung bình:</strong> ${alerts.filter(a => a.severity === 'medium').length}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">🔴 Chi tiết cảnh báo</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Máy</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">OEE hiện tại</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">OEE trước</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Thay đổi</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Mục tiêu</th>
                <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">Mức độ</th>
              </tr>
              ${alerts.map(a => `
                <tr style="background: ${a.severity === 'high' ? '#fef2f2' : a.severity === 'medium' ? '#fffbeb' : 'white'};">
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${a.machineName}</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${a.currentOee < a.targetOee ? '#dc2626' : '#22c55e'};">${a.currentOee.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${a.previousOee.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; color: ${a.change < 0 ? '#dc2626' : '#22c55e'};">
                    ${a.change >= 0 ? '+' : ''}${a.change.toFixed(1)}% (${a.changePercent >= 0 ? '+' : ''}${a.changePercent.toFixed(1)}%)
                  </td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${a.targetOee.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; background: ${
                      a.severity === 'high' ? '#dc2626' : a.severity === 'medium' ? '#f59e0b' : '#22c55e'
                    }; color: white;">
                      ${a.severity === 'high' ? 'Cao' : a.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>💡 Khuyến nghị:</strong> Vui lòng kiểm tra các máy có mức độ cảnh báo cao để xác định nguyên nhân và có biện pháp khắc phục kịp thời.
            </p>
          </div>
        </div>
        
        <div style="background: #1e293b; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator</p>
          <p style="margin: 5px 0 0 0; opacity: 0.7;">Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
        </div>
      </div>
    `;
    
    // Send emails
    let sent = 0;
    let failed = 0;
    
    for (const email of recipients) {
      try {
        const result = await sendEmail(
          email,
          `⚠️ Cảnh báo OEE ${period === 'daily' ? 'hàng ngày' : 'hàng tuần'}: ${alerts.length} máy có OEE giảm`,
          emailHtml
        );
        
        if (result.success) sent++;
        else failed++;
      } catch (err) {
        console.error(`[ScheduledJob] Failed to send OEE alert to ${email}:`, err);
        failed++;
      }
    }
    
    console.log(`[ScheduledJob] OEE ${period} alerts: sent=${sent}, failed=${failed}, alerts=${alerts.length}`);
    return { sent, failed, alerts: alerts.length, message: `Sent to ${sent} recipients, ${failed} failed` };
    
  } catch (error) {
    console.error(`[ScheduledJob] Error checking OEE alerts:`, error);
    return { sent: 0, failed: 0, alerts: 0, message: 'Error: ' + String(error) };
  }
}

/**
 * Manually trigger OEE alert check (for testing)
 */
export async function triggerOeeAlertCheck(period: 'daily' | 'weekly' = 'daily'): Promise<{ sent: number; failed: number; alerts: number; message: string }> {
  return await checkOeeAndSendAlerts(period);
}


/**
 * Generate and send a scheduled report
 */
export async function generateAndSendScheduledReport(report: any): Promise<{ success: boolean; sent: number; failed: number; message: string }> {
  console.log(`[ScheduledJob] Generating scheduled report: ${report.name} (${report.reportType})`);
  const startTime = Date.now();
  
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, sent: 0, failed: 0, message: 'Database not available' };
    }
    
    const recipients = typeof report.recipients === 'string' ? JSON.parse(report.recipients) : report.recipients;
    if (!recipients || recipients.length === 0) {
      return { success: false, sent: 0, failed: 0, message: 'No recipients configured' };
    }
    
    // Get date range (last 7 days for daily, last 30 days for weekly/monthly)
    const now = new Date();
    const daysBack = report.frequency === 'daily' ? 7 : 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    // Parse machine and line filters
    const machineIds = report.machineIds ? (typeof report.machineIds === 'string' ? JSON.parse(report.machineIds) : report.machineIds) : null;
    const lineIds = report.productionLineIds ? (typeof report.productionLineIds === 'string' ? JSON.parse(report.productionLineIds) : report.productionLineIds) : null;
    
    let reportContent = '';
    let fileUrl = '';
    
    if (report.reportType === 'oee' || report.reportType === 'oee_cpk_combined') {
      // Get OEE data
      const oeeConditions = [gte(oeeRecords.recordDate, startDate)];
      if (machineIds && machineIds.length > 0) {
        oeeConditions.push(sql`${oeeRecords.machineId} IN (${sql.join(machineIds.map((id: number) => sql`${id}`), sql`, `)})`);
      }
      
      const oeeData = await db
        .select({
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(and(...oeeConditions))
        .groupBy(oeeRecords.machineId, machines.name);
      
      // Generate OEE section
      const oeeHtml = `
        <h2>📊 Báo cáo OEE</h2>
        <p>Thời gian: ${daysBack} ngày qua (${startDate.toLocaleDateString('vi-VN')} - ${now.toLocaleDateString('vi-VN')})</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #3b82f6; color: white;">
            <th style="padding: 10px; text-align: left;">Máy</th>
            <th style="padding: 10px; text-align: center;">OEE TB</th>
            <th style="padding: 10px; text-align: center;">Availability</th>
            <th style="padding: 10px; text-align: center;">Performance</th>
            <th style="padding: 10px; text-align: center;">Quality</th>
            <th style="padding: 10px; text-align: center;">Số bản ghi</th>
          </tr>
          ${oeeData.map(d => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${d.machineName || `Machine ${d.machineId}`}</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${Number(d.avgOee) >= 85 ? '#22c55e' : Number(d.avgOee) >= 70 ? '#f59e0b' : '#dc2626'};">${Number(d.avgOee).toFixed(1)}%</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${Number(d.avgAvailability).toFixed(1)}%</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${Number(d.avgPerformance).toFixed(1)}%</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${Number(d.avgQuality).toFixed(1)}%</td>
              <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${d.recordCount}</td>
            </tr>
          `).join('')}
        </table>
      `;
      reportContent += oeeHtml;
    }
    
    if (report.reportType === 'cpk' || report.reportType === 'oee_cpk_combined') {
      // Get CPK data
      const cpkData = await db
        .select({
          productCode: spcAnalysisHistory.productCode,
          stationName: spcAnalysisHistory.stationName,
          avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
          avgCp: sql<number>`AVG(${spcAnalysisHistory.cp})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(spcAnalysisHistory)
        .where(and(
          gte(spcAnalysisHistory.createdAt, startDate),
          sql`${spcAnalysisHistory.cpk} IS NOT NULL`
        ))
        .groupBy(spcAnalysisHistory.productCode, spcAnalysisHistory.stationName);
      
      // Generate CPK section
      const cpkHtml = `
        <h2>📈 Báo cáo CPK</h2>
        <p>Thời gian: ${daysBack} ngày qua</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #22c55e; color: white;">
            <th style="padding: 10px; text-align: left;">Sản phẩm</th>
            <th style="padding: 10px; text-align: left;">Công trạm</th>
            <th style="padding: 10px; text-align: center;">CPK TB</th>
            <th style="padding: 10px; text-align: center;">CP TB</th>
            <th style="padding: 10px; text-align: center;">Đánh giá</th>
          </tr>
          ${cpkData.map(d => {
            const cpk = Number(d.avgCpk);
            const rating = cpk >= 1.67 ? 'Xuất sắc' : cpk >= 1.33 ? 'Tốt' : cpk >= 1.0 ? 'Chấp nhận' : 'Cần cải thiện';
            const color = cpk >= 1.67 ? '#22c55e' : cpk >= 1.33 ? '#3b82f6' : cpk >= 1.0 ? '#f59e0b' : '#dc2626';
            return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${d.productCode}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${d.stationName}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${color};">${cpk.toFixed(3)}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${Number(d.avgCp).toFixed(3)}</td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="padding: 2px 8px; border-radius: 4px; background: ${color}; color: white;">${rating}</span></td>
              </tr>
            `;
          }).join('')}
        </table>
      `;
      reportContent += cpkHtml;
    }
    
    // Wrap in full HTML
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${report.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
          h1 { color: #1e293b; }
          h2 { color: #3b82f6; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>📋 ${report.name}</h1>
        <p style="color: #64748b;">Báo cáo ${report.frequency === 'daily' ? 'hàng ngày' : report.frequency === 'weekly' ? 'hàng tuần' : 'hàng tháng'} | Tạo lúc: ${now.toLocaleString('vi-VN')}</p>
        ${reportContent}
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="color: #64748b; font-size: 12px;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator</p>
      </body>
      </html>
    `;
    
    // Upload to storage
    const { storagePut } = await import('./storage');
    const fileName = `report-${report.id}-${Date.now()}.html`;
    const { url } = await storagePut(fileName, Buffer.from(fullHtml), 'text/html');
    fileUrl = url;
    
    // Send emails
    let sent = 0;
    let failed = 0;
    
    for (const email of recipients) {
      try {
        const result = await sendEmail(
          email,
          `📋 ${report.name} - ${now.toLocaleDateString('vi-VN')}`,
          fullHtml
        );
        
        if (result.success) sent++;
        else failed++;
      } catch (err) {
        console.error(`[ScheduledJob] Failed to send report to ${email}:`, err);
        failed++;
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    // Log the report
    await db.insert(scheduledReportLogs).values({
      reportId: report.id,
      status: failed === 0 ? 'success' : (sent > 0 ? 'partial' : 'failed'),
      recipientCount: sent + failed,
      successCount: sent,
      failedCount: failed,
      reportFileUrl: fileUrl,
      errorMessage: failed > 0 ? `${failed} emails failed to send` : null,
      generationTimeMs: executionTime,
    });
    
    // Update report status - only update lastSentAt since other fields don't exist in schema
    await db.update(scheduledReports)
      .set({
        lastSentAt: new Date(),
      })
      .where(eq(scheduledReports.id, report.id));
    
    console.log(`[ScheduledJob] Report ${report.name}: sent=${sent}, failed=${failed}, time=${executionTime}ms`);
    return { success: true, sent, failed, message: `Sent to ${sent} recipients, ${failed} failed` };
    
  } catch (error) {
    console.error(`[ScheduledJob] Error generating report ${report.name}:`, error);
    return { success: false, sent: 0, failed: 0, message: 'Error: ' + String(error) };
  }
}

/**
 * Process all due scheduled reports
 */
export async function processScheduledReports(): Promise<{ processed: number; sent: number; failed: number }> {
  console.log('[ScheduledJob] Processing scheduled reports...');
  
  try {
    const db = await getDb();
    if (!db) {
      return { processed: 0, sent: 0, failed: 0 };
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();
    
    // Get all active reports
    const reports = await db.select()
      .from(scheduledReports)
      .where(eq(scheduledReports.isActive, 1));
    
    let processed = 0;
    let totalSent = 0;
    let totalFailed = 0;
    
    for (const report of reports) {
      // Check if report should run now
      let shouldRun = false;
      
      // Use frequency and timeOfDay from schema
      const reportTimeOfDay = report.timeOfDay || '08:00';
      const reportHour = parseInt(reportTimeOfDay.split(':')[0], 10);
      if (reportHour === currentHour) {
        if (report.frequency === 'daily') {
          shouldRun = true;
        } else if (report.frequency === 'weekly' && report.dayOfWeek === currentDayOfWeek) {
          shouldRun = true;
        } else if (report.frequency === 'monthly' && report.dayOfMonth === currentDayOfMonth) {
          shouldRun = true;
        }
      }
      
      if (shouldRun) {
        const result = await generateAndSendScheduledReport(report);
        processed++;
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    }
    
    console.log(`[ScheduledJob] Processed ${processed} reports: sent=${totalSent}, failed=${totalFailed}`);
    return { processed, sent: totalSent, failed: totalFailed };
    
  } catch (error) {
    console.error('[ScheduledJob] Error processing scheduled reports:', error);
    return { processed: 0, sent: 0, failed: 0 };
  }
}


// ==================== Machine Integration OEE Scheduled Jobs ====================

/**
 * Check Machine OEE alerts and send email notifications
 * Runs daily to check if OEE is below threshold for consecutive days
 */
async function checkMachineOeeAlerts(): Promise<{ processed: number; triggered: number; sent: number; failed: number }> {
  console.log('[ScheduledJob] Checking Machine Integration OEE alerts...');
  
  let processed = 0;
  let triggered = 0;
  let sent = 0;
  let failed = 0;
  
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available');
      return { processed: 0, triggered: 0, sent: 0, failed: 0 };
    }
    
    // Get all active alert configs
    const alertConfigs = await db
      .select()
      .from(oeeAlertConfigs)
      .where(eq(oeeAlertConfigs.isActive, 1));
    
    console.log(`[ScheduledJob] Found ${alertConfigs.length} active OEE alert configs`);
    
    // Get machine names for reference
    const machineNames = await db
      .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
      .from(machineApiKeys)
      .groupBy(machineApiKeys.machineId, machineApiKeys.name);
    const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));
    
    for (const config of alertConfigs) {
      processed++;
      
      try {
        const threshold = parseFloat(config.oeeThreshold as string) || 85;
        const consecutiveDays = config.consecutiveDays || 3;
        
        // Get OEE data for the last N days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - consecutiveDays);
        
        const conditions = [gte(machineOeeData.recordedAt, startDate)];
        if (config.machineId) {
          conditions.push(eq(machineOeeData.machineId, config.machineId));
        }
        
        // Get daily OEE averages
        const oeeData = await db
          .select({
            machineId: machineOeeData.machineId,
            date: sql<string>`DATE(${machineOeeData.recordedAt})`,
            avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          })
          .from(machineOeeData)
          .where(and(...conditions))
          .groupBy(machineOeeData.machineId, sql`DATE(${machineOeeData.recordedAt})`)
          .orderBy(machineOeeData.machineId, sql`DATE(${machineOeeData.recordedAt})`);
        
        // Group by machine and check consecutive days
        const machineOeeMap = new Map<number, { date: string; oee: number }[]>();
        for (const row of oeeData) {
          if (!row.machineId) continue;
          if (!machineOeeMap.has(row.machineId)) {
            machineOeeMap.set(row.machineId, []);
          }
          machineOeeMap.get(row.machineId)!.push({
            date: row.date,
            oee: row.avgOee || 0,
          });
        }
        
        // Check each machine for consecutive days below threshold
        for (const [machineId, oeeHistory] of Array.from(machineOeeMap.entries())) {
          // Count consecutive days below threshold (from most recent)
          let consecutiveBelowThreshold = 0;
          let latestOee = 0;
          
          // Sort by date descending
          oeeHistory.sort((a: { date: string; oee: number }, b: { date: string; oee: number }) => b.date.localeCompare(a.date));
          
          for (const day of oeeHistory) {
            if (day.oee < threshold) {
              consecutiveBelowThreshold++;
              if (latestOee === 0) latestOee = day.oee;
            } else {
              break; // Stop counting when we hit a day above threshold
            }
          }
          
          // Trigger alert if consecutive days >= configured threshold
          if (consecutiveBelowThreshold >= consecutiveDays) {
            triggered++;
            
            const machineName = nameMap.get(machineId) || `Machine ${machineId}`;
            const recipients = JSON.parse(config.recipients || '[]') as string[];
            
            // Insert alert history
            await db.insert(oeeAlertHistory).values({
              alertConfigId: config.id,
              machineId,
              machineName,
              oeeValue: String(latestOee.toFixed(2)),
              consecutiveDaysBelow: consecutiveBelowThreshold,
              recipients: JSON.stringify(recipients),
              emailSent: 0,
            });
            
            // Send email to recipients
            if (recipients.length > 0) {
              const emailHtml = generateOeeAlertEmail({
                configName: config.name,
                machineName,
                machineId,
                currentOee: latestOee,
                threshold,
                consecutiveDays: consecutiveBelowThreshold,
                oeeHistory: oeeHistory.slice(0, consecutiveDays),
              });
              
              for (const email of recipients) {
                try {
                  const result = await sendEmail(
                    email,
                    `⚠️ Cảnh báo OEE: ${machineName} dưới ${threshold}% trong ${consecutiveBelowThreshold} ngày liên tiếp`,
                    emailHtml
                  );
                  
                  if (result.success) {
                    sent++;
                    // Update email_sent status
                    await db.update(oeeAlertHistory)
                      .set({ emailSent: 1, emailSentAt: new Date() })
                      .where(and(
                        eq(oeeAlertHistory.alertConfigId, config.id),
                        eq(oeeAlertHistory.machineId, machineId)
                      ));
                  } else {
                    failed++;
                  }
                } catch (err) {
                  console.error(`[ScheduledJob] Failed to send OEE alert to ${email}:`, err);
                  failed++;
                }
              }
            }
            
            // Update last triggered time
            await db.update(oeeAlertConfigs)
              .set({ lastTriggeredAt: new Date() })
              .where(eq(oeeAlertConfigs.id, config.id));
          }
        }
      } catch (err) {
        console.error(`[ScheduledJob] Error processing alert config ${config.id}:`, err);
      }
    }
    
    console.log(`[ScheduledJob] Machine OEE alerts: processed=${processed}, triggered=${triggered}, sent=${sent}, failed=${failed}`);
    return { processed, triggered, sent, failed };
    
  } catch (error) {
    console.error('[ScheduledJob] Error checking Machine OEE alerts:', error);
    return { processed: 0, triggered: 0, sent: 0, failed: 0 };
  }
}

/**
 * Generate OEE alert email HTML
 */
function generateOeeAlertEmail(data: {
  configName: string;
  machineName: string;
  machineId: number;
  currentOee: number;
  threshold: number;
  consecutiveDays: number;
  oeeHistory: { date: string; oee: number }[];
}): string {
  const oeeColor = data.currentOee < 60 ? '#dc2626' : data.currentOee < 75 ? '#f59e0b' : '#22c55e';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Cảnh báo OEE</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.configName}</p>
      </div>
      
      <div style="padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">
            🏭 ${data.machineName}
          </h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 36px; font-weight: bold; color: ${oeeColor};">${data.currentOee.toFixed(1)}%</div>
              <div style="font-size: 12px; color: #64748b;">OEE hiện tại</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 36px; font-weight: bold; color: #3b82f6;">${data.threshold}%</div>
              <div style="font-size: 12px; color: #64748b;">Ngưỡng cảnh báo</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 36px; font-weight: bold; color: #dc2626;">${data.consecutiveDays}</div>
              <div style="font-size: 12px; color: #64748b;">Ngày liên tiếp</div>
            </div>
          </div>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⚠️ Cảnh báo:</strong> OEE của máy ${data.machineName} đã dưới ngưỡng ${data.threshold}% trong ${data.consecutiveDays} ngày liên tiếp.
            </p>
          </div>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">📊 Lịch sử OEE gần đây</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Ngày</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">OEE</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${data.oeeHistory.map(day => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${day.date}</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${day.oee < data.threshold ? '#dc2626' : '#22c55e'};">
                    ${day.oee.toFixed(1)}%
                  </td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    ${day.oee < data.threshold 
                      ? '<span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Dưới ngưỡng</span>'
                      : '<span style="background: #f0fdf4; color: #22c55e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Đạt</span>'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>💡 Khuyến nghị:</strong> Vui lòng kiểm tra máy ${data.machineName} để xác định nguyên nhân OEE thấp và có biện pháp khắc phục kịp thời.
          </p>
        </div>
      </div>
      
      <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator</p>
        <p style="margin: 5px 0 0 0; opacity: 0.7;">Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
    </div>
  `;
}

/**
 * Process Machine OEE scheduled reports
 * Runs hourly to check for due reports and send them
 */
async function processMachineOeeReports(): Promise<{ processed: number; sent: number; failed: number }> {
  console.log('[ScheduledJob] Processing Machine Integration OEE reports...');
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available');
      return { processed: 0, sent: 0, failed: 0 };
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();
    
    // Get all active report schedules
    const schedules = await db
      .select()
      .from(oeeReportSchedules)
      .where(eq(oeeReportSchedules.isActive, 1));
    
    console.log(`[ScheduledJob] Found ${schedules.length} active OEE report schedules`);
    
    // Get machine names for reference
    const machineNames = await db
      .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
      .from(machineApiKeys)
      .groupBy(machineApiKeys.machineId, machineApiKeys.name);
    const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));
    
    for (const schedule of schedules) {
      // Check if this schedule should run now
      let shouldRun = false;
      
      if (schedule.hour === currentHour) {
        if (schedule.frequency === 'weekly' && schedule.dayOfWeek === currentDayOfWeek) {
          shouldRun = true;
        } else if (schedule.frequency === 'monthly' && schedule.dayOfMonth === currentDayOfMonth) {
          shouldRun = true;
        }
      }
      
      if (!shouldRun) continue;
      
      processed++;
      
      try {
        const recipients = JSON.parse(schedule.recipients || '[]') as string[];
        if (recipients.length === 0) continue;
        
        const machineIds = schedule.machineIds ? JSON.parse(schedule.machineIds) as number[] : null;
        
        // Calculate report period
        const periodEnd = new Date();
        const periodStart = new Date();
        if (schedule.frequency === 'weekly') {
          periodStart.setDate(periodStart.getDate() - 7);
        } else {
          periodStart.setMonth(periodStart.getMonth() - 1);
        }
        
        // Get OEE data for the period
        const conditions = [
          gte(machineOeeData.recordedAt, periodStart),
          lte(machineOeeData.recordedAt, periodEnd),
        ];
        if (machineIds && machineIds.length > 0) {
          conditions.push(sql`${machineOeeData.machineId} IN (${sql.raw(machineIds.join(','))})`);
        }
        
        const oeeData = await db
          .select({
            machineId: machineOeeData.machineId,
            avgOee: sql<number>`AVG(${machineOeeData.oee})`,
            avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
            avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
            avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
            totalDowntime: sql<number>`SUM(COALESCE(${machineOeeData.downtime}, 0))`,
            recordCount: sql<number>`COUNT(*)`,
          })
          .from(machineOeeData)
          .where(and(...conditions))
          .groupBy(machineOeeData.machineId);
        
        // Get daily trend
        const dailyTrend = await db
          .select({
            date: sql<string>`DATE(${machineOeeData.recordedAt})`,
            avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          })
          .from(machineOeeData)
          .where(and(...conditions))
          .groupBy(sql`DATE(${machineOeeData.recordedAt})`)
          .orderBy(sql`DATE(${machineOeeData.recordedAt})`);
        
        // Generate report email
        const reportData = oeeData.map(row => ({
          machineId: row.machineId,
          machineName: nameMap.get(row.machineId!) || `Machine ${row.machineId}`,
          avgOee: row.avgOee || 0,
          avgAvailability: row.avgAvailability || 0,
          avgPerformance: row.avgPerformance || 0,
          avgQuality: row.avgQuality || 0,
          totalDowntime: row.totalDowntime || 0,
          recordCount: row.recordCount || 0,
        }));
        
        const emailHtml = generateOeeReportEmail({
          scheduleName: schedule.name,
          frequency: schedule.frequency,
          periodStart,
          periodEnd,
          machines: reportData,
          dailyTrend: dailyTrend.map(d => ({ date: d.date, oee: d.avgOee || 0 })),
          includeCharts: !!schedule.includeCharts,
          includeTrend: !!schedule.includeTrend,
          includeComparison: !!schedule.includeComparison,
        });
        
        // Insert report history
        const [historyResult] = await db.insert(oeeReportHistory).values({
          scheduleId: schedule.id,
          reportPeriodStart: periodStart,
          reportPeriodEnd: periodEnd,
          recipients: JSON.stringify(recipients),
          reportData: JSON.stringify({ machines: reportData, dailyTrend }),
          emailSent: 0,
        });
        
        // Send email to recipients
        let reportSent = 0;
        let reportFailed = 0;
        
        for (const email of recipients) {
          try {
            const result = await sendEmail(
              email,
              `📊 Báo cáo OEE ${schedule.frequency === 'weekly' ? 'tuần' : 'tháng'}: ${schedule.name}`,
              emailHtml
            );
            
            if (result.success) {
              reportSent++;
              sent++;
            } else {
              reportFailed++;
              failed++;
            }
          } catch (err) {
            console.error(`[ScheduledJob] Failed to send OEE report to ${email}:`, err);
            reportFailed++;
            failed++;
          }
        }
        
        // Update history with email status
        if (reportSent > 0) {
          await db.update(oeeReportHistory)
            .set({ emailSent: 1, emailSentAt: new Date() })
            .where(eq(oeeReportHistory.id, historyResult.insertId));
        }
        
        // Calculate next scheduled time
        const nextScheduledAt = new Date();
        if (schedule.frequency === 'weekly') {
          nextScheduledAt.setDate(nextScheduledAt.getDate() + 7);
        } else {
          nextScheduledAt.setMonth(nextScheduledAt.getMonth() + 1);
        }
        nextScheduledAt.setHours(schedule.hour, 0, 0, 0);
        
        // Update schedule
        await db.update(oeeReportSchedules)
          .set({ lastSentAt: new Date(), nextScheduledAt })
          .where(eq(oeeReportSchedules.id, schedule.id));
        
        console.log(`[ScheduledJob] Sent OEE report "${schedule.name}": ${reportSent} success, ${reportFailed} failed`);
        
      } catch (err) {
        console.error(`[ScheduledJob] Error processing OEE report schedule ${schedule.id}:`, err);
        failed++;
      }
    }
    
    console.log(`[ScheduledJob] Machine OEE reports: processed=${processed}, sent=${sent}, failed=${failed}`);
    return { processed, sent, failed };
    
  } catch (error) {
    console.error('[ScheduledJob] Error processing Machine OEE reports:', error);
    return { processed: 0, sent: 0, failed: 0 };
  }
}

/**
 * Generate OEE report email HTML
 */
function generateOeeReportEmail(data: {
  scheduleName: string;
  frequency: string;
  periodStart: Date;
  periodEnd: Date;
  machines: {
    machineId: number | null;
    machineName: string;
    avgOee: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    totalDowntime: number;
    recordCount: number;
  }[];
  dailyTrend: { date: string; oee: number }[];
  includeCharts: boolean;
  includeTrend: boolean;
  includeComparison: boolean;
}): string {
  const overallOee = data.machines.length > 0
    ? data.machines.reduce((sum, m) => sum + m.avgOee, 0) / data.machines.length
    : 0;
  
  const getOeeColor = (oee: number) => oee >= 85 ? '#22c55e' : oee >= 70 ? '#f59e0b' : '#dc2626';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📊 Báo cáo OEE ${data.frequency === 'weekly' ? 'Tuần' : 'Tháng'}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.scheduleName}</p>
        <p style="margin: 5px 0 0 0; opacity: 0.7; font-size: 14px;">
          ${data.periodStart.toLocaleDateString('vi-VN')} - ${data.periodEnd.toLocaleDateString('vi-VN')}
        </p>
      </div>
      
      <div style="padding: 20px;">
        <!-- Summary Card -->
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: ${getOeeColor(overallOee)};">${overallOee.toFixed(1)}%</div>
          <div style="font-size: 14px; color: #64748b;">OEE Trung bình</div>
          <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">${data.machines.length} máy | ${data.machines.reduce((sum, m) => sum + m.recordCount, 0)} bản ghi</div>
        </div>
        
        ${data.includeComparison ? `
        <!-- Machine Comparison Table -->
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">🏭 So sánh theo máy</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Máy</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">OEE</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">A</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">P</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Q</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Downtime</th>
              </tr>
            </thead>
            <tbody>
              ${data.machines.sort((a, b) => b.avgOee - a.avgOee).map(m => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.machineName}</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${getOeeColor(m.avgOee)};">
                    ${m.avgOee.toFixed(1)}%
                  </td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${m.avgAvailability.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${m.avgPerformance.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${m.avgQuality.toFixed(1)}%</td>
                  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${m.totalDowntime} phút</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${data.includeTrend && data.dailyTrend.length > 0 ? `
        <!-- Daily Trend -->
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">📈 Xu hướng OEE theo ngày</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${data.dailyTrend.map(d => `
              <div style="flex: 1; min-width: 60px; text-align: center; padding: 8px; background: ${getOeeColor(d.oee)}20; border-radius: 4px;">
                <div style="font-size: 11px; color: #64748b;">${d.date.slice(5)}</div>
                <div style="font-size: 14px; font-weight: bold; color: ${getOeeColor(d.oee)};">${d.oee.toFixed(0)}%</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            <strong>📋 Ghi chú:</strong> Báo cáo này được tạo tự động theo lịch đã cấu hình. Vui lòng kiểm tra các máy có OEE thấp để có biện pháp cải thiện.
          </p>
        </div>
      </div>
      
      <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p style="margin: 0;">Email này được gửi tự động từ hệ thống SPC/CPK Calculator</p>
        <p style="margin: 5px 0 0 0; opacity: 0.7;">Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
    </div>
  `;
}

/**
 * Manually trigger Machine OEE alert check (for testing)
 */
export async function triggerMachineOeeAlertCheck(): Promise<{ processed: number; triggered: number; sent: number; failed: number }> {
  return await checkMachineOeeAlerts();
}

/**
 * Manually trigger Machine OEE report processing (for testing)
 */
export async function triggerMachineOeeReportProcess(): Promise<{ processed: number; sent: number; failed: number }> {
  return await processMachineOeeReports();
}


// ============================================================
// Database Sync: MySQL → PostgreSQL
// ============================================================

/**
 * Sync data from MySQL to PostgreSQL
 * Runs daily at 2:30 AM to keep PostgreSQL backup in sync
 */
async function syncMySqlToPostgres(): Promise<{ tables: number; rows: number; errors: number }> {
  console.log('[ScheduledJob] Starting MySQL → PostgreSQL sync...');
  
  let tables = 0;
  let rows = 0;
  let errors = 0;
  
  try {
    // Check if PostgreSQL is configured
    const pgEnabled = process.env.PG_LOCAL_ENABLED === 'true' || !!process.env.POSTGRES_URL;
    if (!pgEnabled) {
      console.log('[ScheduledJob] PostgreSQL not configured, skipping sync');
      return { tables: 0, rows: 0, errors: 0 };
    }
    
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] MySQL not available, skipping sync');
      return { tables: 0, rows: 0, errors: 0 };
    }
    
    // Import pg dynamically
    const pg = await import('pg');
    const { Client } = pg.default || pg;
    
    // Build PostgreSQL connection
    let pgConnectionString = process.env.POSTGRES_URL;
    if (!pgConnectionString && process.env.PG_LOCAL_ENABLED === 'true') {
      const host = process.env.PG_HOST || 'localhost';
      const port = process.env.PG_PORT || '5432';
      const user = process.env.PG_USER || 'spc_user';
      const password = process.env.PG_PASSWORD || 'spc_password';
      const database = process.env.PG_DATABASE || 'spc_calculator';
      pgConnectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    }
    
    if (!pgConnectionString) {
      console.log('[ScheduledJob] PostgreSQL connection string not available');
      return { tables: 0, rows: 0, errors: 0 };
    }
    
    const pgClient = new Client({ connectionString: pgConnectionString });
    await pgClient.connect();
    
    // Tables to sync (in order of dependencies)
    const tablesToSync = [
      'users',
      'local_users',
      'production_lines',
      'machines',
      'oee_records',
      'oee_targets',
      'licenses',
      'spc_analysis_history',
      'companies',
      'departments',
    ];
    
    for (const tableName of tablesToSync) {
      try {
        // Check if table exists in MySQL
        const [mysqlCheck] = await db.execute(
          sql`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${tableName}`
        );
        if (!mysqlCheck || (mysqlCheck as any)[0]?.cnt === 0) {
          continue;
        }
        
        // Check if table exists in PostgreSQL
        const pgCheck = await pgClient.query(
          `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [tableName]
        );
        if (!pgCheck.rows[0] || pgCheck.rows[0].cnt === '0') {
          continue;
        }
        
        // Get data from MySQL
        const [mysqlData] = await db.execute(sql.raw(`SELECT * FROM \`${tableName}\``));
        const dataRows = mysqlData as unknown as any[];
        
        if (!dataRows || dataRows.length === 0) {
          continue;
        }
        
        tables++;
        
        // Insert into PostgreSQL with ON CONFLICT DO NOTHING
        for (const row of dataRows) {
          try {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            
            // Convert column names to snake_case
            const pgColumns = columns.map(col => 
              col.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
            );
            
            await pgClient.query(
              `INSERT INTO ${tableName} (${pgColumns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              values.map(v => v instanceof Date ? v : (typeof v === 'object' && v !== null ? JSON.stringify(v) : v))
            );
            rows++;
          } catch (rowErr: any) {
            if (!rowErr.message?.includes('duplicate key')) {
              errors++;
            }
          }
        }
        
        console.log(`[ScheduledJob] Synced ${tableName}: ${dataRows.length} rows`);
        
      } catch (tableErr) {
        console.error(`[ScheduledJob] Error syncing ${tableName}:`, tableErr);
        errors++;
      }
    }
    
    await pgClient.end();
    
    console.log(`[ScheduledJob] MySQL → PostgreSQL sync completed: ${tables} tables, ${rows} rows, ${errors} errors`);
    
    // Notify owner if there were errors
    if (errors > 0) {
      await notifyOwner({
        title: '⚠️ Database Sync có lỗi',
        content: `MySQL → PostgreSQL sync hoàn thành với ${errors} lỗi.\nTables: ${tables}, Rows: ${rows}`,
      });
    }
    
    return { tables, rows, errors };
    
  } catch (error) {
    console.error('[ScheduledJob] Error in MySQL → PostgreSQL sync:', error);
    return { tables, rows, errors: errors + 1 };
  }
}

// Schedule MySQL → PostgreSQL sync - runs daily at 2:30 AM
cron.schedule('0 30 2 * * *', async () => {
  console.log('[ScheduledJob] Triggered: MySQL → PostgreSQL sync');
  await syncMySqlToPostgres();
}, {
  timezone: 'Asia/Ho_Chi_Minh'
});

console.log('[ScheduledJob] Scheduled: MySQL → PostgreSQL sync at 2:30 AM daily (Asia/Ho_Chi_Minh)');

/**
 * Manually trigger MySQL → PostgreSQL sync (for testing)
 */
export async function triggerMySqlToPostgresSync(): Promise<{ tables: number; rows: number; errors: number }> {
  return await syncMySqlToPostgres();
}


/**
 * Check KPI decline and send alerts
 * Runs daily to compare current week KPIs with previous week
 * Uses custom thresholds from kpi_alert_thresholds table for each production line
 */
export async function checkKPIDeclineAlerts(): Promise<{
  checked: boolean;
  totalLines: number;
  alertsTriggered: number;
  emailsSent: number;
  results: Array<{
    productionLineId: number;
    productionLineName: string;
    cpkAlert: boolean;
    oeeAlert: boolean;
    cpkAbsoluteAlert: boolean;
    oeeAbsoluteAlert: boolean;
  }>;
}> {
  console.log('[ScheduledJob] Checking KPI decline alerts with custom thresholds...');
  
  try {
    const { checkAllLinesKPIAlerts } = await import('./services/kpiAlertService');
    const result = await checkAllLinesKPIAlerts();
    
    console.log(`[ScheduledJob] Checked ${result.totalLines} production lines`);
    console.log(`[ScheduledJob] Alerts triggered: ${result.alertsTriggered}`);
    console.log(`[ScheduledJob] Emails sent: ${result.emailsSent}`);
    
    if (result.alertsTriggered > 0) {
      console.log('[ScheduledJob] Lines with alerts:');
      result.results
        .filter(r => r.cpkAlert || r.oeeAlert || r.cpkAbsoluteAlert || r.oeeAbsoluteAlert)
        .forEach(r => {
          console.log(`  - ${r.productionLineName}: CPK=${r.cpkAlert || r.cpkAbsoluteAlert}, OEE=${r.oeeAlert || r.oeeAbsoluteAlert}`);
        });
    } else {
      console.log('[ScheduledJob] No KPI alerts - all KPIs are within thresholds');
    }
    
    return {
      checked: true,
      ...result
    };
  } catch (error) {
    console.error('[ScheduledJob] Error checking KPI decline alerts:', error);
    return {
      checked: false,
      totalLines: 0,
      alertsTriggered: 0,
      emailsSent: 0,
      results: [],
    };
  }
}

/**
 * Manually trigger KPI decline alert check (for testing)
 */
export async function triggerKPIDeclineCheck(): Promise<{
  checked: boolean;
  totalLines: number;
  alertsTriggered: number;
  emailsSent: number;
  results: Array<{
    productionLineId: number;
    productionLineName: string;
    cpkAlert: boolean;
    oeeAlert: boolean;
    cpkAbsoluteAlert: boolean;
    oeeAbsoluteAlert: boolean;
  }>;
}> {
  return await checkKPIDeclineAlerts();
}

/**
 * Process scheduled KPI reports
 * Checks for due reports and sends them according to configured schedule
 */
export async function processScheduledKpiReports(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  console.log('[ScheduledJob] Processing scheduled KPI reports...');
  
  try {
    const { processScheduledReports } = await import('./services/scheduledKpiReportService');
    const result = await processScheduledReports();
    
    console.log(`[ScheduledJob] KPI Reports - Processed: ${result.processed}, Sent: ${result.sent}, Failed: ${result.failed}`);
    
    return result;
  } catch (error) {
    console.error('[ScheduledJob] Error processing scheduled KPI reports:', error);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
    };
  }
}

/**
 * Manually trigger scheduled KPI reports processing (for testing)
 */
export async function triggerScheduledKpiReports(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  return await processScheduledKpiReports();
}


// ============================================================
// KPI Alert Stats Recording Job
// ============================================================

/**
 * Record KPI alerts to kpi_alert_stats table
 * Runs every 15 minutes to check for KPI violations and record them
 */
export async function recordKpiAlertStats(): Promise<{
  checked: boolean;
  alertsRecorded: number;
  notificationsSent: number;
  errors: number;
}> {
  console.log('[ScheduledJob] Recording KPI alert stats...');
  
  let alertsRecorded = 0;
  let notificationsSent = 0;
  let errors = 0;
  
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available');
      return { checked: false, alertsRecorded: 0, notificationsSent: 0, errors: 1 };
    }
    
    // Import services
    const { recordKpiAlert, sendKpiAlertPushNotification } = await import('./services/kpiAlertStatsService');
    const { checkAndSendKPIAlerts, getAllThresholds } = await import('./services/kpiAlertService');
    const { compareKPIWithPreviousWeek } = await import('./services/shiftManagerService');
    
    // Get all production lines with thresholds
    const thresholds = await getAllThresholds();
    
    // If no thresholds configured, check with default
    if (thresholds.length === 0) {
      console.log('[ScheduledJob] No custom thresholds configured, checking with defaults');
      const result = await checkAndSendKPIAlerts();
      
      if (result.cpkAlert || result.oeeAlert || result.cpkAbsoluteAlert || result.oeeAbsoluteAlert) {
        // Record the alert
        const comparison = await compareKPIWithPreviousWeek({ date: new Date() });
        
        if (result.cpkAlert) {
          const alertId = await recordKpiAlert({
            alertType: 'cpk_decline',
            severity: 'warning',
            currentValue: comparison.currentWeek.avgCpk || undefined,
            previousValue: comparison.previousWeek.avgCpk || undefined,
            changePercent: comparison.cpkChange || undefined,
            alertMessage: `CPK giảm ${comparison.cpkChange?.toFixed(2)}% so với tuần trước`,
          });
          if (alertId) {
            alertsRecorded++;
            await sendKpiAlertPushNotification(alertId);
            notificationsSent++;
          }
        }
        
        if (result.oeeAlert) {
          const alertId = await recordKpiAlert({
            alertType: 'oee_decline',
            severity: 'warning',
            currentValue: comparison.currentWeek.avgOee || undefined,
            previousValue: comparison.previousWeek.avgOee || undefined,
            changePercent: comparison.oeeChange || undefined,
            alertMessage: `OEE giảm ${comparison.oeeChange?.toFixed(2)}% so với tuần trước`,
          });
          if (alertId) {
            alertsRecorded++;
            await sendKpiAlertPushNotification(alertId);
            notificationsSent++;
          }
        }
        
        if (result.cpkAbsoluteAlert) {
          const severity = comparison.currentWeek.avgCpk !== null && comparison.currentWeek.avgCpk < result.thresholdUsed.cpkCritical ? 'critical' : 'warning';
          const alertId = await recordKpiAlert({
            alertType: severity === 'critical' ? 'cpk_below_critical' : 'cpk_below_warning',
            severity,
            currentValue: comparison.currentWeek.avgCpk || undefined,
            thresholdValue: severity === 'critical' ? result.thresholdUsed.cpkCritical : result.thresholdUsed.cpkWarning,
            alertMessage: `CPK (${comparison.currentWeek.avgCpk?.toFixed(3)}) dưới ngưỡng ${severity === 'critical' ? 'nghiêm trọng' : 'cảnh báo'}`,
          });
          if (alertId) {
            alertsRecorded++;
            await sendKpiAlertPushNotification(alertId);
            notificationsSent++;
          }
        }
        
        if (result.oeeAbsoluteAlert) {
          const severity = comparison.currentWeek.avgOee !== null && comparison.currentWeek.avgOee < result.thresholdUsed.oeeCritical ? 'critical' : 'warning';
          const alertId = await recordKpiAlert({
            alertType: severity === 'critical' ? 'oee_below_critical' : 'oee_below_warning',
            severity,
            currentValue: comparison.currentWeek.avgOee || undefined,
            thresholdValue: severity === 'critical' ? result.thresholdUsed.oeeCritical : result.thresholdUsed.oeeWarning,
            alertMessage: `OEE (${comparison.currentWeek.avgOee?.toFixed(1)}%) dưới ngưỡng ${severity === 'critical' ? 'nghiêm trọng' : 'cảnh báo'}`,
          });
          if (alertId) {
            alertsRecorded++;
            await sendKpiAlertPushNotification(alertId);
            notificationsSent++;
          }
        }
      }
    } else {
      // Check each production line with its custom threshold
      for (const threshold of thresholds) {
        try {
          const result = await checkAndSendKPIAlerts(threshold.productionLineId, undefined, threshold.config);
          
          if (result.cpkAlert || result.oeeAlert || result.cpkAbsoluteAlert || result.oeeAbsoluteAlert) {
            const comparison = await compareKPIWithPreviousWeek({
              date: new Date(),
              productionLineId: threshold.productionLineId,
            });
            
            if (result.cpkAlert) {
              const alertId = await recordKpiAlert({
                productionLineId: threshold.productionLineId,
                alertType: 'cpk_decline',
                severity: 'warning',
                currentValue: comparison.currentWeek.avgCpk || undefined,
                previousValue: comparison.previousWeek.avgCpk || undefined,
                changePercent: comparison.cpkChange || undefined,
                alertMessage: `[${threshold.productionLineName}] CPK giảm ${comparison.cpkChange?.toFixed(2)}% so với tuần trước`,
              });
              if (alertId) {
                alertsRecorded++;
                await sendKpiAlertPushNotification(alertId);
                notificationsSent++;
              }
            }
            
            if (result.oeeAlert) {
              const alertId = await recordKpiAlert({
                productionLineId: threshold.productionLineId,
                alertType: 'oee_decline',
                severity: 'warning',
                currentValue: comparison.currentWeek.avgOee || undefined,
                previousValue: comparison.previousWeek.avgOee || undefined,
                changePercent: comparison.oeeChange || undefined,
                alertMessage: `[${threshold.productionLineName}] OEE giảm ${comparison.oeeChange?.toFixed(2)}% so với tuần trước`,
              });
              if (alertId) {
                alertsRecorded++;
                await sendKpiAlertPushNotification(alertId);
                notificationsSent++;
              }
            }
            
            if (result.cpkAbsoluteAlert) {
              const severity = comparison.currentWeek.avgCpk !== null && comparison.currentWeek.avgCpk < result.thresholdUsed.cpkCritical ? 'critical' : 'warning';
              const alertId = await recordKpiAlert({
                productionLineId: threshold.productionLineId,
                alertType: severity === 'critical' ? 'cpk_below_critical' : 'cpk_below_warning',
                severity,
                currentValue: comparison.currentWeek.avgCpk || undefined,
                thresholdValue: severity === 'critical' ? result.thresholdUsed.cpkCritical : result.thresholdUsed.cpkWarning,
                alertMessage: `[${threshold.productionLineName}] CPK (${comparison.currentWeek.avgCpk?.toFixed(3)}) dưới ngưỡng ${severity === 'critical' ? 'nghiêm trọng' : 'cảnh báo'}`,
              });
              if (alertId) {
                alertsRecorded++;
                await sendKpiAlertPushNotification(alertId);
                notificationsSent++;
              }
            }
            
            if (result.oeeAbsoluteAlert) {
              const severity = comparison.currentWeek.avgOee !== null && comparison.currentWeek.avgOee < result.thresholdUsed.oeeCritical ? 'critical' : 'warning';
              const alertId = await recordKpiAlert({
                productionLineId: threshold.productionLineId,
                alertType: severity === 'critical' ? 'oee_below_critical' : 'oee_below_warning',
                severity,
                currentValue: comparison.currentWeek.avgOee || undefined,
                thresholdValue: severity === 'critical' ? result.thresholdUsed.oeeCritical : result.thresholdUsed.oeeWarning,
                alertMessage: `[${threshold.productionLineName}] OEE (${comparison.currentWeek.avgOee?.toFixed(1)}%) dưới ngưỡng ${severity === 'critical' ? 'nghiêm trọng' : 'cảnh báo'}`,
              });
              if (alertId) {
                alertsRecorded++;
                await sendKpiAlertPushNotification(alertId);
                notificationsSent++;
              }
            }
          }
        } catch (lineError) {
          console.error(`[ScheduledJob] Error checking line ${threshold.productionLineName}:`, lineError);
          errors++;
        }
      }
    }
    
    console.log(`[ScheduledJob] KPI alert stats recorded: ${alertsRecorded}, notifications sent: ${notificationsSent}, errors: ${errors}`);
    
    return {
      checked: true,
      alertsRecorded,
      notificationsSent,
      errors,
    };
  } catch (error) {
    console.error('[ScheduledJob] Error recording KPI alert stats:', error);
    return {
      checked: false,
      alertsRecorded,
      notificationsSent,
      errors: errors + 1,
    };
  }
}

/**
 * Manually trigger KPI alert stats recording (for testing)
 */
export async function triggerRecordKpiAlertStats(): Promise<{
  checked: boolean;
  alertsRecorded: number;
  notificationsSent: number;
  errors: number;
}> {
  return await recordKpiAlertStats();
}

// Schedule KPI alert stats recording - runs every 15 minutes
cron.schedule('0 */15 * * * *', async () => {
  console.log('[ScheduledJob] Triggered: KPI alert stats recording');
  await recordKpiAlertStats();
}, {
  timezone: 'Asia/Ho_Chi_Minh'
});

console.log('[ScheduledJob] Scheduled: KPI alert stats recording every 15 minutes (Asia/Ho_Chi_Minh)');


/**
 * Check for performance drop alerts
 */
async function checkPerformanceDropAlerts(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[ScheduledJob] Database not available for performance drop check');
      return;
    }
    
    // Import the performance drop alert service
    const { checkPerformanceDrops } = await import('./services/performanceDropAlertService');
    
    const result = await checkPerformanceDrops();
    
    console.log(`[ScheduledJob] Performance drop check completed: ${result.alertsFound} alerts found`);
    
    if (result.alertsFound > 0) {
      // Notify owner about new alerts
      await notifyOwner({
        title: '⚠️ Cảnh báo hiệu suất giảm đột ngột',
        content: `Phát hiện ${result.alertsFound} cảnh báo hiệu suất giảm trên các dây chuyền sản xuất. Vui lòng kiểm tra trong hệ thống.`,
      });
    }
  } catch (error) {
    console.error('[ScheduledJob] Error checking performance drops:', error);
  }
}

/**
 * Manually trigger performance drop check (for testing)
 */
export async function triggerPerformanceDropCheck(): Promise<{ alertsFound: number }> {
  try {
    const { checkPerformanceDrops } = await import('./services/performanceDropAlertService');
    return await checkPerformanceDrops();
  } catch (error) {
    console.error('[ScheduledJob] Error triggering performance drop check:', error);
    return { alertsFound: 0 };
  }
}


/**
 * Manually trigger weekly accuracy report (for testing)
 */
export async function triggerWeeklyAccuracyReportJob(): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  message: string;
}> {
  return await triggerWeeklyAccuracyReport();
}
