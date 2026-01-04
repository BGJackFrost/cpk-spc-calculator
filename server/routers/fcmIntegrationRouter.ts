/**
 * FCM Integration Router - Firebase Cloud Messaging Integration
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
  subscribeToTopic as fcmSubscribeToTopic,
  unsubscribeFromTopic as fcmUnsubscribeFromTopic,
  isFirebaseInitialized,
} from '../services/firebaseAdminService';

// In-memory storage for topics
const topicsStore = new Map<string, {
  id: number;
  name: string;
  displayName: string;
  description: string;
  subscriberCount: number;
  isActive: boolean;
  createdAt: number;
}>();

// Initialize default topics
const defaultTopics = [
  { name: 'cpk_alerts', displayName: 'CPK Alerts', description: 'Thông báo khi CPK vượt ngưỡng' },
  { name: 'spc_alerts', displayName: 'SPC Alerts', description: 'Thông báo vi phạm SPC rules' },
  { name: 'oee_alerts', displayName: 'OEE Alerts', description: 'Thông báo OEE thấp' },
  { name: 'iot_alerts', displayName: 'IoT Alerts', description: 'Thông báo từ IoT sensors' },
  { name: 'system_alerts', displayName: 'System Alerts', description: 'Thông báo hệ thống' },
];

defaultTopics.forEach((topic, index) => {
  topicsStore.set(topic.name, {
    id: index + 1,
    ...topic,
    subscriberCount: 0,
    isActive: true,
    createdAt: Date.now(),
  });
});

// In-memory notification history
const notificationHistory: Array<{
  id: number;
  type: string;
  title: string;
  body: string;
  targetType: 'device' | 'topic' | 'multiple';
  targetValue: string;
  status: 'sent' | 'failed';
  successCount: number;
  failureCount: number;
  createdAt: number;
}> = [];

let historyIdCounter = 1;

export const fcmIntegrationRouter = router({
  // Get FCM status
  getStatus: protectedProcedure.query(async () => {
    return {
      isInitialized: isFirebaseInitialized(),
      isConfigured: isFirebaseInitialized(),
      activeDevices: 0,
      activeTopics: topicsStore.size,
      lastCheck: Date.now(),
    };
  }),

  // Get statistics
  getStatistics: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }).optional())
    .query(async ({ input }) => {
      const days = input?.days || 7;
      const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
      const filteredHistory = notificationHistory.filter(h => h.createdAt >= startTime);

      return {
        totalSent: filteredHistory.length,
        successCount: filteredHistory.reduce((sum, h) => sum + h.successCount, 0),
        failureCount: filteredHistory.reduce((sum, h) => sum + h.failureCount, 0),
        byType: {
          device: filteredHistory.filter(h => h.targetType === 'device').length,
          topic: filteredHistory.filter(h => h.targetType === 'topic').length,
          multiple: filteredHistory.filter(h => h.targetType === 'multiple').length,
        },
      };
    }),

  // Get notification history
  getHistory: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const sorted = [...notificationHistory].sort((a, b) => b.createdAt - a.createdAt);
      const items = sorted.slice(start, start + pageSize);

      return { items, total: notificationHistory.length, page, pageSize, totalPages: Math.ceil(notificationHistory.length / pageSize) };
    }),

  // Send to single device
  sendToDevice: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      data: z.record(z.string()).optional(),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isFirebaseInitialized()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Firebase not initialized' });
      }

      try {
        const result = await sendToDevice(input.token, {
          title: input.title,
          body: input.body,
          data: input.data,
          imageUrl: input.imageUrl,
        });

        notificationHistory.push({
          id: historyIdCounter++,
          type: 'direct',
          title: input.title,
          body: input.body,
          targetType: 'device',
          targetValue: input.token.substring(0, 20) + '...',
          status: result.success ? 'sent' : 'failed',
          successCount: result.success ? 1 : 0,
          failureCount: result.success ? 0 : 1,
          createdAt: Date.now(),
        });

        return { success: result.success, messageId: result.messageId };
      } catch (error: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  // Send to topic
  sendToTopic: protectedProcedure
    .input(z.object({
      topic: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      data: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isFirebaseInitialized()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Firebase not initialized' });
      }

      try {
        const result = await sendToTopic(input.topic, {
          title: input.title,
          body: input.body,
          data: input.data,
        });

        notificationHistory.push({
          id: historyIdCounter++,
          type: 'topic',
          title: input.title,
          body: input.body,
          targetType: 'topic',
          targetValue: input.topic,
          status: result.success ? 'sent' : 'failed',
          successCount: result.success ? 1 : 0,
          failureCount: result.success ? 0 : 1,
          createdAt: Date.now(),
        });

        return { success: result.success, messageId: result.messageId };
      } catch (error: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  // Send to multiple devices
  sendToMultiple: protectedProcedure
    .input(z.object({
      tokens: z.array(z.string()).min(1).max(500),
      title: z.string().min(1),
      body: z.string().min(1),
      data: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isFirebaseInitialized()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Firebase not initialized' });
      }

      try {
        const result = await sendToMultipleDevices(input.tokens, {
          title: input.title,
          body: input.body,
          data: input.data,
        });

        notificationHistory.push({
          id: historyIdCounter++,
          type: 'batch',
          title: input.title,
          body: input.body,
          targetType: 'multiple',
          targetValue: `${input.tokens.length} devices`,
          status: result.successCount > 0 ? 'sent' : 'failed',
          successCount: result.successCount,
          failureCount: result.failureCount,
          createdAt: Date.now(),
        });

        return { success: result.successCount > 0, successCount: result.successCount, failureCount: result.failureCount };
      } catch (error: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  // Send test notification
  sendTestNotification: protectedProcedure.mutation(async () => {
    return { success: true, message: 'Test notification simulated', timestamp: Date.now() };
  }),

  // Send CPK alert
  sendCpkAlert: protectedProcedure
    .input(z.object({
      planName: z.string(),
      cpkValue: z.number(),
      threshold: z.number(),
      severity: z.enum(['warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      const title = input.severity === 'critical' 
        ? `🚨 CPK Critical: ${input.planName}`
        : `⚠️ CPK Warning: ${input.planName}`;
      const body = `CPK = ${input.cpkValue.toFixed(2)} (Threshold: ${input.threshold.toFixed(2)})`;

      if (!isFirebaseInitialized()) {
        return { success: false, message: 'Firebase not initialized', sentCount: 0 };
      }

      try {
        const result = await sendToTopic('cpk_alerts', { title, body, data: { type: 'cpk_alert', severity: input.severity } });
        return { success: result.success, sentCount: result.success ? 1 : 0, messageId: result.messageId };
      } catch (error: any) {
        return { success: false, message: error.message, sentCount: 0 };
      }
    }),

  // Get all topics
  getTopics: protectedProcedure.query(async () => {
    return Array.from(topicsStore.values());
  }),

  // Create topic
  createTopic: protectedProcedure
    .input(z.object({
      name: z.string().min(1).regex(/^[a-z0-9_]+$/),
      displayName: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (topicsStore.has(input.name)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Topic already exists' });
      }

      const newTopic = {
        id: topicsStore.size + 1,
        name: input.name,
        displayName: input.displayName,
        description: input.description || '',
        subscriberCount: 0,
        isActive: true,
        createdAt: Date.now(),
      };

      topicsStore.set(input.name, newTopic);
      return newTopic;
    }),

  // Subscribe to topic
  subscribeToTopic: protectedProcedure
    .input(z.object({ tokens: z.array(z.string()).min(1), topic: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (!isFirebaseInitialized()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Firebase not initialized' });
      }

      try {
        const result = await fcmSubscribeToTopic(input.tokens, input.topic);
        const topic = topicsStore.get(input.topic);
        if (topic) topic.subscriberCount += result.successCount;
        return { success: result.successCount > 0, successCount: result.successCount, failureCount: result.failureCount };
      } catch (error: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  // Unsubscribe from topic
  unsubscribeFromTopic: protectedProcedure
    .input(z.object({ tokens: z.array(z.string()).min(1), topic: z.string().min(1) }))
    .mutation(async ({ input }) => {
      if (!isFirebaseInitialized()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Firebase not initialized' });
      }

      try {
        const result = await fcmUnsubscribeFromTopic(input.tokens, input.topic);
        const topic = topicsStore.get(input.topic);
        if (topic) topic.subscriberCount = Math.max(0, topic.subscriberCount - result.successCount);
        return { success: result.successCount > 0, successCount: result.successCount, failureCount: result.failureCount };
      } catch (error: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),
});

export default fcmIntegrationRouter;
