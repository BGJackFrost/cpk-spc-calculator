import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing service
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          orderBy: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockImplementation(() => ({
              offset: vi.fn().mockResolvedValue([]),
            })),
          })),
          limit: vi.fn().mockResolvedValue([{ count: 0 }]),
        })),
        orderBy: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockImplementation(() => ({
            offset: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    }),
  }),
}));

import { scheduledOtaService } from './scheduledOtaService';

describe('Scheduled OTA Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateOffPeakHours', () => {
    it('should validate correct time format', () => {
      expect(scheduledOtaService.validateOffPeakHours('22:00', '06:00')).toBe(true);
      expect(scheduledOtaService.validateOffPeakHours('00:00', '23:59')).toBe(true);
      expect(scheduledOtaService.validateOffPeakHours('12:30', '18:45')).toBe(true);
    });

    it('should reject invalid time format', () => {
      expect(scheduledOtaService.validateOffPeakHours('25:00', '06:00')).toBe(false);
      expect(scheduledOtaService.validateOffPeakHours('22:60', '06:00')).toBe(false);
      expect(scheduledOtaService.validateOffPeakHours('invalid', '06:00')).toBe(false);
      expect(scheduledOtaService.validateOffPeakHours('22:00', '')).toBe(false);
    });
  });

  describe('getRecommendedOffPeakHours', () => {
    it('should return default off-peak hours', async () => {
      const result = await scheduledOtaService.getRecommendedOffPeakHours();
      expect(result).toEqual({
        startTime: '22:00',
        endTime: '06:00',
      });
    });
  });
});
