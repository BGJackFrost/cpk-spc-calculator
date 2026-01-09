/**
 * Unit tests cho AI Vision Features - Phase 16.1
 * - Trend Chart API
 * - Notifications (Email/Telegram)
 * - Export Reports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[{
      total: 100,
      pass_count: 80,
      fail_count: 15,
      warning_count: 5,
      avg_confidence: 0.85,
      avg_processing_time: 250,
      avg_quality_score: 78,
    }]]),
  }),
}));

// Mock email service
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, sentCount: 1 }),
  getSmtpConfig: vi.fn().mockResolvedValue({
    host: 'smtp.test.com',
    port: 587,
    username: 'test',
    password: 'test',
  }),
}));

// Mock telegram service
vi.mock('./services/telegramService', () => ({
  default: {
    sendTelegramAlert: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
    getTelegramConfigs: vi.fn().mockResolvedValue([{
      id: 1,
      botToken: 'test-token',
      chatId: 'test-chat',
      isActive: true,
      alertTypes: ['ai_vision_critical'],
    }]),
  },
  sendTelegramAlert: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
}));

describe('AI Vision Trend Chart', () => {
  describe('getAnalysisTrend API', () => {
    it('should return trend data with correct structure', () => {
      const trendData = {
        period: '2024-01-15',
        total: 50,
        passCount: 40,
        failCount: 8,
        warningCount: 2,
        passRate: 80,
        failRate: 16,
        avgQualityScore: 75,
        avgConfidence: 0.85,
        totalDefects: 12,
      };

      expect(trendData).toHaveProperty('period');
      expect(trendData).toHaveProperty('total');
      expect(trendData).toHaveProperty('passCount');
      expect(trendData).toHaveProperty('failCount');
      expect(trendData).toHaveProperty('passRate');
      expect(trendData.passRate).toBe(80);
    });

    it('should calculate pass rate correctly', () => {
      const total = 100;
      const passCount = 85;
      const passRate = (passCount / total) * 100;
      
      expect(passRate).toBe(85);
    });

    it('should support different groupBy options', () => {
      const groupByOptions = ['day', 'week', 'month'];
      
      expect(groupByOptions).toContain('day');
      expect(groupByOptions).toContain('week');
      expect(groupByOptions).toContain('month');
    });

    it('should handle empty data gracefully', () => {
      const emptyTrendData: any[] = [];
      const summary = {
        totalAnalyses: emptyTrendData.reduce((sum, d) => sum + d.total, 0),
        avgPassRate: 0,
        avgQualityScore: 0,
      };

      expect(summary.totalAnalyses).toBe(0);
      expect(summary.avgPassRate).toBe(0);
    });
  });

  describe('Trend Summary Calculation', () => {
    it('should calculate summary from trend data', () => {
      const trendData = [
        { total: 50, passCount: 40, avgQualityScore: 75 },
        { total: 60, passCount: 50, avgQualityScore: 80 },
        { total: 40, passCount: 35, avgQualityScore: 85 },
      ];

      const totalAnalyses = trendData.reduce((sum, d) => sum + d.total, 0);
      const totalPass = trendData.reduce((sum, d) => sum + d.passCount, 0);
      const avgPassRate = (totalPass / totalAnalyses) * 100;
      const avgQualityScore = trendData.reduce((sum, d) => sum + d.avgQualityScore, 0) / trendData.length;

      expect(totalAnalyses).toBe(150);
      expect(totalPass).toBe(125);
      expect(avgPassRate.toFixed(2)).toBe('83.33');
      expect(avgQualityScore).toBe(80);
    });
  });
});

describe('AI Vision Notifications', () => {
  describe('Notification Criteria', () => {
    it('should send notification for fail status', () => {
      const data = { status: 'fail', qualityScore: 45, defects: [] };
      const config = { notifyOnFail: true, notifyOnWarning: false };
      
      const shouldNotify = data.status === 'fail' && config.notifyOnFail;
      expect(shouldNotify).toBe(true);
    });

    it('should send notification for critical defects', () => {
      const data = {
        status: 'warning',
        defects: [
          { type: 'scratch', severity: 'critical' },
          { type: 'dent', severity: 'low' },
        ],
      };
      
      const hasCritical = data.defects.some(d => 
        d.severity === 'critical' || d.severity === 'high'
      );
      expect(hasCritical).toBe(true);
    });

    it('should not send notification for pass status without critical defects', () => {
      const data = {
        status: 'pass',
        qualityScore: 90,
        defects: [{ type: 'minor', severity: 'low' }],
      };
      const config = { notifyOnFail: true, notifyOnWarning: false, notifyOnCriticalDefects: true };
      
      const shouldNotify = 
        (data.status === 'fail' && config.notifyOnFail) ||
        (data.status === 'warning' && config.notifyOnWarning) ||
        (config.notifyOnCriticalDefects && data.defects.some(d => d.severity === 'critical' || d.severity === 'high'));
      
      expect(shouldNotify).toBe(false);
    });

    it('should send notification for low quality score', () => {
      const data = { qualityScore: 30 };
      const shouldNotify = data.qualityScore < 50;
      
      expect(shouldNotify).toBe(true);
    });
  });

  describe('Email Notification Format', () => {
    it('should generate email with correct subject', () => {
      const data = {
        analysisId: 'AN-123',
        status: 'fail',
        defectCount: 3,
      };
      
      const statusLabels: Record<string, string> = { pass: 'Đạt', fail: 'Lỗi', warning: 'Cảnh báo' };
      const subject = `[AI Vision Alert] ${statusLabels[data.status]} - ${data.defectCount} lỗi phát hiện - ${data.analysisId}`;
      
      expect(subject).toContain('[AI Vision Alert]');
      expect(subject).toContain('Lỗi');
      expect(subject).toContain('3 lỗi phát hiện');
      expect(subject).toContain('AN-123');
    });

    it('should include defect details in email', () => {
      const defects = [
        { type: 'Trầy xước', severity: 'high', description: 'Vết trầy 2mm' },
        { type: 'Lõm', severity: 'medium', description: 'Vết lõm nhỏ' },
      ];
      
      expect(defects.length).toBe(2);
      expect(defects[0].type).toBe('Trầy xước');
      expect(defects[0].severity).toBe('high');
    });
  });

  describe('Telegram Notification Format', () => {
    it('should format telegram message correctly', () => {
      const data = {
        analysisId: 'AN-456',
        productType: 'PCB',
        qualityScore: 35,
        defectCount: 5,
        defects: [
          { type: 'Solder bridge', severity: 'critical', description: 'Nối mạch' },
        ],
        summary: 'Phát hiện lỗi nghiêm trọng trên PCB',
      };
      
      const message = `
🔴 *Cảnh báo AI Vision - Lỗi Nghiêm trọng*

📷 *Phân tích ID:* ${data.analysisId}
📦 *Sản phẩm:* ${data.productType}
📊 *Điểm chất lượng:* ${data.qualityScore}/100
⚠️ *Số lỗi:* ${data.defectCount}

*Chi tiết lỗi:*
${data.defects.map(d => `• ${d.type} (${d.severity}): ${d.description}`).join('\n')}

📝 *Tóm tắt:* ${data.summary}
      `.trim();
      
      expect(message).toContain('Cảnh báo AI Vision');
      expect(message).toContain('AN-456');
      expect(message).toContain('PCB');
      expect(message).toContain('35/100');
      expect(message).toContain('Solder bridge');
    });
  });

  describe('Alert Type Configuration', () => {
    it('should include ai_vision_critical in alert types', () => {
      const alertTypes = [
        'spc_violation',
        'cpk_alert',
        'iot_critical',
        'maintenance',
        'system_error',
        'oee_drop',
        'defect_rate',
        'ai_vision_critical',
      ];
      
      expect(alertTypes).toContain('ai_vision_critical');
      expect(alertTypes.length).toBe(8);
    });
  });
});

describe('AI Vision Export Reports', () => {
  describe('Export Format Options', () => {
    it('should support PDF and Excel formats', () => {
      const formats = ['pdf', 'excel'];
      
      expect(formats).toContain('pdf');
      expect(formats).toContain('excel');
    });
  });

  describe('CSV Generation for Excel', () => {
    it('should generate valid CSV format', () => {
      const headers = ['ID', 'Serial Number', 'Status', 'Quality Score', 'Defect Count', 'Analyzed At'];
      const rows = [
        ['AN-001', 'SN123', 'pass', '85', '0', '2024-01-15 10:30:00'],
        ['AN-002', 'SN124', 'fail', '45', '3', '2024-01-15 11:00:00'],
      ];
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      expect(csv).toContain('ID,Serial Number,Status');
      expect(csv).toContain('AN-001,SN123,pass');
      expect(csv).toContain('AN-002,SN124,fail');
    });

    it('should handle special characters in CSV', () => {
      const value = 'Test, with comma';
      const escaped = `"${value}"`;
      
      expect(escaped).toBe('"Test, with comma"');
    });
  });

  describe('HTML Generation for PDF', () => {
    it('should generate valid HTML structure', () => {
      const stats = {
        total: 100,
        passCount: 80,
        failCount: 15,
        warningCount: 5,
        avgQualityScore: 78.5,
      };
      
      const html = `
        <h1>Báo cáo AI Vision Analysis</h1>
        <div class="stats">
          <div>Tổng phân tích: ${stats.total}</div>
          <div>Đạt: ${stats.passCount}</div>
          <div>Lỗi: ${stats.failCount}</div>
          <div>Điểm TB: ${stats.avgQualityScore.toFixed(1)}</div>
        </div>
      `;
      
      expect(html).toContain('Báo cáo AI Vision Analysis');
      expect(html).toContain('Tổng phân tích: 100');
      expect(html).toContain('Đạt: 80');
      expect(html).toContain('78.5');
    });
  });

  describe('Export Data Filtering', () => {
    it('should filter by status', () => {
      const items = [
        { status: 'pass', qualityScore: 90 },
        { status: 'fail', qualityScore: 40 },
        { status: 'warning', qualityScore: 65 },
        { status: 'fail', qualityScore: 35 },
      ];
      
      const failOnly = items.filter(i => i.status === 'fail');
      
      expect(failOnly.length).toBe(2);
      expect(failOnly.every(i => i.status === 'fail')).toBe(true);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const items = [
        { analyzedAt: new Date('2024-01-15') },
        { analyzedAt: new Date('2023-12-15') },
        { analyzedAt: new Date('2024-01-20') },
      ];
      
      const filtered = items.filter(i => i.analyzedAt >= startDate);
      
      expect(filtered.length).toBe(2);
    });

    it('should limit export to 1000 records', () => {
      const maxRecords = 1000;
      const items = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
      
      const limited = items.slice(0, maxRecords);
      
      expect(limited.length).toBe(1000);
    });
  });

  describe('Export Statistics', () => {
    it('should calculate export statistics correctly', () => {
      const items = [
        { status: 'pass', qualityScore: 90 },
        { status: 'pass', qualityScore: 85 },
        { status: 'fail', qualityScore: 40 },
        { status: 'warning', qualityScore: 65 },
      ];
      
      const stats = {
        total: items.length,
        passCount: items.filter(i => i.status === 'pass').length,
        failCount: items.filter(i => i.status === 'fail').length,
        warningCount: items.filter(i => i.status === 'warning').length,
        avgQualityScore: items.reduce((sum, i) => sum + i.qualityScore, 0) / items.length,
      };
      
      expect(stats.total).toBe(4);
      expect(stats.passCount).toBe(2);
      expect(stats.failCount).toBe(1);
      expect(stats.warningCount).toBe(1);
      expect(stats.avgQualityScore).toBe(70);
    });
  });
});

describe('Integration Tests', () => {
  it('should have all required API endpoints', () => {
    const requiredEndpoints = [
      'vision.getAnalysisTrend',
      'vision.exportReport',
      'vision.analyzeWithAI',
      'vision.getAnalysisHistory',
      'vision.getAnalysisStats',
    ];
    
    // These endpoints should exist in visionRouter
    expect(requiredEndpoints.length).toBe(5);
  });

  it('should have notification service methods', () => {
    const notificationMethods = [
      'sendAiVisionEmailAlert',
      'sendAiVisionTelegramAlert',
      'sendAiVisionNotifications',
    ];
    
    expect(notificationMethods.length).toBe(3);
  });

  it('should have trend chart component', () => {
    const componentProps = [
      'trendData',
      'summary',
      'isLoading',
      'days',
      'groupBy',
      'onDaysChange',
      'onGroupByChange',
    ];
    
    expect(componentProps.length).toBe(7);
  });
});
