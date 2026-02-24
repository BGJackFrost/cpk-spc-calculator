import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  })),
  get3dModels: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Test Machine Model',
      category: 'machine',
      model_url: 'https://example.com/model.glb',
      model_format: 'glb',
      is_active: true,
      is_public: false,
    },
  ]),
  get3dModelById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Machine Model',
    category: 'machine',
    model_url: 'https://example.com/model.glb',
    model_format: 'glb',
  }),
  create3dModel: vi.fn().mockResolvedValue({ id: 1 }),
  update3dModel: vi.fn().mockResolvedValue({ success: true }),
  delete3dModel: vi.fn().mockResolvedValue({ success: true }),
  get3dModelInstances: vi.fn().mockResolvedValue([]),
  create3dModelInstance: vi.fn().mockResolvedValue({ id: 1 }),
  update3dModelInstance: vi.fn().mockResolvedValue({ success: true }),
  delete3dModelInstance: vi.fn().mockResolvedValue({ success: true }),
  getTechnicianNotificationPrefs: vi.fn().mockResolvedValue({
    id: 1,
    technician_id: 1,
    push_enabled: true,
    sms_enabled: false,
    email_enabled: true,
  }),
  upsertTechnicianNotificationPrefs: vi.fn().mockResolvedValue({ success: true }),
  createWorkOrderNotification: vi.fn().mockResolvedValue({ id: 1 }),
  updateNotificationStatus: vi.fn().mockResolvedValue({ success: true }),
  getWorkOrderNotifications: vi.fn().mockResolvedValue([]),
  getSmsConfig: vi.fn().mockResolvedValue({
    id: 1,
    provider: 'twilio',
    is_enabled: false,
  }),
  upsertSmsConfig: vi.fn().mockResolvedValue({ success: true }),
  getPushConfig: vi.fn().mockResolvedValue({
    id: 1,
    provider: 'firebase',
    is_enabled: false,
  }),
  upsertPushConfig: vi.fn().mockResolvedValue({ success: true }),
  getMttrMtbfStats: vi.fn().mockResolvedValue([
    {
      id: 1,
      target_type: 'machine',
      target_id: 1,
      mttr: 45,
      mtbf: 720,
      availability: 0.94,
    },
  ]),
  createMttrMtbfStats: vi.fn().mockResolvedValue({ id: 1 }),
  getFailureEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      target_type: 'machine',
      target_id: 1,
      failure_type: 'breakdown',
      severity: 'moderate',
      downtime_duration: 60,
      repair_duration: 45,
    },
  ]),
  createFailureEvent: vi.fn().mockResolvedValue({ id: 1 }),
  updateFailureEvent: vi.fn().mockResolvedValue({ success: true }),
  calculateMttrMtbf: vi.fn().mockResolvedValue({
    mttr: 45,
    mttrMin: 15,
    mttrMax: 120,
    mttrStdDev: 25,
    mtbf: 720,
    mtbfMin: 480,
    mtbfMax: 960,
    mtbfStdDev: 150,
    availability: 0.94,
    totalFailures: 5,
    totalDowntimeMinutes: 300,
    totalUptimeHours: 700,
  }),
  getWorkOrderCountsByType: vi.fn().mockResolvedValue({
    correctiveWorkOrders: 10,
    preventiveWorkOrders: 15,
    predictiveWorkOrders: 5,
    emergencyWorkOrders: 2,
    totalLaborCost: 5000000,
  }),
}));

describe('Phase 98: IoT Enhancement - 3D Model Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get all 3D models', async () => {
    const { get3dModels } = await import('./db');
    const models = await get3dModels({ category: 'machine' });
    
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].name).toBe('Test Machine Model');
  });

  it('should get 3D model by ID', async () => {
    const { get3dModelById } = await import('./db');
    const model = await get3dModelById(1);
    
    expect(model).toBeDefined();
    expect(model.id).toBe(1);
    expect(model.name).toBe('Test Machine Model');
  });

  it('should create 3D model', async () => {
    const { create3dModel } = await import('./db');
    const result = await create3dModel({
      name: 'New Model',
      modelUrl: 'https://example.com/new.glb',
      category: 'equipment',
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it('should update 3D model', async () => {
    const { update3dModel } = await import('./db');
    const result = await update3dModel(1, { name: 'Updated Model' });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should delete 3D model', async () => {
    const { delete3dModel } = await import('./db');
    const result = await delete3dModel(1);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

describe('Phase 98: Work Order Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get technician notification preferences', async () => {
    const { getTechnicianNotificationPrefs } = await import('./db');
    const prefs = await getTechnicianNotificationPrefs(1);
    
    expect(prefs).toBeDefined();
    expect(prefs.technician_id).toBe(1);
    expect(prefs.push_enabled).toBe(true);
  });

  it('should update technician notification preferences', async () => {
    const { upsertTechnicianNotificationPrefs } = await import('./db');
    const result = await upsertTechnicianNotificationPrefs(1, {
      pushEnabled: true,
      smsEnabled: true,
      phoneNumber: '+84123456789',
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should create work order notification', async () => {
    const { createWorkOrderNotification } = await import('./db');
    const result = await createWorkOrderNotification({
      workOrderId: 1,
      technicianId: 1,
      notificationType: 'new_work_order',
      channel: 'push',
      title: 'New Work Order',
      message: 'A new work order has been assigned to you',
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it('should get SMS config', async () => {
    const { getSmsConfig } = await import('./db');
    const config = await getSmsConfig();
    
    expect(config).toBeDefined();
    expect(config.provider).toBe('twilio');
  });

  it('should update SMS config', async () => {
    const { upsertSmsConfig } = await import('./db');
    const result = await upsertSmsConfig({
      provider: 'twilio',
      isEnabled: true,
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should get Push config', async () => {
    const { getPushConfig } = await import('./db');
    const config = await getPushConfig();
    
    expect(config).toBeDefined();
    expect(config.provider).toBe('firebase');
  });
});

describe('Phase 98: MTTR/MTBF Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get MTTR/MTBF stats', async () => {
    const { getMttrMtbfStats } = await import('./db');
    const stats = await getMttrMtbfStats({
      targetType: 'machine',
      targetId: 1,
    });
    
    expect(stats).toBeDefined();
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0].mttr).toBe(45);
    expect(stats[0].mtbf).toBe(720);
  });

  it('should calculate MTTR/MTBF', async () => {
    const { calculateMttrMtbf } = await import('./db');
    const result = await calculateMttrMtbf(
      'machine',
      1,
      new Date('2025-01-01'),
      new Date('2025-01-31')
    );
    
    expect(result).toBeDefined();
    expect(result.mttr).toBe(45);
    expect(result.mtbf).toBe(720);
    expect(result.availability).toBe(0.94);
    expect(result.totalFailures).toBe(5);
  });

  it('should get failure events', async () => {
    const { getFailureEvents } = await import('./db');
    const events = await getFailureEvents({
      targetType: 'machine',
      targetId: 1,
    });
    
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].failure_type).toBe('breakdown');
  });

  it('should create failure event', async () => {
    const { createFailureEvent } = await import('./db');
    const result = await createFailureEvent({
      targetType: 'machine',
      targetId: 1,
      failureType: 'breakdown',
      severity: 'moderate',
      failureStartAt: new Date(),
      description: 'Motor failure',
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it('should get work order counts by type', async () => {
    const { getWorkOrderCountsByType } = await import('./db');
    const counts = await getWorkOrderCountsByType(
      'machine',
      1,
      new Date('2025-01-01'),
      new Date('2025-01-31')
    );
    
    expect(counts).toBeDefined();
    expect(counts.correctiveWorkOrders).toBe(10);
    expect(counts.preventiveWorkOrders).toBe(15);
    expect(counts.predictiveWorkOrders).toBe(5);
    expect(counts.emergencyWorkOrders).toBe(2);
    expect(counts.totalLaborCost).toBe(5000000);
  });

  it('should create MTTR/MTBF stats record', async () => {
    const { createMttrMtbfStats } = await import('./db');
    const result = await createMttrMtbfStats({
      targetType: 'machine',
      targetId: 1,
      periodType: 'monthly',
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      mttr: 45,
      mtbf: 720,
      availability: 0.94,
      totalFailures: 5,
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });
});
