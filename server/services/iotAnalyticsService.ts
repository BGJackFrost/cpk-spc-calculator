/**
 * IoT Analytics Service
 * 
 * Provides analytics and reporting features:
 * - Custom Reports
 * - Data Aggregation
 * - Trend Analysis
 * - Dashboard Widgets
 */

import { getDb } from '../db';
import {
  iotAnalyticsReports,
  iotDashboardWidgets,
  iotDevices,
  iotDeviceData,
  iotAlertHistory,
} from '../../drizzle/schema';
import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';

// ============ Types ============

export interface AnalyticsReport {
  id: number;
  name: string;
  description?: string;
  reportType: string;
  deviceIds?: number[];
  groupIds?: number[];
  metrics: string[];
  timeRange: string;
  aggregation: string;
  filters?: any;
  chartConfig?: any;
  scheduleEnabled: boolean;
  scheduleFrequency?: string;
  scheduleTime?: string;
  recipients?: string[];
  lastGeneratedAt?: Date;
  createdBy?: number;
}

export interface DashboardWidget {
  id: number;
  userId: number;
  widgetType: string;
  title: string;
  config: any;
  position: { x: number; y: number };
  size: { w: number; h: number };
  refreshInterval: number;
  isVisible: boolean;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metric: string;
  deviceId?: number;
}

// ============ Analytics Reports ============

export async function getAnalyticsReports(userId?: number): Promise<AnalyticsReport[]> {
  const db = await getDb();
  let conditions: any[] = [];
  
  if (userId) {
    conditions.push(eq(iotAnalyticsReports.createdBy, userId));
  }
  
  const reports = await db.select()
    .from(iotAnalyticsReports)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(iotAnalyticsReports.createdAt));
  
  return reports.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    reportType: r.reportType,
    deviceIds: r.deviceIds ? JSON.parse(String(r.deviceIds)) : undefined,
    groupIds: r.groupIds ? JSON.parse(String(r.groupIds)) : undefined,
    metrics: r.metrics ? JSON.parse(String(r.metrics)) : [],
    timeRange: r.timeRange || '7d',
    aggregation: r.aggregation || 'hour',
    filters: r.filters ? JSON.parse(String(r.filters)) : undefined,
    chartConfig: r.chartConfig ? JSON.parse(String(r.chartConfig)) : undefined,
    scheduleEnabled: r.scheduleEnabled === 1,
    scheduleFrequency: r.scheduleFrequency || undefined,
    scheduleTime: r.scheduleTime || undefined,
    recipients: r.recipients ? JSON.parse(String(r.recipients)) : undefined,
    lastGeneratedAt: r.lastGeneratedAt ? new Date(r.lastGeneratedAt) : undefined,
    createdBy: r.createdBy || undefined,
  }));
}

export async function createAnalyticsReport(data: {
  name: string;
  description?: string;
  reportType: string;
  deviceIds?: number[];
  groupIds?: number[];
  metrics: string[];
  timeRange?: string;
  aggregation?: string;
  filters?: any;
  chartConfig?: any;
  scheduleEnabled?: boolean;
  scheduleFrequency?: string;
  scheduleTime?: string;
  recipients?: string[];
  createdBy?: number;
}): Promise<AnalyticsReport> {
  const db = await getDb();
  const [result] = await db.insert(iotAnalyticsReports).values({
    name: data.name,
    description: data.description,
    reportType: data.reportType as any,
    deviceIds: data.deviceIds ? JSON.stringify(data.deviceIds) : null,
    groupIds: data.groupIds ? JSON.stringify(data.groupIds) : null,
    metrics: JSON.stringify(data.metrics),
    timeRange: data.timeRange || '7d',
    aggregation: (data.aggregation || 'hour') as any,
    filters: data.filters ? JSON.stringify(data.filters) : null,
    chartConfig: data.chartConfig ? JSON.stringify(data.chartConfig) : null,
    scheduleEnabled: data.scheduleEnabled ? 1 : 0,
    scheduleFrequency: data.scheduleFrequency as any,
    scheduleTime: data.scheduleTime,
    recipients: data.recipients ? JSON.stringify(data.recipients) : null,
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    name: data.name,
    description: data.description,
    reportType: data.reportType,
    deviceIds: data.deviceIds,
    groupIds: data.groupIds,
    metrics: data.metrics,
    timeRange: data.timeRange || '7d',
    aggregation: data.aggregation || 'hour',
    filters: data.filters,
    chartConfig: data.chartConfig,
    scheduleEnabled: data.scheduleEnabled || false,
    scheduleFrequency: data.scheduleFrequency,
    scheduleTime: data.scheduleTime,
    recipients: data.recipients,
    createdBy: data.createdBy,
  };
}

export async function updateAnalyticsReport(id: number, data: Partial<AnalyticsReport>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.reportType !== undefined) updateData.reportType = data.reportType;
  if (data.deviceIds !== undefined) updateData.deviceIds = JSON.stringify(data.deviceIds);
  if (data.groupIds !== undefined) updateData.groupIds = JSON.stringify(data.groupIds);
  if (data.metrics !== undefined) updateData.metrics = JSON.stringify(data.metrics);
  if (data.timeRange !== undefined) updateData.timeRange = data.timeRange;
  if (data.aggregation !== undefined) updateData.aggregation = data.aggregation;
  if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters);
  if (data.chartConfig !== undefined) updateData.chartConfig = JSON.stringify(data.chartConfig);
  if (data.scheduleEnabled !== undefined) updateData.scheduleEnabled = data.scheduleEnabled ? 1 : 0;
  if (data.scheduleFrequency !== undefined) updateData.scheduleFrequency = data.scheduleFrequency;
  if (data.scheduleTime !== undefined) updateData.scheduleTime = data.scheduleTime;
  if (data.recipients !== undefined) updateData.recipients = JSON.stringify(data.recipients);
  
  await db.update(iotAnalyticsReports).set(updateData).where(eq(iotAnalyticsReports.id, id));
  return true;
}

export async function deleteAnalyticsReport(id: number): Promise<boolean> {
  const db = await getDb();
  await db.delete(iotAnalyticsReports).where(eq(iotAnalyticsReports.id, id));
  return true;
}

// ============ Dashboard Widgets ============

export async function getDashboardWidgets(userId: number): Promise<DashboardWidget[]> {
  const db = await getDb();
  const widgets = await db.select()
    .from(iotDashboardWidgets)
    .where(and(
      eq(iotDashboardWidgets.userId, userId),
      eq(iotDashboardWidgets.isVisible, 1)
    ))
    .orderBy(iotDashboardWidgets.createdAt);
  
  return widgets.map(w => ({
    id: w.id,
    userId: w.userId,
    widgetType: w.widgetType,
    title: w.title,
    config: w.config ? JSON.parse(String(w.config)) : {},
    position: w.position ? JSON.parse(String(w.position)) : { x: 0, y: 0 },
    size: w.size ? JSON.parse(String(w.size)) : { w: 4, h: 3 },
    refreshInterval: w.refreshInterval || 30,
    isVisible: w.isVisible === 1,
  }));
}

export async function createDashboardWidget(data: {
  userId: number;
  widgetType: string;
  title: string;
  config: any;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  refreshInterval?: number;
}): Promise<DashboardWidget> {
  const db = await getDb();
  const [result] = await db.insert(iotDashboardWidgets).values({
    userId: data.userId,
    widgetType: data.widgetType as any,
    title: data.title,
    config: JSON.stringify(data.config),
    position: JSON.stringify(data.position || { x: 0, y: 0 }),
    size: JSON.stringify(data.size || { w: 4, h: 3 }),
    refreshInterval: data.refreshInterval || 30,
  });
  
  return {
    id: result.insertId,
    userId: data.userId,
    widgetType: data.widgetType,
    title: data.title,
    config: data.config,
    position: data.position || { x: 0, y: 0 },
    size: data.size || { w: 4, h: 3 },
    refreshInterval: data.refreshInterval || 30,
    isVisible: true,
  };
}

export async function updateDashboardWidget(id: number, data: Partial<{
  title: string;
  config: any;
  position: { x: number; y: number };
  size: { w: number; h: number };
  refreshInterval: number;
  isVisible: boolean;
}>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = {};
  
  if (data.title !== undefined) updateData.title = data.title;
  if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
  if (data.position !== undefined) updateData.position = JSON.stringify(data.position);
  if (data.size !== undefined) updateData.size = JSON.stringify(data.size);
  if (data.refreshInterval !== undefined) updateData.refreshInterval = data.refreshInterval;
  if (data.isVisible !== undefined) updateData.isVisible = data.isVisible ? 1 : 0;
  
  await db.update(iotDashboardWidgets).set(updateData).where(eq(iotDashboardWidgets.id, id));
  return true;
}

export async function deleteDashboardWidget(id: number): Promise<boolean> {
  const db = await getDb();
  await db.delete(iotDashboardWidgets).where(eq(iotDashboardWidgets.id, id));
  return true;
}

export async function saveDashboardLayout(userId: number, widgets: Array<{
  id: number;
  position: { x: number; y: number };
  size: { w: number; h: number };
}>): Promise<boolean> {
  const db = await getDb();
  
  for (const widget of widgets) {
    await db.update(iotDashboardWidgets).set({
      position: JSON.stringify(widget.position),
      size: JSON.stringify(widget.size),
    }).where(and(
      eq(iotDashboardWidgets.id, widget.id),
      eq(iotDashboardWidgets.userId, userId)
    ));
  }
  
  return true;
}

// ============ Data Aggregation ============

export async function getAggregatedData(options: {
  deviceIds?: number[];
  metrics: string[];
  startDate: Date;
  endDate: Date;
  aggregation: 'minute' | 'hour' | 'day' | 'week' | 'month';
}): Promise<TimeSeriesData[]> {
  const db = await getDb();
  
  // Build time format based on aggregation
  let timeFormat: string;
  switch (options.aggregation) {
    case 'minute':
      timeFormat = '%Y-%m-%d %H:%i:00';
      break;
    case 'hour':
      timeFormat = '%Y-%m-%d %H:00:00';
      break;
    case 'day':
      timeFormat = '%Y-%m-%d';
      break;
    case 'week':
      timeFormat = '%Y-%u'; // Year-Week
      break;
    case 'month':
      timeFormat = '%Y-%m';
      break;
    default:
      timeFormat = '%Y-%m-%d %H:00:00';
  }
  
  // Get device data with aggregation
  const data = await db.select({
    timestamp: sql<string>`DATE_FORMAT(${iotDeviceData.timestamp}, ${timeFormat})`,
    deviceId: iotDeviceData.deviceId,
    avgValue: sql<number>`AVG(${iotDeviceData.value})`,
    minValue: sql<number>`MIN(${iotDeviceData.value})`,
    maxValue: sql<number>`MAX(${iotDeviceData.value})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(iotDeviceData)
    .where(and(
      options.deviceIds && options.deviceIds.length > 0
        ? inArray(iotDeviceData.deviceId, options.deviceIds)
        : undefined,
      gte(iotDeviceData.timestamp, options.startDate.toISOString()),
      lte(iotDeviceData.timestamp, options.endDate.toISOString())
    ))
    .groupBy(sql`DATE_FORMAT(${iotDeviceData.timestamp}, ${timeFormat})`, iotDeviceData.deviceId)
    .orderBy(sql`DATE_FORMAT(${iotDeviceData.timestamp}, ${timeFormat})`);
  
  return data.map(d => ({
    timestamp: new Date(d.timestamp),
    value: Number(d.avgValue),
    metric: 'value',
    deviceId: d.deviceId,
  }));
}

// ============ Trend Analysis ============

export async function analyzeTrends(deviceId: number, metric: string, days: number = 30): Promise<{
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  average: number;
  min: number;
  max: number;
  stdDev: number;
  dataPoints: number;
}> {
  const db = await getDb();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const data = await db.select({
    avgValue: sql<number>`AVG(${iotDeviceData.value})`,
    minValue: sql<number>`MIN(${iotDeviceData.value})`,
    maxValue: sql<number>`MAX(${iotDeviceData.value})`,
    stdDev: sql<number>`STDDEV(${iotDeviceData.value})`,
    count: sql<number>`COUNT(*)`,
  })
    .from(iotDeviceData)
    .where(and(
      eq(iotDeviceData.deviceId, deviceId),
      gte(iotDeviceData.timestamp, startDate.toISOString())
    ));
  
  const stats = data[0];
  
  // Get first and last values for trend
  const firstData = await db.select({ value: iotDeviceData.value })
    .from(iotDeviceData)
    .where(and(
      eq(iotDeviceData.deviceId, deviceId),
      gte(iotDeviceData.timestamp, startDate.toISOString())
    ))
    .orderBy(iotDeviceData.timestamp)
    .limit(1);
  
  const lastData = await db.select({ value: iotDeviceData.value })
    .from(iotDeviceData)
    .where(and(
      eq(iotDeviceData.deviceId, deviceId),
      gte(iotDeviceData.timestamp, startDate.toISOString())
    ))
    .orderBy(desc(iotDeviceData.timestamp))
    .limit(1);
  
  const firstValue = firstData[0]?.value ? Number(firstData[0].value) : 0;
  const lastValue = lastData[0]?.value ? Number(lastData[0].value) : 0;
  
  const changePercent = firstValue !== 0 
    ? ((lastValue - firstValue) / firstValue) * 100 
    : 0;
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (changePercent > 5) trend = 'increasing';
  else if (changePercent < -5) trend = 'decreasing';
  else trend = 'stable';
  
  return {
    trend,
    changePercent: Math.round(changePercent * 100) / 100,
    average: Number(stats.avgValue) || 0,
    min: Number(stats.minValue) || 0,
    max: Number(stats.maxValue) || 0,
    stdDev: Number(stats.stdDev) || 0,
    dataPoints: Number(stats.count) || 0,
  };
}

// ============ Report Generation ============

export async function generateReport(reportId: number): Promise<{
  data: any[];
  summary: any;
  generatedAt: Date;
}> {
  const db = await getDb();
  
  // Get report config
  const [report] = await db.select().from(iotAnalyticsReports).where(eq(iotAnalyticsReports.id, reportId));
  if (!report) throw new Error('Report not found');
  
  const deviceIds = report.deviceIds ? JSON.parse(String(report.deviceIds)) : [];
  const metrics = report.metrics ? JSON.parse(String(report.metrics)) : [];
  const timeRange = report.timeRange || '7d';
  const aggregation = report.aggregation || 'hour';
  
  // Parse time range
  const now = new Date();
  let startDate: Date;
  switch (timeRange) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  // Get aggregated data
  const data = await getAggregatedData({
    deviceIds,
    metrics,
    startDate,
    endDate: now,
    aggregation: aggregation as any,
  });
  
  // Generate summary
  const summary = {
    totalDataPoints: data.length,
    deviceCount: new Set(data.map(d => d.deviceId)).size,
    timeRange: {
      start: startDate,
      end: now,
    },
    metrics: metrics,
  };
  
  // Update last generated timestamp
  await db.update(iotAnalyticsReports).set({
    lastGeneratedAt: now.toISOString(),
  }).where(eq(iotAnalyticsReports.id, reportId));
  
  return {
    data,
    summary,
    generatedAt: now,
  };
}

// ============ Analytics Statistics ============

export async function getAnalyticsStats(): Promise<{
  totalReports: number;
  scheduledReports: number;
  totalWidgets: number;
  dataPointsToday: number;
  alertsToday: number;
}> {
  const db = await getDb();
  
  const reports = await db.select().from(iotAnalyticsReports);
  const widgets = await db.select().from(iotDashboardWidgets);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const dataPointsToday = await db.select({ count: sql<number>`COUNT(*)` })
    .from(iotDeviceData)
    .where(gte(iotDeviceData.timestamp, todayStart.toISOString()));
  
  const alertsToday = await db.select({ count: sql<number>`COUNT(*)` })
    .from(iotAlertHistory)
    .where(gte(iotAlertHistory.triggeredAt, todayStart.toISOString()));
  
  return {
    totalReports: reports.length,
    scheduledReports: reports.filter(r => r.scheduleEnabled === 1).length,
    totalWidgets: widgets.length,
    dataPointsToday: Number(dataPointsToday[0]?.count) || 0,
    alertsToday: Number(alertsToday[0]?.count) || 0,
  };
}
