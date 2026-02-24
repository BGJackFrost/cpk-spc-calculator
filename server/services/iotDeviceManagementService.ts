/**
 * IoT Device Management Service - Enhanced
 * 
 * Provides advanced device management features:
 * - Device Groups management
 * - Device Templates
 * - Health Score calculation
 * - Maintenance scheduling
 * - Firmware management
 * - Commissioning workflow
 */

import { getDb } from '../db';
import {
  iotDevices,
  iotDeviceGroups,
  iotDeviceTemplates,
  iotDeviceHealth,
  iotMaintenanceSchedules,
  iotDeviceFirmware,
  iotDeviceCommissioning,
} from '../../drizzle/schema';
import { eq, and, desc, gte, lte, isNull, sql, inArray } from 'drizzle-orm';

// ============ Device Groups ============

export interface DeviceGroup {
  id: number;
  name: string;
  description?: string;
  parentGroupId?: number;
  location?: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  deviceCount?: number;
  children?: DeviceGroup[];
}

export async function getDeviceGroups(): Promise<DeviceGroup[]> {
  const db = await getDb();
  const groups = await db.select().from(iotDeviceGroups).where(eq(iotDeviceGroups.isActive, 1));
  
  // Build tree structure
  const groupMap = new Map<number, DeviceGroup>();
  const rootGroups: DeviceGroup[] = [];
  
  groups.forEach(g => {
    groupMap.set(g.id, {
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      parentGroupId: g.parentGroupId || undefined,
      location: g.location || undefined,
      icon: g.icon || 'folder',
      color: g.color || '#3b82f6',
      sortOrder: g.sortOrder || 0,
      isActive: g.isActive === 1,
      children: [],
    });
  });
  
  groupMap.forEach(group => {
    if (group.parentGroupId) {
      const parent = groupMap.get(group.parentGroupId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(group);
      }
    } else {
      rootGroups.push(group);
    }
  });
  
  return rootGroups.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createDeviceGroup(data: {
  name: string;
  description?: string;
  parentGroupId?: number;
  location?: string;
  icon?: string;
  color?: string;
  createdBy?: number;
}): Promise<DeviceGroup> {
  const db = await getDb();
  const [result] = await db.insert(iotDeviceGroups).values({
    name: data.name,
    description: data.description,
    parentGroupId: data.parentGroupId,
    location: data.location,
    icon: data.icon || 'folder',
    color: data.color || '#3b82f6',
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    name: data.name,
    description: data.description,
    parentGroupId: data.parentGroupId,
    location: data.location,
    icon: data.icon || 'folder',
    color: data.color || '#3b82f6',
    sortOrder: 0,
    isActive: true,
  };
}

export async function updateDeviceGroup(id: number, data: Partial<{
  name: string;
  description: string;
  parentGroupId: number;
  location: string;
  icon: string;
  color: string;
  sortOrder: number;
}>): Promise<boolean> {
  const db = await getDb();
  await db.update(iotDeviceGroups).set(data).where(eq(iotDeviceGroups.id, id));
  return true;
}

export async function deleteDeviceGroup(id: number): Promise<boolean> {
  const db = await getDb();
  await db.update(iotDeviceGroups).set({ isActive: 0 }).where(eq(iotDeviceGroups.id, id));
  return true;
}

// ============ Device Templates ============

export interface DeviceTemplate {
  id: number;
  name: string;
  description?: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  protocol: string;
  defaultConfig?: Record<string, any>;
  metricsConfig?: Record<string, any>;
  alertThresholds?: Record<string, any>;
  tags?: string[];
  icon: string;
  isActive: boolean;
}

export async function getDeviceTemplates(): Promise<DeviceTemplate[]> {
  const db = await getDb();
  const templates = await db.select().from(iotDeviceTemplates).where(eq(iotDeviceTemplates.isActive, 1));
  
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || undefined,
    deviceType: t.deviceType,
    manufacturer: t.manufacturer || undefined,
    model: t.model || undefined,
    protocol: t.protocol,
    defaultConfig: t.defaultConfig ? JSON.parse(String(t.defaultConfig)) : undefined,
    metricsConfig: t.metricsConfig ? JSON.parse(String(t.metricsConfig)) : undefined,
    alertThresholds: t.alertThresholds ? JSON.parse(String(t.alertThresholds)) : undefined,
    tags: t.tags ? JSON.parse(String(t.tags)) : undefined,
    icon: t.icon || 'cpu',
    isActive: t.isActive === 1,
  }));
}

export async function createDeviceTemplate(data: {
  name: string;
  description?: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  protocol: string;
  defaultConfig?: Record<string, any>;
  metricsConfig?: Record<string, any>;
  alertThresholds?: Record<string, any>;
  tags?: string[];
  icon?: string;
  createdBy?: number;
}): Promise<DeviceTemplate> {
  const db = await getDb();
  const [result] = await db.insert(iotDeviceTemplates).values({
    name: data.name,
    description: data.description,
    deviceType: data.deviceType as any,
    manufacturer: data.manufacturer,
    model: data.model,
    protocol: data.protocol as any,
    defaultConfig: data.defaultConfig ? JSON.stringify(data.defaultConfig) : null,
    metricsConfig: data.metricsConfig ? JSON.stringify(data.metricsConfig) : null,
    alertThresholds: data.alertThresholds ? JSON.stringify(data.alertThresholds) : null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    icon: data.icon || 'cpu',
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    name: data.name,
    description: data.description,
    deviceType: data.deviceType,
    manufacturer: data.manufacturer,
    model: data.model,
    protocol: data.protocol,
    defaultConfig: data.defaultConfig,
    metricsConfig: data.metricsConfig,
    alertThresholds: data.alertThresholds,
    tags: data.tags,
    icon: data.icon || 'cpu',
    isActive: true,
  };
}

export async function updateDeviceTemplate(id: number, data: Partial<DeviceTemplate>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = { ...data };
  if (data.defaultConfig) updateData.defaultConfig = JSON.stringify(data.defaultConfig);
  if (data.metricsConfig) updateData.metricsConfig = JSON.stringify(data.metricsConfig);
  if (data.alertThresholds) updateData.alertThresholds = JSON.stringify(data.alertThresholds);
  if (data.tags) updateData.tags = JSON.stringify(data.tags);
  
  await db.update(iotDeviceTemplates).set(updateData).where(eq(iotDeviceTemplates.id, id));
  return true;
}

// ============ Health Score Calculation ============

export interface DeviceHealthScore {
  deviceId: number;
  healthScore: number;
  availabilityScore: number;
  performanceScore: number;
  qualityScore: number;
  uptimeHours: number;
  downtimeHours: number;
  errorCount: number;
  warningCount: number;
  lastErrorAt?: Date;
  lastMaintenanceAt?: Date;
  nextMaintenanceAt?: Date;
  calculatedAt: Date;
}

export async function calculateDeviceHealthScore(deviceId: number): Promise<DeviceHealthScore> {
  const db = await getDb();
  
  // Get device info
  const [device] = await db.select().from(iotDevices).where(eq(iotDevices.id, deviceId));
  if (!device) throw new Error('Device not found');
  
  // Calculate scores based on various factors
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Availability: based on uptime/downtime
  let availabilityScore = 100;
  if (device.status === 'offline') availabilityScore -= 30;
  if (device.status === 'error') availabilityScore -= 50;
  if (device.status === 'maintenance') availabilityScore -= 10;
  
  // Performance: based on response time and throughput (simplified)
  let performanceScore = 100;
  if (device.status !== 'online') performanceScore -= 20;
  
  // Quality: based on error rate (simplified)
  let qualityScore = 100;
  const errorCount = device.errorCount || 0;
  qualityScore -= Math.min(errorCount * 5, 50);
  
  // Overall health score (weighted average)
  const healthScore = Math.round(
    availabilityScore * 0.4 +
    performanceScore * 0.3 +
    qualityScore * 0.3
  );
  
  // Save to database
  const healthData = {
    deviceId,
    healthScore: String(healthScore),
    availabilityScore: String(availabilityScore),
    performanceScore: String(performanceScore),
    qualityScore: String(qualityScore),
    uptimeHours: '0',
    downtimeHours: '0',
    errorCount,
    warningCount: 0,
  };
  
  await db.insert(iotDeviceHealth).values(healthData);
  
  return {
    deviceId,
    healthScore,
    availabilityScore,
    performanceScore,
    qualityScore,
    uptimeHours: 0,
    downtimeHours: 0,
    errorCount,
    warningCount: 0,
    calculatedAt: now,
  };
}

export async function getDeviceHealthHistory(deviceId: number, days: number = 30): Promise<DeviceHealthScore[]> {
  const db = await getDb();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const history = await db.select()
    .from(iotDeviceHealth)
    .where(and(
      eq(iotDeviceHealth.deviceId, deviceId),
      gte(iotDeviceHealth.calculatedAt, startDate.toISOString())
    ))
    .orderBy(desc(iotDeviceHealth.calculatedAt));
  
  return history.map(h => ({
    deviceId: h.deviceId,
    healthScore: Number(h.healthScore),
    availabilityScore: Number(h.availabilityScore),
    performanceScore: Number(h.performanceScore),
    qualityScore: Number(h.qualityScore),
    uptimeHours: Number(h.uptimeHours),
    downtimeHours: Number(h.downtimeHours),
    errorCount: h.errorCount || 0,
    warningCount: h.warningCount || 0,
    lastErrorAt: h.lastErrorAt ? new Date(h.lastErrorAt) : undefined,
    lastMaintenanceAt: h.lastMaintenanceAt ? new Date(h.lastMaintenanceAt) : undefined,
    nextMaintenanceAt: h.nextMaintenanceAt ? new Date(h.nextMaintenanceAt) : undefined,
    calculatedAt: new Date(h.calculatedAt),
  }));
}

// ============ Maintenance Scheduling ============

export interface MaintenanceSchedule {
  id: number;
  deviceId: number;
  title: string;
  description?: string;
  maintenanceType: string;
  priority: string;
  scheduledDate: Date;
  estimatedDuration: number;
  assignedTo?: number;
  status: string;
  completedAt?: Date;
  completedBy?: number;
  notes?: string;
  partsUsed?: any[];
  cost?: number;
  recurrenceRule?: string;
  nextOccurrence?: Date;
}

export async function getMaintenanceSchedules(options?: {
  deviceId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<MaintenanceSchedule[]> {
  const db = await getDb();
  let conditions: any[] = [];
  
  if (options?.deviceId) {
    conditions.push(eq(iotMaintenanceSchedules.deviceId, options.deviceId));
  }
  if (options?.status) {
    conditions.push(eq(iotMaintenanceSchedules.status, options.status as any));
  }
  if (options?.startDate) {
    conditions.push(gte(iotMaintenanceSchedules.scheduledDate, options.startDate.toISOString()));
  }
  if (options?.endDate) {
    conditions.push(lte(iotMaintenanceSchedules.scheduledDate, options.endDate.toISOString()));
  }
  
  const schedules = await db.select()
    .from(iotMaintenanceSchedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(iotMaintenanceSchedules.scheduledDate);
  
  return schedules.map(s => ({
    id: s.id,
    deviceId: s.deviceId,
    title: s.title,
    description: s.description || undefined,
    maintenanceType: s.maintenanceType,
    priority: s.priority || 'medium',
    scheduledDate: new Date(s.scheduledDate),
    estimatedDuration: s.estimatedDuration || 60,
    assignedTo: s.assignedTo || undefined,
    status: s.status || 'scheduled',
    completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
    completedBy: s.completedBy || undefined,
    notes: s.notes || undefined,
    partsUsed: s.partsUsed ? JSON.parse(String(s.partsUsed)) : undefined,
    cost: s.cost ? Number(s.cost) : undefined,
    recurrenceRule: s.recurrenceRule || undefined,
    nextOccurrence: s.nextOccurrence ? new Date(s.nextOccurrence) : undefined,
  }));
}

export async function createMaintenanceSchedule(data: {
  deviceId: number;
  title: string;
  description?: string;
  maintenanceType: string;
  priority?: string;
  scheduledDate: Date;
  estimatedDuration?: number;
  assignedTo?: number;
  recurrenceRule?: string;
  createdBy?: number;
}): Promise<MaintenanceSchedule> {
  const db = await getDb();
  const [result] = await db.insert(iotMaintenanceSchedules).values({
    deviceId: data.deviceId,
    title: data.title,
    description: data.description,
    maintenanceType: data.maintenanceType as any,
    priority: (data.priority || 'medium') as any,
    scheduledDate: data.scheduledDate.toISOString(),
    estimatedDuration: data.estimatedDuration || 60,
    assignedTo: data.assignedTo,
    recurrenceRule: data.recurrenceRule,
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    deviceId: data.deviceId,
    title: data.title,
    description: data.description,
    maintenanceType: data.maintenanceType,
    priority: data.priority || 'medium',
    scheduledDate: data.scheduledDate,
    estimatedDuration: data.estimatedDuration || 60,
    assignedTo: data.assignedTo,
    status: 'scheduled',
    recurrenceRule: data.recurrenceRule,
  };
}

export async function updateMaintenanceSchedule(id: number, data: Partial<{
  title: string;
  description: string;
  maintenanceType: string;
  priority: string;
  scheduledDate: Date;
  estimatedDuration: number;
  assignedTo: number;
  status: string;
  notes: string;
  partsUsed: any[];
  cost: number;
}>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = { ...data };
  if (data.scheduledDate) updateData.scheduledDate = data.scheduledDate.toISOString();
  if (data.partsUsed) updateData.partsUsed = JSON.stringify(data.partsUsed);
  
  await db.update(iotMaintenanceSchedules).set(updateData).where(eq(iotMaintenanceSchedules.id, id));
  return true;
}

export async function completeMaintenanceSchedule(id: number, data: {
  completedBy: number;
  notes?: string;
  partsUsed?: any[];
  cost?: number;
}): Promise<boolean> {
  const db = await getDb();
  await db.update(iotMaintenanceSchedules).set({
    status: 'completed',
    completedAt: new Date().toISOString(),
    completedBy: data.completedBy,
    notes: data.notes,
    partsUsed: data.partsUsed ? JSON.stringify(data.partsUsed) : null,
    cost: data.cost ? String(data.cost) : null,
  }).where(eq(iotMaintenanceSchedules.id, id));
  
  return true;
}

// ============ Firmware Management ============

export interface DeviceFirmware {
  id: number;
  deviceId: number;
  version: string;
  releaseDate?: Date;
  changelog?: string;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;
  status: string;
  installedAt?: Date;
  installedBy?: number;
  previousVersion?: string;
  isCurrent: boolean;
}

export async function getDeviceFirmwareHistory(deviceId: number): Promise<DeviceFirmware[]> {
  const db = await getDb();
  const firmware = await db.select()
    .from(iotDeviceFirmware)
    .where(eq(iotDeviceFirmware.deviceId, deviceId))
    .orderBy(desc(iotDeviceFirmware.createdAt));
  
  return firmware.map(f => ({
    id: f.id,
    deviceId: f.deviceId,
    version: f.version,
    releaseDate: f.releaseDate ? new Date(f.releaseDate) : undefined,
    changelog: f.changelog || undefined,
    fileUrl: f.fileUrl || undefined,
    fileSize: f.fileSize || undefined,
    checksum: f.checksum || undefined,
    status: f.status || 'available',
    installedAt: f.installedAt ? new Date(f.installedAt) : undefined,
    installedBy: f.installedBy || undefined,
    previousVersion: f.previousVersion || undefined,
    isCurrent: f.isCurrent === 1,
  }));
}

export async function addFirmwareVersion(data: {
  deviceId: number;
  version: string;
  releaseDate?: Date;
  changelog?: string;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;
}): Promise<DeviceFirmware> {
  const db = await getDb();
  const [result] = await db.insert(iotDeviceFirmware).values({
    deviceId: data.deviceId,
    version: data.version,
    releaseDate: data.releaseDate?.toISOString(),
    changelog: data.changelog,
    fileUrl: data.fileUrl,
    fileSize: data.fileSize,
    checksum: data.checksum,
    status: 'available',
  });
  
  return {
    id: result.insertId,
    deviceId: data.deviceId,
    version: data.version,
    releaseDate: data.releaseDate,
    changelog: data.changelog,
    fileUrl: data.fileUrl,
    fileSize: data.fileSize,
    checksum: data.checksum,
    status: 'available',
    isCurrent: false,
  };
}

export async function installFirmware(firmwareId: number, installedBy: number): Promise<boolean> {
  const db = await getDb();
  
  // Get firmware info
  const [firmware] = await db.select().from(iotDeviceFirmware).where(eq(iotDeviceFirmware.id, firmwareId));
  if (!firmware) throw new Error('Firmware not found');
  
  // Get current firmware version
  const [currentFirmware] = await db.select()
    .from(iotDeviceFirmware)
    .where(and(
      eq(iotDeviceFirmware.deviceId, firmware.deviceId),
      eq(iotDeviceFirmware.isCurrent, 1)
    ));
  
  // Update old current to not current
  if (currentFirmware) {
    await db.update(iotDeviceFirmware)
      .set({ isCurrent: 0 })
      .where(eq(iotDeviceFirmware.id, currentFirmware.id));
  }
  
  // Update new firmware as current
  await db.update(iotDeviceFirmware).set({
    status: 'installed',
    installedAt: new Date().toISOString(),
    installedBy,
    previousVersion: currentFirmware?.version,
    isCurrent: 1,
  }).where(eq(iotDeviceFirmware.id, firmwareId));
  
  return true;
}

// ============ Commissioning Workflow ============

export interface CommissioningStep {
  id: number;
  deviceId: number;
  stepNumber: number;
  stepName: string;
  stepDescription?: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: number;
  verificationData?: any;
  notes?: string;
}

const DEFAULT_COMMISSIONING_STEPS = [
  { stepNumber: 1, stepName: 'Physical Installation', stepDescription: 'Verify physical installation and connections' },
  { stepNumber: 2, stepName: 'Network Configuration', stepDescription: 'Configure network settings and connectivity' },
  { stepNumber: 3, stepName: 'Protocol Setup', stepDescription: 'Configure communication protocol settings' },
  { stepNumber: 4, stepName: 'Sensor Calibration', stepDescription: 'Calibrate sensors and verify readings' },
  { stepNumber: 5, stepName: 'Alert Configuration', stepDescription: 'Set up alert thresholds and notifications' },
  { stepNumber: 6, stepName: 'Integration Test', stepDescription: 'Test integration with monitoring system' },
  { stepNumber: 7, stepName: 'Documentation', stepDescription: 'Complete documentation and sign-off' },
];

export async function initializeCommissioning(deviceId: number): Promise<CommissioningStep[]> {
  const db = await getDb();
  
  // Check if commissioning already exists
  const existing = await db.select()
    .from(iotDeviceCommissioning)
    .where(eq(iotDeviceCommissioning.deviceId, deviceId));
  
  if (existing.length > 0) {
    return existing.map(s => ({
      id: s.id,
      deviceId: s.deviceId,
      stepNumber: s.stepNumber,
      stepName: s.stepName,
      stepDescription: s.stepDescription || undefined,
      status: s.status || 'pending',
      startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
      completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
      completedBy: s.completedBy || undefined,
      verificationData: s.verificationData ? JSON.parse(String(s.verificationData)) : undefined,
      notes: s.notes || undefined,
    }));
  }
  
  // Create default steps
  const steps: CommissioningStep[] = [];
  for (const step of DEFAULT_COMMISSIONING_STEPS) {
    const [result] = await db.insert(iotDeviceCommissioning).values({
      deviceId,
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      stepDescription: step.stepDescription,
      status: 'pending',
    });
    
    steps.push({
      id: result.insertId,
      deviceId,
      stepNumber: step.stepNumber,
      stepName: step.stepName,
      stepDescription: step.stepDescription,
      status: 'pending',
    });
  }
  
  return steps;
}

export async function updateCommissioningStep(stepId: number, data: {
  status: string;
  completedBy?: number;
  verificationData?: any;
  notes?: string;
}): Promise<boolean> {
  const db = await getDb();
  
  const updateData: any = {
    status: data.status,
    notes: data.notes,
  };
  
  if (data.status === 'in_progress') {
    updateData.startedAt = new Date().toISOString();
  }
  
  if (data.status === 'completed') {
    updateData.completedAt = new Date().toISOString();
    updateData.completedBy = data.completedBy;
    if (data.verificationData) {
      updateData.verificationData = JSON.stringify(data.verificationData);
    }
  }
  
  await db.update(iotDeviceCommissioning).set(updateData).where(eq(iotDeviceCommissioning.id, stepId));
  return true;
}

export async function getCommissioningProgress(deviceId: number): Promise<{
  totalSteps: number;
  completedSteps: number;
  currentStep?: CommissioningStep;
  progress: number;
}> {
  const db = await getDb();
  const steps = await db.select()
    .from(iotDeviceCommissioning)
    .where(eq(iotDeviceCommissioning.deviceId, deviceId))
    .orderBy(iotDeviceCommissioning.stepNumber);
  
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStep = steps.find(s => s.status === 'in_progress' || s.status === 'pending');
  
  return {
    totalSteps,
    completedSteps,
    currentStep: currentStep ? {
      id: currentStep.id,
      deviceId: currentStep.deviceId,
      stepNumber: currentStep.stepNumber,
      stepName: currentStep.stepName,
      stepDescription: currentStep.stepDescription || undefined,
      status: currentStep.status || 'pending',
    } : undefined,
    progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
  };
}

// ============ Device Dashboard Stats ============

export async function getDeviceManagementStats(): Promise<{
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  maintenanceDevices: number;
  totalGroups: number;
  totalTemplates: number;
  avgHealthScore: number;
  pendingMaintenance: number;
  overdueMaintenances: number;
}> {
  const db = await getDb();
  
  // Device counts
  const devices = await db.select().from(iotDevices).where(eq(iotDevices.isActive, 1));
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const errorDevices = devices.filter(d => d.status === 'error').length;
  const maintenanceDevices = devices.filter(d => d.status === 'maintenance').length;
  
  // Group count
  const groups = await db.select().from(iotDeviceGroups).where(eq(iotDeviceGroups.isActive, 1));
  const totalGroups = groups.length;
  
  // Template count
  const templates = await db.select().from(iotDeviceTemplates).where(eq(iotDeviceTemplates.isActive, 1));
  const totalTemplates = templates.length;
  
  // Average health score
  const healthScores = await db.select({ healthScore: iotDeviceHealth.healthScore })
    .from(iotDeviceHealth)
    .orderBy(desc(iotDeviceHealth.calculatedAt))
    .limit(100);
  const avgHealthScore = healthScores.length > 0
    ? Math.round(healthScores.reduce((sum, h) => sum + Number(h.healthScore), 0) / healthScores.length)
    : 100;
  
  // Maintenance counts
  const maintenances = await db.select().from(iotMaintenanceSchedules);
  const pendingMaintenance = maintenances.filter(m => m.status === 'scheduled').length;
  const overdueMaintenances = maintenances.filter(m => 
    m.status === 'scheduled' && new Date(m.scheduledDate) < new Date()
  ).length;
  
  return {
    totalDevices,
    onlineDevices,
    offlineDevices,
    errorDevices,
    maintenanceDevices,
    totalGroups,
    totalTemplates,
    avgHealthScore,
    pendingMaintenance,
    overdueMaintenances,
  };
}
