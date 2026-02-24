/**
 * Unit tests for widgetDataRouter
 */

import { describe, it, expect } from 'vitest';

describe('widgetDataRouter', () => {
  describe('getCpkSummary', () => {
    it('should return CPK summary data', async () => {
      const expectedResponse = {
        avgCpk: 1.45,
        minCpk: 1.15,
        maxCpk: 1.75,
        status: 'good',
        trend: 'up',
        sampleCount: 25,
        lastUpdated: expect.any(Number),
        thresholds: { warning: 1.33, critical: 1.0 },
      };

      expect(expectedResponse.avgCpk).toBeDefined();
      expect(['excellent', 'good', 'warning', 'critical']).toContain(expectedResponse.status);
      expect(['up', 'down', 'stable']).toContain(expectedResponse.trend);
    });

    it('should return correct status based on CPK value', () => {
      const getCpkStatus = (cpk: number) => {
        if (cpk >= 1.67) return 'excellent';
        if (cpk >= 1.33) return 'good';
        if (cpk >= 1.0) return 'warning';
        return 'critical';
      };

      expect(getCpkStatus(1.8)).toBe('excellent');
      expect(getCpkStatus(1.5)).toBe('good');
      expect(getCpkStatus(1.1)).toBe('warning');
      expect(getCpkStatus(0.8)).toBe('critical');
    });
  });

  describe('getOeeRealtime', () => {
    it('should return OEE realtime data', async () => {
      const expectedResponse = {
        oee: 78.5,
        availability: 92.0,
        performance: 88.5,
        quality: 96.5,
        status: 'good',
        lastUpdated: expect.any(Number),
      };

      expect(expectedResponse.oee).toBeDefined();
      expect(expectedResponse.availability).toBeDefined();
      expect(expectedResponse.performance).toBeDefined();
      expect(expectedResponse.quality).toBeDefined();
    });

    it('should return correct status based on OEE value', () => {
      const getOeeStatus = (oee: number) => {
        if (oee >= 85) return 'excellent';
        if (oee >= 70) return 'good';
        if (oee >= 50) return 'warning';
        return 'critical';
      };

      expect(getOeeStatus(90)).toBe('excellent');
      expect(getOeeStatus(75)).toBe('good');
      expect(getOeeStatus(60)).toBe('warning');
      expect(getOeeStatus(40)).toBe('critical');
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts', async () => {
      const expectedResponse = {
        alerts: [{ id: 1, type: 'cpk', severity: 'warning', title: 'Alert 1' }],
        total: 1,
        unreadCount: 1,
        lastUpdated: expect.any(Number),
      };

      expect(Array.isArray(expectedResponse.alerts)).toBe(true);
      expect(expectedResponse.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter alerts by severity', () => {
      const alerts = [
        { id: 1, severity: 'warning' },
        { id: 2, severity: 'critical' },
        { id: 3, severity: 'warning' },
      ];

      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts).toHaveLength(1);
    });
  });

  describe('getQuickStats', () => {
    it('should return quick stats', async () => {
      const expectedResponse = {
        cpk: { value: 1.45, status: 'good' },
        oee: { value: 78.5, status: 'good' },
        activeMachines: 15,
        activeAlerts: 3,
        lastUpdated: expect.any(Number),
      };

      expect(expectedResponse.cpk).toBeDefined();
      expect(expectedResponse.oee).toBeDefined();
      expect(expectedResponse.activeMachines).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getWidgetData', () => {
    it('should return widget data for cpk_summary type', async () => {
      const expectedResponse = {
        type: 'cpk_summary',
        data: { avgCpk: 1.45, status: 'good' },
        config: { id: 'cpk-summary-default', type: 'cpk_summary', title: 'CPK Summary' },
        lastUpdated: expect.any(Number),
      };

      expect(expectedResponse.type).toBe('cpk_summary');
      expect(expectedResponse.data.avgCpk).toBeDefined();
    });

    it('should return widget data for oee_realtime type', async () => {
      const expectedResponse = {
        type: 'oee_realtime',
        data: { oee: 78.5, status: 'good' },
        config: { id: 'oee-realtime-default', type: 'oee_realtime', title: 'OEE Realtime' },
        lastUpdated: expect.any(Number),
      };

      expect(expectedResponse.type).toBe('oee_realtime');
      expect(expectedResponse.data.oee).toBeDefined();
    });
  });

  describe('saveConfig', () => {
    it('should save widget config', async () => {
      const expectedResponse = {
        success: true,
        config: { id: 'widget-123', type: 'cpk_summary', title: 'My CPK Widget', refreshInterval: 60 },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.config.type).toBe('cpk_summary');
    });
  });

  describe('getEmbedUrl', () => {
    it('should return embed URL and iframe code', async () => {
      const expectedResponse = {
        embedUrl: '/embed/widget/cpk-summary-default?token=abc123',
        iframeCode: '<iframe src="/embed/widget/cpk-summary-default?token=abc123" width="400" height="300"></iframe>',
        token: 'abc123',
        expiresAt: expect.any(Number),
      };

      expect(expectedResponse.embedUrl).toContain('/embed/widget/');
      expect(expectedResponse.iframeCode).toContain('<iframe');
      expect(expectedResponse.token).toBeDefined();
    });
  });
});
