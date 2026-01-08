/**
 * Edge Gateway Simulator Router
 * API endpoints cho Edge Gateway Simulator
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as simulatorService from "../services/edgeGatewaySimulatorService";
import * as wsService from "../services/edgeSimulatorWebSocketService";

export const edgeGatewaySimulatorRouter = router({
  // Get all simulator configs
  getConfigs: protectedProcedure.query(async () => {
    return simulatorService.getAllSimulatorConfigs();
  }),

  // Get simulator config by ID
  getConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return simulatorService.getSimulatorConfigById(input.id);
    }),

  // Create simulator config
  createConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      gatewayId: z.number().optional(),
      sensorType: z.enum(['temperature', 'humidity', 'pressure', 'vibration', 'current', 'voltage', 'custom']).optional(),
      baseValue: z.number().optional(),
      noiseLevel: z.number().min(0).max(1).optional(),
      driftRate: z.number().optional(),
      anomalyProbability: z.number().min(0).max(1).optional(),
      anomalyMagnitude: z.number().min(0).optional(),
      latencyMin: z.number().min(0).optional(),
      latencyMax: z.number().min(0).optional(),
      packetLossRate: z.number().min(0).max(1).optional(),
      bufferEnabled: z.boolean().optional(),
      bufferSize: z.number().min(1).optional(),
      offlineProbability: z.number().min(0).max(1).optional(),
      offlineDurationMin: z.number().min(0).optional(),
      offlineDurationMax: z.number().min(0).optional(),
      samplingInterval: z.number().min(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return simulatorService.createSimulatorConfig({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),

  // Start simulator
  start: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      return simulatorService.startSimulator(input.configId);
    }),

  // Stop simulator
  stop: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      return simulatorService.stopSimulator(input.configId);
    }),

  // Get simulator status
  getStatus: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      return simulatorService.getSimulatorStatus(input.configId);
    }),

  // Get active session
  getActiveSession: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      return simulatorService.getActiveSession(input.configId);
    }),

  // Get all running simulators
  getRunning: protectedProcedure.query(async () => {
    return simulatorService.getAllRunningSimulators();
  }),

  // Get WebSocket info
  getWebSocketInfo: protectedProcedure.query(async () => {
    return wsService.getWebSocketInfo();
  }),

  // Start WebSocket broadcast
  startWebSocketBroadcast: protectedProcedure
    .input(z.object({
      configId: z.number(),
      intervalMs: z.number().min(100).max(10000).optional(),
    }))
    .mutation(async ({ input }) => {
      const config = await simulatorService.getSimulatorConfigById(input.configId);
      if (!config) {
        throw new Error('Simulator config not found');
      }
      
      wsService.startSimulatorBroadcast(
        input.intervalMs || config.samplingInterval || 1000,
        () => {
          // Generate simulated data
          const baseValue = config.baseValue || 25;
          const noise = (Math.random() - 0.5) * 2 * (config.noiseLevel || 0.1) * baseValue;
          const value = baseValue + noise;
          
          return {
            deviceId: `simulator-${config.id}`,
            metrics: {
              [config.sensorType || 'value']: value,
            },
            status: 'online' as const,
          };
        }
      );
      
      return { success: true, message: 'WebSocket broadcast started' };
    }),

  // Stop WebSocket broadcast
  stopWebSocketBroadcast: protectedProcedure.mutation(async () => {
    wsService.stopSimulatorBroadcast();
    return { success: true, message: 'WebSocket broadcast stopped' };
  }),
});
