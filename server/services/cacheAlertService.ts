/**
 * Cache Alert Service
 * Tự động gửi cảnh báo khi hit rate giảm dưới ngưỡng
 */

import { getCacheStats } from '../cache';
import { sendEmail } from '../emailService';
import { notifyOwner } from '../_core/notification';

// Types
export interface CacheAlertConfig {
  id: number;
  name: string;
  hitRateThreshold: number;
  checkIntervalMinutes: number;
  alertChannels: string[];
  emailRecipients: string[];
  enabled: boolean;
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CacheAlertHistory {
  id: number;
  configId: number;
  hitRate: number;
  threshold: number;
  alertType: 'warning' | 'critical';
  message: string;
  sentTo: string[];
  createdAt: Date;
}

// In-memory storage for configs and history
let alertConfigs: CacheAlertConfig[] = [
  {
    id: 1,
    name: 'Low Hit Rate Warning',
    hitRateThreshold: 50,
    checkIntervalMinutes: 5,
    alertChannels: ['notification', 'email'],
    emailRecipients: [],
    enabled: true,
    cooldownMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Critical Hit Rate Alert',
    hitRateThreshold: 30,
    checkIntervalMinutes: 5,
    alertChannels: ['notification', 'email'],
    emailRecipients: [],
    enabled: true,
    cooldownMinutes: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let alertHistory: CacheAlertHistory[] = [];
const lastAlertTime: Map<number, number> = new Map();
let nextHistoryId = 1;
let nextConfigId = 3;

export const cacheAlertService = {
  getAlertConfigs(): CacheAlertConfig[] {
    return [...alertConfigs];
  },

  getAlertConfigById(id: number): CacheAlertConfig | undefined {
    return alertConfigs.find(c => c.id === id);
  },

  createAlertConfig(config: Omit<CacheAlertConfig, 'id' | 'createdAt' | 'updatedAt'>): CacheAlertConfig {
    const newConfig: CacheAlertConfig = {
      ...config,
      id: nextConfigId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    alertConfigs.push(newConfig);
    return newConfig;
  },

  updateAlertConfig(id: number, updates: Partial<CacheAlertConfig>): CacheAlertConfig | undefined {
    const index = alertConfigs.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    alertConfigs[index] = { ...alertConfigs[index], ...updates, updatedAt: new Date() };
    return alertConfigs[index];
  },

  deleteAlertConfig(id: number): boolean {
    const index = alertConfigs.findIndex(c => c.id === id);
    if (index === -1) return false;
    alertConfigs.splice(index, 1);
    return true;
  },

  getAlertHistory(limit: number = 100): CacheAlertHistory[] {
    return alertHistory.slice(-limit).reverse();
  },

  clearAlertHistory(): void {
    alertHistory = [];
  },

  resetCooldowns(): void {
    lastAlertTime.clear();
  },

  async checkAndAlert(): Promise<{ checked: boolean; alertSent: boolean; hitRate: number; message: string }> {
    const stats = getCacheStats();
    const hitRate = stats.hitRate;
    let alertSent = false;
    let message = `Hit rate: ${hitRate.toFixed(1)}%`;

    for (const config of alertConfigs.filter(c => c.enabled)) {
      if (hitRate < config.hitRateThreshold) {
        const lastAlert = lastAlertTime.get(config.id) || 0;
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        
        if (Date.now() - lastAlert < cooldownMs) continue;

        const alertType = hitRate < 30 ? 'critical' : 'warning';
        const alertMessage = `Cache Alert: Hit rate (${hitRate.toFixed(1)}%) below threshold ${config.hitRateThreshold}%`;

        const historyEntry: CacheAlertHistory = {
          id: nextHistoryId++,
          configId: config.id,
          hitRate,
          threshold: config.hitRateThreshold,
          alertType,
          message: alertMessage,
          sentTo: [],
          createdAt: new Date(),
        };

        if (config.alertChannels.includes('notification')) {
          try {
            await notifyOwner({
              title: alertType === 'critical' ? 'Critical Cache Alert' : 'Cache Warning',
              content: alertMessage,
            });
            historyEntry.sentTo.push('notification');
          } catch (error) {
            console.error('[CacheAlertService] Error sending notification:', error);
          }
        }

        if (config.alertChannels.includes('email') && config.emailRecipients.length > 0) {
          try {
            for (const email of config.emailRecipients) {
              await sendEmail({
                to: email,
                subject: alertType === 'critical' ? 'Critical Cache Alert' : 'Cache Warning',
                html: `<h2>${alertMessage}</h2><p>Hit Rate: ${hitRate.toFixed(1)}%</p>`,
              });
              historyEntry.sentTo.push(email);
            }
          } catch (error) {
            console.error('[CacheAlertService] Error sending email:', error);
          }
        }

        alertHistory.push(historyEntry);
        lastAlertTime.set(config.id, Date.now());
        alertSent = true;
        message = alertMessage;
      }
    }

    return { checked: true, alertSent, hitRate, message };
  },
};

export default cacheAlertService;
