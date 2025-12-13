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
  role: "user" | "admin";
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
  updates: { name?: string; email?: string; password?: string; role?: "user" | "admin" }
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
