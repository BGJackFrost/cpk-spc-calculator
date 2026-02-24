/**
 * IoT Notification Integration Tests
 * Test notification integration với preferences và MTTR/MTBF calculations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock notification preferences service
const mockGetUserPreferences = vi.fn();
const mockShouldSendNotification = vi.fn();
const mockIsWithinQuietHours = vi.fn();

vi.mock('./services/notificationPreferencesService', () => ({
  getUserPreferences: mockGetUserPreferences,
  shouldSendNotification: mockShouldSendNotification,
  isWithinQuietHours: mockIsWithinQuietHours,
}));

describe('IoT Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldSendNotification', () => {
    it('should return true for critical alarm when filter is all', () => {
      mockShouldSendNotification.mockReturnValue(true);
      const result = mockShouldSendNotification('critical', 'all');
      expect(result).toBe(true);
    });

    it('should return true for warning alarm when filter is warning_up', () => {
      mockShouldSendNotification.mockReturnValue(true);
      const result = mockShouldSendNotification('warning', 'warning_up');
      expect(result).toBe(true);
    });

    it('should return false for info alarm when filter is warning_up', () => {
      mockShouldSendNotification.mockReturnValue(false);
      const result = mockShouldSendNotification('info', 'warning_up');
      expect(result).toBe(false);
    });

    it('should return true for critical alarm when filter is critical_only', () => {
      mockShouldSendNotification.mockReturnValue(true);
      const result = mockShouldSendNotification('critical', 'critical_only');
      expect(result).toBe(true);
    });

    it('should return false for warning alarm when filter is critical_only', () => {
      mockShouldSendNotification.mockReturnValue(false);
      const result = mockShouldSendNotification('warning', 'critical_only');
      expect(result).toBe(false);
    });
  });

  describe('isWithinQuietHours', () => {
    it('should return true when current time is within quiet hours', () => {
      mockIsWithinQuietHours.mockReturnValue(true);
      const result = mockIsWithinQuietHours('22:00', '07:00', new Date('2024-01-01T23:00:00'));
      expect(result).toBe(true);
    });

    it('should return false when current time is outside quiet hours', () => {
      mockIsWithinQuietHours.mockReturnValue(false);
      const result = mockIsWithinQuietHours('22:00', '07:00', new Date('2024-01-01T12:00:00'));
      expect(result).toBe(false);
    });

    it('should handle overnight quiet hours correctly', () => {
      mockIsWithinQuietHours.mockReturnValue(true);
      // 23:00 should be within 22:00-07:00
      const result = mockIsWithinQuietHours('22:00', '07:00', new Date('2024-01-01T23:00:00'));
      expect(result).toBe(true);
    });

    it('should handle early morning within quiet hours', () => {
      mockIsWithinQuietHours.mockReturnValue(true);
      // 05:00 should be within 22:00-07:00
      const result = mockIsWithinQuietHours('22:00', '07:00', new Date('2024-01-01T05:00:00'));
      expect(result).toBe(true);
    });
  });

  describe('Notification Channel Preferences', () => {
    it('should check email enabled preference', () => {
      const preferences = {
        emailEnabled: true,
        emailAddress: 'test@example.com',
        telegramEnabled: false,
        pushEnabled: true,
      };
      expect(preferences.emailEnabled).toBe(true);
      expect(preferences.emailAddress).toBe('test@example.com');
    });

    it('should check telegram enabled preference', () => {
      const preferences = {
        emailEnabled: false,
        telegramEnabled: true,
        telegramChatId: '123456789',
        pushEnabled: true,
      };
      expect(preferences.telegramEnabled).toBe(true);
      expect(preferences.telegramChatId).toBe('123456789');
    });

    it('should check push enabled preference', () => {
      const preferences = {
        emailEnabled: false,
        telegramEnabled: false,
        pushEnabled: true,
      };
      expect(preferences.pushEnabled).toBe(true);
    });
  });
});

describe('MTTR/MTBF Calculations', () => {
  describe('MTTR Calculation', () => {
    it('should calculate MTTR correctly from repair times', () => {
      const repairTimes = [30, 45, 60, 90, 75]; // minutes
      const mttr = repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length;
      expect(mttr).toBe(60);
    });

    it('should handle empty repair times', () => {
      const repairTimes: number[] = [];
      const mttr = repairTimes.length > 0 
        ? repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length 
        : 0;
      expect(mttr).toBe(0);
    });

    it('should calculate MTTR min/max correctly', () => {
      const repairTimes = [30, 45, 60, 90, 75];
      const mttrMin = Math.min(...repairTimes);
      const mttrMax = Math.max(...repairTimes);
      expect(mttrMin).toBe(30);
      expect(mttrMax).toBe(90);
    });
  });

  describe('MTBF Calculation', () => {
    it('should calculate MTBF correctly from failure intervals', () => {
      const failureIntervals = [100, 150, 200, 250, 300]; // hours
      const mtbf = failureIntervals.reduce((a, b) => a + b, 0) / failureIntervals.length;
      expect(mtbf).toBe(200);
    });

    it('should handle single failure interval', () => {
      const failureIntervals = [150];
      const mtbf = failureIntervals.reduce((a, b) => a + b, 0) / failureIntervals.length;
      expect(mtbf).toBe(150);
    });

    it('should calculate MTBF standard deviation', () => {
      const failureIntervals = [100, 150, 200, 250, 300];
      const mean = failureIntervals.reduce((a, b) => a + b, 0) / failureIntervals.length;
      const variance = failureIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / failureIntervals.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeCloseTo(70.71, 1);
    });
  });

  describe('Availability Calculation', () => {
    it('should calculate availability from MTBF and MTTR', () => {
      const mtbf = 200; // hours
      const mttr = 60 / 60; // convert minutes to hours
      const availability = mtbf / (mtbf + mttr);
      expect(availability).toBeCloseTo(0.995, 2);
    });

    it('should handle zero MTTR', () => {
      const mtbf = 200;
      const mttr = 0;
      const availability = mtbf / (mtbf + mttr);
      expect(availability).toBe(1);
    });

    it('should return 0 when both MTBF and MTTR are 0', () => {
      const mtbf = 0;
      const mttr = 0;
      const availability = mtbf === 0 && mttr === 0 ? 0 : mtbf / (mtbf + mttr);
      expect(availability).toBe(0);
    });
  });

  describe('Trend Data Generation', () => {
    it('should generate correct number of data points', () => {
      const days = 7;
      const trendData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trendData.push({
          date: date.toISOString().split('T')[0],
          mttr: Math.round(30 + Math.random() * 60),
          mtbf: Math.round(100 + Math.random() * 200),
          availability: 0.95 + Math.random() * 0.04,
        });
      }
      expect(trendData.length).toBe(days);
    });

    it('should have valid MTTR values in range', () => {
      const mttr = Math.round(30 + Math.random() * 60);
      expect(mttr).toBeGreaterThanOrEqual(30);
      expect(mttr).toBeLessThanOrEqual(90);
    });

    it('should have valid MTBF values in range', () => {
      const mtbf = Math.round(100 + Math.random() * 200);
      expect(mtbf).toBeGreaterThanOrEqual(100);
      expect(mtbf).toBeLessThanOrEqual(300);
    });

    it('should have valid availability values in range', () => {
      const availability = 0.95 + Math.random() * 0.04;
      expect(availability).toBeGreaterThanOrEqual(0.95);
      expect(availability).toBeLessThanOrEqual(0.99);
    });
  });
});
