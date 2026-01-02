import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Health Monitoring Router', () => {
  it('should get system health', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.health.getSystemHealth();

    expect(result).toBeDefined();
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.status).toMatch(/healthy|warning|critical/);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.activeModels).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should get model health', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.health.getModelHealth({});

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const model = result[0];
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.type).toBeDefined();
      expect(model.healthScore).toBeGreaterThanOrEqual(0);
      expect(model.healthScore).toBeLessThanOrEqual(100);
      expect(model.healthStatus).toMatch(/healthy|warning|critical/);
    }
  });

  it('should get drift metrics', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.health.getDriftMetrics({ days: 7 });

    expect(result).toBeDefined();
    expect(result.days).toBe(7);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.avgDrift).toBeGreaterThanOrEqual(0);
    expect(result.summary.maxDrift).toBeGreaterThanOrEqual(0);
    expect(result.summary.driftEventsCount).toBeGreaterThanOrEqual(0);
  });

  it('should get latency metrics', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.health.getLatencyMetrics({ hours: 24 });

    expect(result).toBeDefined();
    expect(result.hours).toBe(24);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.avgLatency).toBeGreaterThan(0);
    expect(result.summary.p95Latency).toBeGreaterThan(0);
    expect(result.summary.p99Latency).toBeGreaterThan(0);
    expect(result.summary.totalRequests).toBeGreaterThan(0);
  });

  it('should get resource metrics', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.health.getResourceMetrics();

    expect(result).toBeDefined();
    expect(result.cpu).toBeDefined();
    expect(result.cpu.usage).toBeGreaterThanOrEqual(0);
    expect(result.cpu.usage).toBeLessThanOrEqual(100);
    expect(result.memory).toBeDefined();
    expect(result.memory.usage).toBeGreaterThanOrEqual(0);
    expect(result.memory.usage).toBeLessThanOrEqual(100);
    expect(result.gpu).toBeDefined();
    expect(result.disk).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});

describe('AI Settings Router', () => {
  it('should get AI config', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.getConfig();

    expect(result).toBeDefined();
    expect(result.autoRetrain).toBeDefined();
    expect(result.retrainInterval).toBeGreaterThan(0);
    expect(result.minAccuracyThreshold).toBeGreaterThanOrEqual(0);
    expect(result.minAccuracyThreshold).toBeLessThanOrEqual(1);
  });

  it('should update AI config', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.updateConfig({
      autoRetrain: true,
      retrainInterval: 14,
      minAccuracyThreshold: 0.9,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config.autoRetrain).toBe(true);
    expect(result.config.retrainInterval).toBe(14);
    expect(result.config.minAccuracyThreshold).toBe(0.9);
  });

  it('should get thresholds', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.getThresholds();

    expect(result).toBeDefined();
    expect(result.cpk).toBeDefined();
    expect(result.cpk.warning).toBeGreaterThan(0);
    expect(result.cpk.critical).toBeGreaterThan(0);
    expect(result.accuracy).toBeDefined();
    expect(result.drift).toBeDefined();
    expect(result.latency).toBeDefined();
  });

  it('should update thresholds', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.updateThresholds({
      cpk: { warning: 1.5, critical: 1.2 },
      accuracy: { warning: 0.92, critical: 0.88 },
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.thresholds).toBeDefined();
    expect(result.thresholds.cpk.warning).toBe(1.5);
    expect(result.thresholds.cpk.critical).toBe(1.2);
  });

  it('should get alert rules', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.getAlertRules();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    
    if (result.length > 0) {
      const rule = result[0];
      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.condition).toBeDefined();
      expect(rule.severity).toMatch(/info|warning|critical/);
      expect(rule.enabled).toBeDefined();
    }
  });

  it('should add alert rule', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ai.settings.addAlertRule({
      name: 'Test Rule',
      condition: 'test > 100',
      severity: 'warning',
      enabled: true,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.rule).toBeDefined();
    expect(result.rule.name).toBe('Test Rule');
    expect(result.rule.condition).toBe('test > 100');
    expect(result.rule.severity).toBe('warning');
  });

  it('should delete alert rule', async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // First add a rule
    const addResult = await caller.ai.settings.addAlertRule({
      name: 'Rule to Delete',
      condition: 'test > 100',
      severity: 'info',
    });

    // Then delete it
    const deleteResult = await caller.ai.settings.deleteAlertRule({
      id: addResult.rule.id,
    });

    expect(deleteResult).toBeDefined();
    expect(deleteResult.success).toBe(true);
  });
});
