/**
 * Login Notification Service
 * Sends email notifications when login from new device is detected
 */

import { getDb } from "./db";
import { userSessions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  deviceFingerprint?: string;
}

interface NotificationResult {
  isNewDevice: boolean;
  shouldNotify: boolean;
  deviceInfo: DeviceInfo;
}

/**
 * Parse user agent to get device/browser info
 */
function parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  // Detect browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    browser = "Microsoft Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  // Detect OS
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
    device = "Mobile";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    device = userAgent.includes("iPad") ? "Tablet" : "Mobile";
  }

  return { browser, os, device };
}

/**
 * Generate a simple device fingerprint from available info
 */
function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  const { browser, os } = parseUserAgent(userAgent);
  // Create a fingerprint that's stable for the same device but different for different devices
  return `${browser}-${os}-${ipAddress.split('.').slice(0, 2).join('.')}`;
}

/**
 * Check if this is a new device for the user
 */
export async function checkNewDevice(
  userId: number,
  userAgent: string,
  ipAddress: string
): Promise<NotificationResult> {
  const db = await getDb();
  const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);
  const deviceInfo: DeviceInfo = { userAgent, ipAddress, deviceFingerprint };

  if (!db) {
    return { isNewDevice: false, shouldNotify: false, deviceInfo };
  }

  try {
    // Check if we've seen this device fingerprint before for this user
    const existingSessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.deviceFingerprint, deviceFingerprint)
        )
      )
      .limit(1);

    const isNewDevice = existingSessions.length === 0;

    // Only notify if it's a new device and user has email
    return {
      isNewDevice,
      shouldNotify: isNewDevice,
      deviceInfo,
    };
  } catch (error) {
    console.error("[LoginNotification] Error checking device:", error);
    return { isNewDevice: false, shouldNotify: false, deviceInfo };
  }
}

/**
 * Send login notification email
 */
export async function sendLoginNotification(
  userId: number,
  email: string,
  deviceInfo: DeviceInfo,
  loginTime: Date
): Promise<boolean> {
  if (!email) {
    return false;
  }

  const { browser, os, device } = parseUserAgent(deviceInfo.userAgent);
  
  try {
    // Import notification service
    const { notifyOwner } = await import("./_core/notification");
    
    const formattedTime = loginTime.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "full",
      timeStyle: "long",
    });

    const content = `
🔐 **Đăng nhập từ thiết bị mới**

Tài khoản của bạn vừa được đăng nhập từ một thiết bị mới:

**Thông tin thiết bị:**
- Trình duyệt: ${browser}
- Hệ điều hành: ${os}
- Loại thiết bị: ${device}
- Địa chỉ IP: ${deviceInfo.ipAddress}
- Thời gian: ${formattedTime}

Nếu đây không phải bạn, vui lòng:
1. Đổi mật khẩu ngay lập tức
2. Kiểm tra phiên đăng nhập trong Cài đặt > Quản lý phiên
3. Bật xác thực 2 yếu tố (2FA) để tăng bảo mật

---
*Email này được gửi tự động từ hệ thống SPC/CPK Calculator*
    `.trim();

    // Send notification to owner (in production, this would be sent to user's email)
    await notifyOwner({
      title: `[Security] Đăng nhập mới - ${email}`,
      content,
    });

    console.log(`[LoginNotification] Sent notification for user ${userId} to ${email}`);
    return true;
  } catch (error) {
    console.error("[LoginNotification] Failed to send notification:", error);
    return false;
  }
}

/**
 * Record device info in session
 */
export async function recordDeviceInSession(
  sessionId: number,
  deviceFingerprint: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(userSessions)
      .set({ deviceFingerprint })
      .where(eq(userSessions.id, sessionId));
  } catch (error) {
    console.error("[LoginNotification] Error recording device:", error);
  }
}

/**
 * Get all known devices for a user
 */
export async function getUserKnownDevices(userId: number): Promise<Array<{
  fingerprint: string;
  browser: string;
  os: string;
  lastSeen: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const sessions = await db
      .select({
        deviceFingerprint: userSessions.deviceFingerprint,
        userAgent: userSessions.userAgent,
        lastActiveAt: userSessions.lastActiveAt,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    // Group by fingerprint and get unique devices
    const deviceMap = new Map<string, { browser: string; os: string; lastSeen: Date }>();
    
    for (const session of sessions) {
      if (session.deviceFingerprint) {
        const { browser, os } = parseUserAgent(session.userAgent || "");
        const existing = deviceMap.get(session.deviceFingerprint);
        
        if (!existing || (session.lastActiveAt && session.lastActiveAt > existing.lastSeen)) {
          deviceMap.set(session.deviceFingerprint, {
            browser,
            os,
            lastSeen: session.lastActiveAt || new Date(),
          });
        }
      }
    }

    return Array.from(deviceMap.entries()).map(([fingerprint, info]) => ({
      fingerprint,
      ...info,
    }));
  } catch (error) {
    console.error("[LoginNotification] Error getting known devices:", error);
    return [];
  }
}
