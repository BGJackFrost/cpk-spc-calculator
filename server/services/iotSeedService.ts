/**
 * IoT Seed Service
 * Seed dữ liệu mẫu cho IoT devices và alarms để testing
 */

import { getDb } from '../db';
import { iotDevices, iotAlarms } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// Sample device data
const sampleDevices = [
  {
    deviceCode: 'TEMP-001',
    deviceName: 'Temperature Sensor - Line 1',
    deviceType: 'temperature_sensor',
    location: 'Production Line 1 - Area A',
    protocol: 'mqtt',
    ipAddress: '192.168.1.101',
    port: 1883,
    status: 'online',
    description: 'Cảm biến nhiệt độ giám sát nhiệt độ môi trường sản xuất',
  },
  {
    deviceCode: 'TEMP-002',
    deviceName: 'Temperature Sensor - Line 2',
    deviceType: 'temperature_sensor',
    location: 'Production Line 2 - Area B',
    protocol: 'mqtt',
    ipAddress: '192.168.1.102',
    port: 1883,
    status: 'online',
    description: 'Cảm biến nhiệt độ giám sát nhiệt độ môi trường sản xuất',
  },
  {
    deviceCode: 'HUM-001',
    deviceName: 'Humidity Sensor - Line 1',
    deviceType: 'humidity_sensor',
    location: 'Production Line 1 - Area A',
    protocol: 'mqtt',
    ipAddress: '192.168.1.103',
    port: 1883,
    status: 'online',
    description: 'Cảm biến độ ẩm giám sát độ ẩm môi trường',
  },
  {
    deviceCode: 'PRESS-001',
    deviceName: 'Pressure Sensor - Compressor',
    deviceType: 'pressure_sensor',
    location: 'Utility Room',
    protocol: 'modbus',
    ipAddress: '192.168.1.104',
    port: 502,
    status: 'online',
    description: 'Cảm biến áp suất máy nén khí',
  },
  {
    deviceCode: 'VIB-001',
    deviceName: 'Vibration Sensor - Motor 1',
    deviceType: 'vibration_sensor',
    location: 'Production Line 1 - Motor Area',
    protocol: 'modbus',
    ipAddress: '192.168.1.105',
    port: 502,
    status: 'online',
    description: 'Cảm biến rung động giám sát motor chính',
  },
  {
    deviceCode: 'FLOW-001',
    deviceName: 'Flow Meter - Cooling System',
    deviceType: 'flow_meter',
    location: 'Cooling System',
    protocol: 'opcua',
    ipAddress: '192.168.1.106',
    port: 4840,
    status: 'online',
    description: 'Đồng hồ đo lưu lượng hệ thống làm mát',
  },
  {
    deviceCode: 'PLC-001',
    deviceName: 'PLC Controller - Line 1',
    deviceType: 'plc',
    location: 'Control Room',
    protocol: 'opcua',
    ipAddress: '192.168.1.110',
    port: 4840,
    status: 'online',
    description: 'PLC điều khiển dây chuyền sản xuất 1',
  },
  {
    deviceCode: 'GATEWAY-001',
    deviceName: 'IoT Gateway - Main',
    deviceType: 'gateway',
    location: 'Server Room',
    protocol: 'mqtt',
    ipAddress: '192.168.1.1',
    port: 1883,
    status: 'online',
    description: 'Gateway chính kết nối các thiết bị IoT',
  },
  {
    deviceCode: 'TEMP-003',
    deviceName: 'Temperature Sensor - Warehouse',
    deviceType: 'temperature_sensor',
    location: 'Warehouse - Zone 1',
    protocol: 'mqtt',
    ipAddress: '192.168.1.107',
    port: 1883,
    status: 'offline',
    description: 'Cảm biến nhiệt độ kho hàng',
  },
  {
    deviceCode: 'ENERGY-001',
    deviceName: 'Energy Meter - Main Panel',
    deviceType: 'energy_meter',
    location: 'Electrical Room',
    protocol: 'modbus',
    ipAddress: '192.168.1.108',
    port: 502,
    status: 'online',
    description: 'Đồng hồ đo năng lượng tủ điện chính',
  },
];

// Sample alarm data generator
function generateSampleAlarms(deviceIds: number[]) {
  const alarmTypes = ['warning', 'error', 'critical'] as const;
  const alarmCodes = [
    { code: 'TEMP_HIGH', message: 'Nhiệt độ vượt ngưỡng cao', type: 'warning' },
    { code: 'TEMP_CRITICAL', message: 'Nhiệt độ quá cao - Cần xử lý ngay!', type: 'critical' },
    { code: 'HUM_LOW', message: 'Độ ẩm thấp hơn ngưỡng cho phép', type: 'warning' },
    { code: 'PRESS_HIGH', message: 'Áp suất vượt ngưỡng an toàn', type: 'error' },
    { code: 'VIB_ABNORMAL', message: 'Phát hiện rung động bất thường', type: 'warning' },
    { code: 'VIB_CRITICAL', message: 'Rung động vượt ngưỡng nguy hiểm!', type: 'critical' },
    { code: 'CONN_LOST', message: 'Mất kết nối với thiết bị', type: 'error' },
    { code: 'FLOW_LOW', message: 'Lưu lượng thấp hơn mức tối thiểu', type: 'warning' },
    { code: 'ENERGY_SPIKE', message: 'Phát hiện đột biến tiêu thụ năng lượng', type: 'warning' },
    { code: 'SENSOR_FAULT', message: 'Lỗi cảm biến - Cần kiểm tra', type: 'error' },
  ];

  const alarms = [];
  const now = Date.now();
  
  // Generate 20 sample alarms
  for (let i = 0; i < 20; i++) {
    const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const alarmInfo = alarmCodes[Math.floor(Math.random() * alarmCodes.length)];
    const value = (Math.random() * 100).toFixed(1);
    const threshold = (parseFloat(value) * 0.8).toFixed(1);
    
    // Random time within last 7 days
    const createdAt = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    // Some alarms are acknowledged/resolved
    const isAcknowledged = Math.random() > 0.5;
    const isResolved = isAcknowledged && Math.random() > 0.5;
    
    alarms.push({
      deviceId,
      alarmType: alarmInfo.type as 'warning' | 'error' | 'critical',
      alarmCode: alarmInfo.code,
      message: alarmInfo.message,
      value,
      threshold,
      acknowledgedAt: isAcknowledged ? new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000) : null,
      acknowledgedBy: isAcknowledged ? 1 : null,
      resolvedAt: isResolved ? new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null,
      createdAt,
    });
  }

  return alarms;
}

/**
 * Seed IoT devices
 */
export async function seedIotDevices(): Promise<{
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, inserted: 0, skipped: 0, error: 'Database not available' };
  }

  let inserted = 0;
  let skipped = 0;

  try {
    for (const device of sampleDevices) {
      // Check if device already exists
      const [existing] = await db.select()
        .from(iotDevices)
        .where(eq(iotDevices.deviceCode, device.deviceCode));

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(iotDevices).values({
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        location: device.location,
        protocol: device.protocol as any,
        ipAddress: device.ipAddress,
        port: device.port,
        status: device.status as any,
        description: device.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    }

    return { success: true, inserted, skipped };
  } catch (error) {
    console.error('Error seeding IoT devices:', error);
    return {
      success: false,
      inserted,
      skipped,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed IoT alarms
 */
export async function seedIotAlarms(): Promise<{
  success: boolean;
  inserted: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, inserted: 0, error: 'Database not available' };
  }

  try {
    // Get existing device IDs
    const devices = await db.select({ id: iotDevices.id }).from(iotDevices);
    
    if (devices.length === 0) {
      return { success: false, inserted: 0, error: 'No devices found. Please seed devices first.' };
    }

    const deviceIds = devices.map(d => d.id);
    const alarms = generateSampleAlarms(deviceIds);

    let inserted = 0;
    for (const alarm of alarms) {
      await db.insert(iotAlarms).values(alarm);
      inserted++;
    }

    return { success: true, inserted };
  } catch (error) {
    console.error('Error seeding IoT alarms:', error);
    return {
      success: false,
      inserted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all IoT data (for testing)
 */
export async function clearIotData(): Promise<{
  success: boolean;
  deletedDevices: number;
  deletedAlarms: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, deletedDevices: 0, deletedAlarms: 0, error: 'Database not available' };
  }

  try {
    // Delete alarms first (foreign key constraint)
    const alarmsResult = await db.delete(iotAlarms);
    const devicesResult = await db.delete(iotDevices);

    return {
      success: true,
      deletedDevices: (devicesResult as any).rowsAffected || 0,
      deletedAlarms: (alarmsResult as any).rowsAffected || 0,
    };
  } catch (error) {
    console.error('Error clearing IoT data:', error);
    return {
      success: false,
      deletedDevices: 0,
      deletedAlarms: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed all IoT data
 */
export async function seedAllIotData(): Promise<{
  success: boolean;
  devices: { inserted: number; skipped: number };
  alarms: { inserted: number };
  error?: string;
}> {
  // Seed devices first
  const devicesResult = await seedIotDevices();
  if (!devicesResult.success) {
    return {
      success: false,
      devices: { inserted: 0, skipped: 0 },
      alarms: { inserted: 0 },
      error: devicesResult.error,
    };
  }

  // Then seed alarms
  const alarmsResult = await seedIotAlarms();
  
  return {
    success: alarmsResult.success,
    devices: { inserted: devicesResult.inserted, skipped: devicesResult.skipped },
    alarms: { inserted: alarmsResult.inserted },
    error: alarmsResult.error,
  };
}

export default {
  seedIotDevices,
  seedIotAlarms,
  seedAllIotData,
  clearIotData,
};


// ==================== WORK ORDER SEED DATA ====================

// Sample technicians data
const SAMPLE_TECHNICIANS = [
  {
    department: 'Maintenance',
    skills: ['electrical', 'plc', 'automation'],
    certifications: [{ name: 'PLC Programming', expiryDate: '2026-12-31' }],
    experienceYears: 5,
    hourlyRate: '150000',
    availability: 'available' as const,
    phone: '0901234567',
    email: 'tech1@company.com',
  },
  {
    department: 'Maintenance',
    skills: ['mechanical', 'hydraulics', 'pneumatics'],
    certifications: [{ name: 'Hydraulics Specialist', expiryDate: '2026-06-30' }],
    experienceYears: 8,
    hourlyRate: '180000',
    availability: 'available' as const,
    phone: '0902345678',
    email: 'tech2@company.com',
  },
  {
    department: 'Automation',
    skills: ['scada', 'hmi', 'robot'],
    certifications: [{ name: 'SCADA Expert', expiryDate: '2025-12-31' }],
    experienceYears: 10,
    hourlyRate: '200000',
    availability: 'available' as const,
    phone: '0903456789',
    email: 'tech3@company.com',
  },
  {
    department: 'Instrumentation',
    skills: ['calibration', 'sensors', 'process_control'],
    certifications: [{ name: 'Calibration Technician', expiryDate: '2026-03-31' }],
    experienceYears: 6,
    hourlyRate: '160000',
    availability: 'busy' as const,
    phone: '0904567890',
    email: 'tech4@company.com',
  },
  {
    department: 'General',
    skills: ['basic_maintenance', 'cleaning'],
    certifications: [{ name: 'Safety Training', expiryDate: '2025-06-30' }],
    experienceYears: 2,
    hourlyRate: '100000',
    availability: 'on_leave' as const,
    phone: '0905678901',
    email: 'tech5@company.com',
  },
];

// Sample maintenance schedules
const SAMPLE_SCHEDULES = [
  {
    title: 'Kiểm tra nhiệt độ hàng ngày',
    description: 'Kiểm tra nhiệt độ các thiết bị hàng ngày',
    maintenanceType: 'inspection' as const,
    priority: 'medium' as const,
    estimatedDuration: 30,
    recurrenceRule: 'FREQ=DAILY',
    status: 'scheduled' as const,
  },
  {
    title: 'Bôi trơn hàng tuần',
    description: 'Bôi trơn các bộ phận chuyển động hàng tuần',
    maintenanceType: 'preventive' as const,
    priority: 'medium' as const,
    estimatedDuration: 60,
    recurrenceRule: 'FREQ=WEEKLY',
    status: 'scheduled' as const,
  },
  {
    title: 'Hiệu chuẩn hàng tháng',
    description: 'Hiệu chuẩn cảm biến và thiết bị đo hàng tháng',
    maintenanceType: 'calibration' as const,
    priority: 'high' as const,
    estimatedDuration: 120,
    recurrenceRule: 'FREQ=MONTHLY',
    status: 'scheduled' as const,
  },
  {
    title: 'Bảo dưỡng tổng thể hàng quý',
    description: 'Bảo dưỡng tổng thể hàng quý',
    maintenanceType: 'preventive' as const,
    priority: 'high' as const,
    estimatedDuration: 480,
    recurrenceRule: 'FREQ=MONTHLY;INTERVAL=3',
    status: 'scheduled' as const,
  },
];

// Work order types and statuses
const WORK_ORDER_TYPES = ['corrective', 'preventive', 'predictive', 'emergency', 'inspection'] as const;
const WORK_ORDER_STATUSES = ['created', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold', 'verified'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

// Failure types
const FAILURE_TYPES = ['breakdown', 'degradation', 'intermittent', 'planned_stop'] as const;
const SEVERITIES = ['minor', 'moderate', 'major', 'critical'] as const;
const ROOT_CAUSE_CATEGORIES = ['mechanical', 'electrical', 'software', 'operator_error', 'wear', 'environmental', 'unknown'] as const;
const RESOLUTION_TYPES = ['repair', 'replace', 'adjust', 'reset', 'other'] as const;

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDateForMySQL(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

import {
  iotTechnicians,
  iotMaintenanceSchedules,
  iotMaintenanceWorkOrders,
  iotFailureEvents,
  users,
} from '../../drizzle/schema';

/**
 * Seed IoT Technicians
 */
export async function seedIotTechnicians(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, count: 0, error: 'Database not available' };
  }

  try {
    // Get first user to link technicians
    const [firstUser] = await db.select().from(users).limit(1);
    if (!firstUser) {
      return { success: false, count: 0, error: 'No users found. Please create users first.' };
    }

    let count = 0;
    for (let i = 0; i < SAMPLE_TECHNICIANS.length; i++) {
      const tech = SAMPLE_TECHNICIANS[i];
      
      // Check if technician already exists
      const [existing] = await db
        .select()
        .from(iotTechnicians)
        .where(eq(iotTechnicians.email, tech.email))
        .limit(1);

      if (!existing) {
        await db.insert(iotTechnicians).values({
          userId: firstUser.id,
          employeeId: `TECH-${String(i + 1).padStart(3, '0')}`,
          department: tech.department,
          skills: tech.skills,
          certifications: tech.certifications,
          experienceYears: tech.experienceYears,
          hourlyRate: tech.hourlyRate,
          availability: tech.availability,
          phone: tech.phone,
          email: tech.email,
          totalWorkOrders: randomInt(10, 100),
          completedWorkOrders: randomInt(5, 80),
          avgCompletionTime: randomInt(30, 180),
          rating: String((4 + Math.random()).toFixed(2)),
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error seeding IoT technicians:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed IoT Maintenance Schedules
 */
export async function seedIotMaintenanceSchedules(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, count: 0, error: 'Database not available' };
  }

  try {
    // Get devices
    const devices = await db.select().from(iotDevices).limit(10);
    if (devices.length === 0) {
      return { success: false, count: 0, error: 'No IoT devices found. Please seed devices first.' };
    }

    // Get technicians
    const technicians = await db.select().from(iotTechnicians).limit(5);

    let count = 0;
    for (const schedule of SAMPLE_SCHEDULES) {
      for (const device of devices.slice(0, 3)) {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + randomInt(1, 30));

        await db.insert(iotMaintenanceSchedules).values({
          deviceId: device.id,
          title: `${schedule.title} - ${device.deviceName}`,
          description: schedule.description,
          maintenanceType: schedule.maintenanceType,
          priority: schedule.priority,
          scheduledDate: formatDateForMySQL(scheduledDate),
          estimatedDuration: schedule.estimatedDuration,
          assignedTo: technicians.length > 0 ? randomElement(technicians).id : null,
          status: schedule.status,
          recurrenceRule: schedule.recurrenceRule,
          nextOccurrence: formatDateForMySQL(new Date(scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000)),
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error seeding IoT maintenance schedules:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed IoT Work Orders
 */
export async function seedIotWorkOrders(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, count: 0, error: 'Database not available' };
  }

  try {
    // Get devices and technicians
    const devices = await db.select().from(iotDevices).limit(10);
    const technicians = await db.select().from(iotTechnicians).limit(5);

    if (devices.length === 0) {
      return { success: false, count: 0, error: 'No IoT devices found. Please seed devices first.' };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let count = 0;
    // Generate 50 work orders
    for (let i = 0; i < 50; i++) {
      const device = randomElement(devices);
      const technician = technicians.length > 0 ? randomElement(technicians) : null;
      const workOrderType = randomElement(WORK_ORDER_TYPES);
      const priority = randomElement(PRIORITIES);
      const status = randomElement(WORK_ORDER_STATUSES);
      
      const createdAt = randomDate(thirtyDaysAgo, now);
      const dueDate = new Date(createdAt.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000);

      let startedAt = null;
      let completedAt = null;
      let actualDuration = null;
      let assignedAt = null;

      if (status === 'completed' || status === 'verified') {
        assignedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(1, 4) * 60 * 60 * 1000));
        startedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(2, 8) * 60 * 60 * 1000));
        completedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(4, 24) * 60 * 60 * 1000));
        actualDuration = randomInt(30, 480);
      } else if (status === 'in_progress' || status === 'on_hold') {
        assignedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(1, 4) * 60 * 60 * 1000));
        startedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(2, 8) * 60 * 60 * 1000));
      } else if (status === 'assigned') {
        assignedAt = formatDateForMySQL(new Date(createdAt.getTime() + randomInt(1, 4) * 60 * 60 * 1000));
      }

      const workOrderNumber = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

      await db.insert(iotMaintenanceWorkOrders).values({
        workOrderNumber,
        title: `${workOrderType === 'corrective' ? 'Sửa chữa' : workOrderType === 'preventive' ? 'Bảo dưỡng' : workOrderType === 'predictive' ? 'Bảo trì dự đoán' : workOrderType === 'emergency' ? 'Khẩn cấp' : 'Kiểm tra'} - ${device.deviceName}`,
        description: `Work order cho thiết bị ${device.deviceCode} - ${device.deviceName}`,
        deviceId: device.id,
        workOrderType,
        priority,
        status,
        estimatedDuration: randomInt(30, 240),
        actualDuration,
        estimatedCost: String(randomInt(100, 5000) * 1000),
        actualCost: status === 'completed' || status === 'verified' ? String(randomInt(80, 6000) * 1000) : null,
        requiredSkills: ['electrical', 'mechanical'].slice(0, randomInt(1, 2)),
        assignedTo: technician?.id || null,
        assignedAt,
        startedAt,
        completedAt,
        dueDate: formatDateForMySQL(dueDate),
        completionNotes: status === 'completed' || status === 'verified' ? `Hoàn thành công việc ${workOrderNumber}` : null,
        rootCause: status === 'completed' || status === 'verified' ? 'Linh kiện hao mòn theo thời gian' : null,
        actionsTaken: status === 'completed' || status === 'verified' ? 'Thay thế linh kiện và kiểm tra vận hành' : null,
      });
      count++;
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error seeding IoT work orders:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed IoT Failure Events
 */
export async function seedIotFailureEvents(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, count: 0, error: 'Database not available' };
  }

  try {
    // Get devices
    const devices = await db.select().from(iotDevices).limit(10);
    if (devices.length === 0) {
      return { success: false, count: 0, error: 'No IoT devices found. Please seed devices first.' };
    }

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let count = 0;
    // Generate 30 failure events
    for (let i = 0; i < 30; i++) {
      const device = randomElement(devices);
      const failureType = randomElement(FAILURE_TYPES);
      const severity = randomElement(SEVERITIES);
      const rootCauseCategory = randomElement(ROOT_CAUSE_CATEGORIES);
      const resolutionType = randomElement(RESOLUTION_TYPES);
      
      const failureStartAt = randomDate(sixtyDaysAgo, now);
      const downtimeDuration = randomInt(15, 480);
      const repairDuration = randomInt(10, downtimeDuration);
      const waitingDuration = downtimeDuration - repairDuration;
      const failureEndAt = new Date(failureStartAt.getTime() + downtimeDuration * 60 * 1000);
      const repairStartAt = new Date(failureStartAt.getTime() + waitingDuration * 60 * 1000);
      const repairEndAt = failureEndAt;
      const isResolved = Math.random() > 0.2;

      await db.insert(iotFailureEvents).values({
        targetType: 'device',
        targetId: device.id,
        failureCode: `F-${String(i + 1).padStart(4, '0')}`,
        failureType,
        severity,
        description: `Sự cố ${failureType} trên thiết bị ${device.deviceName}`,
        failureStartAt: formatDateForMySQL(failureStartAt),
        failureEndAt: isResolved ? formatDateForMySQL(failureEndAt) : null,
        repairStartAt: isResolved ? formatDateForMySQL(repairStartAt) : null,
        repairEndAt: isResolved ? formatDateForMySQL(repairEndAt) : null,
        downtimeDuration: isResolved ? downtimeDuration : null,
        repairDuration: isResolved ? repairDuration : null,
        waitingDuration: isResolved ? waitingDuration : null,
        rootCauseCategory,
        rootCause: isResolved ? `Nguyên nhân: ${rootCauseCategory}` : null,
        resolutionType: isResolved ? resolutionType : null,
        resolution: isResolved ? `Đã ${resolutionType === 'repair' ? 'sửa chữa' : resolutionType === 'replace' ? 'thay thế' : 'xử lý'} thành công` : null,
        timeSincePreviousFailure: String(randomInt(24, 720)),
      });
      count++;
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error seeding IoT failure events:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed all IoT Work Order data
 */
export async function seedAllIotWorkOrderData(): Promise<{
  success: boolean;
  technicians: { count: number };
  schedules: { count: number };
  workOrders: { count: number };
  failureEvents: { count: number };
  error?: string;
}> {
  const techniciansResult = await seedIotTechnicians();
  if (!techniciansResult.success) {
    return {
      success: false,
      technicians: { count: 0 },
      schedules: { count: 0 },
      workOrders: { count: 0 },
      failureEvents: { count: 0 },
      error: techniciansResult.error,
    };
  }

  const schedulesResult = await seedIotMaintenanceSchedules();
  const workOrdersResult = await seedIotWorkOrders();
  const failureEventsResult = await seedIotFailureEvents();

  return {
    success: true,
    technicians: { count: techniciansResult.count },
    schedules: { count: schedulesResult.count },
    workOrders: { count: workOrdersResult.count },
    failureEvents: { count: failureEventsResult.count },
  };
}
