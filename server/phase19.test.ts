/**
 * Phase 19 Tests - WebSocket, PDF Export, Telegram Settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([]),
  })),
}));

// Test Edge Simulator WebSocket Service
describe('Edge Simulator WebSocket Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export required functions', async () => {
    const wsService = await import('./services/edgeSimulatorWebSocketService');
    
    expect(typeof wsService.broadcastSimulatorData).toBe('function');
    expect(typeof wsService.broadcastSimulatorStatus).toBe('function');
    expect(typeof wsService.broadcastBatchData).toBe('function');
    expect(typeof wsService.broadcastAlert).toBe('function');
    expect(typeof wsService.startSimulatorBroadcast).toBe('function');
    expect(typeof wsService.stopSimulatorBroadcast).toBe('function');
    expect(typeof wsService.getWebSocketInfo).toBe('function');
    expect(typeof wsService.notifyConnectionChange).toBe('function');
  });

  it('should return WebSocket info', async () => {
    const wsService = await import('./services/edgeSimulatorWebSocketService');
    const info = wsService.getWebSocketInfo();
    
    expect(info).toHaveProperty('enabled');
    expect(info).toHaveProperty('channel');
    expect(info).toHaveProperty('path');
    expect(info).toHaveProperty('connectedClients');
    expect(info).toHaveProperty('broadcastActive');
    expect(info.channel).toBe('edge-simulator');
    expect(info.path).toBe('/ws/realtime');
  });
});

// Test Retraining PDF Export Service
describe('Retraining PDF Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export required functions', async () => {
    const pdfService = await import('./services/retrainingPdfExportService');
    
    expect(typeof pdfService.generateRetrainingPdfData).toBe('function');
    expect(typeof pdfService.generateRetrainingPdfHtml).toBe('function');
  });

  it('should generate valid HTML from PDF data', async () => {
    const pdfService = await import('./services/retrainingPdfExportService');
    
    const mockData = {
      title: 'Test Report',
      generatedAt: '01/01/2024',
      stats: {
        totalRetrainings: 10,
        successfulRetrainings: 8,
        failedRetrainings: 2,
        avgAccuracyImprovement: 0.05,
        avgTrainingDuration: 120,
        successRate: 80,
      },
      history: [
        {
          id: 1,
          configName: 'Test Config',
          modelId: 1,
          triggerReason: 'accuracy_drop',
          previousAccuracy: 0.9,
          newAccuracy: 0.95,
          accuracyImprovement: 0.05,
          status: 'completed',
          trainingSamples: 1000,
          trainingDurationSec: 120,
          startedAt: Date.now(),
          completedAt: Date.now(),
          errorMessage: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      configs: [
        {
          id: 1,
          name: 'Test Config',
          modelId: 1,
          accuracyThreshold: 0.9,
          f1ScoreThreshold: 0.85,
          checkIntervalHours: 24,
          isEnabled: true,
        },
      ],
    };
    
    const html = pdfService.generateRetrainingPdfHtml(mockData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test Report');
    expect(html).toContain('Test Config');
    expect(html).toContain('80.0%');
  });
});

// Test Telegram Router endpoints
describe('Telegram Router', () => {
  it('should have required endpoints', async () => {
    const telegramRouter = await import('./routers/telegramRouter');
    
    expect(telegramRouter.telegramRouter).toBeDefined();
    expect(telegramRouter.telegramRouter._def.procedures).toHaveProperty('getConfig');
    expect(telegramRouter.telegramRouter._def.procedures).toHaveProperty('saveConfig');
    expect(telegramRouter.telegramRouter._def.procedures).toHaveProperty('testConnection');
  });
});

// Test Edge Gateway Simulator Router WebSocket endpoints
describe('Edge Gateway Simulator Router', () => {
  it('should have WebSocket endpoints', async () => {
    const simulatorRouter = await import('./routers/edgeGatewaySimulatorRouter');
    
    expect(simulatorRouter.edgeGatewaySimulatorRouter).toBeDefined();
    expect(simulatorRouter.edgeGatewaySimulatorRouter._def.procedures).toHaveProperty('getWebSocketInfo');
    expect(simulatorRouter.edgeGatewaySimulatorRouter._def.procedures).toHaveProperty('startWebSocketBroadcast');
    expect(simulatorRouter.edgeGatewaySimulatorRouter._def.procedures).toHaveProperty('stopWebSocketBroadcast');
  });
});

// Test Model Auto Retraining Router PDF endpoint
describe('Model Auto Retraining Router', () => {
  it('should have exportPdf endpoint', async () => {
    const retrainingRouter = await import('./routers/modelAutoRetrainingRouter');
    
    expect(retrainingRouter.modelAutoRetrainingRouter).toBeDefined();
    expect(retrainingRouter.modelAutoRetrainingRouter._def.procedures).toHaveProperty('exportPdf');
  });
});
