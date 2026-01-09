/**
 * Notification Preferences Router
 * tRPC router for managing user notification preferences
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import * as notificationPreferencesService from '../services/notificationPreferencesService';

export const notificationPreferencesRouter = router({
  // Alias for getMyPreferences (used by NotificationChannelsSettings page)
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const prefs = await notificationPreferencesService.getOrCreatePreferences(userId);
      return prefs;
    }),

  // Get current user's notification preferences
  getMyPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const prefs = await notificationPreferencesService.getOrCreatePreferences(userId);
      return prefs;
    }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      emailEnabled: z.boolean().optional(),
      emailAddress: z.string().email().optional().nullable(),
      telegramEnabled: z.boolean().optional(),
      telegramChatId: z.string().optional().nullable(),
      pushEnabled: z.boolean().optional(),
      severityFilter: z.enum(['all', 'warning_up', 'critical_only']).optional(),
      quietHoursEnabled: z.boolean().optional(),
      quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      // Ensure preferences exist
      await notificationPreferencesService.getOrCreatePreferences(userId);
      
      // Update preferences
      const updated = await notificationPreferencesService.updatePreferences(userId, {
        emailEnabled: input.emailEnabled,
        emailAddress: input.emailAddress ?? undefined,
        telegramEnabled: input.telegramEnabled,
        telegramChatId: input.telegramChatId ?? undefined,
        pushEnabled: input.pushEnabled,
        severityFilter: input.severityFilter,
        quietHoursEnabled: input.quietHoursEnabled,
        quietHoursStart: input.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd,
      });

      return updated;
    }),

  // Update notification preferences (alias for updatePreferences)
  update: protectedProcedure
    .input(z.object({
      emailEnabled: z.number().min(0).max(1).optional(),
      emailAddress: z.string().optional().nullable(),
      telegramEnabled: z.number().min(0).max(1).optional(),
      telegramChatId: z.string().optional().nullable(),
      pushEnabled: z.number().min(0).max(1).optional(),
      severityFilter: z.enum(['all', 'warning_up', 'critical_only']).optional(),
      quietHoursEnabled: z.number().min(0).max(1).optional(),
      quietHoursStart: z.string().optional(),
      quietHoursEnd: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      // Ensure preferences exist
      await notificationPreferencesService.getOrCreatePreferences(userId);
      
      // Update preferences
      await notificationPreferencesService.updatePreferences(userId, {
        emailEnabled: input.emailEnabled === 1 ? true : input.emailEnabled === 0 ? false : undefined,
        emailAddress: input.emailAddress ?? undefined,
        telegramEnabled: input.telegramEnabled === 1 ? true : input.telegramEnabled === 0 ? false : undefined,
        telegramChatId: input.telegramChatId ?? undefined,
        pushEnabled: input.pushEnabled === 1 ? true : input.pushEnabled === 0 ? false : undefined,
        severityFilter: input.severityFilter,
        quietHoursEnabled: input.quietHoursEnabled === 1 ? true : input.quietHoursEnabled === 0 ? false : undefined,
        quietHoursStart: input.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd,
      });

      return { success: true };
    }),

  // Reset to default preferences
  resetToDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      const updated = await notificationPreferencesService.updatePreferences(userId, {
        emailEnabled: true,
        telegramEnabled: false,
        pushEnabled: true,
        severityFilter: 'warning_up',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });

      return updated;
    }),

  // Test email notification
  testEmail: protectedProcedure
    .input(z.object({
      email: z.string().email('Email không hợp lệ'),
    }))
    .mutation(async ({ input }) => {
      const { sendEmail, getSmtpConfig } = await import('../emailService');
      
      // Check SMTP config
      const smtpConfig = await getSmtpConfig();
      if (!smtpConfig) {
        return {
          success: false,
          error: 'SMTP chưa được cấu hình. Vui lòng cấu hình SMTP trong phần Cài đặt.',
        };
      }

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">✅ Test Email Thành Công!</h2>
          <p>Đây là email test từ hệ thống IoT/SPC.</p>
          <p>Nếu bạn nhận được email này, cấu hình email của bạn đã hoạt động đúng.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Thời gian gửi: ${new Date().toLocaleString('vi-VN')}<br/>
            Hệ thống: CPK/SPC Calculator
          </p>
        </div>
      `;

      const result = await sendEmail(
        input.email,
        '[TEST] Kiểm tra cấu hình Email - IoT/SPC System',
        testHtml
      );

      return {
        success: result.success,
        error: result.error,
        smtpHost: smtpConfig.host,
      };
    }),

  // Test Telegram notification
  testTelegram: protectedProcedure
    .input(z.object({
      chatId: z.string().min(1, 'Chat ID không được để trống'),
    }))
    .mutation(async ({ input }) => {
      const telegramService = await import('../services/telegramService');
      
      // Get active Telegram configs
      const configs = await telegramService.getTelegramConfigs();
      const activeConfig = configs.find(c => c.isActive);
      
      if (!activeConfig) {
        return {
          success: false,
          error: 'Chưa có cấu hình Telegram Bot nào được kích hoạt. Vui lòng cấu hình trong phần Telegram Settings.',
        };
      }

      // Send test message using the active bot
      const testMessage = `
✅ *Test Telegram Thành Công!*

Đây là tin nhắn test từ hệ thống IoT/SPC.

📍 *Chat ID:* ${input.chatId}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}
🤖 *Bot:* ${activeConfig.name}

Nếu bạn nhận được tin nhắn này, cấu hình Telegram của bạn đã hoạt động đúng.
      `;

      try {
        const response = await fetch(
          `https://api.telegram.org/bot${activeConfig.botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: input.chatId,
              text: testMessage,
              parse_mode: 'Markdown',
            }),
          }
        );

        const result = await response.json();

        if (!result.ok) {
          return {
            success: false,
            error: result.description || 'Không thể gửi tin nhắn Telegram',
          };
        }

        return {
          success: true,
          botName: activeConfig.name,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Lỗi không xác định',
        };
      }
    }),
});
