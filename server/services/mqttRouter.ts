/**
 * MQTT Router - API endpoints cho MQTT service
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getMqttService, IoTTopics, DeviceData } from './mqttService';

export const mqttRouter = router({
  // Kết nối đến MQTT broker
  connect: protectedProcedure
    .input(z.object({
      brokerUrl: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const service = getMqttService(input);
      try {
        await service.connect();
        return { success: true, message: 'Connected to MQTT broker' };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Connection failed' 
        };
      }
    }),

  // Ngắt kết nối
  disconnect: protectedProcedure
    .mutation(async () => {
      const service = getMqttService();
      await service.disconnect();
      return { success: true, message: 'Disconnected from MQTT broker' };
    }),

  // Lấy trạng thái kết nối
  getStatus: publicProcedure
    .query(() => {
      const service = getMqttService();
      return service.getStatus();
    }),

  // Subscribe topic
  subscribe: protectedProcedure
    .input(z.object({
      topic: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        await service.subscribe(input.topic);
        return { success: true, message: `Subscribed to ${input.topic}` };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Subscribe failed' 
        };
      }
    }),

  // Unsubscribe topic
  unsubscribe: protectedProcedure
    .input(z.object({
      topic: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        await service.unsubscribe(input.topic);
        return { success: true, message: `Unsubscribed from ${input.topic}` };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unsubscribe failed' 
        };
      }
    }),

  // Publish message
  publish: protectedProcedure
    .input(z.object({
      topic: z.string(),
      payload: z.union([z.string(), z.record(z.unknown())]),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        await service.publish(input.topic, input.payload);
        return { success: true, message: `Published to ${input.topic}` };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Publish failed' 
        };
      }
    }),

  // Lấy lịch sử message
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(100),
    }).optional())
    .query(({ input }) => {
      const service = getMqttService();
      return service.getHistory(input?.limit);
    }),

  // Xóa lịch sử
  clearHistory: protectedProcedure
    .mutation(() => {
      const service = getMqttService();
      service.clearHistory();
      return { success: true };
    }),

  // Subscribe tất cả devices
  subscribeAllDevices: protectedProcedure
    .mutation(async () => {
      const service = getMqttService();
      try {
        await service.subscribe(IoTTopics.allDevices());
        await service.subscribe(IoTTopics.allAlarms());
        await service.subscribe(IoTTopics.allStatus());
        return { success: true, message: 'Subscribed to all device topics' };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Subscribe failed' 
        };
      }
    }),

  // Subscribe một device cụ thể
  subscribeDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        await service.subscribe(IoTTopics.allDeviceMetrics(input.deviceId));
        await service.subscribe(IoTTopics.deviceAlarm(input.deviceId));
        await service.subscribe(IoTTopics.deviceStatus(input.deviceId));
        return { success: true, message: `Subscribed to device ${input.deviceId}` };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Subscribe failed' 
        };
      }
    }),

  // Gửi command đến device
  sendCommand: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      command: z.string(),
      params: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        const payload = {
          command: input.command,
          params: input.params || {},
          timestamp: new Date().toISOString(),
        };
        await service.publish(IoTTopics.deviceCommand(input.deviceId), payload);
        return { success: true, message: `Command sent to ${input.deviceId}` };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Command failed' 
        };
      }
    }),

  // Test publish (for demo)
  testPublish: protectedProcedure
    .input(z.object({
      deviceId: z.string().default('demo-sensor-01'),
      metric: z.string().default('temperature'),
      value: z.number().default(25),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const service = getMqttService();
      try {
        const topic = IoTTopics.deviceMetric(input.deviceId, input.metric);
        const payload = {
          value: input.value,
          unit: input.unit || '°C',
          timestamp: new Date().toISOString(),
        };
        await service.publish(topic, payload);
        return { success: true, topic, payload };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Test publish failed' 
        };
      }
    }),
});

export type MqttRouter = typeof mqttRouter;
