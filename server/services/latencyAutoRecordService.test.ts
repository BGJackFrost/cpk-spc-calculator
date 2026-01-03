import { describe, it, expect } from 'vitest';

describe('Latency Auto-Record Service', () => {
  it('should export recordLatency function', async () => {
    const module = await import('./latencyAutoRecordService');
    expect(typeof module.recordLatency).toBe('function');
  });

  it('should export recordMqttLatency function', async () => {
    const module = await import('./latencyAutoRecordService');
    expect(typeof module.recordMqttLatency).toBe('function');
  });

  it('should export recordWebhookLatency function', async () => {
    const module = await import('./latencyAutoRecordService');
    expect(typeof module.recordWebhookLatency).toBe('function');
  });

  it('should export getLatencyAutoRecordStats function', async () => {
    const module = await import('./latencyAutoRecordService');
    expect(typeof module.getLatencyAutoRecordStats).toBe('function');
  });

  it('should return stats with expected structure', async () => {
    const { getLatencyAutoRecordStats } = await import('./latencyAutoRecordService');
    const stats = getLatencyAutoRecordStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalRecorded).toBe('number');
    expect(typeof stats.bufferSize).toBe('number');
  });

  it('should not throw when recording latency', async () => {
    const { recordLatency } = await import('./latencyAutoRecordService');
    expect(() => {
      recordLatency({ sourceType: 'api', sourceId: 'test-api', latencyMs: 100, isSuccess: true });
    }).not.toThrow();
  });
});
