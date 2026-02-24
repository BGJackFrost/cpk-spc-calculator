/**
 * Unit tests for Edge Gateway Simulator Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock getDb
const mockExecute = vi.fn();
vi.mock('../db', () => ({
  getDb: () => ({
    execute: mockExecute,
  }),
}));

// Mock edge gateway service
vi.mock('./edgeGatewayService', () => ({
  syncData: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock anomaly detection service
vi.mock('./anomalyDetectionService', () => ({
  detectAnomalies: vi.fn().mockResolvedValue([]),
}));

// Mock anomaly alert service
vi.mock('./anomalyAlertService', () => ({
  processAnomalyForAlerts: vi.fn().mockResolvedValue({ alertTriggered: false }),
}));

import * as simulatorService from './edgeGatewaySimulatorService';

describe('EdgeGatewaySimulatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAllSimulatorConfigs', () => {
    it('should return empty array when no configs exist', async () => {
      mockExecute.mockResolvedValueOnce([]);
      
      const configs = await simulatorService.getAllSimulatorConfigs();
      
      expect(configs).toEqual([]);
    });

    it('should return mapped configs', async () => {
      mockExecute.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Temperature Simulator',
          description: 'Test temperature sensor',
          gateway_id: 1,
          sensor_type: 'temperature',
          base_value: '25.000000',
          noise_level: '0.0200',
          drift_rate: '0.000000',
          anomaly_probability: '0.0100',
          anomaly_magnitude: '3.0000',
          latency_min: 10,
          latency_max: 100,
          packet_loss_rate: '0.0000',
          buffer_enabled: 1,
          buffer_size: 1000,
          offline_probability: '0.0010',
          offline_duration_min: 5,
          offline_duration_max: 60,
          sampling_interval: 1000,
          is_active: 0,
          created_by: 1,
          created_at: '2024-01-01',
          updated_at: null,
        },
      ]);

      const configs = await simulatorService.getAllSimulatorConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        id: 1,
        name: 'Temperature Simulator',
        sensorType: 'temperature',
        baseValue: 25,
        noiseLevel: 0.02,
        bufferEnabled: true,
        isActive: false,
      });
    });
  });

  describe('createSimulatorConfig', () => {
    it('should create a new simulator config', async () => {
      mockExecute
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([
          {
            id: 1,
            name: 'Pressure Simulator',
            description: null,
            gateway_id: null,
            sensor_type: 'pressure',
            base_value: '101.325000',
            noise_level: '0.0100',
            drift_rate: '0.000000',
            anomaly_probability: '0.0100',
            anomaly_magnitude: '3.0000',
            latency_min: 10,
            latency_max: 100,
            packet_loss_rate: '0.0000',
            buffer_enabled: 1,
            buffer_size: 1000,
            offline_probability: '0.0010',
            offline_duration_min: 5,
            offline_duration_max: 60,
            sampling_interval: 1000,
            is_active: 0,
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: null,
          },
        ]);

      const config = await simulatorService.createSimulatorConfig({
        name: 'Pressure Simulator',
        sensorType: 'pressure',
        baseValue: 101.325,
        createdBy: 1,
      });

      expect(config).not.toBeNull();
      expect(config?.name).toBe('Pressure Simulator');
      expect(config?.sensorType).toBe('pressure');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('startSimulator', () => {
    it('should return error when config not found', async () => {
      mockExecute.mockResolvedValueOnce([]); // getSimulatorConfigById returns null

      const result = await simulatorService.startSimulator(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });
  });

  describe('getSimulatorStatus', () => {
    it('should return not running when simulator is not active', () => {
      const status = simulatorService.getSimulatorStatus(999);

      expect(status.isRunning).toBe(false);
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no session exists', async () => {
      mockExecute.mockResolvedValueOnce([]);

      const session = await simulatorService.getActiveSession(999);

      expect(session).toBeNull();
    });

    it('should return mapped session', async () => {
      mockExecute.mockResolvedValueOnce([
        {
          id: 1,
          config_id: 1,
          status: 'running',
          started_at: Date.now(),
          stopped_at: null,
          total_data_points: 100,
          total_anomalies: 5,
          total_packets_lost: 2,
          total_offline_events: 1,
          total_buffered_points: 10,
          avg_latency: '55.50',
          current_value: '25.500000',
          is_offline: 0,
          buffer_count: 0,
          last_data_at: Date.now(),
          error_message: null,
          created_at: '2024-01-01',
          updated_at: null,
        },
      ]);

      const session = await simulatorService.getActiveSession(1);

      expect(session).not.toBeNull();
      expect(session?.status).toBe('running');
      expect(session?.totalDataPoints).toBe(100);
      expect(session?.totalAnomalies).toBe(5);
      expect(session?.avgLatency).toBe(55.5);
    });
  });

  describe('getAllRunningSimulators', () => {
    it('should return empty array when no simulators running', () => {
      const running = simulatorService.getAllRunningSimulators();
      expect(Array.isArray(running)).toBe(true);
    });
  });
});
