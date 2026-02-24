/**
 * AI Vision Notification Service
 * Gửi cảnh báo email/Telegram khi AI Vision phát hiện lỗi nghiêm trọng
 */

import { sendEmail } from '../emailService';
import telegramService from './telegramService';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

export interface AiVisionAlertData {
  analysisId: string;
  imageUrl: string;
  status: 'pass' | 'fail' | 'warning';
  qualityScore: number;
  defectCount: number;
  defects: Array<{
    type: string;
    severity: string;
    description?: string;
    confidence?: number;
  }>;
  summary?: string;
  recommendations?: string[];
  productType?: string;
  inspectionStandard?: string;
  machineId?: number;
  machineName?: string;
  productId?: number;
  productName?: string;
  serialNumber?: string;
  analyzedAt?: Date;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  emailRecipients: string[];
  telegramEnabled: boolean;
  severityThreshold: number; // 1-10, chỉ gửi khi severity >= threshold
  notifyOnFail: boolean;
  notifyOnWarning: boolean;
  notifyOnCriticalDefects: boolean;
}

/**
 * Kiểm tra xem có cần gửi notification không
 */
function shouldSendNotification(data: AiVisionAlertData, config: NotificationConfig): boolean {
  // Kiểm tra status
  if (data.status === 'fail' && config.notifyOnFail) return true;
  if (data.status === 'warning' && config.notifyOnWarning) return true;
  
  // Kiểm tra critical defects
  if (config.notifyOnCriticalDefects) {
    const hasCritical = data.defects.some(d => 
      d.severity === 'critical' || d.severity === 'high'
    );
    if (hasCritical) return true;
  }
  
  // Kiểm tra quality score thấp
  if (data.qualityScore < 50) return true;
  
  return false;
}

/**
 * Tạo nội dung email HTML cho AI Vision alert
 */
function generateEmailHtml(data: AiVisionAlertData): { subject: string; html: string } {
  const statusColors = {
    pass: '#22c55e',
    fail: '#ef4444',
    warning: '#eab308',
  };
  
  const statusLabels = {
    pass: 'Đạt',
    fail: 'Lỗi',
    warning: 'Cảnh báo',
  };
  
  const severityColors: Record<string, string> = {
    low: '#3b82f6',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
  };
  
  const defectsHtml = data.defects.map(d => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${d.type}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">
        <span style="background: ${severityColors[d.severity] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
          ${d.severity}
        </span>
      </td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${d.description || '-'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${d.confidence ? (d.confidence * 100).toFixed(0) + '%' : '-'}</td>
    </tr>
  `).join('');
  
  const subject = `[AI Vision Alert] ${statusLabels[data.status]} - ${data.defectCount} lỗi phát hiện - ${data.analysisId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${statusColors[data.status]} 0%, ${statusColors[data.status]}dd 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .metric { display: inline-block; background: white; padding: 10px 15px; margin: 5px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .metric-label { font-size: 12px; color: #6b7280; }
    .metric-value { font-size: 18px; font-weight: bold; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
    .image-preview { max-width: 300px; border-radius: 8px; margin: 15px 0; }
    .summary-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔍 AI Vision Analysis Alert</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Kết quả: ${statusLabels[data.status]} | ID: ${data.analysisId}</p>
    </div>
    
    <div class="content">
      <h2>📊 Thông tin phân tích</h2>
      
      <div style="margin: 15px 0;">
        <div class="metric">
          <div class="metric-label">Trạng thái</div>
          <div class="metric-value" style="color: ${statusColors[data.status]};">${statusLabels[data.status]}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Điểm chất lượng</div>
          <div class="metric-value">${data.qualityScore}/100</div>
        </div>
        <div class="metric">
          <div class="metric-label">Số lỗi</div>
          <div class="metric-value">${data.defectCount}</div>
        </div>
      </div>
      
      <div style="margin: 15px 0;">
        <p><strong>📦 Loại sản phẩm:</strong> ${data.productType || 'Chung'}</p>
        <p><strong>📋 Tiêu chuẩn:</strong> ${data.inspectionStandard || 'IPC-A-610'}</p>
        ${data.machineName ? `<p><strong>🏢 Máy:</strong> ${data.machineName}</p>` : ''}
        ${data.serialNumber ? `<p><strong>🔢 Serial:</strong> ${data.serialNumber}</p>` : ''}
        <p><strong>⏰ Thời gian:</strong> ${data.analyzedAt ? new Date(data.analyzedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}</p>
      </div>
      
      ${data.imageUrl ? `
        <div style="margin: 15px 0;">
          <h3>📷 Hình ảnh phân tích</h3>
          <img src="${data.imageUrl}" alt="Analyzed image" class="image-preview" />
        </div>
      ` : ''}
      
      ${data.defects.length > 0 ? `
        <h3>⚠️ Chi tiết lỗi phát hiện</h3>
        <table>
          <thead>
            <tr>
              <th>Loại lỗi</th>
              <th>Mức độ</th>
              <th>Mô tả</th>
              <th>Độ tin cậy</th>
            </tr>
          </thead>
          <tbody>
            ${defectsHtml}
          </tbody>
        </table>
      ` : ''}
      
      ${data.summary ? `
        <div class="summary-box">
          <h3 style="margin-top: 0;">📝 Tóm tắt</h3>
          <p>${data.summary}</p>
        </div>
      ` : ''}
      
      ${data.recommendations && data.recommendations.length > 0 ? `
        <h3>💡 Khuyến nghị</h3>
        <ul>
          ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Đây là email tự động từ hệ thống AI Vision Analysis</p>
      <p>© ${new Date().getFullYear()} CPK/SPC Calculator</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

/**
 * Gửi email notification cho AI Vision alert
 */
export async function sendAiVisionEmailAlert(
  data: AiVisionAlertData,
  recipients: string[]
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    if (recipients.length === 0) {
      return { success: false, sentCount: 0, error: 'No recipients' };
    }
    
    const { subject, html } = generateEmailHtml(data);
    const result = await sendEmail(recipients, subject, html);
    
    console.log(`[AI Vision Email] Sent alert to ${result.sentCount || 0} recipients`);
    return { success: result.success, sentCount: result.sentCount || 0 };
  } catch (error) {
    console.error('[AI Vision Email] Error sending alert:', error);
    return { success: false, sentCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gửi Telegram notification cho AI Vision alert
 */
export async function sendAiVisionTelegramAlert(
  data: AiVisionAlertData
): Promise<{ sent: number; failed: number; errors: string[] }> {
  try {
    const result = await telegramService.sendTelegramAlert('ai_vision_critical', {
      analysisId: data.analysisId,
      productType: data.productType,
      machineName: data.machineName,
      qualityScore: data.qualityScore,
      defectCount: data.defectCount,
      defects: data.defects,
      summary: data.summary,
    });
    
    console.log(`[AI Vision Telegram] Sent: ${result.sent}, Failed: ${result.failed}`);
    return result;
  } catch (error) {
    console.error('[AI Vision Telegram] Error sending alert:', error);
    return { sent: 0, failed: 1, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
}

/**
 * Gửi tất cả notifications cho AI Vision alert
 */
export async function sendAiVisionNotifications(
  data: AiVisionAlertData,
  config?: Partial<NotificationConfig>
): Promise<{
  emailSent: number;
  telegramSent: number;
  errors: string[];
}> {
  const result = {
    emailSent: 0,
    telegramSent: 0,
    errors: [] as string[],
  };
  
  // Default config
  const defaultConfig: NotificationConfig = {
    emailEnabled: true,
    emailRecipients: [],
    telegramEnabled: true,
    severityThreshold: 7,
    notifyOnFail: true,
    notifyOnWarning: false,
    notifyOnCriticalDefects: true,
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Check if should send
  if (!shouldSendNotification(data, finalConfig)) {
    console.log('[AI Vision Notification] Skipped - does not meet criteria');
    return result;
  }
  
  // Get email recipients from database if not provided
  let emailRecipients = finalConfig.emailRecipients;
  if (emailRecipients.length === 0) {
    try {
      const db = await getDb();
      if (db) {
        const settings = await db.execute(sql`
          SELECT email FROM email_notification_settings 
          WHERE notify_on_spc_violation = 1 OR notify_on_cpk_violation = 1
        `);
        emailRecipients = ((settings as any)[0] || []).map((s: any) => s.email).filter(Boolean);
      }
    } catch (error) {
      console.error('[AI Vision Notification] Error getting email recipients:', error);
    }
  }
  
  // Send email
  if (finalConfig.emailEnabled && emailRecipients.length > 0) {
    const emailResult = await sendAiVisionEmailAlert(data, emailRecipients);
    result.emailSent = emailResult.sentCount;
    if (emailResult.error) {
      result.errors.push(`Email: ${emailResult.error}`);
    }
  }
  
  // Send Telegram
  if (finalConfig.telegramEnabled) {
    const telegramResult = await sendAiVisionTelegramAlert(data);
    result.telegramSent = telegramResult.sent;
    if (telegramResult.errors.length > 0) {
      result.errors.push(...telegramResult.errors.map(e => `Telegram: ${e}`));
    }
  }
  
  console.log(`[AI Vision Notification] Email: ${result.emailSent}, Telegram: ${result.telegramSent}`);
  return result;
}

export default {
  sendAiVisionEmailAlert,
  sendAiVisionTelegramAlert,
  sendAiVisionNotifications,
};
