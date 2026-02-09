import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[{ ping: 1, cnt: 340 }]]),
  }),
}));

// Mock rateLimiter - partial mock to keep actual exports
vi.mock('./_core/rateLimiter', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    isRateLimitEnabled: vi.fn().mockReturnValue(false),
    getRedisStatus: vi.fn().mockReturnValue({ connected: false, url: null }),
  };
});

describe('Health Check Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return basic health status', async () => {
    const { getBasicHealth } = await import('./services/healthCheckService');
    const health = await getBasicHealth();

    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.timestamp).toBeDefined();
    expect(typeof health.uptime).toBe('number');
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(health.uptimeFormatted).toBeDefined();
    expect(typeof health.uptimeFormatted).toBe('string');
    expect(health.version).toBeDefined();
    expect(health.environment).toBeDefined();
  });

  it('should return detailed health status', async () => {
    const { getDetailedHealth } = await import('./services/healthCheckService');
    const health = await getDetailedHealth();

    expect(health).toBeDefined();
    expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    expect(health.timestamp).toBeDefined();

    // Database
    expect(health.database).toBeDefined();
    expect(health.database.status).toMatch(/connected|disconnected|error/);
    expect(typeof health.database.latencyMs).toBe('number');

    // Memory
    expect(health.memory).toBeDefined();
    expect(health.memory.rss).toBeGreaterThan(0);
    expect(health.memory.heapUsed).toBeGreaterThan(0);
    expect(health.memory.heapTotal).toBeGreaterThan(0);
    expect(health.memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(health.memory.usagePercent).toBeLessThanOrEqual(100);
    expect(health.memory.systemTotal).toBeGreaterThan(0);
    expect(health.memory.systemFree).toBeGreaterThanOrEqual(0);
    expect(health.memory.systemUsagePercent).toBeGreaterThanOrEqual(0);
    expect(health.memory.systemUsagePercent).toBeLessThanOrEqual(100);

    // CPU
    expect(health.cpu).toBeDefined();
    expect(typeof health.cpu.loadAvg1m).toBe('number');
    expect(typeof health.cpu.loadAvg5m).toBe('number');
    expect(typeof health.cpu.loadAvg15m).toBe('number');
    expect(health.cpu.cpuCount).toBeGreaterThan(0);

    // System
    expect(health.system).toBeDefined();
    expect(health.system.platform).toBeDefined();
    expect(health.system.arch).toBeDefined();
    expect(health.system.nodeVersion).toMatch(/^v\d+/);
    expect(health.system.hostname).toBeDefined();
    expect(health.system.pid).toBeGreaterThan(0);

    // Services
    expect(health.services).toBeDefined();
    expect(health.services.websocket).toMatch(/available|unavailable/);
    expect(health.services.sse).toMatch(/available|unavailable/);
    expect(health.services.rateLimiter).toMatch(/enabled|disabled/);
    expect(health.services.redis).toMatch(/connected|disconnected|not_configured/);
  });

  it('should return liveness status', async () => {
    const { getLivenessStatus } = await import('./services/healthCheckService');
    const status = getLivenessStatus();

    expect(status).toBeDefined();
    expect(status.status).toBe('ok');
    expect(status.timestamp).toBeDefined();
    expect(new Date(status.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should return readiness status', async () => {
    const { getReadinessStatus } = await import('./services/healthCheckService');
    const readiness = await getReadinessStatus();

    expect(readiness).toBeDefined();
    expect(typeof readiness.ready).toBe('boolean');
    expect(readiness.checks).toBeDefined();
    expect(typeof readiness.checks.database).toBe('boolean');
    expect(typeof readiness.checks.memory).toBe('boolean');
  });

  it('should generate Prometheus metrics', async () => {
    const { getPrometheusMetrics } = await import('./services/healthCheckService');
    const metrics = await getPrometheusMetrics();

    expect(typeof metrics).toBe('string');
    expect(metrics.length).toBeGreaterThan(0);

    // Check for required metric names
    expect(metrics).toContain('app_info');
    expect(metrics).toContain('app_uptime_seconds');
    expect(metrics).toContain('app_health_status');
    expect(metrics).toContain('db_connected');
    expect(metrics).toContain('process_memory_rss_bytes');
    expect(metrics).toContain('process_memory_heap_used_bytes');
    expect(metrics).toContain('system_memory_total_bytes');
    expect(metrics).toContain('system_cpu_load_1m');
    expect(metrics).toContain('service_websocket_available');
    expect(metrics).toContain('service_sse_available');
    expect(metrics).toContain('service_rate_limiter_enabled');

    // Check format: each metric should have HELP and TYPE
    expect(metrics).toContain('# HELP');
    expect(metrics).toContain('# TYPE');
    expect(metrics).toContain('gauge');
  });

  it('should format uptime correctly', async () => {
    const { getBasicHealth } = await import('./services/healthCheckService');
    const health = await getBasicHealth();

    // Uptime should be a non-negative number
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    // Formatted uptime should contain 's' for seconds
    expect(health.uptimeFormatted).toMatch(/\d+s/);
  });
});

describe('Rate Limiter', () => {
  it('should export required functions', async () => {
    const rateLimiter = await import('./_core/rateLimiter');

    expect(typeof rateLimiter.apiRateLimiter).toBe('function');
    expect(typeof rateLimiter.authRateLimiter).toBe('function');
    expect(typeof rateLimiter.exportRateLimiter).toBe('function');
    expect(typeof rateLimiter.isRateLimitEnabled).toBe('function');
    expect(typeof rateLimiter.setAlertCallback).toBe('function');
    expect(typeof rateLimiter.getRateLimitStats).toBe('function');
    expect(typeof rateLimiter.resetRateLimitStats).toBe('function');
    expect(typeof rateLimiter.checkUserRateLimit).toBe('function');
    expect(typeof rateLimiter.getUserRateLimitInfo).toBe('function');
    expect(typeof rateLimiter.trackRateLimitRequest).toBe('function');
    expect(typeof rateLimiter.addToWhitelist).toBe('function');
    expect(typeof rateLimiter.removeFromWhitelist).toBe('function');
    expect(typeof rateLimiter.getWhitelist).toBe('function');
    expect(typeof rateLimiter.getRedisStatus).toBe('function');
  });

  it('should track rate limit stats', async () => {
    const { getRateLimitStats, resetRateLimitStats, trackRateLimitRequest } = await import('./_core/rateLimiter');

    resetRateLimitStats();

    trackRateLimitRequest('192.168.1.1', '/api/test', false);
    trackRateLimitRequest('192.168.1.1', '/api/test', false);
    trackRateLimitRequest('192.168.1.2', '/api/test', true);

    const stats = getRateLimitStats();

    expect(stats).toBeDefined();
    expect(stats.totalRequests).toBe(3);
    expect(stats.blockedRequests).toBe(1);
    expect(typeof stats.blockRate).toBe('string');
    expect(stats.blockRate).toContain('%');
    expect(stats.enabled).toBeDefined();
    expect(stats.config).toBeDefined();
    expect(stats.config.windowMs).toBeGreaterThan(0);
    expect(stats.config.maxRequests).toBeGreaterThan(0);
  });

  it('should manage IP whitelist', async () => {
    const { addToWhitelist, removeFromWhitelist, getWhitelist } = await import('./_core/rateLimiter');

    const initialWhitelist = getWhitelist();
    expect(Array.isArray(initialWhitelist)).toBe(true);

    addToWhitelist('10.20.30.40');
    const afterAdd = getWhitelist();
    expect(afterAdd).toContain('10.20.30.40');

    removeFromWhitelist('10.20.30.40');
    const afterRemove = getWhitelist();
    expect(afterRemove).not.toContain('10.20.30.40');
  });

  it('should check user rate limit', async () => {
    const { checkUserRateLimit, getUserRateLimitInfo } = await import('./_core/rateLimiter');

    const result = checkUserRateLimit('test-user-health-check');
    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe('boolean');
    expect(typeof result.remaining).toBe('number');
    expect(typeof result.resetAt).toBe('number');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);

    const info = getUserRateLimitInfo('test-user-health-check');
    expect(info).toBeDefined();
    expect(typeof info.count).toBe('number');
    expect(typeof info.limit).toBe('number');
    expect(typeof info.remaining).toBe('number');
    expect(typeof info.resetAt).toBe('number');
  });

  it('should return Redis status', async () => {
    const { getRedisStatus } = await import('./_core/rateLimiter');

    const status = getRedisStatus();
    expect(status).toBeDefined();
    expect(typeof status.connected).toBe('boolean');
    // url can be null if not configured
    expect(status.url === null || typeof status.url === 'string').toBe(true);
  });

  it('should reset stats', async () => {
    const { resetRateLimitStats, getRateLimitStats, trackRateLimitRequest } = await import('./_core/rateLimiter');

    trackRateLimitRequest('1.2.3.4', '/test', false);
    resetRateLimitStats();

    const stats = getRateLimitStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.blockedRequests).toBe(0);
  });
});

describe('Database Indexing Migration', () => {
  it('should export addPerformanceIndexes function', async () => {
    const module = await import('./migrations/add-performance-indexes');
    expect(typeof module.addPerformanceIndexes).toBe('function');
    expect(typeof module.default).toBe('function');
  });

  it('should export addAdvancedIndexes function', async () => {
    const module = await import('./migrations/add-advanced-indexes');
    expect(typeof module.addAdvancedIndexes).toBe('function');
    expect(typeof module.default).toBe('function');
  });
});
