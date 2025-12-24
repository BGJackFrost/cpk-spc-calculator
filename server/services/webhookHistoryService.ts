/**
 * Webhook History Service with Retry Mechanism
 */
import { getDb } from '../db';
import { webhookLogs } from '../../drizzle/schema';
import { eq, desc, and, lt, gte, sql } from 'drizzle-orm';

// Types
export interface WebhookDelivery {
  id: string;
  webhookId: number;
  webhookName: string;
  webhookType: 'slack' | 'teams' | 'custom';
  url: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  statusCode?: number;
  response?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
  alertId?: number;
  alertType?: string;
}

export interface WebhookRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 5,
  initialDelayMs: 60000, // 1 minute
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2,
};

// In-memory webhook delivery queue
const deliveryQueue: WebhookDelivery[] = [];

/**
 * Calculate next retry delay using exponential backoff
 */
function calculateRetryDelay(retryCount: number, config: WebhookRetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Create a new webhook delivery record
 */
export async function createWebhookDelivery(
  webhookId: number,
  webhookName: string,
  webhookType: 'slack' | 'teams' | 'custom',
  url: string,
  payload: any,
  alertId?: number,
  alertType?: string
): Promise<WebhookDelivery> {
  const delivery: WebhookDelivery = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    webhookId,
    webhookName,
    webhookType,
    url,
    payload,
    status: 'pending',
    retryCount: 0,
    maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
    createdAt: new Date(),
    alertId,
    alertType,
  };

  deliveryQueue.unshift(delivery);
  
  // Keep only last 1000 deliveries in memory
  if (deliveryQueue.length > 1000) {
    deliveryQueue.pop();
  }

  return delivery;
}

/**
 * Update webhook delivery status
 */
export function updateDeliveryStatus(
  deliveryId: string,
  status: WebhookDelivery['status'],
  statusCode?: number,
  response?: string,
  error?: string
): WebhookDelivery | null {
  const delivery = deliveryQueue.find(d => d.id === deliveryId);
  
  if (!delivery) {
    return null;
  }

  delivery.status = status;
  delivery.statusCode = statusCode;
  delivery.response = response;
  delivery.error = error;

  if (status === 'success' || status === 'failed') {
    delivery.completedAt = new Date();
  }

  return delivery;
}

/**
 * Schedule retry for failed delivery
 */
export function scheduleRetry(deliveryId: string): WebhookDelivery | null {
  const delivery = deliveryQueue.find(d => d.id === deliveryId);
  
  if (!delivery) {
    return null;
  }

  if (delivery.retryCount >= delivery.maxRetries) {
    delivery.status = 'failed';
    delivery.completedAt = new Date();
    return delivery;
  }

  delivery.retryCount++;
  delivery.status = 'retrying';
  
  const delay = calculateRetryDelay(delivery.retryCount);
  delivery.nextRetryAt = new Date(Date.now() + delay);

  return delivery;
}

/**
 * Get deliveries pending retry
 */
export function getPendingRetries(): WebhookDelivery[] {
  const now = new Date();
  return deliveryQueue.filter(
    d => d.status === 'retrying' && d.nextRetryAt && d.nextRetryAt <= now
  );
}

/**
 * Send webhook with retry support
 */
export async function sendWebhookWithRetry(
  delivery: WebhookDelivery
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(delivery.payload),
    });

    const responseText = await response.text();

    if (response.ok) {
      updateDeliveryStatus(delivery.id, 'success', response.status, responseText);
      return { success: true, statusCode: response.status };
    } else {
      // Non-2xx response, schedule retry
      updateDeliveryStatus(delivery.id, 'retrying', response.status, responseText, `HTTP ${response.status}`);
      scheduleRetry(delivery.id);
      return { success: false, statusCode: response.status, error: `HTTP ${response.status}` };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Network error';
    updateDeliveryStatus(delivery.id, 'retrying', undefined, undefined, errorMessage);
    scheduleRetry(delivery.id);
    return { success: false, error: errorMessage };
  }
}

/**
 * Process pending retries
 */
export async function processRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingRetries = getPendingRetries();
  let succeeded = 0;
  let failed = 0;

  for (const delivery of pendingRetries) {
    const result = await sendWebhookWithRetry(delivery);
    
    if (result.success) {
      succeeded++;
    } else if (delivery.retryCount >= delivery.maxRetries) {
      failed++;
    }

    // Small delay between retries
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    processed: pendingRetries.length,
    succeeded,
    failed,
  };
}

/**
 * Get webhook delivery history
 */
export function getDeliveryHistory(
  options: {
    limit?: number;
    webhookId?: number;
    status?: WebhookDelivery['status'];
    alertId?: number;
  } = {}
): WebhookDelivery[] {
  let filtered = [...deliveryQueue];

  if (options.webhookId !== undefined) {
    filtered = filtered.filter(d => d.webhookId === options.webhookId);
  }

  if (options.status) {
    filtered = filtered.filter(d => d.status === options.status);
  }

  if (options.alertId !== undefined) {
    filtered = filtered.filter(d => d.alertId === options.alertId);
  }

  return filtered.slice(0, options.limit || 100);
}

/**
 * Get webhook statistics
 */
export function getWebhookStatistics(): {
  total: number;
  pending: number;
  success: number;
  failed: number;
  retrying: number;
  avgRetries: number;
  successRate: number;
} {
  const total = deliveryQueue.length;
  const pending = deliveryQueue.filter(d => d.status === 'pending').length;
  const success = deliveryQueue.filter(d => d.status === 'success').length;
  const failed = deliveryQueue.filter(d => d.status === 'failed').length;
  const retrying = deliveryQueue.filter(d => d.status === 'retrying').length;
  
  const totalRetries = deliveryQueue.reduce((sum, d) => sum + d.retryCount, 0);
  const avgRetries = total > 0 ? totalRetries / total : 0;
  
  const completed = success + failed;
  const successRate = completed > 0 ? (success / completed) * 100 : 0;

  return {
    total,
    pending,
    success,
    failed,
    retrying,
    avgRetries: Math.round(avgRetries * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
  };
}

/**
 * Get retry statistics
 */
export function getRetryStatistics(): {
  pendingRetries: number;
  exhaustedRetries: number;
  nextRetryIn?: number;
} {
  const now = new Date();
  const retrying = deliveryQueue.filter(d => d.status === 'retrying');
  const exhausted = deliveryQueue.filter(
    d => d.status === 'failed' && d.retryCount >= d.maxRetries
  );
  
  const pendingRetries = retrying.filter(d => d.nextRetryAt && d.nextRetryAt > now);
  const nextRetry = pendingRetries
    .map(d => d.nextRetryAt!.getTime() - now.getTime())
    .sort((a, b) => a - b)[0];

  return {
    pendingRetries: pendingRetries.length,
    exhaustedRetries: exhausted.length,
    nextRetryIn: nextRetry,
  };
}

/**
 * Manually retry a specific delivery
 */
export async function retryDelivery(deliveryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const delivery = deliveryQueue.find(d => d.id === deliveryId);
  
  if (!delivery) {
    return { success: false, error: 'Delivery not found' };
  }

  if (delivery.status === 'success') {
    return { success: false, error: 'Delivery already succeeded' };
  }

  // Reset for retry
  delivery.status = 'pending';
  delivery.nextRetryAt = undefined;

  const result = await sendWebhookWithRetry(delivery);
  return { success: result.success, error: result.error };
}

/**
 * Clear delivery history
 */
export function clearDeliveryHistory(olderThanDays?: number): number {
  if (olderThanDays === undefined) {
    const count = deliveryQueue.length;
    deliveryQueue.length = 0;
    return count;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  
  const initialLength = deliveryQueue.length;
  const filtered = deliveryQueue.filter(d => d.createdAt >= cutoff);
  deliveryQueue.length = 0;
  deliveryQueue.push(...filtered);
  
  return initialLength - deliveryQueue.length;
}

/**
 * Get delivery by ID
 */
export function getDeliveryById(deliveryId: string): WebhookDelivery | null {
  return deliveryQueue.find(d => d.id === deliveryId) || null;
}

/**
 * Export delivery history to JSON
 */
export function exportDeliveryHistory(): string {
  return JSON.stringify(deliveryQueue, null, 2);
}
