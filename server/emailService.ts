/**
 * Email Service for SPC/CPK Calculator
 * Handles sending email notifications for SPC violations
 */

import { getDb } from "./db";
import { smtpConfig, emailNotificationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

// Email template types
export type EmailType = "spc_violation" | "cpk_warning" | "ca_violation" | "daily_report";

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
  recommendation: string;
  timestamp: Date;
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
      <p><strong>Thời gian:</strong> ${data.timestamp.toLocaleString('vi-VN')}</p>
      
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
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const smtpSettings = await getSmtpConfig();
  
  if (!smtpSettings) {
    console.warn("[Email] SMTP not configured, email not sent");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    console.log(`[Email] Sending email to: ${to}`);
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

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`[Email] Email sent successfully. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Email] Failed to send email: ${errorMessage}`);
    return { success: false, error: errorMessage };
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
