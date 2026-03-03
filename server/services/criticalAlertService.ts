/**
 * Critical Alert Service
 * Gửi cảnh báo nghiêm trọng qua Email và Telegram
 */

import { getDb } from '../db';
import { notificationPreferences, userNotifications, users } from '../../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendTelegramAlert, AlertType } from './telegramService';
import { sendEmail, getSmtpConfig } from '../emailService';
import { sendSseEvent } from '../sse';

export interface CriticalAlertData {
  type: 'cpk_critical' | 'spc_violation' | 'system_error' | 'iot_critical';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  details?: {
    cpk?: number;
    threshold?: number;
    productCode?: string;
    stationName?: string;
    planName?: string;
    lineName?: string;
    machineName?: string;
    ruleName?: string;
    value?: number;
    [key: string]: any;
  };
  userId?: number; // Specific user to notify, or null for all admins
}

export interface AlertResult {
  success: boolean;
  emailSent: number;
  telegramSent: number;
  pushSent: number;
  errors: string[];
}

/**
 * Lấy danh sách users cần thông báo dựa trên severity
 */
async function getUsersToNotify(
  severity: 'warning' | 'critical',
  specificUserId?: number
): Promise<{ id: number; email: string; telegramChatId?: string; emailEnabled: boolean; telegramEnabled: boolean }[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Nếu có specificUserId, chỉ lấy user đó
    if (specificUserId) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, specificUserId));

      if (!user) return [];

      // Lấy notification preferences
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, specificUserId));

      return [{
        id: user.id,
        email: user.email || '',
        telegramChatId: prefs?.telegramChatId || undefined,
        emailEnabled: prefs?.emailEnabled === 1,
        telegramEnabled: prefs?.telegramEnabled === 1,
      }];
    }

    // Lấy tất cả admin users
    const adminUsers = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'admin'));

    if (adminUsers.length === 0) return [];

    // Lấy notification preferences cho các admin
    const userIds = adminUsers.map(u => u.id);
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(inArray(notificationPreferences.userId, userIds));

    const prefsMap = new Map(prefs.map(p => [p.userId, p]));

    return adminUsers.map(user => {
      const pref = prefsMap.get(user.id);
      
      // Kiểm tra severity filter
      if (pref?.severityFilter === 'critical_only' && severity !== 'critical') {
        return null;
      }
      if (pref?.severityFilter === 'warning_up' && severity === 'warning') {
        // warning_up means warning and above, so include warning
      }

      return {
        id: user.id,
        email: user.email || '',
        telegramChatId: pref?.telegramChatId || undefined,
        emailEnabled: pref?.emailEnabled === 1 ?? true,
        telegramEnabled: pref?.telegramEnabled === 1 ?? false,
      };
    }).filter((u): u is NonNullable<typeof u> => u !== null);
  } catch (error) {
    console.error('[CriticalAlert] Error getting users to notify:', error);
    return [];
  }
}

/**
 * Tạo HTML email cho critical alert
 */
function generateCriticalAlertEmail(data: CriticalAlertData): { subject: string; html: string } {
  const severityColor = data.severity === 'critical' ? '#dc2626' : '#f59e0b';
  const severityLabel = data.severity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO';
  const severityEmoji = data.severity === 'critical' ? '🚨' : '⚠️';

  const subject = `${severityEmoji} [${severityLabel}] ${data.title}`;

  const detailsHtml = data.details ? Object.entries(data.details)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const labels: Record<string, string> = {
        cpk: 'CPK',
        threshold: 'Ngưỡng',
        productCode: 'Mã sản phẩm',
        stationName: 'Trạm',
        planName: 'Kế hoạch',
        lineName: 'Dây chuyền',
        machineName: 'Máy',
        ruleName: 'Rule vi phạm',
        value: 'Giá trị',
      };
      const label = labels[key] || key;
      const displayValue = typeof value === 'number' ? value.toFixed(3) : String(value);
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${displayValue}</td></tr>`;
    }).join('') : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, ${severityColor} 0%, ${data.severity === 'critical' ? '#b91c1c' : '#d97706'} 100%); color: white; padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">${severityEmoji}</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${severityLabel}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${data.title}</p>
    </div>
    
    <div style="background: white; padding: 25px; border: 1px solid #e5e7eb; border-top: none;">
      <div style="background: ${data.severity === 'critical' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${data.severity === 'critical' ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <p style="margin: 0; color: ${severityColor}; font-weight: 600;">${data.message}</p>
      </div>
      
      ${detailsHtml ? `
      <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Chi tiết:</h3>
      <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
        ${detailsHtml}
      </table>
      ` : ''}
      
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 12px;">
        Thời gian: ${new Date().toLocaleString('vi-VN')}
      </p>
    </div>
    
    <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px;">
      <p style="margin: 0;">Hệ thống CPK/SPC Calculator</p>
      <p style="margin: 5px 0 0 0; opacity: 0.7;">Đây là email tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * Gửi critical alert qua tất cả các kênh
 */
export async function sendCriticalAlert(data: CriticalAlertData): Promise<AlertResult> {
  const result: AlertResult = {
    success: false,
    emailSent: 0,
    telegramSent: 0,
    pushSent: 0,
    errors: [],
  };

  try {
    // Lấy danh sách users cần thông báo
    const usersToNotify = await getUsersToNotify(data.severity, data.userId);
    
    if (usersToNotify.length === 0) {
      result.errors.push('No users to notify');
      return result;
    }

    // 1. Gửi Email
    const smtpConfig = await getSmtpConfig();
    if (smtpConfig) {
      const emailUsers = usersToNotify.filter(u => u.emailEnabled && u.email);
      if (emailUsers.length > 0) {
        const { subject, html } = generateCriticalAlertEmail(data);
        const emails = emailUsers.map(u => u.email);
        
        try {
          await sendEmail(emails, subject, html);
          result.emailSent = emails.length;
        } catch (emailError) {
          result.errors.push(`Email error: ${emailError}`);
        }
      }
    }

    // 2. Gửi Telegram
    const telegramUsers = usersToNotify.filter(u => u.telegramEnabled && u.telegramChatId);
    if (telegramUsers.length > 0) {
      // Map alert type to Telegram alert type
      const telegramAlertType: AlertType = data.type === 'cpk_critical' ? 'cpk_alert' : 
                                            data.type === 'spc_violation' ? 'spc_violation' :
                                            data.type === 'iot_critical' ? 'iot_critical' : 'system_error';
      
      try {
        const telegramResult = await sendTelegramAlert(telegramAlertType, {
          ...data.details,
          message: data.message,
          title: data.title,
        });
        result.telegramSent = telegramResult.sent;
        if (telegramResult.errors.length > 0) {
          result.errors.push(...telegramResult.errors.map(e => `Telegram: ${e}`));
        }
      } catch (telegramError) {
        result.errors.push(`Telegram error: ${telegramError}`);
      }
    }

    // 3. Gửi Push notification (SSE)
    for (const user of usersToNotify) {
      try {
        sendSseEvent('critical_alert', {
          userId: user.id,
          type: data.type,
          severity: data.severity,
          title: data.title,
          message: data.message,
          details: data.details,
          timestamp: new Date().toISOString(),
        });
        result.pushSent++;
      } catch (pushError) {
        result.errors.push(`Push error for user ${user.id}: ${pushError}`);
      }
    }

    // 4. Lưu notification vào database
    const db = await getDb();
    if (db) {
      for (const user of usersToNotify) {
        try {
          await db.insert(userNotifications).values({
            userId: user.id,
            type: data.type === 'cpk_critical' ? 'cpk_alert' : 
                  data.type === 'spc_violation' ? 'spc_violation' : 'system',
            severity: data.severity,
            title: data.title,
            message: data.message,
            metadata: JSON.stringify(data.details || {}),
            isRead: 0,
          });
        } catch (dbError) {
          console.error(`[CriticalAlert] Error saving notification for user ${user.id}:`, dbError);
        }
      }
    }

    result.success = result.emailSent > 0 || result.telegramSent > 0 || result.pushSent > 0;
    
    console.log(`[CriticalAlert] Sent: Email=${result.emailSent}, Telegram=${result.telegramSent}, Push=${result.pushSent}`);
    
    return result;
  } catch (error) {
    console.error('[CriticalAlert] Error sending critical alert:', error);
    result.errors.push(String(error));
    return result;
  }
}

/**
 * Gửi CPK critical alert
 */
export async function sendCpkCriticalAlert(
  cpkValue: number,
  threshold: number,
  planName: string,
  productCode?: string,
  stationName?: string,
  userId?: number
): Promise<AlertResult> {
  const severity = cpkValue < 1.0 ? 'critical' : 'warning';
  
  return sendCriticalAlert({
    type: 'cpk_critical',
    severity,
    title: `CPK ${severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}: ${planName}`,
    message: `CPK = ${cpkValue.toFixed(3)} ${severity === 'critical' ? '< 1.0' : `< ${threshold}`}. ${
      severity === 'critical' 
        ? 'Quy trình không đạt yêu cầu, cần can thiệp ngay!' 
        : 'Cần cải thiện quy trình sản xuất.'
    }`,
    details: {
      cpk: cpkValue,
      threshold,
      planName,
      productCode,
      stationName,
    },
    userId,
  });
}

/**
 * Gửi SPC violation alert
 */
export async function sendSpcViolationAlert(
  ruleName: string,
  ruleCode: string,
  value: number,
  planName: string,
  lineName?: string,
  machineName?: string,
  userId?: number
): Promise<AlertResult> {
  // Rule 1 và 2 là critical
  const severity = ruleCode.startsWith('R1') || ruleCode.startsWith('R2') ? 'critical' : 'warning';
  
  return sendCriticalAlert({
    type: 'spc_violation',
    severity,
    title: `Vi phạm SPC Rule: ${ruleCode}`,
    message: `Kế hoạch "${planName}" phát hiện vi phạm ${ruleName}. Giá trị: ${value.toFixed(4)}`,
    details: {
      ruleName,
      value,
      planName,
      lineName,
      machineName,
    },
    userId,
  });
}

export default {
  sendCriticalAlert,
  sendCpkCriticalAlert,
  sendSpcViolationAlert,
};
