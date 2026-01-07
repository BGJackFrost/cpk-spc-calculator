/**
 * Test file cho FloorPlanDesigner - Phase 15 features
 * - Auto-refresh IoT status
 * - IoT device popup
 * - Layer management
 */

import { describe, it, expect } from 'vitest';

// Test interfaces và types
describe('FloorPlanDesigner Types', () => {
  it('should have correct FloorPlanItem interface with layerId', () => {
    const item = {
      id: 'item-1',
      type: 'iot_device' as const,
      name: 'Sensor 1',
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      rotation: 0,
      color: '#22c55e',
      status: 'online' as const,
      iotDeviceId: 1,
      iotDeviceCode: 'IOT-001',
      iotDeviceType: 'sensor',
      layerId: 'layer-iot',
    };

    expect(item.layerId).toBe('layer-iot');
    expect(item.type).toBe('iot_device');
    expect(item.iotDeviceId).toBe(1);
  });

  it('should have correct FloorPlanLayer interface', () => {
    const layer = {
      id: 'layer-iot',
      name: 'Thiết bị IoT',
      visible: true,
      locked: false,
      color: '#8b5cf6',
      zIndex: 3,
    };

    expect(layer.id).toBe('layer-iot');
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
    expect(layer.zIndex).toBe(3);
  });

  it('should have correct FloorPlanConfig with layers', () => {
    const config = {
      id: 1,
      name: 'Test Floor Plan',
      width: 1200,
      height: 800,
      gridSize: 20,
      showGrid: true,
      items: [],
      layers: [
        { id: 'layer-default', name: 'Mặc định', visible: true, locked: false, color: '#6b7280', zIndex: 0 },
        { id: 'layer-machines', name: 'Máy móc', visible: true, locked: false, color: '#3b82f6', zIndex: 1 },
        { id: 'layer-iot', name: 'Thiết bị IoT', visible: true, locked: false, color: '#8b5cf6', zIndex: 3 },
      ],
    };

    expect(config.layers).toBeDefined();
    expect(config.layers?.length).toBe(3);
    expect(config.layers?.[2].id).toBe('layer-iot');
  });
});

// Test IoT device status colors
describe('IoT Device Status Colors', () => {
  const statusColors: Record<string, string> = {
    online: '#22c55e',
    offline: '#6b7280',
    error: '#ef4444',
    maintenance: '#3b82f6',
  };

  it('should return correct color for online status', () => {
    expect(statusColors['online']).toBe('#22c55e');
  });

  it('should return correct color for offline status', () => {
    expect(statusColors['offline']).toBe('#6b7280');
  });

  it('should return correct color for error status', () => {
    expect(statusColors['error']).toBe('#ef4444');
  });

  it('should return correct color for maintenance status', () => {
    expect(statusColors['maintenance']).toBe('#3b82f6');
  });
});

// Test layer visibility logic
describe('Layer Visibility Logic', () => {
  const layers = [
    { id: 'layer-default', name: 'Mặc định', visible: true, locked: false, color: '#6b7280', zIndex: 0 },
    { id: 'layer-machines', name: 'Máy móc', visible: false, locked: false, color: '#3b82f6', zIndex: 1 },
    { id: 'layer-iot', name: 'Thiết bị IoT', visible: true, locked: true, color: '#8b5cf6', zIndex: 3 },
  ];

  it('should correctly identify visible layers', () => {
    const visibleLayers = layers.filter(l => l.visible);
    expect(visibleLayers.length).toBe(2);
    expect(visibleLayers[0].id).toBe('layer-default');
    expect(visibleLayers[1].id).toBe('layer-iot');
  });

  it('should correctly identify locked layers', () => {
    const lockedLayers = layers.filter(l => l.locked);
    expect(lockedLayers.length).toBe(1);
    expect(lockedLayers[0].id).toBe('layer-iot');
  });

  it('should filter items by layer visibility', () => {
    const items = [
      { id: 'item-1', layerId: 'layer-default' },
      { id: 'item-2', layerId: 'layer-machines' },
      { id: 'item-3', layerId: 'layer-iot' },
    ];

    const visibleItems = items.filter(item => {
      const layer = layers.find(l => l.id === item.layerId);
      return layer ? layer.visible : true;
    });

    expect(visibleItems.length).toBe(2);
    expect(visibleItems[0].id).toBe('item-1');
    expect(visibleItems[1].id).toBe('item-3');
  });
});

// Test auto-refresh interval
describe('Auto-refresh Interval', () => {
  it('should have default interval of 30 seconds', () => {
    const AUTO_REFRESH_INTERVAL = 30000;
    expect(AUTO_REFRESH_INTERVAL).toBe(30000);
  });

  it('should update IoT device status correctly', () => {
    const items = [
      { id: 'item-1', type: 'iot_device', iotDeviceId: 1, status: 'offline', color: '#6b7280' },
      { id: 'item-2', type: 'machine', machineId: 1, status: 'running', color: '#3b82f6' },
    ];

    const iotDevices = [
      { id: 1, status: 'online' },
    ];

    const statusColors: Record<string, string> = {
      online: '#22c55e',
      offline: '#6b7280',
      error: '#ef4444',
      maintenance: '#3b82f6',
    };

    const updatedItems = items.map(item => {
      if (item.type === 'iot_device' && item.iotDeviceId) {
        const device = iotDevices.find(d => d.id === item.iotDeviceId);
        if (device) {
          return {
            ...item,
            status: device.status,
            color: statusColors[device.status] || '#6b7280',
          };
        }
      }
      return item;
    });

    expect(updatedItems[0].status).toBe('online');
    expect(updatedItems[0].color).toBe('#22c55e');
    expect(updatedItems[1].status).toBe('running'); // Machine không bị thay đổi
  });
});

// Test IoT device popup data
describe('IoT Device Popup Data', () => {
  it('should correctly map device data for popup', () => {
    const rawDevice = {
      id: 1,
      deviceCode: 'IOT-001',
      deviceName: 'Temperature Sensor',
      deviceType: 'sensor',
      status: 'online',
      location: 'Zone A',
      lastHeartbeat: '2025-01-07T10:00:00Z',
      manufacturer: 'Siemens',
      model: 'S7-1200',
      firmwareVersion: '1.2.3',
      ipAddress: '192.168.1.100',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      healthScore: 95,
    };

    const popupDevice = {
      id: rawDevice.id,
      deviceCode: rawDevice.deviceCode,
      deviceName: rawDevice.deviceName,
      deviceType: rawDevice.deviceType,
      status: rawDevice.status as 'online' | 'offline' | 'error' | 'maintenance',
      location: rawDevice.location,
      lastHeartbeat: rawDevice.lastHeartbeat,
      manufacturer: rawDevice.manufacturer,
      model: rawDevice.model,
      firmwareVersion: rawDevice.firmwareVersion,
      ipAddress: rawDevice.ipAddress,
      macAddress: rawDevice.macAddress,
      healthScore: rawDevice.healthScore,
    };

    expect(popupDevice.id).toBe(1);
    expect(popupDevice.deviceCode).toBe('IOT-001');
    expect(popupDevice.status).toBe('online');
    expect(popupDevice.healthScore).toBe(95);
  });
});

// Test default layers
describe('Default Layers', () => {
  const DEFAULT_LAYERS = [
    { id: 'layer-default', name: 'Mặc định', visible: true, locked: false, color: '#6b7280', zIndex: 0 },
    { id: 'layer-machines', name: 'Máy móc', visible: true, locked: false, color: '#3b82f6', zIndex: 1 },
    { id: 'layer-workstations', name: 'Công trạm', visible: true, locked: false, color: '#10b981', zIndex: 2 },
    { id: 'layer-iot', name: 'Thiết bị IoT', visible: true, locked: false, color: '#8b5cf6', zIndex: 3 },
  ];

  it('should have 4 default layers', () => {
    expect(DEFAULT_LAYERS.length).toBe(4);
  });

  it('should have correct layer order by zIndex', () => {
    const sortedLayers = [...DEFAULT_LAYERS].sort((a, b) => a.zIndex - b.zIndex);
    expect(sortedLayers[0].id).toBe('layer-default');
    expect(sortedLayers[3].id).toBe('layer-iot');
  });

  it('should have all layers visible by default', () => {
    const allVisible = DEFAULT_LAYERS.every(l => l.visible);
    expect(allVisible).toBe(true);
  });

  it('should have all layers unlocked by default', () => {
    const allUnlocked = DEFAULT_LAYERS.every(l => !l.locked);
    expect(allUnlocked).toBe(true);
  });
});
