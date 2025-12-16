import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentShift, getShiftTimeRange, SHIFTS } from './shiftReportService';

describe('shiftReportService', () => {
  describe('SHIFTS', () => {
    it('should have correct shift definitions', () => {
      expect(SHIFTS.morning).toEqual({ start: 6, end: 14, name: "Ca sáng" });
      expect(SHIFTS.afternoon).toEqual({ start: 14, end: 22, name: "Ca chiều" });
      expect(SHIFTS.night).toEqual({ start: 22, end: 6, name: "Ca đêm" });
    });
  });

  describe('getCurrentShift', () => {
    it('should return morning shift for hours 6-13', () => {
      const originalDate = Date;
      
      // Mock Date to return 8:00 AM
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0));
      
      expect(getCurrentShift()).toBe('morning');
      
      vi.useRealTimers();
    });

    it('should return afternoon shift for hours 14-21', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 16, 0, 0));
      
      expect(getCurrentShift()).toBe('afternoon');
      
      vi.useRealTimers();
    });

    it('should return night shift for hours 22-5', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0));
      
      expect(getCurrentShift()).toBe('night');
      
      vi.useRealTimers();
    });

    it('should return night shift for early morning hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 3, 0, 0));
      
      expect(getCurrentShift()).toBe('night');
      
      vi.useRealTimers();
    });
  });

  describe('getShiftTimeRange', () => {
    it('should return correct time range for morning shift', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const { start, end } = getShiftTimeRange(date, 'morning');
      
      expect(start.getHours()).toBe(6);
      expect(start.getMinutes()).toBe(0);
      expect(end.getHours()).toBe(14);
      expect(end.getMinutes()).toBe(0);
      expect(start.getDate()).toBe(end.getDate()); // Same day
    });

    it('should return correct time range for afternoon shift', () => {
      const date = new Date(2024, 0, 15);
      const { start, end } = getShiftTimeRange(date, 'afternoon');
      
      expect(start.getHours()).toBe(14);
      expect(end.getHours()).toBe(22);
      expect(start.getDate()).toBe(end.getDate());
    });

    it('should return correct time range for night shift spanning two days', () => {
      const date = new Date(2024, 0, 15);
      const { start, end } = getShiftTimeRange(date, 'night');
      
      expect(start.getHours()).toBe(22);
      expect(start.getDate()).toBe(15);
      expect(end.getHours()).toBe(6);
      expect(end.getDate()).toBe(16); // Next day
    });
  });
});
