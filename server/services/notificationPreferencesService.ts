/**
 * Notification Preferences Service
 * Handles CRUD operations for user notification preferences
 */

import { getDb } from '../db';
import { notificationPreferences } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface NotificationPreferencesInput {
  emailEnabled?: boolean;
  emailAddress?: string;
  telegramEnabled?: boolean;
  telegramChatId?: string;
  pushEnabled?: boolean;
  severityFilter?: 'all' | 'warning_up' | 'critical_only';
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Get notification preferences for a user
 */
export async function getPreferencesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return results[0] || null;
}

/**
 * Create default notification preferences for a user
 */
export async function createDefaultPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(notificationPreferences).values({
    userId,
    emailEnabled: 1,
    telegramEnabled: 0,
    pushEnabled: 1,
    severityFilter: 'warning_up',
    quietHoursEnabled: 0,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  return result;
}

/**
 * Update notification preferences for a user
 */
export async function updatePreferences(userId: number, input: NotificationPreferencesInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateData: Record<string, any> = {};

  if (input.emailEnabled !== undefined) {
    updateData.emailEnabled = input.emailEnabled ? 1 : 0;
  }
  if (input.emailAddress !== undefined) {
    updateData.emailAddress = input.emailAddress;
  }
  if (input.telegramEnabled !== undefined) {
    updateData.telegramEnabled = input.telegramEnabled ? 1 : 0;
  }
  if (input.telegramChatId !== undefined) {
    updateData.telegramChatId = input.telegramChatId;
  }
  if (input.pushEnabled !== undefined) {
    updateData.pushEnabled = input.pushEnabled ? 1 : 0;
  }
  if (input.severityFilter !== undefined) {
    updateData.severityFilter = input.severityFilter;
  }
  if (input.quietHoursEnabled !== undefined) {
    updateData.quietHoursEnabled = input.quietHoursEnabled ? 1 : 0;
  }
  if (input.quietHoursStart !== undefined) {
    updateData.quietHoursStart = input.quietHoursStart;
  }
  if (input.quietHoursEnd !== undefined) {
    updateData.quietHoursEnd = input.quietHoursEnd;
  }

  await db
    .update(notificationPreferences)
    .set(updateData)
    .where(eq(notificationPreferences.userId, userId));

  return getPreferencesByUserId(userId);
}

/**
 * Get or create notification preferences for a user
 */
export async function getOrCreatePreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  let prefs = await getPreferencesByUserId(userId);
  
  if (!prefs) {
    await createDefaultPreferences(userId);
    prefs = await getPreferencesByUserId(userId);
  }

  return prefs;
}

/**
 * Check if notification should be sent based on severity and user preferences
 */
export function shouldSendNotification(
  severity: 'info' | 'warning' | 'error' | 'critical',
  severityFilter: 'all' | 'warning_up' | 'critical_only'
): boolean {
  if (severityFilter === 'all') return true;
  
  if (severityFilter === 'warning_up') {
    return severity !== 'info';
  }
  
  if (severityFilter === 'critical_only') {
    return severity === 'critical' || severity === 'error';
  }
  
  return true;
}

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  quietHoursStart: string,
  quietHoursEnd: string
): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const [startHour, startMin] = quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = quietHoursEnd.split(':').map(Number);
  
  const startTime = startHour * 100 + startMin;
  const endTime = endHour * 100 + endMin;
  
  if (startTime <= endTime) {
    // Same day range (e.g., 09:00 - 17:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight range (e.g., 22:00 - 07:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}
