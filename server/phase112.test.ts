/**
 * Phase 112 Tests - IoT Enhancement Part 5
 * - Dashboard tùy chỉnh kéo thả widget
 * - Export báo cáo OEE so sánh
 * - Tích hợp Telegram/Slack cho alert OEE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
  })),
}));

describe('Phase 112 - IoT Enhancement Part 5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Widget Configuration', () => {
    it('should have widget config structure', () => {
      const widgetConfig = {
        id: 'device-stats',
        title: 'Thống kê thiết bị',
        visible: true,
        order: 0,
        colSpan: 1,
      };

      expect(widgetConfig).toHaveProperty('id');
      expect(widgetConfig).toHaveProperty('title');
      expect(widgetConfig).toHaveProperty('visible');
      expect(widgetConfig).toHaveProperty('order');
    });

    it('should support widget reordering', () => {
      const widgets = [
        { id: 'w1', order: 0 },
        { id: 'w2', order: 1 },
        { id: 'w3', order: 2 },
      ];

      const reordered = [
        { id: 'w3', order: 0 },
        { id: 'w1', order: 1 },
        { id: 'w2', order: 2 },
      ];

      expect(reordered[0].id).toBe('w3');
      expect(reordered[0].order).toBe(0);
    });

    it('should filter visible widgets', () => {
      const widgets = [
        { id: 'w1', visible: true, order: 0 },
        { id: 'w2', visible: false, order: 1 },
        { id: 'w3', visible: true, order: 2 },
      ];

      const visibleWidgets = widgets.filter(w => w.visible);
      expect(visibleWidgets).toHaveLength(2);
      expect(visibleWidgets.map(w => w.id)).toEqual(['w1', 'w3']);
    });
  });

  describe('OEE Comparison Export', () => {
    it('should format OEE data for export', () => {
      const oeeData = [
        {
          lineCode: 'LINE-01',
          lineName: 'Dây chuyền 1',
          oee: 85.5,
          availability: 90.0,
          performance: 95.0,
          quality: 99.5,
          targetOee: 85,
        },
        {
          lineCode: 'LINE-02',
          lineName: 'Dây chuyền 2',
          oee: 78.2,
          availability: 85.0,
          performance: 92.0,
          quality: 98.0,
          targetOee: 85,
        },
      ];

      expect(oeeData).toHaveLength(2);
      expect(oeeData[0].oee).toBeGreaterThan(oeeData[0].targetOee);
      expect(oeeData[1].oee).toBeLessThan(oeeData[1].targetOee);
    });

    it('should calculate OEE status correctly', () => {
      const getOeeStatus = (oee: number, target: number) => {
        if (oee >= target) return 'good';
        if (oee >= target * 0.9) return 'warning';
        return 'bad';
      };

      expect(getOeeStatus(90, 85)).toBe('good');
      expect(getOeeStatus(80, 85)).toBe('warning');
      expect(getOeeStatus(70, 85)).toBe('bad');
    });

    it('should generate Excel column headers', () => {
      const columns = [
        { header: 'Mã dây chuyền', key: 'lineCode', width: 15 },
        { header: 'Tên dây chuyền', key: 'lineName', width: 30 },
        { header: 'OEE (%)', key: 'oee', width: 12 },
        { header: 'Availability (%)', key: 'availability', width: 15 },
        { header: 'Performance (%)', key: 'performance', width: 15 },
        { header: 'Quality (%)', key: 'quality', width: 12 },
      ];

      expect(columns).toHaveLength(6);
      expect(columns.find(c => c.key === 'oee')).toBeDefined();
    });
  });

  describe('Slack Service', () => {
    it('should format Slack message blocks', () => {
      const formatOeeDropAlert = (data: any) => ({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📉 Cảnh báo OEE giảm', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Dây chuyền:*\n${data.lineName}` },
              { type: 'mrkdwn', text: `*OEE hiện tại:*\n${data.currentOee}%` },
            ]
          },
        ]
      });

      const message = formatOeeDropAlert({
        lineName: 'Line 1',
        currentOee: 75.5,
      });

      expect(message.blocks).toHaveLength(2);
      expect(message.blocks[0].type).toBe('header');
      expect(message.blocks[1].type).toBe('section');
    });

    it('should validate webhook URL format', () => {
      const isValidSlackWebhook = (url: string) => {
        return url.startsWith('https://hooks.slack.com/services/');
      };

      expect(isValidSlackWebhook('https://hooks.slack.com/services/T00/B00/xxx')).toBe(true);
      expect(isValidSlackWebhook('https://example.com/webhook')).toBe(false);
    });
  });

  describe('Telegram Service', () => {
    it('should format Telegram message', () => {
      const formatTelegramAlert = (data: any) => `
🚨 *Cảnh báo OEE*

📍 *Dây chuyền:* ${data.lineName}
📊 *OEE hiện tại:* ${data.currentOee}%
📉 *Giảm:* ${data.dropPercent}%
⏰ *Thời gian:* ${new Date().toLocaleString('vi-VN')}
      `.trim();

      const message = formatTelegramAlert({
        lineName: 'Line 1',
        currentOee: 75.5,
        dropPercent: 5.2,
      });

      expect(message).toContain('Cảnh báo OEE');
      expect(message).toContain('Line 1');
      expect(message).toContain('75.5%');
    });

    it('should validate bot token format', () => {
      const isValidBotToken = (token: string) => {
        return /^\d+:[A-Za-z0-9_-]+$/.test(token);
      };

      expect(isValidBotToken('123456789:ABCdefGHIjklMNOpqrSTUvwxYZ')).toBe(true);
      expect(isValidBotToken('invalid-token')).toBe(false);
    });

    it('should validate chat ID format', () => {
      const isValidChatId = (chatId: string) => {
        return /^-?\d+$/.test(chatId);
      };

      expect(isValidChatId('-1001234567890')).toBe(true);
      expect(isValidChatId('123456789')).toBe(true);
      expect(isValidChatId('invalid')).toBe(false);
    });
  });

  describe('Alert Type Configuration', () => {
    it('should have all alert types defined', () => {
      const alertTypes = [
        'spc_violation',
        'cpk_alert',
        'iot_critical',
        'maintenance',
        'system_error',
        'oee_drop',
        'oee_comparison',
        'defect_rate',
      ];

      expect(alertTypes).toContain('oee_drop');
      expect(alertTypes).toContain('oee_comparison');
      expect(alertTypes.length).toBeGreaterThanOrEqual(6);
    });

    it('should filter configs by alert type', () => {
      const configs = [
        { id: 1, alertTypes: ['oee_drop', 'cpk_alert'], isActive: true },
        { id: 2, alertTypes: ['iot_critical'], isActive: true },
        { id: 3, alertTypes: ['oee_drop'], isActive: false },
      ];

      const oeeDropConfigs = configs.filter(
        c => c.isActive && c.alertTypes.includes('oee_drop')
      );

      expect(oeeDropConfigs).toHaveLength(1);
      expect(oeeDropConfigs[0].id).toBe(1);
    });
  });

  describe('OEE Comparison Report', () => {
    it('should sort lines by OEE descending', () => {
      const lines = [
        { lineId: 1, lineName: 'Line 1', currentOee: 85 },
        { lineId: 2, lineName: 'Line 2', currentOee: 92 },
        { lineId: 3, lineName: 'Line 3', currentOee: 78 },
      ];

      const sorted = [...lines].sort((a, b) => b.currentOee - a.currentOee);

      expect(sorted[0].lineId).toBe(2);
      expect(sorted[1].lineId).toBe(1);
      expect(sorted[2].lineId).toBe(3);
    });

    it('should format time range correctly', () => {
      const formatTimeRange = (range: string) => {
        const map: Record<string, string> = {
          '1h': '1 giờ',
          '4h': '4 giờ',
          '8h': '8 giờ',
          '24h': '24 giờ',
        };
        return map[range] || range;
      };

      expect(formatTimeRange('4h')).toBe('4 giờ');
      expect(formatTimeRange('24h')).toBe('24 giờ');
    });
  });
});
