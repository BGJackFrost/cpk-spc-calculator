/**
 * Notification Channel Service
 * 
 * Manages notification channels (Email, Webhook) for performance alerts
 * and other system notifications.
 */

import { sendEmail } from '../emailService';
import { notifyOwner } from '../_core/notification';

// Channel types
export type ChannelType = 'email' | 'webhook' | 'owner';

// Channel status
export type ChannelStatus = 'active' | 'inactive' | 'error';

// Notification channel interface
export interface NotificationChannel {
  id: number;
  name: string;
  type: ChannelType;
  config: EmailConfig | WebhookConfig | OwnerConfig;
  enabled: boolean;
  status: ChannelStatus;
  lastUsedAt?: Date;
  lastError?: string;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Email configuration
export interface EmailConfig {
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  subjectPrefix?: string;
}

// Webhook configuration
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
  timeout?: number;
  retryCount?: number;
}

// Owner notification configuration
export interface OwnerConfig {
  enabled: boolean;
}

// Notification payload
export interface NotificationPayload {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  data?: Record<string, any>;
  htmlContent?: string;
}

// In-memory storage for channels
let channels: NotificationChannel[] = [
  {
    id: 1,
    name: 'System Owner',
    type: 'owner',
    config: { enabled: true } as OwnerConfig,
    enabled: true,
    status: 'active',
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Admin Email',
    type: 'email',
    config: {
      recipients: [],
      subjectPrefix: '[SPC/CPK Alert]',
    } as EmailConfig,
    enabled: false,
    status: 'inactive',
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let channelIdCounter = 3;

/**
 * Get all notification channels
 */
export function getChannels(): NotificationChannel[] {
  return [...channels];
}

/**
 * Get channel by ID
 */
export function getChannelById(id: number): NotificationChannel | undefined {
  return channels.find(c => c.id === id);
}

/**
 * Create a new notification channel
 */
export function createChannel(data: {
  name: string;
  type: ChannelType;
  config: Record<string, any>;
  enabled?: boolean;
}): NotificationChannel {
  const channel: NotificationChannel = {
    id: channelIdCounter++,
    name: data.name,
    type: data.type,
    config: data.config as EmailConfig | WebhookConfig | OwnerConfig,
    enabled: data.enabled ?? true,
    status: data.enabled ? 'active' : 'inactive',
    successCount: 0,
    failureCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  channels.push(channel);
  return channel;
}

/**
 * Update a notification channel
 */
export function updateChannel(
  id: number,
  updates: Partial<{
    name: string;
    config: Record<string, any>;
    enabled: boolean;
  }>
): NotificationChannel | null {
  const channel = channels.find(c => c.id === id);
  if (!channel) return null;
  
  if (updates.name !== undefined) channel.name = updates.name;
  if (updates.config !== undefined) {
    channel.config = updates.config as EmailConfig | WebhookConfig | OwnerConfig;
  }
  if (updates.enabled !== undefined) {
    channel.enabled = updates.enabled;
    channel.status = updates.enabled ? 'active' : 'inactive';
  }
  channel.updatedAt = new Date();
  
  return channel;
}

/**
 * Delete a notification channel
 */
export function deleteChannel(id: number): boolean {
  const index = channels.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  channels.splice(index, 1);
  return true;
}

/**
 * Toggle channel enabled status
 */
export function toggleChannel(id: number, enabled: boolean): boolean {
  const channel = channels.find(c => c.id === id);
  if (!channel) return false;
  
  channel.enabled = enabled;
  channel.status = enabled ? 'active' : 'inactive';
  channel.updatedAt = new Date();
  
  return true;
}

/**
 * Send notification via email channel
 */
async function sendEmailNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<boolean> {
  const config = channel.config as EmailConfig;
  
  if (!config.recipients || config.recipients.length === 0) {
    channel.lastError = 'No recipients configured';
    channel.status = 'error';
    return false;
  }
  
  const subject = config.subjectPrefix
    ? `${config.subjectPrefix} ${payload.title}`
    : payload.title;
  
  const html = payload.htmlContent || `
    <div style="font-family: Arial, sans-serif;">
      <h2 style="color: ${
        payload.severity === 'critical' ? '#dc2626' :
        payload.severity === 'warning' ? '#f59e0b' : '#3b82f6'
      };">${payload.title}</h2>
      <p>${payload.message}</p>
      ${payload.data ? `<pre>${JSON.stringify(payload.data, null, 2)}</pre>` : ''}
    </div>
  `;
  
  try {
    const result = await sendEmail(config.recipients, subject, html);
    
    if (result.success) {
      channel.successCount++;
      channel.lastUsedAt = new Date();
      channel.status = 'active';
      channel.lastError = undefined;
      return true;
    } else {
      channel.failureCount++;
      channel.lastError = result.error || 'Unknown error';
      channel.status = 'error';
      return false;
    }
  } catch (error) {
    channel.failureCount++;
    channel.lastError = error instanceof Error ? error.message : 'Unknown error';
    channel.status = 'error';
    return false;
  }
}

/**
 * Send notification via webhook channel
 */
async function sendWebhookNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<boolean> {
  const config = channel.config as WebhookConfig;
  
  if (!config.url) {
    channel.lastError = 'No webhook URL configured';
    channel.status = 'error';
    return false;
  }
  
  const body = JSON.stringify({
    title: payload.title,
    message: payload.message,
    severity: payload.severity || 'info',
    data: payload.data,
    timestamp: new Date().toISOString(),
  });
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  
  // Add HMAC signature if secret is configured
  if (config.secret) {
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', config.secret)
      .update(body)
      .digest('hex');
    headers['X-Webhook-Signature'] = signature;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout || 10000);
    
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      channel.successCount++;
      channel.lastUsedAt = new Date();
      channel.status = 'active';
      channel.lastError = undefined;
      return true;
    } else {
      channel.failureCount++;
      channel.lastError = `HTTP ${response.status}: ${response.statusText}`;
      channel.status = 'error';
      return false;
    }
  } catch (error) {
    channel.failureCount++;
    channel.lastError = error instanceof Error ? error.message : 'Unknown error';
    channel.status = 'error';
    return false;
  }
}

/**
 * Send notification via owner channel
 */
async function sendOwnerNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const result = await notifyOwner({
      title: payload.title,
      content: payload.message,
    });
    
    if (result) {
      channel.successCount++;
      channel.lastUsedAt = new Date();
      channel.status = 'active';
      channel.lastError = undefined;
      return true;
    } else {
      channel.failureCount++;
      channel.lastError = 'Failed to notify owner';
      channel.status = 'error';
      return false;
    }
  } catch (error) {
    channel.failureCount++;
    channel.lastError = error instanceof Error ? error.message : 'Unknown error';
    channel.status = 'error';
    return false;
  }
}

/**
 * Send notification to a specific channel
 */
export async function sendToChannel(
  channelId: number,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  const channel = channels.find(c => c.id === channelId);
  
  if (!channel) {
    return { success: false, error: 'Channel not found' };
  }
  
  if (!channel.enabled) {
    return { success: false, error: 'Channel is disabled' };
  }
  
  let success = false;
  
  switch (channel.type) {
    case 'email':
      success = await sendEmailNotification(channel, payload);
      break;
    case 'webhook':
      success = await sendWebhookNotification(channel, payload);
      break;
    case 'owner':
      success = await sendOwnerNotification(channel, payload);
      break;
  }
  
  return {
    success,
    error: success ? undefined : channel.lastError,
  };
}

/**
 * Send notification to all enabled channels
 */
export async function sendToAllChannels(
  payload: NotificationPayload
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{ channelId: number; channelName: string; success: boolean; error?: string }>;
}> {
  const enabledChannels = channels.filter(c => c.enabled);
  const results: Array<{ channelId: number; channelName: string; success: boolean; error?: string }> = [];
  
  for (const channel of enabledChannels) {
    const result = await sendToChannel(channel.id, payload);
    results.push({
      channelId: channel.id,
      channelName: channel.name,
      success: result.success,
      error: result.error,
    });
  }
  
  return {
    total: enabledChannels.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * Test a notification channel
 */
export async function testChannel(channelId: number): Promise<{
  success: boolean;
  error?: string;
  responseTime?: number;
}> {
  const startTime = Date.now();
  
  const result = await sendToChannel(channelId, {
    title: '🔔 Test Notification',
    message: 'This is a test notification from the SPC/CPK Performance Monitoring System.',
    severity: 'info',
    data: {
      testTime: new Date().toISOString(),
      channelId,
    },
  });
  
  return {
    ...result,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Get channel statistics
 */
export function getChannelStats(): {
  total: number;
  enabled: number;
  byType: Record<ChannelType, number>;
  totalSuccess: number;
  totalFailure: number;
  byStatus: Record<ChannelStatus, number>;
} {
  const byType: Record<ChannelType, number> = {
    email: 0,
    webhook: 0,
    owner: 0,
  };
  
  const byStatus: Record<ChannelStatus, number> = {
    active: 0,
    inactive: 0,
    error: 0,
  };
  
  let totalSuccess = 0;
  let totalFailure = 0;
  
  for (const channel of channels) {
    byType[channel.type]++;
    byStatus[channel.status]++;
    totalSuccess += channel.successCount;
    totalFailure += channel.failureCount;
  }
  
  return {
    total: channels.length,
    enabled: channels.filter(c => c.enabled).length,
    byType,
    totalSuccess,
    totalFailure,
    byStatus,
  };
}

export default {
  getChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel,
  toggleChannel,
  sendToChannel,
  sendToAllChannels,
  testChannel,
  getChannelStats,
};
