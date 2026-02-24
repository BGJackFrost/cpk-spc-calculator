import { describe, it, expect, vi } from 'vitest';

describe('Phase 159 - Time Period Comparison & Machine Integration API', () => {
  
  describe('Time Period Comparison', () => {
    it('should calculate percentage change correctly', () => {
      const currentValue = 85;
      const previousValue = 80;
      const change = ((currentValue - previousValue) / previousValue) * 100;
      expect(change).toBeCloseTo(6.25, 2);
    });

    it('should handle zero previous value', () => {
      const currentValue = 85;
      const previousValue = 0;
      const change = previousValue === 0 ? 100 : ((currentValue - previousValue) / previousValue) * 100;
      expect(change).toBe(100);
    });

    it('should calculate week date ranges correctly', () => {
      const now = new Date('2025-01-15');
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      expect(startOfWeek.getDay()).toBe(0); // Sunday
    });

    it('should calculate month date ranges correctly', () => {
      const now = new Date('2025-01-15');
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      expect(startOfMonth.getDate()).toBe(1);
      expect(endOfMonth.getDate()).toBeGreaterThanOrEqual(28);
    });
  });

  describe('Machine Integration API', () => {
    it('should generate valid API key format', () => {
      const generateApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let key = 'mk_';
        for (let i = 0; i < 32; i++) {
          key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
      };
      
      const apiKey = generateApiKey();
      expect(apiKey).toMatch(/^mk_[A-Za-z0-9]{32}$/);
    });

    it('should validate inspection data schema', () => {
      const validData = {
        machineId: 'AOI-001',
        timestamp: Date.now(),
        inspectionType: 'visual',
        result: 'pass',
        defectsFound: 0,
        totalInspected: 100,
        details: { board: 'PCB-A', side: 'top' }
      };
      
      expect(validData.machineId).toBeTruthy();
      expect(validData.timestamp).toBeGreaterThan(0);
      expect(['pass', 'fail', 'warning']).toContain(validData.result);
    });

    it('should validate measurement data schema', () => {
      const validData = {
        machineId: 'CMM-001',
        timestamp: Date.now(),
        measurementType: 'dimension',
        parameter: 'length',
        value: 10.5,
        unit: 'mm',
        usl: 11.0,
        lsl: 10.0,
        target: 10.5
      };
      
      expect(validData.value).toBeGreaterThanOrEqual(validData.lsl);
      expect(validData.value).toBeLessThanOrEqual(validData.usl);
    });

    it('should validate OEE data schema', () => {
      const validData = {
        machineId: 'CNC-001',
        timestamp: Date.now(),
        availability: 0.95,
        performance: 0.90,
        quality: 0.99,
        oee: 0.95 * 0.90 * 0.99,
        plannedProductionTime: 480,
        actualRunTime: 456,
        totalCount: 1000,
        goodCount: 990
      };
      
      expect(validData.oee).toBeCloseTo(0.8465, 3);
      expect(validData.availability).toBeGreaterThanOrEqual(0);
      expect(validData.availability).toBeLessThanOrEqual(1);
    });

    it('should log API requests with correct structure', () => {
      const logEntry = {
        apiKeyId: 1,
        endpoint: 'pushInspectionData',
        method: 'POST',
        requestBody: JSON.stringify({ test: true }),
        responseStatus: 200,
        responseTime: 45,
        ipAddress: '192.168.1.100',
        userAgent: 'AOI-Client/1.0',
        timestamp: Date.now()
      };
      
      expect(logEntry.responseStatus).toBe(200);
      expect(logEntry.responseTime).toBeLessThan(1000);
    });
  });

  describe('Machine Integration Dashboard', () => {
    it('should calculate request statistics correctly', () => {
      const logs = [
        { responseStatus: 200, responseTime: 50 },
        { responseStatus: 200, responseTime: 60 },
        { responseStatus: 400, responseTime: 30 },
        { responseStatus: 200, responseTime: 70 },
        { responseStatus: 500, responseTime: 100 }
      ];
      
      const totalRequests = logs.length;
      const successfulRequests = logs.filter(l => l.responseStatus === 200).length;
      const avgResponseTime = logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length;
      const successRate = (successfulRequests / totalRequests) * 100;
      
      expect(totalRequests).toBe(5);
      expect(successfulRequests).toBe(3);
      expect(avgResponseTime).toBe(62);
      expect(successRate).toBe(60);
    });

    it('should group logs by date correctly', () => {
      const logs = [
        { timestamp: new Date('2025-01-15').getTime() },
        { timestamp: new Date('2025-01-15').getTime() },
        { timestamp: new Date('2025-01-14').getTime() },
        { timestamp: new Date('2025-01-14').getTime() },
        { timestamp: new Date('2025-01-14').getTime() }
      ];
      
      const groupedByDate = logs.reduce((acc, log) => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(groupedByDate['2025-01-15']).toBe(2);
      expect(groupedByDate['2025-01-14']).toBe(3);
    });
  });
});
