/**
 * Email Service for SPC/CPK Calculator
 * Handles sending email notifications for SPC violations
 */

import { getDb } from "./db";
import { smtpConfig, emailNotificationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

// Email template types
export type EmailType = "spc_violation" | "cpk_warning" | "ca_violation" | "daily_report" | "oee_alert" | "maintenance_alert" | "predictive_alert" | "approval_request" | "approval_result";

// Approval notification types
export interface ApprovalRequestEmailData {
  entityType: string;
  entityId: number;
  entityLabel: string;
  requesterName: string;
  requesterEmail?: string;
  totalAmount?: number;
  notes?: string;
  approverName?: string;
  approverEmail: string;
  stepName?: string;
  systemUrl?: string;
}

export interface ApprovalResultEmailData {
  entityType: string;
  entityId: number;
  entityLabel: string;
  requesterName: string;
  requesterEmail: string;
  action: "approved" | "rejected" | "returned";
  approverName: string;
  comments?: string;
  totalAmount?: number;
  systemUrl?: string;
}

export interface SpcViolationEmailData {
  productCode: string;
  stationName: string;
  violationType: string;
  violationDetails: string;
  currentValue: number;
  ucl: number;
  lcl: number;
  timestamp: Date;
}

export interface CpkWarningEmailData {
  productCode: string;
  stationName: string;
  cpkValue: number;
  threshold: number;
  recommendation?: string;
  timestamp?: Date;
  mean?: number;
  stdDev?: number;
  sampleCount?: number;
  analyzedAt?: Date;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Get SMTP configuration from database
 */
export async function getSmtpConfig(): Promise<SmtpSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const configs = await db.select().from(smtpConfig).limit(1);
  if (configs.length === 0) return null;

  const config = configs[0];
  return {
    host: config.host,
    port: config.port,
    secure: config.secure === 1,
    username: config.username,
    password: config.password,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
  };
}

/**
 * Save SMTP configuration to database
 */
export async function saveSmtpConfig(settings: SmtpSettings): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(smtpConfig).limit(1);
  
  const data = {
    host: settings.host,
    port: settings.port,
    secure: settings.secure ? 1 : 0,
    username: settings.username,
    password: settings.password,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
  };

  if (existing.length > 0) {
    await db.update(smtpConfig).set(data).where(eq(smtpConfig.id, existing[0].id));
  } else {
    await db.insert(smtpConfig).values(data);
  }
}

/**
 * Generate HTML email content for SPC violation
 */
function generateSpcViolationEmail(data: SpcViolationEmailData): { subject: string; html: string } {
  const subject = `[SPC Alert] Vi phạm ${data.violationType} - ${data.productCode} @ ${data.stationName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .metric { display: inline-block; background: white; padding: 10px 15px; margin: 5px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .metric-label { font-size: 12px; color: #6b7280; }
    .metric-value { font-size: 18px; font-weight: bold; color: #111827; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0; }
    .alert-title { color: #dc2626; font-weight: bold; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ Cảnh báo SPC</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Phát hiện vi phạm quy tắc kiểm soát thống kê</p>
    </div>
    <div class="content">
      <h2 style="color: #111827; margin-top: 0;">Chi tiết vi phạm</h2>
      
      <div class="alert-box">
        <div class="alert-title">${data.violationType}</div>
        <div>${data.violationDetails}</div>
      </div>
      
      <p><strong>Sản phẩm:</strong> ${data.productCode}</p>
      <p><strong>Trạm:</strong> ${data.stationName}</p>
      <p><strong>Thời gian:</strong> ${data.timestamp.toLocaleString('vi-VN')}</p>
      
      <div style="margin: 20px 0;">
        <div class="metric">
          <div class="metric-label">Giá trị hiện tại</div>
          <div class="metric-value" style="color: #dc2626;">${data.currentValue.toFixed(4)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">UCL</div>
          <div class="metric-value">${data.ucl.toFixed(4)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">LCL</div>
          <div class="metric-value">${data.lcl.toFixed(4)}</div>
        </div>
      </div>
      
      <p style="margin-top: 20px;">
        <strong>Khuyến nghị:</strong> Kiểm tra quy trình sản xuất và thực hiện các biện pháp khắc phục kịp thời.
      </p>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống SPC/CPK Calculator</p>
      <p>© ${new Date().getFullYear()} SPC/CPK Calculator. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Generate HTML email content for CPK warning
 */
function generateCpkWarningEmail(data: CpkWarningEmailData): { subject: string; html: string } {
  const subject = `[CPK Alert] Chỉ số CPK thấp - ${data.productCode} @ ${data.stationName}`;
  
  const cpkColor = data.cpkValue < 1.0 ? '#dc2626' : data.cpkValue < 1.33 ? '#f59e0b' : '#10b981';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .cpk-display { text-align: center; padding: 30px; background: white; border-radius: 8px; margin: 20px 0; }
    .cpk-value { font-size: 48px; font-weight: bold; }
    .cpk-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .recommendation { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Cảnh báo CPK</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Chỉ số năng lực quy trình dưới ngưỡng</p>
    </div>
    <div class="content">
      <p><strong>Sản phẩm:</strong> ${data.productCode}</p>
      <p><strong>Trạm:</strong> ${data.stationName}</p>
      <p><strong>Thời gian:</strong> ${(data.timestamp || data.analyzedAt || new Date()).toLocaleString('vi-VN')}</p>
      
      <div class="cpk-display">
        <div class="cpk-value" style="color: ${cpkColor};">${data.cpkValue.toFixed(2)}</div>
        <div class="cpk-label">Chỉ số CPK (Ngưỡng: ${data.threshold})</div>
      </div>
      
      <div class="recommendation">
        <strong>💡 Khuyến nghị:</strong>
        <p style="margin: 5px 0 0 0;">${data.recommendation}</p>
      </div>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống SPC/CPK Calculator</p>
      <p>© ${new Date().getFullYear()} SPC/CPK Calculator. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Send email using configured SMTP with nodemailer
 */
/**
 * Parse email list from comma-separated string
 */
export function parseEmailList(emailString: string): string[] {
  return emailString
    .split(',')
    .map(e => e.trim())
    .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  // Support both single email and array of emails
  const recipients = Array.isArray(to) ? to : parseEmailList(to);
  
  if (recipients.length === 0) {
    console.warn("[Email] No valid recipients provided");
    return { success: false, error: "No valid recipients", sentCount: 0 };
  }
  const smtpSettings = await getSmtpConfig();
  
  if (!smtpSettings) {
    console.warn("[Email] SMTP not configured, email not sent");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    console.log(`[Email] Sending email to: ${recipients.join(', ')}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] Using SMTP: ${smtpSettings.host}:${smtpSettings.port}`);
    
    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure, // true for 465, false for other ports
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      // Allow self-signed certificates for internal SMTP servers
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email to all recipients
    let sentCount = 0;
    const errors: string[] = [];
    
    for (const recipient of recipients) {
      try {
        const info = await transporter.sendMail({
          from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
          to: recipient,
          subject,
          html,
        });
        console.log(`[Email] Email sent to ${recipient}. Message ID: ${info.messageId}`);
        sentCount++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Email] Failed to send to ${recipient}: ${errMsg}`);
        errors.push(`${recipient}: ${errMsg}`);
      }
    }

    console.log(`[Email] Sent ${sentCount}/${recipients.length} emails successfully`);
    return { 
      success: sentCount > 0, 
      sentCount,
      error: errors.length > 0 ? errors.join('; ') : undefined 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Email] Failed to send email: ${errorMessage}`);
    return { success: false, error: errorMessage, sentCount: 0 };
  }
}

/**
 * Send SPC violation notification to configured users
 */
export async function notifySpcViolation(data: SpcViolationEmailData): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get users who want SPC violation notifications
  const settings = await db.select().from(emailNotificationSettings)
    .where(eq(emailNotificationSettings.notifyOnSpcViolation, 1));

  const { subject, html } = generateSpcViolationEmail(data);

  for (const setting of settings) {
    await sendEmail(setting.email, subject, html);
  }

  console.log(`[Email] Sent SPC violation notification to ${settings.length} users`);
}

/**
 * Send CPK warning notification to configured users
 */
export async function notifyCpkWarning(data: CpkWarningEmailData): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get users who want CPK violation notifications
  const settings = await db.select().from(emailNotificationSettings)
    .where(eq(emailNotificationSettings.notifyOnCpkViolation, 1));

  const { subject, html } = generateCpkWarningEmail(data);

  for (const setting of settings) {
    // Check if CPK is below user's threshold
    if (data.cpkValue < (setting.cpkThreshold || 1.33)) {
      await sendEmail(setting.email, subject, html);
    }
  }

  console.log(`[Email] Sent CPK warning notification`);
}

/**
 * OEE Alert Email Data
 */
export interface OeeAlertEmailData {
  machineName: string;
  machineCode: string;
  oeeValue: number;
  threshold: number;
  availability: number;
  performance: number;
  quality: number;
  timestamp: Date;
}

/**
 * Maintenance Alert Email Data
 */
export interface MaintenanceAlertEmailData {
  workOrderTitle: string;
  machineName: string;
  alertType: "overdue" | "upcoming" | "critical";
  scheduledDate: Date;
  priority: string;
  technicianName?: string;
}

/**
 * Predictive Maintenance Alert Email Data
 */
export interface PredictiveAlertEmailData {
  machineName: string;
  machineCode: string;
  predictionType: string;
  probability: number;
  estimatedFailureDate: Date;
  recommendation: string;
}

/**
 * Generate HTML email for OEE Alert
 */
function generateOeeAlertEmail(data: OeeAlertEmailData): { subject: string; html: string } {
  const subject = `[⚠️ OEE Alert] ${data.machineName} - OEE ${data.oeeValue.toFixed(1)}% (dưới ngưỡng ${data.threshold}%)`;
  
  const oeeColor = data.oeeValue < 60 ? '#dc2626' : data.oeeValue < 75 ? '#f59e0b' : '#10b981';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .oee-display { text-align: center; padding: 30px; background: white; border-radius: 8px; margin: 20px 0; }
    .oee-value { font-size: 48px; font-weight: bold; }
    .metrics { display: flex; justify-content: space-around; margin: 20px 0; }
    .metric { text-align: center; padding: 15px; background: white; border-radius: 8px; flex: 1; margin: 0 5px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .metric-label { font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📊 Cảnh báo OEE</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Hiệu suất thiết bị dưới ngưỡng cho phép</p>
    </div>
    <div class="content">
      <p><strong>Thiết bị:</strong> ${data.machineName} (${data.machineCode})</p>
      <p><strong>Thời gian:</strong> ${data.timestamp.toLocaleString('vi-VN')}</p>
      
      <div class="oee-display">
        <div class="oee-value" style="color: ${oeeColor};">${data.oeeValue.toFixed(1)}%</div>
        <div style="color: #6b7280; margin-top: 5px;">OEE (Ngưỡng: ${data.threshold}%)</div>
      </div>
      
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${data.availability.toFixed(1)}%</div>
          <div class="metric-label">Availability</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.performance.toFixed(1)}%</div>
          <div class="metric-label">Performance</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.quality.toFixed(1)}%</div>
          <div class="metric-label">Quality</div>
        </div>
      </div>
      
      <p style="background: #fef3c7; padding: 15px; border-radius: 8px;">
        <strong>💡 Khuyến nghị:</strong> Kiểm tra thiết bị và quy trình sản xuất để xác định nguyên nhân và cải thiện hiệu suất.
      </p>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống MMS</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Generate HTML email for Maintenance Alert
 */
function generateMaintenanceAlertEmail(data: MaintenanceAlertEmailData): { subject: string; html: string } {
  const alertTypeText = data.alertType === "overdue" ? "Quá hạn" : 
                        data.alertType === "upcoming" ? "Sắp đến" : "Khẩn cấp";
  const alertColor = data.alertType === "overdue" ? '#dc2626' : 
                     data.alertType === "critical" ? '#dc2626' : '#f59e0b';
  
  const subject = `[🔧 Bảo trì ${alertTypeText}] ${data.workOrderTitle} - ${data.machineName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${alertColor} 0%, ${alertColor}dd 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${alertColor}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔧 Cảnh báo Bảo trì</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Công việc bảo trì ${alertTypeText.toLowerCase()}</p>
    </div>
    <div class="content">
      <div class="info-box">
        <h3 style="margin: 0 0 10px 0;">${data.workOrderTitle}</h3>
        <p style="margin: 5px 0;"><strong>Thiết bị:</strong> ${data.machineName}</p>
        <p style="margin: 5px 0;"><strong>Ngày dự kiến:</strong> ${data.scheduledDate.toLocaleDateString('vi-VN')}</p>
        <p style="margin: 5px 0;"><strong>Độ ưu tiên:</strong> ${data.priority}</p>
        ${data.technicianName ? `<p style="margin: 5px 0;"><strong>Kỹ thuật viên:</strong> ${data.technicianName}</p>` : ''}
      </div>
      
      <p style="background: #fef3c7; padding: 15px; border-radius: 8px;">
        <strong>⚠️ Lưu ý:</strong> Vui lòng kiểm tra và thực hiện công việc bảo trì đúng hạn để đảm bảo thiết bị hoạt động ổn định.
      </p>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống MMS</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Generate HTML email for Predictive Maintenance Alert
 */
function generatePredictiveAlertEmail(data: PredictiveAlertEmailData): { subject: string; html: string } {
  const subject = `[🔮 Dự đoán] ${data.machineName} - ${data.predictionType} (${data.probability.toFixed(0)}% xác suất)`;
  
  const probColor = data.probability > 80 ? '#dc2626' : data.probability > 50 ? '#f59e0b' : '#10b981';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
    .prob-display { text-align: center; padding: 30px; background: white; border-radius: 8px; margin: 20px 0; }
    .prob-value { font-size: 48px; font-weight: bold; }
    .recommendation { background: #f3e8ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔮 Dự đoán Bảo trì</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Phát hiện nguy cơ hỏng hóc tiềm ẩn</p>
    </div>
    <div class="content">
      <p><strong>Thiết bị:</strong> ${data.machineName} (${data.machineCode})</p>
      <p><strong>Loại dự đoán:</strong> ${data.predictionType}</p>
      <p><strong>Ngày dự kiến hỏng:</strong> ${data.estimatedFailureDate.toLocaleDateString('vi-VN')}</p>
      
      <div class="prob-display">
        <div class="prob-value" style="color: ${probColor};">${data.probability.toFixed(0)}%</div>
        <div style="color: #6b7280; margin-top: 5px;">Xác suất hỏng hóc</div>
      </div>
      
      <div class="recommendation">
        <strong>💡 Khuyến nghị:</strong>
        <p style="margin: 5px 0 0 0;">${data.recommendation}</p>
      </div>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống MMS</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Send OEE alert notification
 */
export async function notifyOeeAlert(data: OeeAlertEmailData, recipients: string[]): Promise<{ success: boolean; sentCount: number }> {
  const { subject, html } = generateOeeAlertEmail(data);
  const result = await sendEmail(recipients, subject, html);
  console.log(`[Email] Sent OEE alert notification to ${result.sentCount || 0} recipients`);
  return { success: result.success, sentCount: result.sentCount || 0 };
}

/**
 * Send Maintenance alert notification
 */
export async function notifyMaintenanceAlert(data: MaintenanceAlertEmailData, recipients: string[]): Promise<{ success: boolean; sentCount: number }> {
  const { subject, html } = generateMaintenanceAlertEmail(data);
  const result = await sendEmail(recipients, subject, html);
  console.log(`[Email] Sent Maintenance alert notification to ${result.sentCount || 0} recipients`);
  return { success: result.success, sentCount: result.sentCount || 0 };
}

/**
 * Send Predictive Maintenance alert notification
 */
export async function notifyPredictiveAlert(data: PredictiveAlertEmailData, recipients: string[]): Promise<{ success: boolean; sentCount: number }> {
  const { subject, html } = generatePredictiveAlertEmail(data);
  const result = await sendEmail(recipients, subject, html);
  console.log(`[Email] Sent Predictive alert notification to ${result.sentCount || 0} recipients`);
  return { success: result.success, sentCount: result.sentCount || 0 };
}


/**
 * Generate HTML email for approval request notification
 */
function generateApprovalRequestEmail(data: ApprovalRequestEmailData): { subject: string; html: string } {
  const subject = `[Cần phê duyệt] ${data.entityLabel} #${data.entityId}`;
  const amountInfo = data.totalAmount 
    ? `<div class="metric"><span class="metric-label">Giá trị</span><br><span class="metric-value">${data.totalAmount.toLocaleString("vi-VN")} VNĐ</span></div>` 
    : "";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; }
    .metric { display: inline-block; background: #f3f4f6; padding: 12px 18px; margin: 5px; border-radius: 8px; text-align: center; }
    .metric-label { font-size: 12px; color: #6b7280; display: block; }
    .metric-value { font-size: 16px; font-weight: 600; color: #111827; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 15px; }
    .btn:hover { background: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    td:first-child { color: #6b7280; width: 40%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Yêu cầu Phê duyệt</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${data.approverName || "Quý vị"}</strong>,</p>
      <p>Bạn có một yêu cầu mới cần phê duyệt:</p>
      
      <div class="info-box">
        <table>
          <tr><td>Loại yêu cầu:</td><td><strong>${data.entityLabel}</strong></td></tr>
          <tr><td>Mã đơn:</td><td><strong>#${data.entityId}</strong></td></tr>
          <tr><td>Người yêu cầu:</td><td>${data.requesterName}</td></tr>
          ${data.stepName ? `<tr><td>Bước phê duyệt:</td><td>${data.stepName}</td></tr>` : ""}
          ${data.totalAmount ? `<tr><td>Giá trị:</td><td><strong>${data.totalAmount.toLocaleString("vi-VN")} VNĐ</strong></td></tr>` : ""}
          ${data.notes ? `<tr><td>Ghi chú:</td><td>${data.notes}</td></tr>` : ""}
        </table>
      </div>
      
      <p>Vui lòng truy cập hệ thống để xem chi tiết và xử lý yêu cầu này.</p>
      
      ${data.systemUrl ? `<a href="${data.systemUrl}/pending-approvals" class="btn">Xem và Phê duyệt</a>` : ""}
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
      <p>Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>
`;
  
  return { subject, html };
}

/**
 * Generate HTML email for approval result notification
 */
function generateApprovalResultEmail(data: ApprovalResultEmailData): { subject: string; html: string } {
  const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
    approved: { label: "Đã được phê duyệt", color: "#22c55e", icon: "✅" },
    rejected: { label: "Đã bị từ chối", color: "#ef4444", icon: "❌" },
    returned: { label: "Đã được trả lại", color: "#f59e0b", icon: "↩️" },
  };
  
  const actionInfo = actionLabels[data.action] || actionLabels.approved;
  const subject = `[${actionInfo.label}] ${data.entityLabel} #${data.entityId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: ${actionInfo.color}; color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; }
    .status-badge { display: inline-block; background: ${actionInfo.color}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    td:first-child { color: #6b7280; width: 40%; }
    .comments { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${actionInfo.icon} ${actionInfo.label}</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${data.requesterName}</strong>,</p>
      <p>Yêu cầu của bạn đã được xử lý:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <span class="status-badge">${actionInfo.label.toUpperCase()}</span>
      </div>
      
      <div class="info-box">
        <table>
          <tr><td>Loại yêu cầu:</td><td><strong>${data.entityLabel}</strong></td></tr>
          <tr><td>Mã đơn:</td><td><strong>#${data.entityId}</strong></td></tr>
          <tr><td>Người xử lý:</td><td>${data.approverName}</td></tr>
          ${data.totalAmount ? `<tr><td>Giá trị:</td><td><strong>${data.totalAmount.toLocaleString("vi-VN")} VNĐ</strong></td></tr>` : ""}
        </table>
      </div>
      
      ${data.comments ? `
      <div class="comments">
        <strong>💬 Ghi chú từ người phê duyệt:</strong>
        <p style="margin: 10px 0 0 0;">${data.comments}</p>
      </div>
      ` : ""}
      
      ${data.systemUrl ? `<a href="${data.systemUrl}" class="btn">Xem chi tiết</a>` : ""}
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống SPC/CPK Calculator.</p>
      <p>Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>
`;
  
  return { subject, html };
}

/**
 * Send approval request notification via SMTP
 */
export async function notifyApprovalRequest(data: ApprovalRequestEmailData): Promise<{ success: boolean; sentCount: number }> {
  const { subject, html } = generateApprovalRequestEmail(data);
  const result = await sendEmail(data.approverEmail, subject, html);
  console.log(`[Email] Sent approval request notification to ${data.approverEmail}: ${result.success ? "success" : result.error}`);
  return { success: result.success, sentCount: result.sentCount || 0 };
}

/**
 * Send approval result notification via SMTP
 */
export async function notifyApprovalResult(data: ApprovalResultEmailData): Promise<{ success: boolean; sentCount: number }> {
  const { subject, html } = generateApprovalResultEmail(data);
  const result = await sendEmail(data.requesterEmail, subject, html);
  console.log(`[Email] Sent approval result notification to ${data.requesterEmail}: ${result.success ? "success" : result.error}`);
  return { success: result.success, sentCount: result.sentCount || 0 };
}


/**
 * Send CPK warning email to a specific recipient (for testing)
 */
export async function sendCpkWarningEmail(
  to: string,
  data: CpkWarningEmailData
): Promise<{ success: boolean; error?: string }> {
  const { subject, html } = generateCpkWarningEmail(data);
  return await sendEmail(to, subject, html);
}

/**
 * Send SPC violation email to a specific recipient (for testing)
 */
export async function sendSpcViolationEmail(
  to: string,
  data: SpcViolationEmailData
): Promise<{ success: boolean; error?: string }> {
  const { subject, html } = generateSpcViolationEmail(data);
  return await sendEmail(to, subject, html);
}


/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  username: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const subject = "Đặt lại mật khẩu - Hệ thống CPK/SPC";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Yêu cầu đặt lại mật khẩu</h2>
      <p>Xin chào <strong>${username}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Đặt lại mật khẩu
        </a>
      </div>
      <p style="color: #666;">Link này sẽ hết hạn sau 1 giờ.</p>
      <p style="color: #666;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Hệ thống CPK/SPC Calculator.
      </p>
    </div>
  `;
  
  return await sendEmail(to, subject, html);
}


// ============================================
// Security Alert Email Functions
// ============================================

export interface AccountLockedEmailData {
  username: string;
  lockedAt: Date;
  lockedUntil: Date;
  failedAttempts: number;
  ipAddress?: string;
  reason?: string;
}

export interface SecurityAlertEmailData {
  alertType: 'account_locked' | 'suspicious_activity' | 'multiple_failed_logins' | 'brute_force_detected';
  username?: string;
  ipAddress?: string;
  details: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
}

/**
 * Generate account locked email HTML
 */
function generateAccountLockedEmail(data: AccountLockedEmailData): { subject: string; html: string } {
  const subject = `🔒 [CRITICAL] Tài khoản bị khóa: ${data.username}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ CẢNH BÁO BẢO MẬT</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Tài khoản đã bị khóa</p>
      </div>
      
      <div style="padding: 30px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
        <h2 style="color: #dc2626; margin-top: 0;">Thông tin chi tiết</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; font-weight: bold; width: 40%;">Tên đăng nhập:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">${data.username}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; font-weight: bold;">Thời gian khóa:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">${data.lockedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; font-weight: bold;">Mở khóa lúc:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">${data.lockedUntil.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; font-weight: bold;">Số lần thất bại:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold;">${data.failedAttempts}</td>
          </tr>
          ${data.ipAddress ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; font-weight: bold;">Địa chỉ IP:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">${data.ipAddress}</td>
          </tr>
          ` : ''}
          ${data.reason ? `
          <tr>
            <td style="padding: 10px 0; font-weight: bold;">Lý do:</td>
            <td style="padding: 10px 0;">${data.reason}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div style="padding: 20px; background-color: #fff;">
        <h3 style="color: #374151; margin-top: 0;">Hành động đề xuất:</h3>
        <ul style="color: #6b7280; line-height: 1.8;">
          <li>Kiểm tra xem đây có phải là hoạt động hợp lệ từ người dùng</li>
          <li>Nếu nghi ngờ tấn công, hãy kiểm tra IP address và block nếu cần</li>
          <li>Liên hệ người dùng để xác nhận nếu cần thiết</li>
          <li>Xem xét mở khóa tài khoản nếu đây là sự cố hợp lệ</li>
        </ul>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth-audit-logs" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Xem Auth Audit Logs
          </a>
        </div>
      </div>
      
      <div style="padding: 15px; background-color: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Email này được gửi tự động từ Hệ thống CPK/SPC Calculator</p>
        <p style="margin: 5px 0 0 0;">Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>
    </div>
  `;
  
  return { subject, html };
}

/**
 * Generate security alert email HTML
 */
function generateSecurityAlertEmail(data: SecurityAlertEmailData): { subject: string; html: string } {
  const alertTypeLabels: Record<string, string> = {
    'account_locked': 'Tài khoản bị khóa',
    'suspicious_activity': 'Hoạt động đáng ngờ',
    'multiple_failed_logins': 'Nhiều lần đăng nhập thất bại',
    'brute_force_detected': 'Phát hiện tấn công Brute Force',
  };
  
  const severityColors = {
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    critical: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  };
  
  const colors = severityColors[data.severity];
  const icon = data.severity === 'critical' ? '🚨' : '⚠️';
  
  const subject = `${icon} [${data.severity.toUpperCase()}] ${alertTypeLabels[data.alertType] || data.alertType}${data.username ? `: ${data.username}` : ''}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff;">
      <div style="background-color: ${colors.border}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${icon} CẢNH BÁO BẢO MẬT</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${alertTypeLabels[data.alertType] || data.alertType}</p>
      </div>
      
      <div style="padding: 30px; background-color: ${colors.bg}; border-left: 4px solid ${colors.border};">
        <h2 style="color: ${colors.text}; margin-top: 0;">Chi tiết cảnh báo</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40; font-weight: bold; width: 40%;">Loại cảnh báo:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40;">${alertTypeLabels[data.alertType] || data.alertType}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40; font-weight: bold;">Mức độ:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40;">
              <span style="background-color: ${colors.border}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${data.severity.toUpperCase()}
              </span>
            </td>
          </tr>
          ${data.username ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40; font-weight: bold;">Tên đăng nhập:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40;">${data.username}</td>
          </tr>
          ` : ''}
          ${data.ipAddress ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40; font-weight: bold;">Địa chỉ IP:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40;">${data.ipAddress}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40; font-weight: bold;">Thời gian:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid ${colors.border}40;">${data.timestamp.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Chi tiết:</td>
            <td style="padding: 10px 0;">${data.details}</td>
          </tr>
        </table>
      </div>
      
      <div style="padding: 20px; background-color: #fff; text-align: center;">
        <a href="${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth-audit-logs" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Xem Auth Audit Logs
        </a>
      </div>
      
      <div style="padding: 15px; background-color: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">Email này được gửi tự động từ Hệ thống CPK/SPC Calculator</p>
      </div>
    </div>
  `;
  
  return { subject, html };
}

/**
 * Send account locked notification to admins
 */
export async function sendAccountLockedNotification(
  data: AccountLockedEmailData
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  try {
    // Get admin users' emails
    const [adminUsers] = await db.execute(
      `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != ''`
    );
    
    const adminEmails = (adminUsers as any[]).map(u => u.email).filter(Boolean);
    
    if (adminEmails.length === 0) {
      console.warn("[SecurityAlert] No admin emails found to send notification");
      return { success: false, error: "No admin emails configured" };
    }
    
    const { subject, html } = generateAccountLockedEmail(data);
    const result = await sendEmail(adminEmails, subject, html);
    
    console.log(`[SecurityAlert] Sent account locked notification to ${result.sentCount || 0} admins`);
    return result;
  } catch (error: any) {
    console.error("[SecurityAlert] Failed to send account locked notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send security alert notification to admins
 */
export async function sendSecurityAlertNotification(
  data: SecurityAlertEmailData
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  try {
    // Get admin users' emails
    const [adminUsers] = await db.execute(
      `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email != ''`
    );
    
    const adminEmails = (adminUsers as any[]).map(u => u.email).filter(Boolean);
    
    if (adminEmails.length === 0) {
      console.warn("[SecurityAlert] No admin emails found to send notification");
      return { success: false, error: "No admin emails configured" };
    }
    
    const { subject, html } = generateSecurityAlertEmail(data);
    const result = await sendEmail(adminEmails, subject, html);
    
    console.log(`[SecurityAlert] Sent security alert notification to ${result.sentCount || 0} admins`);
    return result;
  } catch (error: any) {
    console.error("[SecurityAlert] Failed to send security alert notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send critical alert to specific email addresses
 */
export async function sendCriticalAlertEmail(
  to: string | string[],
  alertType: string,
  details: string,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  const data: SecurityAlertEmailData = {
    alertType: alertType as any,
    details,
    timestamp: new Date(),
    severity: 'critical',
    username: additionalData?.username,
    ipAddress: additionalData?.ipAddress,
  };
  
  const { subject, html } = generateSecurityAlertEmail(data);
  return await sendEmail(to, subject, html);
}
