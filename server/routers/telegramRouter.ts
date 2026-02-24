/**
 * Telegram Router - API endpoints cho Telegram Bot integration
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import telegramService, { AlertType } from '../services/telegramService';

export const telegramRouter = router({
  // Get default config for Settings page
  getConfig: protectedProcedure.query(async () => {
    const configs = await telegramService.getTelegramConfigs();
    const defaultConfig = configs.find(c => c.isActive) || configs[0];
    if (defaultConfig) {
      return {
        botToken: defaultConfig.botToken,
        chatId: defaultConfig.chatId,
        isEnabled: defaultConfig.isActive,
      };
    }
    return { botToken: '', chatId: '', isEnabled: false };
  }),

  // Save config from Settings page
  saveConfig: protectedProcedure
    .input(z.object({
      botToken: z.string(),
      chatId: z.string(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const configs = await telegramService.getTelegramConfigs();
      const existingConfig = configs.find(c => c.isActive) || configs[0];
      
      if (existingConfig) {
        return telegramService.updateTelegramConfig(existingConfig.id, {
          botToken: input.botToken,
          chatId: input.chatId,
          isActive: input.isEnabled,
        });
      } else {
        return telegramService.createTelegramConfig({
          botToken: input.botToken,
          chatId: input.chatId,
          name: 'Default Config',
          isActive: input.isEnabled,
          alertTypes: ['spc_violation', 'cpk_alert', 'iot_critical', 'maintenance', 'system_error'],
          createdBy: ctx.user?.id,
        });
      }
    }),

  // Test connection from Settings page
  testConnection: protectedProcedure
    .input(z.object({
      botToken: z.string(),
      chatId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${input.botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: input.chatId,
              text: '✅ Test kết nối thành công!\n\nHệ thống CPK/SPC đã kết nối với Telegram Bot của bạn.',
              parse_mode: 'HTML',
            }),
          }
        );
        const result = await response.json();
        if (result.ok) {
          return { success: true };
        } else {
          return { success: false, error: result.description || 'Unknown error' };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

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
        'ai_vision_critical',
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
      { value: 'ai_vision_critical', label: 'AI Vision Lỗi nghiêm trọng', description: 'Cảnh báo khi AI Vision phát hiện lỗi nghiêm trọng' },
    ];
  }),
});

export default telegramRouter;
