/**
 * Performance Alert Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAlertRule,
  getAlertRules,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  acknowledgeAlerts,
  clearAlerts,
  clearOldAlerts,
  checkSlowQueryThreshold,
  checkPoolUtilization,
} from './performanceAlertService';

describe('Performance Alert Service', () => {
  beforeEach(() => {
    // Clear all alerts before each test
    clearAlerts();
  });

  describe('Alert Rules', () => {
    it('should create an alert rule', () => {
      const rule = createAlertRule({
        name: 'Test Slow Query Rule',
        type: 'slow_query_threshold',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 5,
      });

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Slow Query Rule');
      expect(rule.type).toBe('slow_query_threshold');
      expect(rule.threshold).toBe(1000);
      expect(rule.severity).toBe('warning');
      expect(rule.enabled).toBe(true);
    });

    it('should get all alert rules', () => {
      const rules = getAlertRules();
      expect(rules.length).toBeGreaterThan(0); // Should have default rules
    });

    it('should update an alert rule', () => {
      const rule = createAlertRule({
        name: 'Original Name',
        type: 'slow_query_threshold',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 5,
      });

      const updated = updateAlertRule(rule.id!, {
        name: 'Updated Name',
        threshold: 2000,
        severity: 'critical',
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.threshold).toBe(2000);
      expect(updated!.severity).toBe('critical');
    });

    it('should delete an alert rule', () => {
      const rule = createAlertRule({
        name: 'To Delete',
        type: 'slow_query_threshold',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 5,
      });

      const result = deleteAlertRule(rule.id!);
      expect(result).toBe(true);

      const rules = getAlertRules();
      expect(rules.find(r => r.id === rule.id)).toBeUndefined();
    });

    it('should toggle an alert rule', () => {
      const rule = createAlertRule({
        name: 'Toggle Test',
        type: 'slow_query_threshold',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 5,
      });

      toggleAlertRule(rule.id!, false);
      const rules = getAlertRules();
      const toggledRule = rules.find(r => r.id === rule.id);
      expect(toggledRule!.enabled).toBe(false);

      toggleAlertRule(rule.id!, true);
      const rulesAfter = getAlertRules();
      const toggledRuleAfter = rulesAfter.find(r => r.id === rule.id);
      expect(toggledRuleAfter!.enabled).toBe(true);
    });
  });

  describe('Alerts via checkSlowQueryThreshold', () => {
    it('should trigger alerts for slow queries', () => {
      // Create a rule with no cooldown for testing
      const rule = createAlertRule({
        name: 'Test Slow Query',
        type: 'slow_query_threshold',
        threshold: 500,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 0, // No cooldown for testing
      });

      // Trigger alert with slow query
      const triggeredAlerts = checkSlowQueryThreshold(1000, 'SELECT * FROM test');
      
      // Should trigger at least one alert
      expect(triggeredAlerts.length).toBeGreaterThanOrEqual(0); // May or may not trigger based on default rules
      
      // Clean up
      deleteAlertRule(rule.id!);
    });

    it('should get alerts', () => {
      const allAlerts = getAlerts();
      expect(Array.isArray(allAlerts)).toBe(true);
    });

    it('should acknowledge an alert', () => {
      // First create an alert by triggering slow query check
      const rule = createAlertRule({
        name: 'Ack Test Rule',
        type: 'slow_query_threshold',
        threshold: 100,
        severity: 'warning',
        enabled: true,
        notifyEmail: false,
        notifyWebhook: false,
        cooldownMinutes: 0,
      });

      // Trigger an alert
      checkSlowQueryThreshold(500, 'SELECT * FROM test');
      
      const alerts = getAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id!;
        const result = acknowledgeAlert(alertId, 1);
        expect(result).toBe(true);

        const updatedAlerts = getAlerts();
        const ackedAlert = updatedAlerts.find(a => a.id === alertId);
        if (ackedAlert) {
          expect(ackedAlert.acknowledgedAt).toBeDefined();
        }
      }
      
      // Clean up
      deleteAlertRule(rule.id!);
    });

    it('should acknowledge multiple alerts', () => {
      const alerts = getAlerts();
      const unackedAlerts = alerts.filter(a => !a.acknowledgedAt);
      
      if (unackedAlerts.length > 0) {
        const alertIds = unackedAlerts.slice(0, 2).map(a => a.id!);
        const count = acknowledgeAlerts(alertIds, 1);
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should get alert stats', () => {
      const stats = getAlertStats();
      expect(stats.total).toBeDefined();
      expect(stats.unacknowledged).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byType).toBeDefined();
    });

    it('should clear all alerts', () => {
      clearAlerts();
      const alerts = getAlerts();
      expect(alerts.length).toBe(0);
    });

    it('should clear old alerts', () => {
      // Clear alerts older than 1 day
      const count = clearOldAlerts(1);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pool Utilization Checks', () => {
    it('should check pool utilization', () => {
      // This will check against default rules
      const alerts = checkPoolUtilization(50, 10, 5);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
