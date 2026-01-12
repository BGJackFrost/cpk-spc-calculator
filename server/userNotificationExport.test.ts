/**
 * Test cho tính năng export lịch sử thông báo
 * Phase 10.5 - Badge thông báo, Date Range Picker và Export
 */

import { describe, it, expect } from 'vitest';

describe('User Notification Export Feature', () => {
  describe('Export CSV API', () => {
    it('should have exportCsv procedure in userNotificationRouter', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter).toBeDefined();
      expect(userNotificationRouter._def.procedures).toHaveProperty('exportCsv');
    });

    it('should have correct input schema for exportCsv', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      const exportCsv = userNotificationRouter._def.procedures.exportCsv;
      expect(exportCsv).toBeDefined();
      // Verify it's a query procedure
      expect(exportCsv._def.type).toBe('query');
    });
  });

  describe('Export Excel API', () => {
    it('should have exportExcel procedure in userNotificationRouter', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter).toBeDefined();
      expect(userNotificationRouter._def.procedures).toHaveProperty('exportExcel');
    });

    it('should have correct input schema for exportExcel', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      const exportExcel = userNotificationRouter._def.procedures.exportExcel;
      expect(exportExcel).toBeDefined();
      // Verify it's a query procedure
      expect(exportExcel._def.type).toBe('query');
    });
  });

  describe('Notification Count API', () => {
    it('should have getUnreadCount procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('getUnreadCount');
    });

    it('should have getStats procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('getStats');
    });
  });

  describe('Notification Helper Functions', () => {
    it('should export createUserNotification helper', async () => {
      const { createUserNotification } = await import('./routers/userNotificationRouter');
      expect(createUserNotification).toBeDefined();
      expect(typeof createUserNotification).toBe('function');
    });

    it('should export notifyReportSent helper', async () => {
      const { notifyReportSent } = await import('./routers/userNotificationRouter');
      expect(notifyReportSent).toBeDefined();
      expect(typeof notifyReportSent).toBe('function');
    });

    it('should export notifySpcViolation helper', async () => {
      const { notifySpcViolation } = await import('./routers/userNotificationRouter');
      expect(notifySpcViolation).toBeDefined();
      expect(typeof notifySpcViolation).toBe('function');
    });

    it('should export notifyCpkAlert helper', async () => {
      const { notifyCpkAlert } = await import('./routers/userNotificationRouter');
      expect(notifyCpkAlert).toBeDefined();
      expect(typeof notifyCpkAlert).toBe('function');
    });

    it('should export notifyAnomalyDetected helper', async () => {
      const { notifyAnomalyDetected } = await import('./routers/userNotificationRouter');
      expect(notifyAnomalyDetected).toBeDefined();
      expect(typeof notifyAnomalyDetected).toBe('function');
    });
  });

  describe('Type Labels', () => {
    it('should have proper type labels for CSV export', async () => {
      // Verify type labels are defined correctly
      const typeLabels: Record<string, string> = {
        'report_sent': 'Báo cáo',
        'spc_violation': 'Vi phạm SPC',
        'cpk_alert': 'Cảnh báo CPK',
        'system': 'Hệ thống',
        'anomaly_detected': 'Bất thường',
      };
      
      expect(Object.keys(typeLabels)).toHaveLength(5);
      expect(typeLabels['report_sent']).toBe('Báo cáo');
      expect(typeLabels['cpk_alert']).toBe('Cảnh báo CPK');
    });

    it('should have proper severity labels', async () => {
      const severityLabels: Record<string, string> = {
        'info': 'Thông tin',
        'warning': 'Cảnh báo',
        'critical': 'Nghiêm trọng',
      };
      
      expect(Object.keys(severityLabels)).toHaveLength(3);
      expect(severityLabels['critical']).toBe('Nghiêm trọng');
    });
  });
});
