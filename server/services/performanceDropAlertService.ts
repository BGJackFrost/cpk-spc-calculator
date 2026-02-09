/**
 * Performance Drop Alert Service
 * Phát hiện và cảnh báo khi hiệu suất dây chuyền giảm đột ngột
 */
import { getDb } from '../db';
import { productionLines, oeeRecords, kpiAlertStats, systemSettings } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

export interface PerformanceDropConfig {
  enabled: boolean;
  oeeDropThreshold: number; // Ngưỡng giảm OEE (%)
  cpkDropThreshold: number; // Ngưỡng giảm CPK
  comparisonPeriodHours: number; // So sánh với dữ liệu trong N giờ trước
  checkIntervalMinutes: number; // Kiểm tra mỗi N phút
  notifyOwner: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  minSamplesRequired: number; // Số mẫu tối thiểu để đánh giá
}

export interface PerformanceDropAlert {
  productionLineId: number;
  productionLineName: string;
  alertType: 'oee_drop' | 'cpk_drop' | 'availability_drop' | 'quality_drop';
  currentValue: number;
  baselineValue: number;
  dropPercentage: number;
  severity: 'warning' | 'critical';
  message: string;
  detectedAt: Date;
}

const DEFAULT_CONFIG: PerformanceDropConfig = {
  enabled: false,
  oeeDropThreshold: 10, // Giảm 10% OEE
  cpkDropThreshold: 0.2, // Giảm 0.2 CPK
  comparisonPeriodHours: 24, // So sánh với 24h trước
  checkIntervalMinutes: 30, // Kiểm tra mỗi 30 phút
  notifyOwner: true,
  notifyEmail: true,
  notifySms: false,
  minSamplesRequired: 5,
};

let performanceDropConfig: PerformanceDropConfig = { ...DEFAULT_CONFIG };

/**
 * Lấy cấu hình Performance Drop Alert
 */
export async function getPerformanceDropConfig(): Promise<PerformanceDropConfig> {
  const db = await getDb();
  if (!db) return performanceDropConfig;

  try {
    const result = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'performance_drop_config'))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      const savedConfig = JSON.parse(result[0].value);
      performanceDropConfig = { ...DEFAULT_CONFIG, ...savedConfig };
    }
  } catch (error) {
    console.error('Error loading performance drop config:', error);
  }

  return performanceDropConfig;
}

/**
 * Lưu cấu hình Performance Drop Alert
 */
export async function savePerformanceDropConfig(config: Partial<PerformanceDropConfig>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    performanceDropConfig = { ...performanceDropConfig, ...config };
    const configJson = JSON.stringify(performanceDropConfig);

    await db.execute(sql.raw(`
      INSERT INTO system_settings (\`key\`, \`value\`, createdAt, updatedAt)
      VALUES ('performance_drop_config', '${configJson.replace(/'/g, "''")}', NOW(), NOW())
      ON DUPLICATE KEY UPDATE \`value\` = '${configJson.replace(/'/g, "''")}', updatedAt = NOW()
    `));

    return true;
  } catch (error) {
    console.error('Error saving performance drop config:', error);
    return false;
  }
}

/**
 * Lấy baseline hiệu suất của dây chuyền
 */
async function getBaselinePerformance(
  lineId: number,
  hoursBack: number
): Promise<{
  avgOee: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  sampleCount: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const endTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // Exclude last hour

  try {
    const result = await db.select({
      avgOee: sql<number>`AVG(${oeeRecords.oee})`,
      avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
      avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
      avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
      sampleCount: sql<number>`COUNT(*)`,
    })
      .from(oeeRecords)
      .where(
        and(
          eq(oeeRecords.productionLineId, lineId),
          gte(oeeRecords.recordDate, startTime),
          lte(oeeRecords.recordDate, endTime)
        )
      );

    if (result.length > 0 && Number(result[0].sampleCount) > 0) {
      return {
        avgOee: Number(result[0].avgOee) || 0,
        avgAvailability: Number(result[0].avgAvailability) || 0,
        avgPerformance: Number(result[0].avgPerformance) || 0,
        avgQuality: Number(result[0].avgQuality) || 0,
        sampleCount: Number(result[0].sampleCount) || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting baseline performance:', error);
    return null;
  }
}

/**
 * Lấy hiệu suất hiện tại của dây chuyền
 */
async function getCurrentPerformance(
  lineId: number,
  hoursBack: number = 1
): Promise<{
  avgOee: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  sampleCount: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  try {
    const result = await db.select({
      avgOee: sql<number>`AVG(${oeeRecords.oee})`,
      avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
      avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
      avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
      sampleCount: sql<number>`COUNT(*)`,
    })
      .from(oeeRecords)
      .where(
        and(
          eq(oeeRecords.productionLineId, lineId),
          gte(oeeRecords.recordDate, startTime)
        )
      );

    if (result.length > 0 && Number(result[0].sampleCount) > 0) {
      return {
        avgOee: Number(result[0].avgOee) || 0,
        avgAvailability: Number(result[0].avgAvailability) || 0,
        avgPerformance: Number(result[0].avgPerformance) || 0,
        avgQuality: Number(result[0].avgQuality) || 0,
        sampleCount: Number(result[0].sampleCount) || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting current performance:', error);
    return null;
  }
}

/**
 * Kiểm tra và phát hiện giảm hiệu suất đột ngột
 */
export async function checkPerformanceDrops(): Promise<PerformanceDropAlert[]> {
  await getPerformanceDropConfig();

  if (!performanceDropConfig.enabled) {
    return [];
  }

  const db = await getDb();
  if (!db) return [];

  const alerts: PerformanceDropAlert[] = [];

  try {
    // Lấy tất cả dây chuyền đang hoạt động
    const lines = await db.select()
      .from(productionLines)
      .where(eq(productionLines.status, 'active'));

    for (const line of lines) {
      const baseline = await getBaselinePerformance(
        line.id,
        performanceDropConfig.comparisonPeriodHours
      );
      const current = await getCurrentPerformance(line.id, 1);

      if (!baseline || !current) continue;
      if (baseline.sampleCount < performanceDropConfig.minSamplesRequired) continue;
      if (current.sampleCount < 1) continue;

      // Kiểm tra OEE drop
      const oeeDrop = baseline.avgOee - current.avgOee;
      if (oeeDrop >= performanceDropConfig.oeeDropThreshold) {
        const dropPercentage = (oeeDrop / baseline.avgOee) * 100;
        const severity = oeeDrop >= performanceDropConfig.oeeDropThreshold * 1.5 ? 'critical' : 'warning';

        alerts.push({
          productionLineId: line.id,
          productionLineName: line.name,
          alertType: 'oee_drop',
          currentValue: current.avgOee,
          baselineValue: baseline.avgOee,
          dropPercentage,
          severity,
          message: `OEE giảm ${oeeDrop.toFixed(2)}% (từ ${baseline.avgOee.toFixed(2)}% xuống ${current.avgOee.toFixed(2)}%)`,
          detectedAt: new Date(),
        });
      }

      // Kiểm tra Availability drop
      const availabilityDrop = baseline.avgAvailability - current.avgAvailability;
      if (availabilityDrop >= performanceDropConfig.oeeDropThreshold) {
        const dropPercentage = (availabilityDrop / baseline.avgAvailability) * 100;
        const severity = availabilityDrop >= performanceDropConfig.oeeDropThreshold * 1.5 ? 'critical' : 'warning';

        alerts.push({
          productionLineId: line.id,
          productionLineName: line.name,
          alertType: 'availability_drop',
          currentValue: current.avgAvailability,
          baselineValue: baseline.avgAvailability,
          dropPercentage,
          severity,
          message: `Availability giảm ${availabilityDrop.toFixed(2)}% (từ ${baseline.avgAvailability.toFixed(2)}% xuống ${current.avgAvailability.toFixed(2)}%)`,
          detectedAt: new Date(),
        });
      }

      // Kiểm tra Quality drop
      const qualityDrop = baseline.avgQuality - current.avgQuality;
      if (qualityDrop >= performanceDropConfig.oeeDropThreshold) {
        const dropPercentage = (qualityDrop / baseline.avgQuality) * 100;
        const severity = qualityDrop >= performanceDropConfig.oeeDropThreshold * 1.5 ? 'critical' : 'warning';

        alerts.push({
          productionLineId: line.id,
          productionLineName: line.name,
          alertType: 'quality_drop',
          currentValue: current.avgQuality,
          baselineValue: baseline.avgQuality,
          dropPercentage,
          severity,
          message: `Quality giảm ${qualityDrop.toFixed(2)}% (từ ${baseline.avgQuality.toFixed(2)}% xuống ${current.avgQuality.toFixed(2)}%)`,
          detectedAt: new Date(),
        });
      }
    }

    // Lưu alerts vào database và gửi thông báo
    for (const alert of alerts) {
      await savePerformanceDropAlert(alert);
    }

    return alerts;
  } catch (error) {
    console.error('Error checking performance drops:', error);
    return [];
  }
}

/**
 * Lưu alert vào database và gửi thông báo
 */
async function savePerformanceDropAlert(alert: PerformanceDropAlert): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Kiểm tra xem đã có alert tương tự trong 1 giờ qua chưa
    const existingAlert = await db.select()
      .from(kpiAlertStats)
      .where(
        and(
          eq(kpiAlertStats.productionLineId, alert.productionLineId),
          eq(kpiAlertStats.alertType, alert.alertType),
          isNull(kpiAlertStats.resolvedAt),
          gte(kpiAlertStats.createdAt, new Date(Date.now() - 60 * 60 * 1000))
        )
      )
      .limit(1);

    if (existingAlert.length > 0) {
      // Đã có alert, không tạo mới
      return;
    }

    // Tạo alert mới
    await db.insert(kpiAlertStats).values({
      productionLineId: alert.productionLineId,
      alertType: alert.alertType,
      severity: alert.severity,
      alertMessage: alert.message,
      currentValue: alert.currentValue.toString(),
      thresholdValue: alert.baselineValue.toString(),
      createdAt: alert.detectedAt,
    });

    // Gửi thông báo
    if (performanceDropConfig.notifyOwner) {
      await notifyOwner({
        title: `[${alert.severity.toUpperCase()}] Hiệu suất giảm đột ngột - ${alert.productionLineName}`,
        content: `
Dây chuyền: ${alert.productionLineName}
Loại cảnh báo: ${alert.alertType.replace(/_/g, ' ').toUpperCase()}
${alert.message}

Giá trị baseline: ${alert.baselineValue.toFixed(2)}
Giá trị hiện tại: ${alert.currentValue.toFixed(2)}
Mức giảm: ${alert.dropPercentage.toFixed(2)}%

Vui lòng kiểm tra và xử lý kịp thời.
        `,
      });
    }

    console.log(`[PerformanceDrop] Alert created for ${alert.productionLineName}: ${alert.message}`);
  } catch (error) {
    console.error('Error saving performance drop alert:', error);
  }
}

/**
 * Lấy danh sách alerts chưa xử lý
 */
export async function getUnresolvedPerformanceDropAlerts(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const alerts = await db.select({
      id: kpiAlertStats.id,
      productionLineId: kpiAlertStats.productionLineId,
      alertType: kpiAlertStats.alertType,
      severity: kpiAlertStats.severity,
      alertMessage: kpiAlertStats.alertMessage,
      currentValue: kpiAlertStats.currentValue,
      thresholdValue: kpiAlertStats.thresholdValue,
      createdAt: kpiAlertStats.createdAt,
      acknowledgedAt: kpiAlertStats.acknowledgedAt,
    })
      .from(kpiAlertStats)
      .where(
        and(
          isNull(kpiAlertStats.resolvedAt),
          sql`${kpiAlertStats.alertType} IN ('oee_drop', 'cpk_drop', 'availability_drop', 'quality_drop')`
        )
      )
      .orderBy(desc(kpiAlertStats.createdAt))
      .limit(100);

    // Lấy tên dây chuyền
    const lineIds = [...new Set(alerts.filter(a => a.productionLineId).map(a => a.productionLineId!))];
    let lineMap = new Map<number, string>();

    if (lineIds.length > 0) {
      const lines = await db.select({ id: productionLines.id, name: productionLines.name })
        .from(productionLines);
      lineMap = new Map(lines.map(l => [l.id, l.name]));
    }

    return alerts.map(a => ({
      ...a,
      productionLineName: a.productionLineId ? lineMap.get(a.productionLineId) : undefined,
      minutesSinceCreated: Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000),
    }));
  } catch (error) {
    console.error('Error getting unresolved performance drop alerts:', error);
    return [];
  }
}

/**
 * Đánh dấu alert đã xử lý
 */
export async function resolvePerformanceDropAlert(alertId: number, resolvedBy?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(kpiAlertStats)
      .set({
        resolvedAt: new Date(),
        resolvedBy: resolvedBy || 'system',
      })
      .where(eq(kpiAlertStats.id, alertId));

    return true;
  } catch (error) {
    console.error('Error resolving performance drop alert:', error);
    return false;
  }
}

/**
 * Lấy thống kê performance drops
 */
export async function getPerformanceDropStats(days: number = 7): Promise<{
  totalAlerts: number;
  byType: { type: string; count: number }[];
  byLine: { lineId: number; lineName: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return { totalAlerts: 0, byType: [], byLine: [], bySeverity: [] };
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Total alerts
    const totalResult = await db.select({
      count: sql<number>`COUNT(*)`,
    })
      .from(kpiAlertStats)
      .where(
        and(
          sql`${kpiAlertStats.alertType} IN ('oee_drop', 'cpk_drop', 'availability_drop', 'quality_drop')`,
          gte(kpiAlertStats.createdAt, startDate)
        )
      );

    // By type
    const byTypeResult = await db.select({
      type: kpiAlertStats.alertType,
      count: sql<number>`COUNT(*)`,
    })
      .from(kpiAlertStats)
      .where(
        and(
          sql`${kpiAlertStats.alertType} IN ('oee_drop', 'cpk_drop', 'availability_drop', 'quality_drop')`,
          gte(kpiAlertStats.createdAt, startDate)
        )
      )
      .groupBy(kpiAlertStats.alertType);

    // By severity
    const bySeverityResult = await db.select({
      severity: kpiAlertStats.severity,
      count: sql<number>`COUNT(*)`,
    })
      .from(kpiAlertStats)
      .where(
        and(
          sql`${kpiAlertStats.alertType} IN ('oee_drop', 'cpk_drop', 'availability_drop', 'quality_drop')`,
          gte(kpiAlertStats.createdAt, startDate)
        )
      )
      .groupBy(kpiAlertStats.severity);

    // By line
    const byLineResult = await db.select({
      lineId: kpiAlertStats.productionLineId,
      count: sql<number>`COUNT(*)`,
    })
      .from(kpiAlertStats)
      .where(
        and(
          sql`${kpiAlertStats.alertType} IN ('oee_drop', 'cpk_drop', 'availability_drop', 'quality_drop')`,
          gte(kpiAlertStats.createdAt, startDate)
        )
      )
      .groupBy(kpiAlertStats.productionLineId);

    // Get line names
    const lineIds = byLineResult.filter(r => r.lineId).map(r => r.lineId!);
    let lineMap = new Map<number, string>();
    if (lineIds.length > 0) {
      const lines = await db.select({ id: productionLines.id, name: productionLines.name })
        .from(productionLines);
      lineMap = new Map(lines.map(l => [l.id, l.name]));
    }

    return {
      totalAlerts: Number(totalResult[0]?.count) || 0,
      byType: byTypeResult.map(r => ({ type: r.type || 'unknown', count: Number(r.count) })),
      bySeverity: bySeverityResult.map(r => ({ severity: r.severity || 'unknown', count: Number(r.count) })),
      byLine: byLineResult
        .filter(r => r.lineId)
        .map(r => ({
          lineId: r.lineId!,
          lineName: lineMap.get(r.lineId!) || `Line #${r.lineId}`,
          count: Number(r.count),
        })),
    };
  } catch (error) {
    console.error('Error getting performance drop stats:', error);
    return { totalAlerts: 0, byType: [], byLine: [], bySeverity: [] };
  }
}
