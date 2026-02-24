/**
 * Edge Gateway Router
 * API endpoints cho Edge Gateway management
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as edgeGatewayService from "../services/edgeGatewayService";

export const edgeGatewayRouter = router({
  // Get all gateways
  list: publicProcedure.query(async () => {
    return edgeGatewayService.getAllGateways();
  }),

  // Get gateway by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return edgeGatewayService.getGatewayById(input.id);
    }),

  // Create gateway
  create: protectedProcedure
    .input(z.object({
      gatewayCode: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      location: z.string().optional(),
      productionLineId: z.number().optional(),
      ipAddress: z.string().optional(),
      macAddress: z.string().optional(),
      bufferCapacity: z.number().optional(),
      syncInterval: z.number().optional(),
      firmwareVersion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return edgeGatewayService.createGateway(input);
    }),

  // Update gateway
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      productionLineId: z.number().optional(),
      ipAddress: z.string().optional(),
      macAddress: z.string().optional(),
      bufferCapacity: z.number().optional(),
      syncInterval: z.number().optional(),
      firmwareVersion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return edgeGatewayService.updateGateway(id, updates);
    }),

  // Delete gateway
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return edgeGatewayService.deleteGateway(input.id);
    }),

  // Get devices by gateway
  getDevices: publicProcedure
    .input(z.object({ gatewayId: z.number() }))
    .query(async ({ input }) => {
      return edgeGatewayService.getDevicesByGateway(input.gatewayId);
    }),

  // Create device
  createDevice: protectedProcedure
    .input(z.object({
      gatewayId: z.number(),
      deviceCode: z.string().min(1),
      name: z.string().min(1),
      deviceType: z.enum(['sensor', 'plc', 'actuator', 'meter', 'camera']),
      protocol: z.enum(['modbus_tcp', 'modbus_rtu', 'opcua', 'mqtt', 'http', 'serial']).optional(),
      address: z.string().optional(),
      pollingInterval: z.number().optional(),
      dataType: z.enum(['int16', 'int32', 'float32', 'float64', 'bool', 'string']).optional(),
      scaleFactor: z.number().optional(),
      offset: z.number().optional(),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return edgeGatewayService.createDevice(input);
    }),

  // Heartbeat from gateway
  heartbeat: publicProcedure
    .input(z.object({
      gatewayId: z.number(),
      cpuUsage: z.number().optional(),
      memoryUsage: z.number().optional(),
      diskUsage: z.number().optional(),
      currentBufferSize: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { gatewayId, ...metrics } = input;
      return edgeGatewayService.updateHeartbeat(gatewayId, metrics);
    }),

  // Sync data from gateway
  syncData: publicProcedure
    .input(z.object({
      gatewayId: z.number(),
      data: z.array(z.object({
        deviceId: z.number(),
        value: z.number(),
        timestamp: z.number(),
        quality: z.enum(['good', 'uncertain', 'bad']).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return edgeGatewayService.syncData(input.gatewayId, input.data);
    }),

  // Get gateway statistics
  getStats: publicProcedure
    .input(z.object({ gatewayId: z.number() }))
    .query(async ({ input }) => {
      return edgeGatewayService.getGatewayStats(input.gatewayId);
    }),
});
