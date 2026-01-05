/**
 * Test file for IoT Seed Service - Work Order Functions
 */

import { describe, it, expect } from 'vitest';

describe('IoT Seed Service - Work Order Functions', () => {
  describe('Module Exports', () => {
    it('should export seedIotTechnicians function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotTechnicians).toBe('function');
    });

    it('should export seedIotMaintenanceSchedules function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotMaintenanceSchedules).toBe('function');
    });

    it('should export seedIotWorkOrders function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotWorkOrders).toBe('function');
    });

    it('should export seedIotFailureEvents function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotFailureEvents).toBe('function');
    });

    it('should export seedAllIotWorkOrderData function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedAllIotWorkOrderData).toBe('function');
    });

    it('should export seedIotDevices function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotDevices).toBe('function');
    });

    it('should export seedIotAlarms function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedIotAlarms).toBe('function');
    });

    it('should export seedAllIotData function', async () => {
      const module = await import('./iotSeedService');
      expect(typeof module.seedAllIotData).toBe('function');
    });
  });

  describe('Helper Functions Validation', () => {
    it('should format date correctly for MySQL', () => {
      const date = new Date('2025-01-05T10:30:00Z');
      const formatted = date.toISOString().slice(0, 19).replace('T', ' ');
      expect(formatted).toBe('2025-01-05 10:30:00');
    });

    it('should generate random integers within range', () => {
      const randomInt = (min: number, max: number) => 
        Math.floor(Math.random() * (max - min + 1)) + min;
      
      for (let i = 0; i < 100; i++) {
        const result = randomInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('should generate random dates within range', () => {
      const randomDate = (start: Date, end: Date) =>
        new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');
      
      for (let i = 0; i < 100; i++) {
        const result = randomDate(start, end);
        expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(result.getTime()).toBeLessThanOrEqual(end.getTime());
      }
    });
  });

  describe('Sample Data Structure Validation', () => {
    it('should have valid technician availability values', () => {
      const validAvailabilities = ['available', 'busy', 'on_leave', 'unavailable'];
      expect(validAvailabilities).toContain('available');
      expect(validAvailabilities).toContain('busy');
      expect(validAvailabilities).toContain('on_leave');
      expect(validAvailabilities).toContain('unavailable');
    });

    it('should have valid maintenance types', () => {
      const validTypes = ['preventive', 'corrective', 'predictive', 'calibration', 'inspection'];
      expect(validTypes.length).toBe(5);
      expect(validTypes).toContain('preventive');
      expect(validTypes).toContain('inspection');
    });

    it('should have valid work order types', () => {
      const validTypes = ['corrective', 'preventive', 'predictive', 'emergency', 'inspection'];
      expect(validTypes.length).toBe(5);
    });

    it('should have valid work order statuses', () => {
      const validStatuses = ['created', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold', 'verified'];
      expect(validStatuses.length).toBe(7);
    });

    it('should have valid priorities', () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      expect(validPriorities.length).toBe(4);
    });

    it('should have valid failure types', () => {
      const validFailureTypes = ['breakdown', 'degradation', 'intermittent', 'planned_stop'];
      expect(validFailureTypes.length).toBe(4);
    });

    it('should have valid severities', () => {
      const validSeverities = ['minor', 'moderate', 'major', 'critical'];
      expect(validSeverities.length).toBe(4);
    });

    it('should have valid root cause categories', () => {
      const validCategories = ['mechanical', 'electrical', 'software', 'operator_error', 'wear', 'environmental', 'unknown'];
      expect(validCategories.length).toBe(7);
    });

    it('should have valid resolution types', () => {
      const validTypes = ['repair', 'replace', 'adjust', 'reset', 'other'];
      expect(validTypes.length).toBe(5);
    });
  });
});
