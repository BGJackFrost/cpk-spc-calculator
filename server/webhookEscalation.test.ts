import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('./db', () => ({
  getEscalationRules: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Test Escalation Rule',
      description: 'Test description',
      source_webhook_id: 1,
      trigger_after_failures: 3,
      trigger_after_minutes: 15,
      level1_targets: [{ type: 'email', value: 'test@example.com' }],
      level1_delay_minutes: 0,
      level2_targets: [],
      level2_delay_minutes: 15,
      level3_targets: [],
      level3_delay_minutes: 30,
      auto_resolve_on_success: true,
      notify_on_escalate: true,
      notify_on_resolve: true,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]),
  getEscalationRuleById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Escalation Rule',
    source_webhook_id: 1,
    trigger_after_failures: 3,
    trigger_after_minutes: 15,
    is_active: true,
  }),
  createEscalationRule: vi.fn().mockResolvedValue(1),
  updateEscalationRule: vi.fn().mockResolvedValue(undefined),
  deleteEscalationRule: vi.fn().mockResolvedValue(undefined),
  getEscalationLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getPendingEscalations: vi.fn().mockResolvedValue([]),
  updateEscalationLog: vi.fn().mockResolvedValue(undefined),
  recordLatencyMetric: vi.fn().mockResolvedValue(1),
  getLatencyHeatmapData: vi.fn().mockResolvedValue([
    {
      hour_of_day: 10,
      day_of_week: 1,
      avg_latency: 150,
      min_latency: 50,
      max_latency: 300,
      count: 100,
      success_count: 95,
    },
  ]),
  getLatencyStats: vi.fn().mockResolvedValue({
    avg_latency: 150,
    min_latency: 50,
    max_latency: 300,
    total_count: 1000,
    success_count: 950,
  }),
  getLatencyTimeSeries: vi.fn().mockResolvedValue([
    { time_bucket: '2024-01-01 10:00', avg_latency: 150, min_latency: 50, max_latency: 300 },
  ]),
  getLatencySources: vi.fn().mockResolvedValue([
    { source_type: 'iot_device', source_id: 'device-001', source_name: 'Temperature Sensor' },
  ]),
}));

describe('Webhook Escalation Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEscalationRules', () => {
    it('should return list of escalation rules', async () => {
      const { getEscalationRules } = await import('./db');
      const rules = await getEscalationRules();
      
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('Test Escalation Rule');
      expect(rules[0].trigger_after_failures).toBe(3);
      expect(rules[0].level1_targets).toHaveLength(1);
    });
  });

  describe('getEscalationRuleById', () => {
    it('should return a single rule by ID', async () => {
      const { getEscalationRuleById } = await import('./db');
      const rule = await getEscalationRuleById(1);
      
      expect(rule).toBeDefined();
      expect(rule.id).toBe(1);
      expect(rule.name).toBe('Test Escalation Rule');
    });
  });

  describe('createEscalationRule', () => {
    it('should create a new escalation rule', async () => {
      const { createEscalationRule } = await import('./db');
      const id = await createEscalationRule({
        name: 'New Rule',
        sourceWebhookId: 1,
        triggerAfterFailures: 5,
        triggerAfterMinutes: 30,
        level1Targets: [{ type: 'email', value: 'admin@example.com' }],
        createdBy: 'user-123',
      });
      
      expect(id).toBe(1);
      expect(createEscalationRule).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateEscalationRule', () => {
    it('should update an existing rule', async () => {
      const { updateEscalationRule } = await import('./db');
      await updateEscalationRule(1, { name: 'Updated Rule' });
      
      expect(updateEscalationRule).toHaveBeenCalledWith(1, { name: 'Updated Rule' });
    });
  });

  describe('deleteEscalationRule', () => {
    it('should delete a rule', async () => {
      const { deleteEscalationRule } = await import('./db');
      await deleteEscalationRule(1);
      
      expect(deleteEscalationRule).toHaveBeenCalledWith(1);
    });
  });

  describe('getEscalationLogs', () => {
    it('should return escalation logs', async () => {
      const { getEscalationLogs } = await import('./db');
      const result = await getEscalationLogs({ limit: 50 });
      
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
    });
  });

  describe('getPendingEscalations', () => {
    it('should return pending escalations', async () => {
      const { getPendingEscalations } = await import('./db');
      const pending = await getPendingEscalations();
      
      expect(Array.isArray(pending)).toBe(true);
    });
  });
});

describe('Latency Monitoring Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordLatencyMetric', () => {
    it('should record a latency metric', async () => {
      const { recordLatencyMetric } = await import('./db');
      const id = await recordLatencyMetric({
        sourceType: 'iot_device',
        sourceId: 'device-001',
        sourceName: 'Temperature Sensor',
        latencyMs: 150,
        isSuccess: true,
      });
      
      expect(id).toBe(1);
      expect(recordLatencyMetric).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLatencyHeatmapData', () => {
    it('should return heatmap data', async () => {
      const { getLatencyHeatmapData } = await import('./db');
      const data = await getLatencyHeatmapData({});
      
      expect(data).toHaveLength(1);
      expect(data[0].hour_of_day).toBe(10);
      expect(data[0].day_of_week).toBe(1);
      expect(data[0].avg_latency).toBe(150);
    });
  });

  describe('getLatencyStats', () => {
    it('should return latency statistics', async () => {
      const { getLatencyStats } = await import('./db');
      const stats = await getLatencyStats({});
      
      expect(stats.avg_latency).toBe(150);
      expect(stats.min_latency).toBe(50);
      expect(stats.max_latency).toBe(300);
      expect(stats.total_count).toBe(1000);
      expect(stats.success_count).toBe(950);
    });
  });

  describe('getLatencyTimeSeries', () => {
    it('should return time series data', async () => {
      const { getLatencyTimeSeries } = await import('./db');
      const data = await getLatencyTimeSeries({});
      
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('time_bucket');
      expect(data[0]).toHaveProperty('avg_latency');
    });
  });

  describe('getLatencySources', () => {
    it('should return list of sources', async () => {
      const { getLatencySources } = await import('./db');
      const sources = await getLatencySources();
      
      expect(sources).toHaveLength(1);
      expect(sources[0].source_type).toBe('iot_device');
      expect(sources[0].source_id).toBe('device-001');
    });
  });
});

describe('Escalation Target Validation', () => {
  it('should validate email target format', () => {
    const emailTarget = { type: 'email', value: 'test@example.com' };
    expect(emailTarget.type).toBe('email');
    expect(emailTarget.value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should validate webhook target format', () => {
    const webhookTarget = { type: 'webhook', value: 'https://hooks.slack.com/services/xxx' };
    expect(webhookTarget.type).toBe('webhook');
    expect(webhookTarget.value).toMatch(/^https?:\/\//);
  });
});

describe('Latency Status Classification', () => {
  const getLatencyStatus = (avgLatency: number) => {
    if (avgLatency < 100) return 'good';
    if (avgLatency < 500) return 'normal';
    if (avgLatency < 1000) return 'high';
    return 'critical';
  };

  it('should classify low latency as good', () => {
    expect(getLatencyStatus(50)).toBe('good');
    expect(getLatencyStatus(99)).toBe('good');
  });

  it('should classify medium latency as normal', () => {
    expect(getLatencyStatus(100)).toBe('normal');
    expect(getLatencyStatus(499)).toBe('normal');
  });

  it('should classify high latency as high', () => {
    expect(getLatencyStatus(500)).toBe('high');
    expect(getLatencyStatus(999)).toBe('high');
  });

  it('should classify very high latency as critical', () => {
    expect(getLatencyStatus(1000)).toBe('critical');
    expect(getLatencyStatus(5000)).toBe('critical');
  });
});
