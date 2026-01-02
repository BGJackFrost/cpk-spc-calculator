import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';

/**
 * Settings Router - AI Configuration Management
 * 
 * Procedures:
 * - getConfig: Get AI system configuration
 * - updateConfig: Update AI configuration
 * - getThresholds: Get alert thresholds
 * - updateThresholds: Update alert thresholds
 * - getAlertRules: Get alert rules
 * - updateAlertRules: Update alert rules
 */

// Mock configuration (replace with database in production)
let aiConfig = {
  autoRetrain: true,
  retrainInterval: 7, // days
  minAccuracyThreshold: 0.85,
  maxModelAge: 30, // days
  enableAutoDeployment: false,
  enableMonitoring: true,
  dataRetentionDays: 90,
  maxConcurrentTraining: 3,
};

let thresholds = {
  cpk: {
    warning: 1.33,
    critical: 1.0,
  },
  accuracy: {
    warning: 0.9,
    critical: 0.85,
  },
  drift: {
    warning: 0.1,
    critical: 0.2,
  },
  latency: {
    warning: 100, // ms
    critical: 500,
  },
};

let alertRules = [
  {
    id: '1',
    name: 'Low Model Accuracy',
    condition: 'accuracy < 0.85',
    severity: 'critical',
    enabled: true,
  },
  {
    id: '2',
    name: 'High Prediction Latency',
    condition: 'latency > 500ms',
    severity: 'warning',
    enabled: true,
  },
  {
    id: '3',
    name: 'Data Drift Detected',
    condition: 'drift > 0.2',
    severity: 'critical',
    enabled: true,
  },
];

export const settingsRouter = router({
  /**
   * Get AI configuration
   */
  getConfig: publicProcedure.query(async () => {
    return aiConfig;
  }),

  /**
   * Update AI configuration
   */
  updateConfig: publicProcedure
    .input(z.object({
      autoRetrain: z.boolean().optional(),
      retrainInterval: z.number().min(1).max(365).optional(),
      minAccuracyThreshold: z.number().min(0).max(1).optional(),
      maxModelAge: z.number().min(1).max(365).optional(),
      enableAutoDeployment: z.boolean().optional(),
      enableMonitoring: z.boolean().optional(),
      dataRetentionDays: z.number().min(1).max(3650).optional(),
      maxConcurrentTraining: z.number().min(1).max(10).optional(),
    }))
    .mutation(async ({ input }) => {
      aiConfig = { ...aiConfig, ...input };
      return {
        success: true,
        config: aiConfig,
      };
    }),

  /**
   * Get alert thresholds
   */
  getThresholds: publicProcedure.query(async () => {
    return thresholds;
  }),

  /**
   * Update alert thresholds
   */
  updateThresholds: publicProcedure
    .input(z.object({
      cpk: z.object({
        warning: z.number().optional(),
        critical: z.number().optional(),
      }).optional(),
      accuracy: z.object({
        warning: z.number().min(0).max(1).optional(),
        critical: z.number().min(0).max(1).optional(),
      }).optional(),
      drift: z.object({
        warning: z.number().min(0).max(1).optional(),
        critical: z.number().min(0).max(1).optional(),
      }).optional(),
      latency: z.object({
        warning: z.number().min(0).optional(),
        critical: z.number().min(0).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.cpk) {
        thresholds.cpk = { ...thresholds.cpk, ...input.cpk };
      }
      if (input.accuracy) {
        thresholds.accuracy = { ...thresholds.accuracy, ...input.accuracy };
      }
      if (input.drift) {
        thresholds.drift = { ...thresholds.drift, ...input.drift };
      }
      if (input.latency) {
        thresholds.latency = { ...thresholds.latency, ...input.latency };
      }

      return {
        success: true,
        thresholds,
      };
    }),

  /**
   * Get alert rules
   */
  getAlertRules: publicProcedure.query(async () => {
    return alertRules;
  }),

  /**
   * Update alert rules
   */
  updateAlertRules: publicProcedure
    .input(z.object({
      rules: z.array(z.object({
        id: z.string(),
        name: z.string(),
        condition: z.string(),
        severity: z.enum(['info', 'warning', 'critical']),
        enabled: z.boolean(),
      })),
    }))
    .mutation(async ({ input }) => {
      alertRules = input.rules;
      return {
        success: true,
        rules: alertRules,
      };
    }),

  /**
   * Add alert rule
   */
  addAlertRule: publicProcedure
    .input(z.object({
      name: z.string(),
      condition: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const newRule = {
        id: `${Date.now()}`,
        ...input,
      };
      alertRules.push(newRule);
      return {
        success: true,
        rule: newRule,
      };
    }),

  /**
   * Delete alert rule
   */
  deleteAlertRule: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const index = alertRules.findIndex(r => r.id === input.id);
      if (index === -1) {
        throw new Error('Alert rule not found');
      }
      alertRules.splice(index, 1);
      return {
        success: true,
      };
    }),
});
