import { authenticator } from "otplib";
import * as crypto from "crypto";
import { getDb, logAuthAuditEvent } from "./db";
import { sendEmail } from "./emailService";

// Generate TOTP secret for user
export async function generateTOTPSecret(userId: number, username: string): Promise<{ secret: string; qrCode: string; otpauth: string }> {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(username, "CPK-SPC System", secret);
  
  // Generate QR code as base64
  const QRCode = await import("qrcode");
  const qrCode = await QRCode.toDataURL(otpauth);
  
  // Save secret to database (not enabled yet)
  const db = await getDb();
  await db.execute(
    `INSERT INTO user_two_factor_auth (user_id, secret, enabled, created_at, updated_at)
     VALUES (?, ?, FALSE, ?, ?)
     ON DUPLICATE KEY UPDATE secret = ?, enabled = FALSE, updated_at = ?`,
    [userId, secret, Date.now(), Date.now(), secret, Date.now()]
  );
  
  return { secret, qrCode, otpauth };
}

// Verify TOTP code
export function verifyTOTP(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}

// Enable 2FA after verification
export async function enable2FA(userId: number, token: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const db = await getDb();
  
  const [rows] = await db.execute(
    `SELECT secret FROM user_two_factor_auth WHERE user_id = ${userId} AND enabled = FALSE`
  );
  
  const result = rows as any[];
  if (!result.length) {
    return { success: false, error: "2FA chưa được thiết lập hoặc đã được kích hoạt" };
  }
  
  const secret = result[0].secret;
  
  if (!verifyTOTP(secret, token)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  
  await db.execute(
    `UPDATE user_two_factor_auth SET enabled = TRUE, verified_at = ${Date.now()}, updated_at = ${Date.now()} WHERE user_id = ${userId}`
  );
  
  const backupCodes = await generateBackupCodes(userId);
  
  // Log 2FA enabled event
  await logAuthAuditEvent({
    userId,
    eventType: '2fa_enabled',
    authMethod: '2fa',
    details: { backupCodesGenerated: backupCodes.length },
    severity: 'info',
  });
  
  // Send confirmation email
  await send2FAStatusEmail(userId, true);
  
  return { success: true, backupCodes };
}

// Disable 2FA
export async function disable2FA(userId: number, token: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  
  const [rows] = await db.execute(
    `SELECT secret FROM user_two_factor_auth WHERE user_id = ${userId} AND enabled = TRUE`
  );
  
  const result = rows as any[];
  if (!result.length) {
    return { success: false, error: "2FA chưa được kích hoạt" };
  }
  
  const secret = result[0].secret;
  
  if (!verifyTOTP(secret, token)) {
    return { success: false, error: "Mã xác thực không đúng" };
  }
  
  await db.execute(`DELETE FROM user_two_factor_auth WHERE user_id = ${userId}`);
  await db.execute(`DELETE FROM two_factor_backup_codes WHERE user_id = ${userId}`);
  
  // Log 2FA disabled event
  await logAuthAuditEvent({
    userId,
    eventType: '2fa_disabled',
    authMethod: '2fa',
    severity: 'critical',
  });
  
  // Send warning email
  await send2FAStatusEmail(userId, false);
  
  return { success: true };
}

// Generate backup codes
export async function generateBackupCodes(userId: number): Promise<string[]> {
  const db = await getDb();
  
  await db.execute(`DELETE FROM two_factor_backup_codes WHERE user_id = ${userId}`);
  
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
    await db.execute(
      `INSERT INTO two_factor_backup_codes (user_id, code, used, created_at) VALUES (${userId}, '${code}', FALSE, ${Date.now()})`
    );
  }
  
  return codes;
}

// Verify backup code
export async function verifyBackupCode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  
  const [rows] = await db.execute(
    `SELECT id FROM two_factor_backup_codes WHERE user_id = ${userId} AND code = '${code.toUpperCase()}' AND used = FALSE`
  );
  
  const result = rows as any[];
  if (!result.length) {
    return false;
  }
  
  await db.execute(
    `UPDATE two_factor_backup_codes SET used = TRUE, used_at = ${Date.now()} WHERE id = ${result[0].id}`
  );
  
  return true;
}

// Check if user has 2FA enabled
export async function has2FAEnabled(userId: number): Promise<boolean> {
  const db = await getDb();
  
  const [rows] = await db.execute(
    `SELECT enabled FROM user_two_factor_auth WHERE user_id = ${userId} AND enabled = TRUE`
  );
  
  return (rows as any[]).length > 0;
}

export const is2FAEnabled = has2FAEnabled;

// Get user's 2FA secret for verification
export async function get2FASecret(userId: number): Promise<string | null> {
  const db = await getDb();
  
  const [rows] = await db.execute(
    `SELECT secret FROM user_two_factor_auth WHERE user_id = ${userId} AND enabled = TRUE`
  );
  
  const result = rows as any[];
  return result.length ? result[0].secret : null;
}

// Verify 2FA during login
export async function verify2FALogin(userId: number, code: string, isBackupCode: boolean = false): Promise<boolean> {
  if (isBackupCode) {
    return verifyBackupCode(userId, code);
  }
  
  const secret = await get2FASecret(userId);
  if (!secret) return false;
  
  return verifyTOTP(secret, code);
}


// Send email notification when 2FA status changes
async function send2FAStatusEmail(userId: number, enabled: boolean): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    
    // Get user email
    const [rows] = await db.execute(
      `SELECT email, username, name FROM local_users WHERE id = ${userId}`
    );
    const user = (rows as any[])[0];
    
    if (!user?.email) {
      console.log(`[2FA] No email found for user ${userId}, skipping notification`);
      return;
    }
    
    const displayName = user.name || user.username;
    const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    if (enabled) {
      // 2FA enabled email
      const subject = '[CPK-SPC] Xác thực 2 yếu tố đã được bật';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; text-align: center; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">🔐</div>
              <h1 style="margin: 0; text-align: center;">Xác thực 2 yếu tố đã được bật</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${displayName}</strong>,</p>
              <p>Xác thực 2 yếu tố (2FA) đã được <strong style="color: #10b981;">kích hoạt thành công</strong> cho tài khoản của bạn.</p>
              <p><strong>Thời gian:</strong> ${timestamp}</p>
              
              <div class="warning">
                <strong>⚠️ Lưu ý quan trọng:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Hãy lưu giữ mã backup codes ở nơi an toàn</li>
                  <li>Mỗi mã backup chỉ sử dụng được một lần</li>
                  <li>Nếu bạn không thực hiện thao tác này, hãy liên hệ quản trị viên ngay</li>
                </ul>
              </div>
              
              <p>Từ giờ, mỗi lần đăng nhập bạn sẽ cần nhập mã OTP từ ứng dụng xác thực.</p>
            </div>
            <div class="footer">
              <p>Email này được gửi tự động từ hệ thống CPK-SPC Calculator</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail(user.email, subject, html);
      console.log(`[2FA] Sent 2FA enabled notification to ${user.email}`);
    } else {
      // 2FA disabled email
      const subject = '[CPK-SPC] ⚠️ Cảnh báo: Xác thực 2 yếu tố đã bị tắt';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .warning-icon { font-size: 48px; text-align: center; }
            .alert { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="warning-icon">⚠️</div>
              <h1 style="margin: 0; text-align: center;">Xác thực 2 yếu tố đã bị tắt</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${displayName}</strong>,</p>
              <p>Xác thực 2 yếu tố (2FA) đã được <strong style="color: #ef4444;">vô hiệu hóa</strong> cho tài khoản của bạn.</p>
              <p><strong>Thời gian:</strong> ${timestamp}</p>
              
              <div class="alert">
                <strong>🚨 Cảnh báo bảo mật:</strong>
                <p style="margin: 10px 0 0 0;">Tài khoản của bạn hiện không còn được bảo vệ bởi xác thực 2 yếu tố. Điều này làm giảm mức độ bảo mật của tài khoản.</p>
              </div>
              
              <p><strong>Nếu bạn không thực hiện thao tác này:</strong></p>
              <ul>
                <li>Đổi mật khẩu ngay lập tức</li>
                <li>Bật lại xác thực 2 yếu tố</li>
                <li>Liên hệ quản trị viên để được hỗ trợ</li>
              </ul>
              
              <p>Chúng tôi khuyến nghị bạn nên bật lại 2FA để bảo vệ tài khoản tốt hơn.</p>
            </div>
            <div class="footer">
              <p>Email này được gửi tự động từ hệ thống CPK-SPC Calculator</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail(user.email, subject, html);
      console.log(`[2FA] Sent 2FA disabled warning to ${user.email}`);
    }
  } catch (error) {
    console.error('[2FA] Failed to send status email:', error);
  }
}
