/**
 * Scheduled Jobs Module
 * Handles automated tasks like license expiry checks
 */

import cron from 'node-cron';
import { getLicensesExpiringSoon, getExpiredLicenses } from './db';
import { triggerWebhooks } from './webhookService';
import { notifyOwner } from './_core/notification';
import { processWebhookRetries, getRetryStats } from './webhookService';
import { sendEmail } from './emailService';

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
