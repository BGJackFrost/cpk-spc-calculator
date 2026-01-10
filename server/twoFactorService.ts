import { authenticator } from "otplib";
import * as crypto from "crypto";
import { getDb } from "./db";

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
