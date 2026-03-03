/**
 * Telegram Service - Gửi tin nhắn cảnh báo qua Telegram Bot
 */
import { getDb } from '../db';
import { telegramConfig, telegramMessageHistory } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface TelegramConfig {
  id: number;
  botToken: string;
  chatId: string;
  name: string;
  description?: string;
  isActive: boolean;
  alertTypes: string[];
  createdBy?: number;
}

export interface TelegramMessage {
  configId: number;
  messageType: string;
  content: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt?: Date;
}

// Alert types that can trigger Telegram notifications
export type AlertType = 
  | 'spc_violation'
  | 'cpk_alert'
  | 'iot_critical'
  | 'maintenance'
  | 'system_error'
  | 'oee_drop'
  | 'defect_rate'
  | 'ai_vision_critical';

// Message templates for different alert types
const messageTemplates: Record<AlertType, (data: any) => string> = {
  spc_violation: (data) => `
🚨 *Vi phạm SPC Rule*

📍 *Dây chuyền:* ${data.lineName || 'N/A'}
🔧 *Máy:* ${data.machineName || 'N/A'}
📊 *Rule vi phạm:* ${data.ruleName || 'N/A'}
📈 *Giá trị:* ${data.value || 'N/A'}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}

${data.description || ''}
`,

  cpk_alert: (data) => `
⚠️ *Cảnh báo CPK*

📍 *Dây chuyền:* ${data.lineName || 'N/A'}
📦 *Sản phẩm:* ${data.productName || 'N/A'}
📊 *CPK hiện tại:* ${data.cpk?.toFixed(2) || 'N/A'}
🎯 *Ngưỡng:* ${data.threshold || 1.33}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}

${data.cpk < 1.0 ? '❌ CPK < 1.0 - Quy trình không đạt yêu cầu!' : '⚠️ CPK < 1.33 - Cần cải thiện quy trình'}
`,

  iot_critical: (data) => `
🔴 *Cảnh báo IoT Critical*

📍 *Thiết bị:* ${data.deviceName || 'N/A'}
🔧 *Loại sensor:* ${data.sensorType || 'N/A'}
📊 *Giá trị:* ${data.value || 'N/A'} ${data.unit || ''}
🎯 *Ngưỡng:* ${data.threshold || 'N/A'}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}

${data.message || 'Giá trị vượt ngưỡng critical!'}
`,

  maintenance: (data) => `
🔧 *Thông báo Bảo trì*

📍 *Máy:* ${data.machineName || 'N/A'}
📋 *Loại:* ${data.maintenanceType || 'N/A'}
📅 *Lịch:* ${data.scheduledDate || 'N/A'}
👤 *Phụ trách:* ${data.assignee || 'N/A'}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}

${data.description || ''}
`,

  system_error: (data) => `
❌ *Lỗi Hệ thống*

🔧 *Module:* ${data.module || 'N/A'}
📋 *Lỗi:* ${data.error || 'N/A'}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}

${data.stackTrace ? '```\n' + data.stackTrace.slice(0, 500) + '\n```' : ''}
`,

  oee_drop: (data) => `
📉 *Cảnh báo OEE giảm*

📍 *Dây chuyền:* ${data.lineName || 'N/A'}
📊 *OEE hiện tại:* ${data.currentOee?.toFixed(1) || 'N/A'}%
📊 *OEE trước đó:* ${data.previousOee?.toFixed(1) || 'N/A'}%
📉 *Giảm:* ${data.dropPercent?.toFixed(1) || 'N/A'}%
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}
`,

  defect_rate: (data) => `
⚠️ *Cảnh báo Tỷ lệ lỗi*

📍 *Dây chuyền:* ${data.lineName || 'N/A'}
📦 *Sản phẩm:* ${data.productName || 'N/A'}
📊 *Tỷ lệ lỗi:* ${data.defectRate?.toFixed(2) || 'N/A'}%
🎯 *Ngưỡng:* ${data.threshold || 'N/A'}%
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}
`,

  ai_vision_critical: (data) => `
🔴 *Cảnh báo AI Vision - Lỗi Nghiêm trọng*

📷 *Phân tích ID:* ${data.analysisId || 'N/A'}
📦 *Sản phẩm:* ${data.productType || 'Chung'}
🏢 *Máy:* ${data.machineName || 'N/A'}
📊 *Điểm chất lượng:* ${data.qualityScore || 0}/100
⚠️ *Số lỗi:* ${data.defectCount || 0}

*Chi tiết lỗi:*
${(data.defects || []).map((d: any) => `• ${d.type} (${d.severity}): ${d.description || ''}`).join('\n')}

📝 *Tóm tắt:* ${data.summary || 'Không có'}
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}
`,
};

/**
 * Gửi tin nhắn qua Telegram Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return { success: false, error: result.description || 'Unknown error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Lấy tất cả cấu hình Telegram
 */
export async function getTelegramConfigs(): Promise<TelegramConfig[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const configs = await db.select().from(telegramConfig).orderBy(desc(telegramConfig.createdAt));
    return configs.map(c => ({
      id: c.id,
      botToken: c.botToken,
      chatId: c.chatId,
      name: c.name,
      description: c.description || undefined,
      isActive: c.isActive === 1,
      alertTypes: (c.alertTypes as string[]) || [],
      createdBy: c.createdBy || undefined,
    }));
  } catch (error) {
    console.error('Error fetching Telegram configs:', error);
    return [];
  }
}

/**
 * Lấy cấu hình Telegram theo ID
 */
export async function getTelegramConfigById(id: number): Promise<TelegramConfig | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const configs = await db.select().from(telegramConfig).where(eq(telegramConfig.id, id)).limit(1);
    if (configs.length === 0) return null;

    const c = configs[0];
    return {
      id: c.id,
      botToken: c.botToken,
      chatId: c.chatId,
      name: c.name,
      description: c.description || undefined,
      isActive: c.isActive === 1,
      alertTypes: (c.alertTypes as string[]) || [],
      createdBy: c.createdBy || undefined,
    };
  } catch (error) {
    console.error('Error fetching Telegram config:', error);
    return null;
  }
}

/**
 * Tạo cấu hình Telegram mới
 */
export async function createTelegramConfig(config: Omit<TelegramConfig, 'id'>): Promise<TelegramConfig | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const result = await db.insert(telegramConfig).values({
      botToken: config.botToken,
      chatId: config.chatId,
      name: config.name,
      description: config.description,
      isActive: config.isActive ? 1 : 0,
      alertTypes: config.alertTypes,
      createdBy: config.createdBy,
    });

    const insertId = Number(result[0].insertId);
    return getTelegramConfigById(insertId);
  } catch (error) {
    console.error('Error creating Telegram config:', error);
    return null;
  }
}

/**
 * Cập nhật cấu hình Telegram
 */
export async function updateTelegramConfig(id: number, config: Partial<TelegramConfig>): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    await db.update(telegramConfig)
      .set({
        ...(config.botToken && { botToken: config.botToken }),
        ...(config.chatId && { chatId: config.chatId }),
        ...(config.name && { name: config.name }),
        ...(config.description !== undefined && { description: config.description }),
        ...(config.isActive !== undefined && { isActive: config.isActive ? 1 : 0 }),
        ...(config.alertTypes && { alertTypes: config.alertTypes }),
      })
      .where(eq(telegramConfig.id, id));

    return true;
  } catch (error) {
    console.error('Error updating Telegram config:', error);
    return false;
  }
}

/**
 * Xóa cấu hình Telegram
 */
export async function deleteTelegramConfig(id: number): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    await db.delete(telegramConfig).where(eq(telegramConfig.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting Telegram config:', error);
    return false;
  }
}

/**
 * Gửi cảnh báo qua Telegram
 */
export async function sendTelegramAlert(
  alertType: AlertType,
  data: any
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const db = getDb();
  const result = { sent: 0, failed: 0, errors: [] as string[] };

  // Get active configs that subscribe to this alert type
  const configs = await getTelegramConfigs();
  const activeConfigs = configs.filter(c => 
    c.isActive && c.alertTypes.includes(alertType)
  );

  if (activeConfigs.length === 0) {
    return result;
  }

  // Generate message from template
  const template = messageTemplates[alertType];
  if (!template) {
    result.errors.push(`Unknown alert type: ${alertType}`);
    return result;
  }

  const message = template(data);

  // Send to all active configs
  for (const config of activeConfigs) {
    const sendResult = await sendTelegramMessage(config.botToken, config.chatId, message);

    // Log message history
    if (db) {
      try {
        await db.insert(telegramMessageHistory).values({
          configId: config.id,
          messageType: alertType,
          content: message,
          status: sendResult.success ? 'sent' : 'failed',
          errorMessage: sendResult.error,
          sentAt: sendResult.success ? new Date() : undefined,
        });
      } catch (error) {
        console.error('Error logging Telegram message:', error);
      }
    }

    if (sendResult.success) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push(`Config ${config.name}: ${sendResult.error}`);
    }
  }

  return result;
}

/**
 * Test gửi tin nhắn Telegram
 */
export async function testTelegramConfig(configId: number): Promise<{ success: boolean; error?: string }> {
  const config = await getTelegramConfigById(configId);
  if (!config) {
    return { success: false, error: 'Config not found' };
  }

  const testMessage = `
✅ *Test Telegram Bot*

Kết nối thành công!
Bot: ${config.name}
Thời gian: ${new Date().toLocaleString('vi-VN')}
`;

  return sendTelegramMessage(config.botToken, config.chatId, testMessage);
}

/**
 * Lấy lịch sử tin nhắn
 */
export async function getTelegramMessageHistory(
  configId?: number,
  limit: number = 50
): Promise<TelegramMessage[]> {
  const db = getDb();
  if (!db) return [];

  try {
    let query = db.select().from(telegramMessageHistory);
    
    if (configId) {
      query = query.where(eq(telegramMessageHistory.configId, configId)) as any;
    }

    const messages = await query
      .orderBy(desc(telegramMessageHistory.createdAt))
      .limit(limit);

    return messages.map(m => ({
      configId: m.configId,
      messageType: m.messageType,
      content: m.content,
      status: m.status as 'sent' | 'failed' | 'pending',
      errorMessage: m.errorMessage || undefined,
      sentAt: m.sentAt ? new Date(m.sentAt) : undefined,
    }));
  } catch (error) {
    console.error('Error fetching Telegram message history:', error);
    return [];
  }
}

export default {
  getTelegramConfigs,
  getTelegramConfigById,
  createTelegramConfig,
  updateTelegramConfig,
  deleteTelegramConfig,
  sendTelegramAlert,
  testTelegramConfig,
  getTelegramMessageHistory,
};
