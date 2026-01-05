/**
 * IoT Alert Escalation Router
 * 
 * API endpoints for alert escalation features:
 * - Escalation Rules CRUD
 * - Alert Correlation CRUD
 * - Escalation Processing
 * - Statistics
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import * as escalationService from '../services/iotAlertEscalationService';

export const iotAlertEscalationRouter = router({
  // ============ Escalation Rules ============
  
  getRules: publicProcedure.query(async () => {
    return escalationService.getEscalationRules();
  }),
  
  createRule: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      alertType: z.string().optional(),
      severityFilter: z.array(z.string()).optional(),
      deviceFilter: z.array(z.number()).optional(),
      groupFilter: z.array(z.number()).optional(),
      escalationLevels: z.array(z.object({
        level: z.number(),
        delayMinutes: z.number(),
        channels: z.array(z.enum(['email', 'sms', 'push', 'webhook', 'slack', 'teams'])),
        recipients: z.array(z.string()),
        message: z.string().optional(),
      })),
      cooldownMinutes: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return escalationService.createEscalationRule({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),
  
  updateRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      alertType: z.string().optional(),
      severityFilter: z.array(z.string()).optional(),
      deviceFilter: z.array(z.number()).optional(),
      groupFilter: z.array(z.number()).optional(),
      escalationLevels: z.array(z.object({
        level: z.number(),
        delayMinutes: z.number(),
        channels: z.array(z.enum(['email', 'sms', 'push', 'webhook', 'slack', 'teams'])),
        recipients: z.array(z.string()),
        message: z.string().optional(),
      })).optional(),
      cooldownMinutes: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return escalationService.updateEscalationRule(id, data);
    }),
  
  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return escalationService.deleteEscalationRule(input.id);
    }),
  
  // ============ Alert Correlations ============
  
  getCorrelations: publicProcedure.query(async () => {
    return escalationService.getAlertCorrelations();
  }),
  
  createCorrelation: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      correlationWindowMinutes: z.number().optional(),
      sourceAlertPattern: z.any(),
      relatedAlertPattern: z.any(),
      actionType: z.enum(['suppress', 'merge', 'escalate', 'notify']),
      actionConfig: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return escalationService.createAlertCorrelation({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),
  
  updateCorrelation: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      correlationWindowMinutes: z.number().optional(),
      sourceAlertPattern: z.any().optional(),
      relatedAlertPattern: z.any().optional(),
      actionType: z.enum(['suppress', 'merge', 'escalate', 'notify']).optional(),
      actionConfig: z.any().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return escalationService.updateAlertCorrelation(id, data);
    }),
  
  // ============ Statistics ============
  
  getStats: publicProcedure.query(async () => {
    return escalationService.getEscalationStats();
  }),
  
  // ============ Test Escalation ============
  
  testEscalation: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      alertType: z.string(),
      severity: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      await escalationService.processAlertEscalation({
        id: Date.now(),
        ...input,
      });
      return { success: true, message: 'Escalation test triggered' };
    }),
});

export default iotAlertEscalationRouter;
