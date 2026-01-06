/**
 * Phase 109 - IoT Enhancement Part 2 Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[]]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));

describe('Phase 109 - IoT Enhancement Part 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MqttRealtimeWidget Integration', () => {
    it('should have MqttRealtimeWidget component', async () => {
      const fs = await import('fs/promises');
      const exists = await fs.access('/home/ubuntu/cpk-spc-calculator/client/src/components/MqttRealtimeWidget.tsx')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have MqttRealtimeWidget imported in IotOverviewDashboard', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/cpk-spc-calculator/client/src/pages/IotOverviewDashboard.tsx', 'utf-8');
      expect(content).toContain("import MqttRealtimeWidget from '@/components/MqttRealtimeWidget'");
    });

    it('should render MqttRealtimeWidget in IotOverviewDashboard', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/cpk-spc-calculator/client/src/pages/IotOverviewDashboard.tsx', 'utf-8');
      expect(content).toContain('<MqttRealtimeWidget');
      expect(content).toContain('showMessages={false}');
      expect(content).toContain('maxSensors={12}');
    });

    it('should have useMqttRealtime hook', async () => {
      const fs = await import('fs/promises');
      const exists = await fs.access('/home/ubuntu/cpk-spc-calculator/client/src/hooks/useMqttRealtime.ts')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('OEE Critical Notification', () => {
    it('should have sendOeeCriticalNotification function', async () => {
      const { sendOeeCriticalNotification } = await import('./services/iotOeeAlertService');
      expect(typeof sendOeeCriticalNotification).toBe('function');
    });

    it('should send notification for critical alerts', async () => {
      const { sendOeeCriticalNotification } = await import('./services/iotOeeAlertService');
      const { notifyOwner } = await import('./_core/notification');
      
      const mockAlert = {
        configId: 1,
        alertType: 'oee_critical',
        severity: 'critical' as const,
        targetName: 'Test Line',
        currentValue: 65,
        thresholdValue: 75,
        message: 'OEE 65.0% < critical 75%',
      };

      const result = await sendOeeCriticalNotification(mockAlert);
      
      expect(notifyOwner).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should include notification count in runAllAlertChecks result', async () => {
      const { runAllAlertChecks } = await import('./services/iotOeeAlertService');
      const result = await runAllAlertChecks();
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(item => {
        expect(item).toHaveProperty('configId');
        expect(item).toHaveProperty('alertsTriggered');
        expect(item).toHaveProperty('notificationsSent');
      });
    });
  });

  describe('MTTR/MTBF Scheduled Reports', () => {
    it('should have scheduledMttrMtbfService', async () => {
      const fs = await import('fs/promises');
      const exists = await fs.access('/home/ubuntu/cpk-spc-calculator/server/services/scheduledMttrMtbfService.ts')
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have checkAndSendDueReports function', async () => {
      const { checkAndSendDueReports } = await import('./services/scheduledMttrMtbfService');
      expect(typeof checkAndSendDueReports).toBe('function');
    });

    it('should have MTTR/MTBF reports scheduled in scheduledJobs', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/cpk-spc-calculator/server/scheduledJobs.ts', 'utf-8');
      expect(content).toContain('checkMttrMtbfReports');
      expect(content).toContain('MTTR/MTBF scheduled reports');
    });

    it('should support weekly and monthly frequency', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('/home/ubuntu/cpk-spc-calculator/server/services/scheduledMttrMtbfService.ts', 'utf-8');
      expect(content).toContain("frequency: 'daily' | 'weekly' | 'monthly'");
    });
  });

  describe('Integration Tests', () => {
    it('should have all required components integrated', async () => {
      const fs = await import('fs/promises');
      
      const dashboardContent = await fs.readFile('/home/ubuntu/cpk-spc-calculator/client/src/pages/IotOverviewDashboard.tsx', 'utf-8');
      expect(dashboardContent).toContain('MqttRealtimeWidget');
      expect(dashboardContent).toContain('MttrMtbfComparisonWidget');
      
      const oeeAlertContent = await fs.readFile('/home/ubuntu/cpk-spc-calculator/server/services/iotOeeAlertService.ts', 'utf-8');
      expect(oeeAlertContent).toContain('sendOeeCriticalNotification');
      expect(oeeAlertContent).toContain('notifyOwner');
      
      const scheduledJobsContent = await fs.readFile('/home/ubuntu/cpk-spc-calculator/server/scheduledJobs.ts', 'utf-8');
      expect(scheduledJobsContent).toContain('checkMttrMtbfReports');
    });
  });
});
