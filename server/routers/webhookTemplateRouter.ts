/**
 * Webhook Template Router - API endpoints cho quản lý webhook templates
 * Hỗ trợ Telegram, Zalo, Slack, Teams, Discord và Custom webhooks
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { webhookTemplates, webhookTemplateLogs } from '../../drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// Placeholder variables for templates
const TEMPLATE_PLACEHOLDERS = [
  { key: '{{cpk}}', description: 'Giá trị CPK hiện tại' },
  { key: '{{cp}}', description: 'Giá trị Cp hiện tại' },
  { key: '{{product}}', description: 'Tên sản phẩm' },
  { key: '{{product_code}}', description: 'Mã sản phẩm' },
  { key: '{{station}}', description: 'Tên công trạm' },
  { key: '{{line}}', description: 'Tên dây chuyền' },
  { key: '{{machine}}', description: 'Tên máy' },
  { key: '{{usl}}', description: 'Giới hạn trên (USL)' },
  { key: '{{lsl}}', description: 'Giới hạn dưới (LSL)' },
  { key: '{{mean}}', description: 'Giá trị trung bình' },
  { key: '{{stddev}}', description: 'Độ lệch chuẩn' },
  { key: '{{sample_count}}', description: 'Số lượng mẫu' },
  { key: '{{timestamp}}', description: 'Thời gian sự kiện' },
  { key: '{{date}}', description: 'Ngày sự kiện' },
  { key: '{{time}}', description: 'Giờ sự kiện' },
  { key: '{{severity}}', description: 'Mức độ nghiêm trọng' },
  { key: '{{alert_type}}', description: 'Loại cảnh báo' },
  { key: '{{message}}', description: 'Nội dung chi tiết' },
];

// Event types
const EVENT_TYPES = [
  { value: 'spc_violation', label: 'Vi phạm SPC' },
  { value: 'cpk_alert', label: 'Cảnh báo CPK' },
  { value: 'quality_issue', label: 'Vấn đề chất lượng' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'oee_low', label: 'OEE thấp' },
  { value: 'defect_detected', label: 'Phát hiện lỗi' },
  { value: 'system', label: 'Hệ thống' },
];

// Helper function to render template with data
function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
  }
  return result;
}

// Helper function to send webhook
async function sendWebhook(
  template: any,
  eventData: Record<string, any>
): Promise<{ success: boolean; responseStatus?: number; responseBody?: string; error?: string }> {
  try {
    const renderedTitle = template.templateTitle ? renderTemplate(template.templateTitle, eventData) : '';
    const renderedBody = renderTemplate(template.templateBody, eventData);

    let url = '';
    let method = 'POST';
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any = {};

    switch (template.channelType) {
      case 'telegram':
        url = `https://api.telegram.org/bot${template.telegramBotToken}/sendMessage`;
        body = {
          chat_id: template.telegramChatId,
          text: renderedTitle ? `<b>${renderedTitle}</b>\n\n${renderedBody}` : renderedBody,
          parse_mode: template.telegramParseMode || 'HTML',
        };
        break;

      case 'zalo':
        // Zalo OA API
        url = `https://openapi.zalo.me/v2.0/oa/message`;
        headers['access_token'] = template.zaloAccessToken;
        body = {
          recipient: { user_id: template.zaloOaId },
          message: { text: renderedBody },
        };
        break;

      case 'slack':
        url = template.webhookUrl;
        body = {
          text: renderedTitle || 'Thông báo từ CPK/SPC System',
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: renderedBody },
            },
          ],
        };
        break;

      case 'teams':
        url = template.webhookUrl;
        body = {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: eventData.severity === 'critical' ? 'FF0000' : eventData.severity === 'warning' ? 'FFA500' : '0076D7',
          summary: renderedTitle || 'Thông báo từ CPK/SPC System',
          sections: [
            {
              activityTitle: renderedTitle,
              text: renderedBody,
            },
          ],
        };
        break;

      case 'discord':
        url = template.webhookUrl;
        body = {
          content: renderedTitle,
          embeds: [
            {
              description: renderedBody,
              color: eventData.severity === 'critical' ? 0xFF0000 : eventData.severity === 'warning' ? 0xFFA500 : 0x0076D7,
            },
          ],
        };
        break;

      case 'custom':
      default:
        url = template.webhookUrl;
        method = template.webhookMethod || 'POST';
        
        // Parse custom headers
        if (template.webhookHeaders) {
          const customHeaders = typeof template.webhookHeaders === 'string' 
            ? JSON.parse(template.webhookHeaders) 
            : template.webhookHeaders;
          headers = { ...headers, ...customHeaders };
        }

        // Handle auth
        if (template.webhookAuthType === 'bearer' && template.webhookAuthValue) {
          headers['Authorization'] = `Bearer ${template.webhookAuthValue}`;
        } else if (template.webhookAuthType === 'api_key' && template.webhookAuthValue) {
          headers['X-API-Key'] = template.webhookAuthValue;
        }

        body = {
          title: renderedTitle,
          message: renderedBody,
          severity: eventData.severity,
          timestamp: new Date().toISOString(),
          data: eventData,
        };
        break;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      responseStatus: response.status,
      responseBody: responseText,
      error: response.ok ? undefined : responseText,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export const webhookTemplateRouter = router({
  // Get all templates for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const templates = await db!
      .select()
      .from(webhookTemplates)
      .where(eq(webhookTemplates.userId, ctx.user!.id))
      .orderBy(desc(webhookTemplates.createdAt));
    return templates;
  }),

  // Get template by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [template] = await db!
        .select()
        .from(webhookTemplates)
        .where(and(
          eq(webhookTemplates.id, input.id),
          eq(webhookTemplates.userId, ctx.user!.id)
        ));
      return template || null;
    }),

  // Get placeholders and event types
  getMetadata: protectedProcedure.query(async () => {
    return {
      placeholders: TEMPLATE_PLACEHOLDERS,
      eventTypes: EVENT_TYPES,
      channelTypes: [
        { value: 'telegram', label: 'Telegram', icon: 'MessageSquare' },
        { value: 'zalo', label: 'Zalo', icon: 'MessageCircle' },
        { value: 'slack', label: 'Slack', icon: 'Hash' },
        { value: 'teams', label: 'Microsoft Teams', icon: 'Users' },
        { value: 'discord', label: 'Discord', icon: 'Gamepad2' },
        { value: 'custom', label: 'Custom Webhook', icon: 'Globe' },
      ],
    };
  }),

  // Create new template
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      channelType: z.enum(['telegram', 'zalo', 'slack', 'teams', 'discord', 'custom']),
      templateTitle: z.string().optional(),
      templateBody: z.string().min(1),
      templateFormat: z.enum(['text', 'markdown', 'html', 'json']).default('text'),
      // Zalo
      zaloOaId: z.string().optional(),
      zaloAccessToken: z.string().optional(),
      zaloTemplateId: z.string().optional(),
      // Telegram
      telegramBotToken: z.string().optional(),
      telegramChatId: z.string().optional(),
      telegramParseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
      // Custom webhook
      webhookUrl: z.string().optional(),
      webhookMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
      webhookHeaders: z.any().optional(),
      webhookAuthType: z.enum(['none', 'bearer', 'basic', 'api_key']).optional(),
      webhookAuthValue: z.string().optional(),
      // Filters
      events: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      workstationIds: z.array(z.number()).optional(),
      productCodes: z.array(z.string()).optional(),
      minSeverity: z.enum(['info', 'warning', 'critical']).optional(),
      rateLimitMinutes: z.number().optional(),
      isActive: z.boolean().default(true),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db!.insert(webhookTemplates).values({
        userId: ctx.user!.id,
        name: input.name,
        description: input.description,
        channelType: input.channelType,
        templateTitle: input.templateTitle,
        templateBody: input.templateBody,
        templateFormat: input.templateFormat,
        zaloOaId: input.zaloOaId,
        zaloAccessToken: input.zaloAccessToken,
        zaloTemplateId: input.zaloTemplateId,
        telegramBotToken: input.telegramBotToken,
        telegramChatId: input.telegramChatId,
        telegramParseMode: input.telegramParseMode,
        webhookUrl: input.webhookUrl,
        webhookMethod: input.webhookMethod,
        webhookHeaders: input.webhookHeaders,
        webhookAuthType: input.webhookAuthType,
        webhookAuthValue: input.webhookAuthValue,
        events: input.events,
        productionLineIds: input.productionLineIds,
        workstationIds: input.workstationIds,
        productCodes: input.productCodes,
        minSeverity: input.minSeverity,
        rateLimitMinutes: input.rateLimitMinutes,
        isActive: input.isActive ? 1 : 0,
        isDefault: input.isDefault ? 1 : 0,
      });
      return { id: result.insertId };
    }),

  // Update template
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      channelType: z.enum(['telegram', 'zalo', 'slack', 'teams', 'discord', 'custom']).optional(),
      templateTitle: z.string().optional(),
      templateBody: z.string().optional(),
      templateFormat: z.enum(['text', 'markdown', 'html', 'json']).optional(),
      zaloOaId: z.string().optional(),
      zaloAccessToken: z.string().optional(),
      zaloTemplateId: z.string().optional(),
      telegramBotToken: z.string().optional(),
      telegramChatId: z.string().optional(),
      telegramParseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
      webhookUrl: z.string().optional(),
      webhookMethod: z.enum(['GET', 'POST', 'PUT']).optional(),
      webhookHeaders: z.any().optional(),
      webhookAuthType: z.enum(['none', 'bearer', 'basic', 'api_key']).optional(),
      webhookAuthValue: z.string().optional(),
      events: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      workstationIds: z.array(z.number()).optional(),
      productCodes: z.array(z.string()).optional(),
      minSeverity: z.enum(['info', 'warning', 'critical']).optional(),
      rateLimitMinutes: z.number().optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      
      const updateData: any = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          if (key === 'isActive' || key === 'isDefault') {
            updateData[key] = value ? 1 : 0;
          } else {
            updateData[key] = value;
          }
        }
      }

      await db!
        .update(webhookTemplates)
        .set(updateData)
        .where(and(
          eq(webhookTemplates.id, id),
          eq(webhookTemplates.userId, ctx.user!.id)
        ));
      
      return { success: true };
    }),

  // Delete template
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db!
        .delete(webhookTemplates)
        .where(and(
          eq(webhookTemplates.id, input.id),
          eq(webhookTemplates.userId, ctx.user!.id)
        ));
      return { success: true };
    }),

  // Test template
  test: protectedProcedure
    .input(z.object({
      id: z.number(),
      testData: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [template] = await db!
        .select()
        .from(webhookTemplates)
        .where(and(
          eq(webhookTemplates.id, input.id),
          eq(webhookTemplates.userId, ctx.user!.id)
        ));

      if (!template) {
        return { success: false, error: 'Template không tồn tại' };
      }

      // Sample test data
      const testData = input.testData || {
        cpk: '1.45',
        cp: '1.67',
        product: 'Sản phẩm Test',
        product_code: 'TEST-001',
        station: 'Công trạm 1',
        line: 'Dây chuyền A',
        machine: 'Máy CNC-01',
        usl: '100',
        lsl: '90',
        mean: '95.5',
        stddev: '1.2',
        sample_count: '50',
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('vi-VN'),
        time: new Date().toLocaleTimeString('vi-VN'),
        severity: 'warning',
        alert_type: 'Test Alert',
        message: 'Đây là tin nhắn test từ hệ thống CPK/SPC Calculator',
      };

      const result = await sendWebhook(template, testData);

      // Log the test
      await db!.insert(webhookTemplateLogs).values({
        templateId: template.id,
        eventType: 'test',
        eventTitle: 'Test Message',
        eventMessage: 'Test message sent',
        eventData: testData,
        severity: 'info',
        renderedTitle: template.templateTitle ? renderTemplate(template.templateTitle, testData) : null,
        renderedBody: renderTemplate(template.templateBody, testData),
        responseStatus: result.responseStatus,
        responseBody: result.responseBody,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        sentAt: result.success ? sql`NOW()` : null,
      });

      // Update template stats
      if (result.success) {
        await db!
          .update(webhookTemplates)
          .set({
            totalSent: sql`total_sent + 1`,
            lastSentAt: sql`NOW()`,
          })
          .where(eq(webhookTemplates.id, template.id));
      } else {
        await db!
          .update(webhookTemplates)
          .set({
            totalFailed: sql`total_failed + 1`,
            lastError: result.error,
          })
          .where(eq(webhookTemplates.id, template.id));
      }

      return result;
    }),

  // Get logs for a template
  getLogs: protectedProcedure
    .input(z.object({
      templateId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      
      // First get user's template IDs
      const userTemplates = await db!
        .select({ id: webhookTemplates.id })
        .from(webhookTemplates)
        .where(eq(webhookTemplates.userId, ctx.user!.id));
      
      const templateIds = userTemplates.map(t => t.id);
      
      if (templateIds.length === 0) {
        return [];
      }

      let query = db!
        .select()
        .from(webhookTemplateLogs)
        .orderBy(desc(webhookTemplateLogs.createdAt))
        .limit(input.limit);

      if (input.templateId) {
        query = query.where(eq(webhookTemplateLogs.templateId, input.templateId)) as any;
      }

      const logs = await query;
      return logs.filter(log => templateIds.includes(log.templateId));
    }),

  // Get sample templates
  getSampleTemplates: protectedProcedure.query(async () => {
    return [
      {
        name: 'Telegram - Cảnh báo CPK',
        channelType: 'telegram',
        templateTitle: '⚠️ Cảnh báo CPK',
        templateBody: `🔴 <b>CPK Alert</b>

📦 Sản phẩm: {{product}} ({{product_code}})
🏭 Dây chuyền: {{line}}
⚙️ Công trạm: {{station}}

📊 Chỉ số:
• CPK: {{cpk}}
• Mean: {{mean}}
• StdDev: {{stddev}}

⏰ Thời gian: {{timestamp}}
📝 {{message}}`,
        templateFormat: 'html',
        events: ['cpk_alert', 'spc_violation'],
      },
      {
        name: 'Zalo - Thông báo chất lượng',
        channelType: 'zalo',
        templateTitle: 'Thông báo chất lượng',
        templateBody: `[THÔNG BÁO CHẤT LƯỢNG]

Sản phẩm: {{product}}
Mã SP: {{product_code}}
Dây chuyền: {{line}}

Chỉ số CPK: {{cpk}}
Số mẫu: {{sample_count}}

Thời gian: {{date}} {{time}}

{{message}}`,
        templateFormat: 'text',
        events: ['quality_issue', 'cpk_alert'],
      },
      {
        name: 'Slack - SPC Violation',
        channelType: 'slack',
        templateTitle: ':warning: SPC Violation Detected',
        templateBody: `*Product:* {{product}} ({{product_code}})
*Line:* {{line}} | *Station:* {{station}}

*Metrics:*
• CPK: {{cpk}} | CP: {{cp}}
• Mean: {{mean}} ± {{stddev}}
• USL: {{usl}} | LSL: {{lsl}}

*Severity:* {{severity}}
*Time:* {{timestamp}}

{{message}}`,
        templateFormat: 'markdown',
        events: ['spc_violation'],
      },
      {
        name: 'Custom Webhook - JSON',
        channelType: 'custom',
        templateTitle: 'Alert Notification',
        templateBody: `{
  "alert_type": "{{alert_type}}",
  "severity": "{{severity}}",
  "product": {
    "code": "{{product_code}}",
    "name": "{{product}}"
  },
  "metrics": {
    "cpk": {{cpk}},
    "mean": {{mean}},
    "stddev": {{stddev}}
  },
  "location": {
    "line": "{{line}}",
    "station": "{{station}}",
    "machine": "{{machine}}"
  },
  "timestamp": "{{timestamp}}",
  "message": "{{message}}"
}`,
        templateFormat: 'json',
        events: ['spc_violation', 'cpk_alert', 'quality_issue'],
      },
    ];
  }),
});
