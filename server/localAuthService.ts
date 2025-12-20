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
  token: string,
  deviceInfo: {
    deviceName?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    location?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(userSessions).values({
    userId,
    token,
    deviceName: deviceInfo.deviceName || "Unknown Device",
    deviceType: deviceInfo.deviceType || "unknown",
    browser: deviceInfo.browser || "Unknown",
    os: deviceInfo.os || "Unknown",
    ipAddress: deviceInfo.ipAddress,
    location: deviceInfo.location,
    expiresAt,
    isActive: 1,
  });
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
