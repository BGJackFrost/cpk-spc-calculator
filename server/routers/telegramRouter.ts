/**
 * Telegram Router - API endpoints cho Telegram Bot integration
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import telegramService, { AlertType } from '../services/telegramService';

export const telegramRouter = router({
  // Get all Telegram configs
  getConfigs: protectedProcedure.query(async () => {
    return telegramService.getTelegramConfigs();
  }),

  // Get config by ID
  getConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return telegramService.getTelegramConfigById(input.id);
    }),

  // Create new config
  createConfig: protectedProcedure
    .input(z.object({
      botToken: z.string().min(1, 'Bot token is required'),
      chatId: z.string().min(1, 'Chat ID is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      alertTypes: z.array(z.string()).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      return telegramService.createTelegramConfig({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),

  // Update config
  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      botToken: z.string().optional(),
      chatId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      alertTypes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return telegramService.updateTelegramConfig(id, data);
    }),

  // Delete config
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return telegramService.deleteTelegramConfig(input.id);
    }),

  // Test config
  testConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return telegramService.testTelegramConfig(input.id);
    }),

  // Send alert
  sendAlert: protectedProcedure
    .input(z.object({
      alertType: z.enum([
        'spc_violation',
        'cpk_alert',
        'iot_critical',
        'maintenance',
        'system_error',
        'oee_drop',
        'defect_rate',
      ]),
      data: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      return telegramService.sendTelegramAlert(input.alertType as AlertType, input.data);
    }),

  // Get message history
  getMessageHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      return telegramService.getTelegramMessageHistory(input?.configId, input?.limit);
    }),

  // Get available alert types
  getAlertTypes: publicProcedure.query(() => {
    return [
      { value: 'spc_violation', label: 'Vi phạm SPC Rule', description: 'Cảnh báo khi vi phạm các quy tắc SPC' },
      { value: 'cpk_alert', label: 'Cảnh báo CPK', description: 'Cảnh báo khi CPK dưới ngưỡng' },
      { value: 'iot_critical', label: 'IoT Critical', description: 'Cảnh báo sensor vượt ngưỡng critical' },
      { value: 'maintenance', label: 'Bảo trì', description: 'Thông báo lịch bảo trì' },
      { value: 'system_error', label: 'Lỗi hệ thống', description: 'Cảnh báo lỗi hệ thống' },
      { value: 'oee_drop', label: 'OEE giảm', description: 'Cảnh báo khi OEE giảm đột ngột' },
      { value: 'defect_rate', label: 'Tỷ lệ lỗi', description: 'Cảnh báo tỷ lệ lỗi cao' },
    ];
  }),
});

export default telegramRouter;
