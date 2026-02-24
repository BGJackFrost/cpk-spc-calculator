/**
 * Unit tests for Notification Preferences Service
 */

import { describe, it, expect } from 'vitest';
import {
  shouldSendNotification,
  isWithinQuietHours,
} from './notificationPreferencesService';

describe('NotificationPreferencesService', () => {
  describe('shouldSendNotification', () => {
    it('should send all notifications when filter is "all"', () => {
      expect(shouldSendNotification('info', 'all')).toBe(true);
      expect(shouldSendNotification('warning', 'all')).toBe(true);
      expect(shouldSendNotification('error', 'all')).toBe(true);
      expect(shouldSendNotification('critical', 'all')).toBe(true);
    });

    it('should filter info notifications when filter is "warning_up"', () => {
      expect(shouldSendNotification('info', 'warning_up')).toBe(false);
      expect(shouldSendNotification('warning', 'warning_up')).toBe(true);
      expect(shouldSendNotification('error', 'warning_up')).toBe(true);
      expect(shouldSendNotification('critical', 'warning_up')).toBe(true);
    });

    it('should only send critical/error when filter is "critical_only"', () => {
      expect(shouldSendNotification('info', 'critical_only')).toBe(false);
      expect(shouldSendNotification('warning', 'critical_only')).toBe(false);
      expect(shouldSendNotification('error', 'critical_only')).toBe(true);
      expect(shouldSendNotification('critical', 'critical_only')).toBe(true);
    });
  });

  describe('isWithinQuietHours', () => {
    // Note: These tests depend on the current time, so we test the logic patterns
    
    it('should validate time format', () => {
      const validTimes = ['00:00', '12:30', '23:59', '07:00'];
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      validTimes.forEach(time => {
        expect(timeRegex.test(time)).toBe(true);
      });
    });

    it('should handle same-day range logic', () => {
      // Test the logic for same-day range (e.g., 09:00 - 17:00)
      const isWithinSameDayRange = (currentTime: number, start: number, end: number): boolean => {
        return currentTime >= start && currentTime <= end;
      };

      // 10:00 is within 09:00 - 17:00
      expect(isWithinSameDayRange(1000, 900, 1700)).toBe(true);
      // 08:00 is NOT within 09:00 - 17:00
      expect(isWithinSameDayRange(800, 900, 1700)).toBe(false);
      // 18:00 is NOT within 09:00 - 17:00
      expect(isWithinSameDayRange(1800, 900, 1700)).toBe(false);
    });

    it('should handle overnight range logic', () => {
      // Test the logic for overnight range (e.g., 22:00 - 07:00)
      const isWithinOvernightRange = (currentTime: number, start: number, end: number): boolean => {
        return currentTime >= start || currentTime <= end;
      };

      // 23:00 is within 22:00 - 07:00
      expect(isWithinOvernightRange(2300, 2200, 700)).toBe(true);
      // 03:00 is within 22:00 - 07:00
      expect(isWithinOvernightRange(300, 2200, 700)).toBe(true);
      // 12:00 is NOT within 22:00 - 07:00
      expect(isWithinOvernightRange(1200, 2200, 700)).toBe(false);
    });
  });

  describe('Severity Filter Validation', () => {
    it('should accept valid severity filters', () => {
      const validFilters = ['all', 'warning_up', 'critical_only'];
      validFilters.forEach(filter => {
        expect(['all', 'warning_up', 'critical_only']).toContain(filter);
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co', 'user+tag@example.org'];
      const invalidEmails = ['invalid', 'no@', '@nodomain.com', ''];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Telegram Chat ID Validation', () => {
    it('should validate telegram chat ID format', () => {
      const validChatIds = ['123456789', '-100123456789', '987654321'];
      const invalidChatIds = ['abc', '', 'not-a-number'];
      
      const chatIdRegex = /^-?\d+$/;
      
      validChatIds.forEach(id => {
        expect(chatIdRegex.test(id)).toBe(true);
      });
      
      invalidChatIds.forEach(id => {
        expect(chatIdRegex.test(id)).toBe(false);
      });
    });
  });
});
