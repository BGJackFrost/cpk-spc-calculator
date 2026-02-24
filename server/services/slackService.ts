/**
 * Slack Service - Gửi tin nhắn cảnh báo qua Slack Webhook
 */

export type AlertType = 
  | 'spc_violation'
  | 'cpk_alert'
  | 'iot_critical'
  | 'maintenance'
  | 'system_error'
  | 'oee_drop'
  | 'oee_comparison'
  | 'defect_rate';

const messageTemplates: Record<AlertType, (data: any) => object> = {
  spc_violation: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🚨 Vi phạm SPC Rule', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Dây chuyền:*\n${data.lineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Máy:*\n${data.machineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Rule vi phạm:*\n${data.ruleName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Giá trị:*\n${data.value || 'N/A'}` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  cpk_alert: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '⚠️ Cảnh báo CPK', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Dây chuyền:*\n${data.lineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Sản phẩm:*\n${data.productName || 'N/A'}` },
          { type: 'mrkdwn', text: `*CPK hiện tại:*\n${data.cpk?.toFixed(2) || 'N/A'}` },
          { type: 'mrkdwn', text: `*Ngưỡng:*\n${data.threshold || 1.33}` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  iot_critical: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🔴 Cảnh báo IoT Critical', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Thiết bị:*\n${data.deviceName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Loại sensor:*\n${data.sensorType || 'N/A'}` },
          { type: 'mrkdwn', text: `*Giá trị:*\n${data.value || 'N/A'} ${data.unit || ''}` },
          { type: 'mrkdwn', text: `*Ngưỡng:*\n${data.threshold || 'N/A'}` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  maintenance: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '🔧 Thông báo Bảo trì', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Máy:*\n${data.machineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Loại:*\n${data.maintenanceType || 'N/A'}` },
          { type: 'mrkdwn', text: `*Lịch:*\n${data.scheduledDate || 'N/A'}` },
          { type: 'mrkdwn', text: `*Phụ trách:*\n${data.assignee || 'N/A'}` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  system_error: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '❌ Lỗi Hệ thống', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Module:*\n${data.module || 'N/A'}` },
          { type: 'mrkdwn', text: `*Lỗi:*\n${data.error || 'N/A'}` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  oee_drop: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '📉 Cảnh báo OEE giảm', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Dây chuyền:*\n${data.lineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*OEE hiện tại:*\n${data.currentOee?.toFixed(1) || 'N/A'}%` },
          { type: 'mrkdwn', text: `*OEE trước đó:*\n${data.previousOee?.toFixed(1) || 'N/A'}%` },
          { type: 'mrkdwn', text: `*Giảm:*\n${data.dropPercent?.toFixed(1) || 'N/A'}%` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  oee_comparison: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '📊 Báo cáo So sánh OEE', emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Thời gian:* ${data.timeRange || 'N/A'}` } },
      ...(data.lines || []).map((line: any) => ({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*${line.name}:*\n${line.oee?.toFixed(1) || 'N/A'}%` },
          { type: 'mrkdwn', text: `*Trend:*\n${line.trend === 'up' ? '📈' : line.trend === 'down' ? '📉' : '➡️'}` },
        ]
      })),
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),

  defect_rate: (data) => ({
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '⚠️ Cảnh báo Tỷ lệ lỗi', emoji: true } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Dây chuyền:*\n${data.lineName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Sản phẩm:*\n${data.productName || 'N/A'}` },
          { type: 'mrkdwn', text: `*Tỷ lệ lỗi:*\n${data.defectRate?.toFixed(2) || 'N/A'}%` },
          { type: 'mrkdwn', text: `*Ngưỡng:*\n${data.threshold || 'N/A'}%` },
        ]
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  }),
};

async function sendSlackMessage(
  webhookUrl: string,
  payload: object
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendSlackAlert(
  webhookUrl: string,
  alertType: AlertType,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const template = messageTemplates[alertType];
  if (!template) {
    return { success: false, error: `Unknown alert type: ${alertType}` };
  }

  const payload = template(data);
  return sendSlackMessage(webhookUrl, payload);
}

export async function testSlackWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  const testPayload = {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '✅ Test Slack Webhook', emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: 'Kết nối Slack Webhook thành công!' } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `⏰ ${new Date().toLocaleString('vi-VN')}` }] }
    ]
  };

  return sendSlackMessage(webhookUrl, testPayload);
}

export async function sendOeeComparisonReportToSlack(
  webhookUrl: string,
  lines: Array<{
    lineId: number;
    lineName: string;
    lineCode: string;
    currentOee: number;
    targetOee: number;
    availability: number;
    performance: number;
    quality: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  }>,
  timeRange: string
): Promise<{ success: boolean; error?: string }> {
  const sortedLines = [...lines].sort((a, b) => b.currentOee - a.currentOee);

  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: '📊 Báo cáo So sánh OEE Dây chuyền', emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Khoảng thời gian:* ${timeRange}` } },
    { type: 'divider' },
  ];

  sortedLines.forEach((line, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    const trendIcon = line.trend === 'up' ? '📈' : line.trend === 'down' ? '📉' : '➡️';
    const statusIcon = line.currentOee >= line.targetOee ? '✅' : line.currentOee >= line.targetOee * 0.9 ? '⚠️' : '❌';

    blocks.push({
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `${medal} *${line.lineName}*\n${line.lineCode}` },
        { type: 'mrkdwn', text: `${statusIcon} *OEE:* ${line.currentOee.toFixed(1)}%\n${trendIcon} ${line.changePercent.toFixed(1)}%` },
      ]
    });

    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `A: ${line.availability.toFixed(1)}% | P: ${line.performance.toFixed(1)}% | Q: ${line.quality.toFixed(1)}% | Target: ${line.targetOee}%` }
      ]
    });
  });

  blocks.push(
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `📅 Báo cáo tạo lúc: ${new Date().toLocaleString('vi-VN')}` }] }
  );

  return sendSlackMessage(webhookUrl, { blocks });
}

export default {
  sendSlackAlert,
  testSlackWebhook,
  sendOeeComparisonReportToSlack,
};
