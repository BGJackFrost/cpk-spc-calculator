/**
 * Memory Leak Detector Service
 * 
 * Monitors memory usage and detects potential memory leaks.
 * Provides heap analysis and garbage collection insights.
 */

// Memory snapshot interface
export interface MemorySnapshot {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

// Memory trend analysis
export interface MemoryTrend {
  isLeaking: boolean;
  growthRate: number; // bytes per minute
  avgHeapUsed: number;
  maxHeapUsed: number;
  minHeapUsed: number;
  samples: number;
  duration: number; // minutes
  recommendation: string;
}

// Memory alert
export interface MemoryAlert {
  id: string;
  type: 'high_usage' | 'rapid_growth' | 'potential_leak' | 'gc_pressure';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  currentUsage: number;
  threshold: number;
}

// Configuration
interface MemoryConfig {
  snapshotInterval: number; // ms
  maxSnapshots: number;
  highUsageThreshold: number; // percentage of heap limit
  rapidGrowthThreshold: number; // bytes per minute
  leakDetectionWindow: number; // minutes
  gcPressureThreshold: number; // GC events per minute
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private alerts: MemoryAlert[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private gcEvents: Date[] = [];
  
  private config: MemoryConfig = {
    snapshotInterval: 60000, // 1 minute
    maxSnapshots: 60, // 1 hour of data
    highUsageThreshold: 85, // 85% of heap
    rapidGrowthThreshold: 10 * 1024 * 1024, // 10MB per minute
    leakDetectionWindow: 15, // 15 minutes
    gcPressureThreshold: 10, // 10 GC events per minute
  };

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): MemoryConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    // Check for alerts
    this.checkAlerts(snapshot);

    return snapshot;
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
    };
  }

  /**
   * Get memory snapshots
   */
  getSnapshots(limit?: number): MemorySnapshot[] {
    const snapshots = [...this.snapshots];
    if (limit) {
      return snapshots.slice(-limit);
    }
    return snapshots;
  }

  /**
   * Analyze memory trend
   */
  analyzeTrend(): MemoryTrend {
    const trend: MemoryTrend = {
      isLeaking: false,
      growthRate: 0,
      avgHeapUsed: 0,
      maxHeapUsed: 0,
      minHeapUsed: Infinity,
      samples: this.snapshots.length,
      duration: 0,
      recommendation: '',
    };

    if (this.snapshots.length < 2) {
      trend.recommendation = 'Not enough data to analyze trend. Need at least 2 snapshots.';
      return trend;
    }

    // Calculate statistics
    let totalHeap = 0;
    this.snapshots.forEach((s) => {
      totalHeap += s.heapUsed;
      if (s.heapUsed > trend.maxHeapUsed) trend.maxHeapUsed = s.heapUsed;
      if (s.heapUsed < trend.minHeapUsed) trend.minHeapUsed = s.heapUsed;
    });
    trend.avgHeapUsed = totalHeap / this.snapshots.length;

    // Calculate duration
    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    trend.duration = (lastSnapshot.timestamp.getTime() - firstSnapshot.timestamp.getTime()) / 60000;

    // Calculate growth rate
    if (trend.duration > 0) {
      const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
      trend.growthRate = heapGrowth / trend.duration;
    }

    // Detect potential leak
    if (trend.growthRate > this.config.rapidGrowthThreshold) {
      trend.isLeaking = true;
      trend.recommendation = `Memory is growing at ${this.formatBytes(trend.growthRate)}/min. ` +
        'Consider profiling with --inspect to identify the source.';
    } else if (trend.growthRate > 0 && trend.duration > this.config.leakDetectionWindow) {
      // Check if memory is consistently growing
      const recentSnapshots = this.snapshots.slice(-Math.floor(this.config.leakDetectionWindow));
      let growingCount = 0;
      for (let i = 1; i < recentSnapshots.length; i++) {
        if (recentSnapshots[i].heapUsed > recentSnapshots[i - 1].heapUsed) {
          growingCount++;
        }
      }
      if (growingCount > recentSnapshots.length * 0.7) {
        trend.isLeaking = true;
        trend.recommendation = 'Memory shows consistent growth pattern. ' +
          'Check for event listener leaks, unclosed connections, or growing caches.';
      }
    }

    if (!trend.isLeaking) {
      trend.recommendation = 'Memory usage appears stable. No leak detected.';
    }

    return trend;
  }

  /**
   * Check for memory alerts
   */
  private checkAlerts(snapshot: MemorySnapshot): void {
    const heapUsagePercent = (snapshot.heapUsed / snapshot.heapTotal) * 100;

    // High usage alert
    if (heapUsagePercent > this.config.highUsageThreshold) {
      this.addAlert({
        type: 'high_usage',
        severity: heapUsagePercent > 95 ? 'critical' : 'warning',
        message: `Heap usage at ${heapUsagePercent.toFixed(1)}% (${this.formatBytes(snapshot.heapUsed)} / ${this.formatBytes(snapshot.heapTotal)})`,
        currentUsage: heapUsagePercent,
        threshold: this.config.highUsageThreshold,
      });
    }

    // Rapid growth alert
    const trend = this.analyzeTrend();
    if (trend.growthRate > this.config.rapidGrowthThreshold) {
      this.addAlert({
        type: 'rapid_growth',
        severity: 'warning',
        message: `Memory growing at ${this.formatBytes(trend.growthRate)}/min`,
        currentUsage: trend.growthRate,
        threshold: this.config.rapidGrowthThreshold,
      });
    }

    // Potential leak alert
    if (trend.isLeaking) {
      this.addAlert({
        type: 'potential_leak',
        severity: 'critical',
        message: trend.recommendation,
        currentUsage: trend.growthRate,
        threshold: this.config.rapidGrowthThreshold,
      });
    }
  }

  /**
   * Add an alert
   */
  private addAlert(alert: Omit<MemoryAlert, 'id' | 'timestamp'>): void {
    // Check if similar alert exists in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSimilar = this.alerts.find(
      (a) => a.type === alert.type && a.timestamp > fiveMinutesAgo
    );
    if (recentSimilar) return;

    this.alerts.push({
      ...alert,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Get alerts
   */
  getAlerts(options?: {
    type?: MemoryAlert['type'];
    severity?: MemoryAlert['severity'];
    limit?: number;
  }): MemoryAlert[] {
    let alerts = [...this.alerts];

    if (options?.type) {
      alerts = alerts.filter((a) => a.type === options.type);
    }

    if (options?.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, this.config.snapshotInterval);

    // Take initial snapshot
    this.takeSnapshot();
    console.log('[MemoryLeakDetector] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[MemoryLeakDetector] Monitoring stopped');
    }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      this.gcEvents.push(new Date());
      // Keep only last hour of GC events
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.gcEvents = this.gcEvents.filter((e) => e > oneHourAgo);
      return true;
    }
    return false;
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    current: MemorySnapshot;
    trend: MemoryTrend;
    alertCount: number;
    criticalAlerts: number;
    gcEventsLastHour: number;
    isMonitoring: boolean;
  } {
    return {
      current: this.getCurrentUsage(),
      trend: this.analyzeTrend(),
      alertCount: this.alerts.length,
      criticalAlerts: this.alerts.filter((a) => a.severity === 'critical').length,
      gcEventsLastHour: this.gcEvents.length,
      isMonitoring: this.isMonitoring(),
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get formatted memory report
   */
  getReport(): string {
    const stats = this.getStats();
    const current = stats.current;
    const trend = stats.trend;

    let report = '=== Memory Report ===\n\n';
    report += `Timestamp: ${new Date().toISOString()}\n\n`;
    
    report += '--- Current Usage ---\n';
    report += `Heap Used: ${this.formatBytes(current.heapUsed)}\n`;
    report += `Heap Total: ${this.formatBytes(current.heapTotal)}\n`;
    report += `External: ${this.formatBytes(current.external)}\n`;
    report += `RSS: ${this.formatBytes(current.rss)}\n\n`;
    
    report += '--- Trend Analysis ---\n';
    report += `Samples: ${trend.samples}\n`;
    report += `Duration: ${trend.duration.toFixed(1)} minutes\n`;
    report += `Avg Heap: ${this.formatBytes(trend.avgHeapUsed)}\n`;
    report += `Growth Rate: ${this.formatBytes(trend.growthRate)}/min\n`;
    report += `Leak Detected: ${trend.isLeaking ? 'YES' : 'No'}\n`;
    report += `Recommendation: ${trend.recommendation}\n\n`;
    
    report += '--- Alerts ---\n';
    report += `Total: ${stats.alertCount}\n`;
    report += `Critical: ${stats.criticalAlerts}\n`;

    return report;
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetector();

// Export functions
export const takeMemorySnapshot = memoryLeakDetector.takeSnapshot.bind(memoryLeakDetector);
export const getCurrentMemoryUsage = memoryLeakDetector.getCurrentUsage.bind(memoryLeakDetector);
export const getMemorySnapshots = memoryLeakDetector.getSnapshots.bind(memoryLeakDetector);
export const analyzeMemoryTrend = memoryLeakDetector.analyzeTrend.bind(memoryLeakDetector);
export const getMemoryAlerts = memoryLeakDetector.getAlerts.bind(memoryLeakDetector);
export const clearMemoryAlerts = memoryLeakDetector.clearAlerts.bind(memoryLeakDetector);
export const startMemoryMonitoring = memoryLeakDetector.startMonitoring.bind(memoryLeakDetector);
export const stopMemoryMonitoring = memoryLeakDetector.stopMonitoring.bind(memoryLeakDetector);
export const getMemoryStats = memoryLeakDetector.getStats.bind(memoryLeakDetector);
export const getMemoryReport = memoryLeakDetector.getReport.bind(memoryLeakDetector);
export const forceGarbageCollection = memoryLeakDetector.forceGC.bind(memoryLeakDetector);
export const updateMemoryConfig = memoryLeakDetector.updateConfig.bind(memoryLeakDetector);
export const getMemoryConfig = memoryLeakDetector.getConfig.bind(memoryLeakDetector);
