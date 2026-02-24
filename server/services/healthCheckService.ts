/**
 * Health Check Service
 * 
 * Provides comprehensive health check endpoints for monitoring:
 * - Database connectivity
 * - Memory usage
 * - Uptime
 * - Service availability
 * 
 * Compatible with Prometheus/Grafana monitoring
 */

import os from "os";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Server start time
const serverStartTime = Date.now();

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  uptimeFormatted: string;
  version: string;
  environment: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  database: {
    status: "connected" | "disconnected" | "error";
    latencyMs: number;
    tableCount?: number;
    error?: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    usagePercent: number;
    systemTotal: number;
    systemFree: number;
    systemUsagePercent: number;
  };
  cpu: {
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m: number;
    cpuCount: number;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    hostname: string;
    pid: number;
  };
  services: {
    websocket: "available" | "unavailable";
    sse: "available" | "unavailable";
    rateLimiter: "enabled" | "disabled";
    redis: "connected" | "disconnected" | "not_configured";
  };
}

export interface PrometheusMetrics {
  lines: string[];
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Basic health check - lightweight, suitable for load balancer probes
 */
export async function getBasicHealth(): Promise<HealthStatus> {
  const uptime = Date.now() - serverStartTime;

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime,
    uptimeFormatted: formatUptime(uptime),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  };
}

/**
 * Detailed health check - comprehensive, for admin monitoring
 */
export async function getDetailedHealth(): Promise<DetailedHealthStatus> {
  const basic = await getBasicHealth();
  const memUsage = process.memoryUsage();
  const systemTotal = os.totalmem();
  const systemFree = os.freemem();
  const loadAvg = os.loadavg();

  // Database check
  let dbStatus: DetailedHealthStatus["database"] = {
    status: "disconnected",
    latencyMs: -1,
  };

  try {
    const db = await getDb();
    if (db) {
      const start = Date.now();
      const result = await db.execute(sql`SELECT 1 as ping`);
      const latency = Date.now() - start;

      // Get table count
      let tableCount = 0;
      try {
        const tables = await db.execute(
          sql`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE()`
        );
        tableCount = (tables as any)[0]?.[0]?.cnt || 0;
      } catch {
        // Ignore table count errors
      }

      dbStatus = {
        status: "connected",
        latencyMs: latency,
        tableCount,
      };
    }
  } catch (error: any) {
    dbStatus = {
      status: "error",
      latencyMs: -1,
      error: error.message,
    };
  }

  // Services check
  let rateLimiterStatus: "enabled" | "disabled" = "disabled";
  let redisStatus: "connected" | "disconnected" | "not_configured" = "not_configured";

  try {
    const { isRateLimitEnabled, getRedisStatus } = await import("../_core/rateLimiter");
    rateLimiterStatus = isRateLimitEnabled() ? "enabled" : "disabled";
    const redis = getRedisStatus();
    redisStatus = redis.url ? (redis.connected ? "connected" : "disconnected") : "not_configured";
  } catch {
    // Ignore import errors
  }

  // Determine overall status
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (dbStatus.status === "error" || dbStatus.status === "disconnected") {
    overallStatus = "unhealthy";
  } else if (dbStatus.latencyMs > 1000) {
    overallStatus = "degraded";
  }

  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    overallStatus = overallStatus === "healthy" ? "degraded" : overallStatus;
  }

  return {
    ...basic,
    status: overallStatus,
    database: dbStatus,
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      usagePercent: parseFloat(heapUsagePercent.toFixed(2)),
      systemTotal,
      systemFree,
      systemUsagePercent: parseFloat(
        (((systemTotal - systemFree) / systemTotal) * 100).toFixed(2)
      ),
    },
    cpu: {
      loadAvg1m: parseFloat(loadAvg[0].toFixed(2)),
      loadAvg5m: parseFloat(loadAvg[1].toFixed(2)),
      loadAvg15m: parseFloat(loadAvg[2].toFixed(2)),
      cpuCount: os.cpus().length,
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      hostname: os.hostname(),
      pid: process.pid,
    },
    services: {
      websocket: "available",
      sse: "available",
      rateLimiter: rateLimiterStatus,
      redis: redisStatus,
    },
  };
}

/**
 * Generate Prometheus-compatible metrics output
 */
export async function getPrometheusMetrics(): Promise<string> {
  const health = await getDetailedHealth();
  const lines: string[] = [];

  // Helper to add metric
  const addMetric = (name: string, help: string, type: string, value: number, labels?: Record<string, string>) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    const labelStr = labels
      ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`
      : "";
    lines.push(`${name}${labelStr} ${value}`);
  };

  // Application info
  addMetric("app_info", "Application information", "gauge", 1, {
    version: health.version,
    environment: health.environment,
    node_version: health.system.nodeVersion,
  });

  // Uptime
  addMetric("app_uptime_seconds", "Application uptime in seconds", "gauge", Math.floor(health.uptime / 1000));

  // Health status (1 = healthy, 0.5 = degraded, 0 = unhealthy)
  const statusValue = health.status === "healthy" ? 1 : health.status === "degraded" ? 0.5 : 0;
  addMetric("app_health_status", "Application health status", "gauge", statusValue);

  // Database
  addMetric("db_connected", "Database connection status", "gauge", health.database.status === "connected" ? 1 : 0);
  if (health.database.latencyMs >= 0) {
    addMetric("db_latency_ms", "Database query latency in milliseconds", "gauge", health.database.latencyMs);
  }
  if (health.database.tableCount !== undefined) {
    addMetric("db_table_count", "Number of database tables", "gauge", health.database.tableCount);
  }

  // Memory
  addMetric("process_memory_rss_bytes", "Process resident set size", "gauge", health.memory.rss);
  addMetric("process_memory_heap_used_bytes", "Process heap used", "gauge", health.memory.heapUsed);
  addMetric("process_memory_heap_total_bytes", "Process heap total", "gauge", health.memory.heapTotal);
  addMetric("process_memory_external_bytes", "Process external memory", "gauge", health.memory.external);
  addMetric("system_memory_total_bytes", "System total memory", "gauge", health.memory.systemTotal);
  addMetric("system_memory_free_bytes", "System free memory", "gauge", health.memory.systemFree);
  addMetric("system_memory_usage_percent", "System memory usage percentage", "gauge", health.memory.systemUsagePercent);

  // CPU
  addMetric("system_cpu_load_1m", "System CPU load average 1 minute", "gauge", health.cpu.loadAvg1m);
  addMetric("system_cpu_load_5m", "System CPU load average 5 minutes", "gauge", health.cpu.loadAvg5m);
  addMetric("system_cpu_load_15m", "System CPU load average 15 minutes", "gauge", health.cpu.loadAvg15m);
  addMetric("system_cpu_count", "Number of CPU cores", "gauge", health.cpu.cpuCount);

  // Services
  addMetric("service_websocket_available", "WebSocket service availability", "gauge", health.services.websocket === "available" ? 1 : 0);
  addMetric("service_sse_available", "SSE service availability", "gauge", health.services.sse === "available" ? 1 : 0);
  addMetric("service_rate_limiter_enabled", "Rate limiter enabled", "gauge", health.services.rateLimiter === "enabled" ? 1 : 0);
  addMetric("service_redis_connected", "Redis connection status", "gauge", health.services.redis === "connected" ? 1 : 0);

  return lines.join("\n") + "\n";
}

/**
 * Liveness probe - simple check that the process is running
 */
export function getLivenessStatus(): { status: "ok"; timestamp: string } {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness probe - check if the app is ready to serve traffic
 */
export async function getReadinessStatus(): Promise<{
  ready: boolean;
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {};

  // Check database
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`SELECT 1`);
      checks.database = true;
    } else {
      checks.database = false;
    }
  } catch {
    checks.database = false;
  }

  // Check memory (fail if > 95% heap usage)
  const mem = process.memoryUsage();
  checks.memory = (mem.heapUsed / mem.heapTotal) < 0.95;

  const ready = Object.values(checks).every(Boolean);

  return { ready, checks };
}
