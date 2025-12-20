/**
 * Local Authentication Service
 * Provides offline authentication without requiring Manus OAuth
 */

import { getDb, logLoginEvent } from "./db";
import { localUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 10;
const JWT_EXPIRY = "7d"; // 7 days

export interface LocalAuthUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: "user" | "manager" | "admin";
  mustChangePassword?: boolean;
}

export interface RegisterInput {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for local auth
 */
export function generateLocalToken(user: LocalAuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      authType: "local",
    },
    ENV.jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyLocalToken(token: string): LocalAuthUser | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as LocalAuthUser & { authType: string };
    if (decoded.authType !== "local") return null;
    return {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

/**
 * Register a new local user
 */
export async function registerLocalUser(input: RegisterInput): Promise<{ success: boolean; user?: LocalAuthUser; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Check if username already exists
    const existing = await db.select().from(localUsers).where(eq(localUsers.username, input.username)).limit(1);
    if (existing.length > 0) {
      return { success: false, error: "Username already exists" };
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Insert new user
    const result = await db.insert(localUsers).values({
      username: input.username,
      passwordHash,
      name: input.name || null,
      email: input.email || null,
      role: "user",
      isActive: 1,
    });

    const insertId = result[0].insertId;

    return {
      success: true,
      user: {
        id: insertId,
        username: input.username,
        name: input.name || null,
        email: input.email || null,
        role: "user",
      },
    };
  } catch (error) {
    console.error("[LocalAuth] Registration error:", error);
    return { success: false, error: "Registration failed" };
  }
}

/**
 * Login with local credentials
 */
export async function loginLocalUser(input: LoginInput): Promise<{ success: boolean; token?: string; user?: LocalAuthUser; error?: string; mustChangePassword?: boolean }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Find user by username
    const users = await db.select().from(localUsers).where(eq(localUsers.username, input.username)).limit(1);
    if (users.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }

    const user = users[0];

    // Check if user is active
    if (user.isActive !== 1) {
      return { success: false, error: "Account is disabled" };
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      // Log failed login attempt
      await logLoginEvent({
        userId: user.id,
        username: user.username,
        authType: "local",
        eventType: "login_failed",
      });
      return { success: false, error: "Invalid username or password" };
    }

    // Update last signed in
    await db.update(localUsers).set({ lastSignedIn: new Date() }).where(eq(localUsers.id, user.id));

    // Log successful login
    await logLoginEvent({
      userId: user.id,
      username: user.username,
      authType: "local",
      eventType: "login",
    });

    const authUser: LocalAuthUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword === 1,
    };

    const token = generateLocalToken(authUser);

    return {
      success: true,
      token,
      user: authUser,
      mustChangePassword: user.mustChangePassword === 1,
    };
  } catch (error) {
    console.error("[LocalAuth] Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

/**
 * Get local user by ID
 */
export async function getLocalUserById(id: number): Promise<LocalAuthUser | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const users = await db.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
    if (users.length === 0) return null;

    const user = users[0];
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * List all local users (admin only)
 */
export async function listLocalUsers(): Promise<LocalAuthUser[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const users = await db.select().from(localUsers).where(eq(localUsers.isActive, 1));
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  } catch {
    return [];
  }
}

/**
 * Update local user
 */
export async function updateLocalUser(
  id: number,
  updates: { name?: string; email?: string; password?: string; role?: "user" | "manager" | "admin" }
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.password) {
      updateData.passwordHash = await hashPassword(updates.password);
    }

    await db.update(localUsers).set(updateData).where(eq(localUsers.id, id));
    return { success: true };
  } catch (error) {
    console.error("[LocalAuth] Update error:", error);
    return { success: false, error: "Update failed" };
  }
}

/**
 * Delete (deactivate) local user
 */
export async function deactivateLocalUser(id: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db.update(localUsers).set({ isActive: 0 }).where(eq(localUsers.id, id));
    return { success: true };
  } catch (error) {
    console.error("[LocalAuth] Deactivate error:", error);
    return { success: false, error: "Deactivate failed" };
  }
}

/**
 * Change password for local user
 */
export async function changeLocalPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get user
    const users = await db.select().from(localUsers).where(eq(localUsers.id, userId)).limit(1);
    if (users.length === 0) {
      return { success: false, error: "User not found" };
    }

    const user = users[0];

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await db.update(localUsers).set({
      passwordHash: newPasswordHash,
      mustChangePassword: 0,
    }).where(eq(localUsers.id, userId));

    return { success: true };
  } catch (error) {
    console.error("[LocalAuth] Change password error:", error);
    return { success: false, error: "Failed to change password" };
  }
}

/**
 * Admin reset password for user
 */
export async function adminResetPassword(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    const newPasswordHash = await hashPassword(newPassword);
    await db.update(localUsers).set({
      passwordHash: newPasswordHash,
      mustChangePassword: 1, // Force user to change on next login
    }).where(eq(localUsers.id, userId));

    return { success: true };
  } catch (error) {
    console.error("[LocalAuth] Admin reset password error:", error);
    return { success: false, error: "Failed to reset password" };
  }
}

/**
 * Create default admin user if not exists
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const admins = await db.select().from(localUsers).where(eq(localUsers.role, "admin")).limit(1);
    if (admins.length === 0) {
      console.log("[LocalAuth] Creating default admin user...");
      const passwordHash = await hashPassword("admin123");
      await db.insert(localUsers).values({
        username: "admin",
        passwordHash,
        name: "Administrator",
        email: "admin@local.system",
        role: "admin",
        isActive: 1,
        mustChangePassword: 1, // Force password change on first login
      });
      console.log("[LocalAuth] Default admin created: username=admin, password=admin123");
    }
  } catch (error) {
    console.error("[LocalAuth] Error ensuring default admin:", error);
  }
}


// ==================== PASSWORD RESET ====================

import crypto from "crypto";
import { passwordResetTokens, userSessions, twoFactorAuth, twoFactorBackupCodes } from "../drizzle/schema";
import { and, lt, isNull, desc } from "drizzle-orm";

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;

  // Find user by email
  const users = await db.select().from(localUsers).where(eq(localUsers.email, email)).limit(1);
  if (users.length === 0) return null;

  const user = users[0];
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete old tokens for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  // Create new token
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    email,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Verify password reset token and reset password
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  // Find valid token
  const tokens = await db.select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.token, token),
      isNull(passwordResetTokens.usedAt)
    ))
    .limit(1);

  if (tokens.length === 0) {
    return { success: false, message: "Token không hợp lệ hoặc đã được sử dụng" };
  }

  const resetToken = tokens[0];
  
  // Check if expired
  if (new Date() > new Date(resetToken.expiresAt)) {
    return { success: false, message: "Token đã hết hạn" };
  }

  // Update password
  const passwordHash = await hashPassword(newPassword);
  await db.update(localUsers)
    .set({ passwordHash, mustChangePassword: 0 })
    .where(eq(localUsers.id, resetToken.userId));

  // Mark token as used
  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return { success: true, message: "Mật khẩu đã được đặt lại thành công" };
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Create a new session
 */
export async function createSession(
  userId: number,
  userAgentOrToken: string,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Parse user agent to get device info
  const { browser, os, deviceType } = parseUserAgentForSession(userAgentOrToken);
  
  // Generate a unique token for the session
  const token = `session_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    const result = await db.insert(userSessions).values({
      userId,
      token,
      deviceName: `${browser} on ${os}`,
      deviceType: deviceType,
      deviceFingerprint,
      browser,
      os,
      userAgent: userAgentOrToken,
      ipAddress,
      expiresAt,
      isActive: 1,
    });
    
    return { id: result[0].insertId };
  } catch (error) {
    console.error("[Session] Create error:", error);
    return null;
  }
}

/**
 * Parse user agent string for session info
 */
function parseUserAgentForSession(userAgent: string): { browser: string; os: string; deviceType: string } {
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "desktop";

  // Parse browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  // Parse OS
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
    deviceType = "mobile";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    deviceType = userAgent.includes("iPad") ? "tablet" : "mobile";
  }

  return { browser, os, deviceType };
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: number): Promise<Array<{
  id: number;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent?: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];

  const sessions = await db.select()
    .from(userSessions)
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, 1)
    ))
    .orderBy(desc(userSessions.lastActiveAt));

  return sessions.map(s => ({
    id: s.id,
    deviceName: s.deviceName,
    deviceType: s.deviceType,
    browser: s.browser,
    os: s.os,
    ipAddress: s.ipAddress,
    location: s.location,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
  }));
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(userSessions)
    .set({ isActive: 0 })
    .where(and(
      eq(userSessions.id, sessionId),
      eq(userSessions.userId, userId)
    ));

  return true;
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(userId: number, currentToken: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Get current session to exclude
  const currentSessions = await db.select()
    .from(userSessions)
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.token, currentToken)
    ))
    .limit(1);

  const currentSessionId = currentSessions.length > 0 ? currentSessions[0].id : -1;

  // Revoke all other sessions
  await db.update(userSessions)
    .set({ isActive: 0 })
    .where(and(
      eq(userSessions.userId, userId),
      eq(userSessions.isActive, 1)
    ));

  // Re-activate current session
  if (currentSessionId > 0) {
    await db.update(userSessions)
      .set({ isActive: 1 })
      .where(eq(userSessions.id, currentSessionId));
  }

  return 1;
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(userSessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(userSessions.token, token));
}

// ==================== TWO FACTOR AUTHENTICATION ====================

import * as OTPAuth from "otpauth";

/**
 * Generate 2FA secret for a user
 */
export async function generate2FASecret(userId: number, username: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Generate new TOTP secret
  const totp = new OTPAuth.TOTP({
    issuer: "SPC/CPK Calculator",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const otpauthUrl = totp.toString();

  // Check if user already has 2FA setup
  const existing = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId)).limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(twoFactorAuth)
      .set({ secret, isEnabled: 0, verifiedAt: null })
      .where(eq(twoFactorAuth.userId, userId));
  } else {
    // Create new
    await db.insert(twoFactorAuth).values({
      userId,
      secret,
      isEnabled: 0,
    });
  }

  // Generate QR code URL using Google Charts API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

  return { secret, otpauthUrl, qrCodeUrl };
}

/**
 * Verify 2FA code and enable 2FA
 */
export async function verify2FAAndEnable(userId: number, code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
  const db = await getDb();
  if (!db) return { success: false };

  // Get user's 2FA secret
  const tfaRecords = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId)).limit(1);
  if (tfaRecords.length === 0) return { success: false };

  const tfa = tfaRecords[0];

  // Verify code
  const totp = new OTPAuth.TOTP({
    issuer: "SPC/CPK Calculator",
    label: "user",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(tfa.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return { success: false };

  // Enable 2FA
  await db.update(twoFactorAuth)
    .set({ isEnabled: 1, verifiedAt: new Date() })
    .where(eq(twoFactorAuth.userId, userId));

  // Generate backup codes
  const backupCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    backupCodes.push(code);
    
    // Hash and store backup code
    const hashedCode = await hashPassword(code);
    await db.insert(twoFactorBackupCodes).values({
      userId,
      code: hashedCode,
    });
  }

  return { success: true, backupCodes };
}

/**
 * Verify 2FA code during login
 */
export async function verify2FACode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get user's 2FA secret
  const tfaRecords = await db.select().from(twoFactorAuth)
    .where(and(
      eq(twoFactorAuth.userId, userId),
      eq(twoFactorAuth.isEnabled, 1)
    ))
    .limit(1);

  if (tfaRecords.length === 0) return true; // 2FA not enabled

  const tfa = tfaRecords[0];

  // Try TOTP code first
  const totp = new OTPAuth.TOTP({
    issuer: "SPC/CPK Calculator",
    label: "user",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(tfa.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) return true;

  // Try backup code
  const backupCodes = await db.select().from(twoFactorBackupCodes)
    .where(and(
      eq(twoFactorBackupCodes.userId, userId),
      isNull(twoFactorBackupCodes.usedAt)
    ));

  for (const bc of backupCodes) {
    const isValid = await verifyPassword(code.toUpperCase(), bc.code);
    if (isValid) {
      // Mark backup code as used
      await db.update(twoFactorBackupCodes)
        .set({ usedAt: new Date() })
        .where(eq(twoFactorBackupCodes.id, bc.id));
      return true;
    }
  }

  return false;
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const tfaRecords = await db.select().from(twoFactorAuth)
    .where(and(
      eq(twoFactorAuth.userId, userId),
      eq(twoFactorAuth.isEnabled, 1)
    ))
    .limit(1);

  return tfaRecords.length > 0;
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: number, password: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  // Verify password first
  const users = await db.select().from(localUsers).where(eq(localUsers.id, userId)).limit(1);
  if (users.length === 0) return { success: false, message: "User not found" };

  const isValidPassword = await verifyPassword(password, users[0].passwordHash);
  if (!isValidPassword) return { success: false, message: "Mật khẩu không đúng" };

  // Delete 2FA records
  await db.delete(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
  await db.delete(twoFactorBackupCodes).where(eq(twoFactorBackupCodes.userId, userId));

  return { success: true, message: "Đã tắt xác thực 2 yếu tố" };
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const codes = await db.select().from(twoFactorBackupCodes)
    .where(and(
      eq(twoFactorBackupCodes.userId, userId),
      isNull(twoFactorBackupCodes.usedAt)
    ));

  return codes.length;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: number, password: string): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  // Verify password first
  const users = await db.select().from(localUsers).where(eq(localUsers.id, userId)).limit(1);
  if (users.length === 0) return { success: false, message: "User not found" };

  const isValidPassword = await verifyPassword(password, users[0].passwordHash);
  if (!isValidPassword) return { success: false, message: "Mật khẩu không đúng" };

  // Delete old backup codes
  await db.delete(twoFactorBackupCodes).where(eq(twoFactorBackupCodes.userId, userId));

  // Generate new backup codes
  const backupCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    backupCodes.push(code);
    
    const hashedCode = await hashPassword(code);
    await db.insert(twoFactorBackupCodes).values({
      userId,
      code: hashedCode,
    });
  }

  return { success: true, backupCodes };
}


// ==================== TRUSTED DEVICES ====================

import { trustedDevices, failedLoginAttempts, accountLockouts, loginLocationHistory, securitySettings } from "../drizzle/schema";

/**
 * Check if device is trusted for a user
 */
export async function isTrustedDevice(userId: number, deviceFingerprint: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const devices = await db.select()
    .from(trustedDevices)
    .where(and(
      eq(trustedDevices.userId, userId),
      eq(trustedDevices.deviceFingerprint, deviceFingerprint)
    ))
    .limit(1);

  if (devices.length === 0) return false;

  const device = devices[0];
  
  // Check if expired
  if (device.expiresAt && new Date() > new Date(device.expiresAt)) {
    // Delete expired device
    await db.delete(trustedDevices).where(eq(trustedDevices.id, device.id));
    return false;
  }

  // Update last used
  await db.update(trustedDevices)
    .set({ lastUsedAt: new Date() })
    .where(eq(trustedDevices.id, device.id));

  return true;
}

/**
 * Add a trusted device for a user
 */
export async function addTrustedDevice(
  userId: number,
  deviceFingerprint: string,
  deviceInfo: {
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
    trustDays?: number; // 0 = never expires
  }
): Promise<{ success: boolean; deviceId?: number }> {
  const db = await getDb();
  if (!db) return { success: false };

  try {
    // Check if already exists
    const existing = await db.select()
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db.update(trustedDevices)
        .set({
          lastUsedAt: new Date(),
          deviceName: deviceInfo.deviceName || existing[0].deviceName,
        })
        .where(eq(trustedDevices.id, existing[0].id));
      return { success: true, deviceId: existing[0].id };
    }

    // Calculate expiry
    const expiresAt = deviceInfo.trustDays && deviceInfo.trustDays > 0
      ? new Date(Date.now() + deviceInfo.trustDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await db.insert(trustedDevices).values({
      userId,
      deviceFingerprint,
      deviceName: deviceInfo.deviceName || "Unknown Device",
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
    });

    return { success: true, deviceId: result[0].insertId };
  } catch (error) {
    console.error("[TrustedDevices] Add error:", error);
    return { success: false };
  }
}

/**
 * Get all trusted devices for a user
 */
export async function getTrustedDevices(userId: number): Promise<Array<{
  id: number;
  deviceFingerprint: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const devices = await db.select()
    .from(trustedDevices)
    .where(eq(trustedDevices.userId, userId))
    .orderBy(desc(trustedDevices.lastUsedAt));

  return devices.map(d => ({
    id: d.id,
    deviceFingerprint: d.deviceFingerprint,
    deviceName: d.deviceName,
    ipAddress: d.ipAddress,
    lastUsedAt: d.lastUsedAt,
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
  }));
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(userId: number, deviceId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(trustedDevices)
    .where(and(
      eq(trustedDevices.id, deviceId),
      eq(trustedDevices.userId, userId)
    ));

  return true;
}

/**
 * Remove all trusted devices for a user
 */
export async function removeAllTrustedDevices(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
  return true;
}

// ==================== FAILED LOGIN TRACKING ====================

// Default constants (can be overridden by security settings)
const DEFAULT_ALERT_THRESHOLD = 5; // Send alert after 5 failures
const DEFAULT_LOCKOUT_THRESHOLD = 10; // Lock account after 10 failures
const DEFAULT_LOCKOUT_DURATION_MINUTES = 30;
const FAILED_ATTEMPTS_WINDOW_MINUTES = 15;

/**
 * Record a failed login attempt
 */
export async function recordFailedLoginAttempt(
  username: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<{ shouldAlert: boolean; shouldLock: boolean; failedCount: number }> {
  const db = await getDb();
  if (!db) return { shouldAlert: false, shouldLock: false, failedCount: 0 };

  // Get security settings
  const settings = await getSecuritySettings();
  const alertThreshold = parseInt(settings.alert_threshold || String(DEFAULT_ALERT_THRESHOLD), 10);
  const lockoutThreshold = parseInt(settings.max_failed_attempts || String(DEFAULT_LOCKOUT_THRESHOLD), 10);

  try {
    // Record the attempt
    await db.insert(failedLoginAttempts).values({
      username,
      ipAddress,
      userAgent,
      reason: reason || "wrong_password",
    });

    // Count recent failures
    const windowStart = new Date(Date.now() - FAILED_ATTEMPTS_WINDOW_MINUTES * 60 * 1000);
    const recentFailures = await db.select()
      .from(failedLoginAttempts)
      .where(and(
        eq(failedLoginAttempts.username, username),
        // Note: We can't use gt with timestamp directly, so we'll count all and filter
      ));

    // Filter by time window
    const failedCount = recentFailures.filter(f => 
      new Date(f.attemptedAt) > windowStart
    ).length;

    const shouldAlert = failedCount === alertThreshold;
    const shouldLock = failedCount >= lockoutThreshold;

    // Lock account if threshold reached
    if (shouldLock) {
      await lockAccount(username, failedCount);
    }

    return { shouldAlert, shouldLock, failedCount };
  } catch (error) {
    console.error("[FailedLogin] Record error:", error);
    return { shouldAlert: false, shouldLock: false, failedCount: 0 };
  }
}

/**
 * Lock an account
 */
async function lockAccount(username: string, failedAttempts: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get lockout duration from settings
  const settings = await getSecuritySettings();
  const lockoutDurationMinutes = parseInt(settings.lockout_duration_minutes || String(DEFAULT_LOCKOUT_DURATION_MINUTES), 10);

  // Find user
  const users = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
  if (users.length === 0) return;

  const user = users[0];
  const lockedUntil = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);

  // Check if already locked
  const existingLock = await db.select()
    .from(accountLockouts)
    .where(and(
      eq(accountLockouts.userId, user.id),
      isNull(accountLockouts.unlockedAt)
    ))
    .limit(1);

  if (existingLock.length > 0) {
    // Update existing lock
    await db.update(accountLockouts)
      .set({ lockedUntil, failedAttempts })
      .where(eq(accountLockouts.id, existingLock[0].id));
  } else {
    // Create new lock
    await db.insert(accountLockouts).values({
      userId: user.id,
      username,
      lockedUntil,
      reason: "too_many_failed_attempts",
      failedAttempts,
    });
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(username: string): Promise<{ locked: boolean; lockedUntil?: Date; reason?: string }> {
  const db = await getDb();
  if (!db) return { locked: false };

  const users = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
  if (users.length === 0) return { locked: false };

  const user = users[0];

  const locks = await db.select()
    .from(accountLockouts)
    .where(and(
      eq(accountLockouts.userId, user.id),
      isNull(accountLockouts.unlockedAt)
    ))
    .orderBy(desc(accountLockouts.lockedAt))
    .limit(1);

  if (locks.length === 0) return { locked: false };

  const lock = locks[0];

  // Check if lock has expired
  if (new Date() > new Date(lock.lockedUntil)) {
    // Check if auto-unlock is enabled
    const settings = await getSecuritySettings();
    const autoUnlockEnabled = settings.auto_unlock_enabled === "true";
    
    if (autoUnlockEnabled) {
      // Auto-unlock
      await db.update(accountLockouts)
        .set({ unlockedAt: new Date() })
        .where(eq(accountLockouts.id, lock.id));
      return { locked: false };
    }
    // If auto-unlock is disabled, account remains locked until admin unlocks
  }

  return {
    locked: true,
    lockedUntil: lock.lockedUntil,
    reason: lock.reason || undefined,
  };
}

/**
 * Unlock an account (admin action)
 */
export async function unlockAccount(username: string, adminId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const users = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
  if (users.length === 0) return false;

  await db.update(accountLockouts)
    .set({ unlockedAt: new Date(), unlockedBy: adminId })
    .where(and(
      eq(accountLockouts.userId, users[0].id),
      isNull(accountLockouts.unlockedAt)
    ));

  // Clear recent failed attempts
  await db.delete(failedLoginAttempts).where(eq(failedLoginAttempts.username, username));

  return true;
}

/**
 * Get locked accounts (admin)
 */
export async function getLockedAccounts(): Promise<Array<{
  id: number;
  userId: number;
  username: string;
  lockedAt: Date;
  lockedUntil: Date;
  reason: string | null;
  failedAttempts: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const locks = await db.select()
    .from(accountLockouts)
    .where(isNull(accountLockouts.unlockedAt))
    .orderBy(desc(accountLockouts.lockedAt));

  return locks.map(l => ({
    id: l.id,
    userId: l.userId,
    username: l.username,
    lockedAt: l.lockedAt,
    lockedUntil: l.lockedUntil,
    reason: l.reason,
    failedAttempts: l.failedAttempts,
  }));
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedAttempts(username: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(failedLoginAttempts).where(eq(failedLoginAttempts.username, username));
}

// ==================== IP LOCATION TRACKING ====================

interface IpLocationInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  timezone?: string;
}

/**
 * Get location info from IP address using ip-api.com
 */
export async function getIpLocation(ipAddress: string): Promise<IpLocationInfo | null> {
  // Skip for private/local IPs
  if (isPrivateIp(ipAddress)) {
    return {
      country: "Local Network",
      countryCode: "LO",
      city: "Local",
    };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,regionName,city,lat,lon,isp,timezone`);
    const data = await response.json();

    if (data.status === "success") {
      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        isp: data.isp,
        timezone: data.timezone,
      };
    }
    return null;
  } catch (error) {
    console.error("[IpLocation] Error:", error);
    return null;
  }
}

/**
 * Check if IP is private/local
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") return true;
  
  // Check private ranges
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return true;
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
}

/**
 * Save login location to history
 */
export async function saveLoginLocation(
  loginHistoryId: number,
  userId: number,
  ipAddress: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const location = await getIpLocation(ipAddress);
  if (!location) return;

  try {
    await db.insert(loginLocationHistory).values({
      loginHistoryId,
      userId,
      ipAddress,
      country: location.country,
      countryCode: location.countryCode,
      region: location.region,
      city: location.city,
      latitude: location.latitude?.toString(),
      longitude: location.longitude?.toString(),
      isp: location.isp,
      timezone: location.timezone,
    });
  } catch (error) {
    console.error("[LoginLocation] Save error:", error);
  }
}

/**
 * Get login location history for a user
 */
export async function getLoginLocationHistory(userId: number, limit: number = 50): Promise<Array<{
  id: number;
  loginHistoryId: number;
  ipAddress: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  isp: string | null;
  timezone: string | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const locations = await db.select()
    .from(loginLocationHistory)
    .where(eq(loginLocationHistory.userId, userId))
    .orderBy(desc(loginLocationHistory.createdAt))
    .limit(limit);

  return locations.map(l => ({
    id: l.id,
    loginHistoryId: l.loginHistoryId,
    ipAddress: l.ipAddress,
    country: l.country,
    countryCode: l.countryCode,
    region: l.region,
    city: l.city,
    latitude: l.latitude,
    longitude: l.longitude,
    isp: l.isp,
    timezone: l.timezone,
    createdAt: l.createdAt,
  }));
}

/**
 * Get all login location history (admin)
 */
export async function getAllLoginLocationHistory(limit: number = 100): Promise<Array<{
  id: number;
  userId: number;
  ipAddress: string;
  country: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  const locations = await db.select()
    .from(loginLocationHistory)
    .orderBy(desc(loginLocationHistory.createdAt))
    .limit(limit);

  return locations.map(l => ({
    id: l.id,
    userId: l.userId,
    ipAddress: l.ipAddress,
    country: l.country,
    city: l.city,
    latitude: l.latitude,
    longitude: l.longitude,
    createdAt: l.createdAt,
  }));
}


// ==================== SECURITY SETTINGS ====================

// Cache for security settings
let securitySettingsCache: Map<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all security settings
 */
export async function getSecuritySettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) {
    return getDefaultSecuritySettings();
  }

  // Check cache
  if (securitySettingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return Object.fromEntries(securitySettingsCache);
  }

  try {
    const settings = await db.select()
      .from(securitySettings)
      .execute();

    const settingsMap = new Map<string, string>();
    for (const setting of settings) {
      settingsMap.set(setting.settingKey, setting.settingValue);
    }

    // Fill in defaults for missing settings
    const defaults = getDefaultSecuritySettings();
    for (const [key, value] of Object.entries(defaults)) {
      if (!settingsMap.has(key)) {
        settingsMap.set(key, value);
      }
    }

    // Update cache
    securitySettingsCache = settingsMap;
    cacheTimestamp = Date.now();

    return Object.fromEntries(settingsMap);
  } catch (error) {
    console.error("[SecuritySettings] Get error:", error);
    return getDefaultSecuritySettings();
  }
}

/**
 * Get a single security setting
 */
export async function getSecuritySetting(key: string): Promise<string> {
  const settings = await getSecuritySettings();
  return settings[key] || getDefaultSecuritySettings()[key] || "";
}

/**
 * Update security settings
 */
export async function updateSecuritySettings(
  settings: Record<string, string>,
  updatedBy: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database không khả dụng" };
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      // Validate key
      if (!isValidSecuritySettingKey(key)) {
        continue;
      }

      // Validate value
      const validationError = validateSecuritySettingValue(key, value);
      if (validationError) {
        return { success: false, message: validationError };
      }

      // Upsert setting
      await db.insert(securitySettings)
        .values({
          settingKey: key,
          settingValue: value,
          updatedBy,
        })
        .onDuplicateKeyUpdate({
          set: {
            settingValue: value,
            updatedBy,
          },
        });
    }

    // Clear cache
    securitySettingsCache = null;

    return { success: true, message: "Đã cập nhật cài đặt bảo mật" };
  } catch (error) {
    console.error("[SecuritySettings] Update error:", error);
    return { success: false, message: "Lỗi khi cập nhật cài đặt" };
  }
}

/**
 * Get default security settings
 */
function getDefaultSecuritySettings(): Record<string, string> {
  return {
    max_failed_attempts: "10",
    alert_threshold: "5",
    lockout_duration_minutes: "30",
    auto_unlock_enabled: "true",
    trusted_device_expiry_days: "30",
  };
}

/**
 * Valid security setting keys
 */
const VALID_SECURITY_SETTING_KEYS = [
  "max_failed_attempts",
  "alert_threshold",
  "lockout_duration_minutes",
  "auto_unlock_enabled",
  "trusted_device_expiry_days",
];

function isValidSecuritySettingKey(key: string): boolean {
  return VALID_SECURITY_SETTING_KEYS.includes(key);
}

/**
 * Validate security setting value
 */
function validateSecuritySettingValue(key: string, value: string): string | null {
  switch (key) {
    case "max_failed_attempts":
      const maxAttempts = parseInt(value, 10);
      if (isNaN(maxAttempts) || maxAttempts < 3 || maxAttempts > 100) {
        return "Số lần thất bại tối đa phải từ 3 đến 100";
      }
      break;
    case "alert_threshold":
      const alertThreshold = parseInt(value, 10);
      if (isNaN(alertThreshold) || alertThreshold < 1 || alertThreshold > 50) {
        return "Ngưỡng cảnh báo phải từ 1 đến 50";
      }
      break;
    case "lockout_duration_minutes":
      const lockoutDuration = parseInt(value, 10);
      if (isNaN(lockoutDuration) || lockoutDuration < 1 || lockoutDuration > 1440) {
        return "Thời gian khóa phải từ 1 đến 1440 phút (24 giờ)";
      }
      break;
    case "auto_unlock_enabled":
      if (value !== "true" && value !== "false") {
        return "Giá trị phải là true hoặc false";
      }
      break;
    case "trusted_device_expiry_days":
      const expiryDays = parseInt(value, 10);
      if (isNaN(expiryDays) || expiryDays < 1 || expiryDays > 365) {
        return "Số ngày hết hạn phải từ 1 đến 365";
      }
      break;
  }
  return null;
}

/**
 * Get security settings with descriptions for UI
 */
export async function getSecuritySettingsWithDescriptions(): Promise<Array<{
  key: string;
  value: string;
  description: string;
  type: "number" | "boolean";
  min?: number;
  max?: number;
}>> {
  const settings = await getSecuritySettings();
  
  return [
    {
      key: "max_failed_attempts",
      value: settings.max_failed_attempts,
      description: "Số lần đăng nhập thất bại tối đa trước khi khóa tài khoản",
      type: "number",
      min: 3,
      max: 100,
    },
    {
      key: "alert_threshold",
      value: settings.alert_threshold,
      description: "Số lần thất bại để gửi cảnh báo cho admin",
      type: "number",
      min: 1,
      max: 50,
    },
    {
      key: "lockout_duration_minutes",
      value: settings.lockout_duration_minutes,
      description: "Thời gian khóa tài khoản (phút)",
      type: "number",
      min: 1,
      max: 1440,
    },
    {
      key: "auto_unlock_enabled",
      value: settings.auto_unlock_enabled,
      description: "Tự động mở khóa tài khoản sau thời gian lockout",
      type: "boolean",
    },
    {
      key: "trusted_device_expiry_days",
      value: settings.trusted_device_expiry_days,
      description: "Số ngày thiết bị tin cậy hết hạn",
      type: "number",
      min: 1,
      max: 365,
    },
  ];
}
