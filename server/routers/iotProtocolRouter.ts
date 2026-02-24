/**
 * IoT Protocol Router
 * 
 * API endpoints for protocol management:
 * - MQTT Connection Management
 * - OPC-UA Connection Management
 * - Modbus Connection Management
 * - Connection Monitoring
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import * as protocolService from '../services/iotProtocolService';

export const iotProtocolRouter = router({
  // ============ MQTT ============
  
  connectMQTT: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      host: z.string(),
      port: z.number().default(1883),
      clientId: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      useTls: z.boolean().optional(),
      cleanSession: z.boolean().optional(),
      keepAlive: z.number().optional(),
      topics: z.array(z.string()).optional(),
      qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.connectMQTT(input.deviceId, {
        protocol: 'mqtt',
        ...input,
      });
    }),
  
  disconnectMQTT: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return protocolService.disconnectMQTT(input.deviceId);
    }),
  
  publishMQTT: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      topic: z.string(),
      message: z.string(),
      qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.publishMQTT(input.deviceId, input.topic, input.message, input.qos);
    }),
  
  subscribeMQTT: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      topics: z.array(z.string()),
      qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.subscribeMQTT(input.deviceId, input.topics, input.qos);
    }),
  
  // ============ OPC-UA ============
  
  connectOPCUA: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      endpointUrl: z.string(),
      host: z.string().optional().default('localhost'),
      port: z.number().optional().default(4840),
      securityMode: z.enum(['None', 'Sign', 'SignAndEncrypt']).optional(),
      securityPolicy: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      nodeIds: z.array(z.string()).optional(),
      samplingInterval: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.connectOPCUA(input.deviceId, {
        protocol: 'opc_ua',
        ...input,
      });
    }),
  
  disconnectOPCUA: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return protocolService.disconnectOPCUA(input.deviceId);
    }),
  
  readOPCUANodes: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      nodeIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return protocolService.readOPCUANodes(input.deviceId, input.nodeIds);
    }),
  
  writeOPCUANode: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      nodeId: z.string(),
      value: z.any(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.writeOPCUANode(input.deviceId, input.nodeId, input.value);
    }),
  
  // ============ Modbus ============
  
  connectModbus: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      host: z.string(),
      port: z.number().default(502),
      protocol: z.enum(['modbus_tcp', 'modbus_rtu']).default('modbus_tcp'),
      unitId: z.number().default(1),
      baudRate: z.number().optional(),
      dataBits: z.number().optional(),
      stopBits: z.number().optional(),
      parity: z.enum(['none', 'even', 'odd']).optional(),
      registers: z.array(z.object({
        address: z.number(),
        type: z.enum(['coil', 'discrete', 'holding', 'input']),
        count: z.number(),
        name: z.string(),
        dataType: z.enum(['int16', 'uint16', 'int32', 'uint32', 'float32', 'float64']),
        scale: z.number().optional(),
        offset: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.connectModbus(input.deviceId, {
        ...input,
        protocol: input.protocol,
      });
    }),
  
  disconnectModbus: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return protocolService.disconnectModbus(input.deviceId);
    }),
  
  readModbusRegisters: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      registerType: z.enum(['coil', 'discrete', 'holding', 'input']),
      address: z.number(),
      count: z.number(),
    }))
    .mutation(async ({ input }) => {
      return protocolService.readModbusRegisters(
        input.deviceId,
        input.registerType,
        input.address,
        input.count
      );
    }),
  
  writeModbusRegister: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      registerType: z.enum(['coil', 'holding']),
      address: z.number(),
      value: z.union([z.number(), z.boolean()]),
    }))
    .mutation(async ({ input }) => {
      return protocolService.writeModbusRegister(
        input.deviceId,
        input.registerType,
        input.address,
        input.value
      );
    }),
  
  // ============ Connection Management ============
  
  getConnectionStatus: publicProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return protocolService.getConnectionStatus(input.deviceId);
    }),
  
  getAllConnectionStatuses: publicProcedure.query(async () => {
    return protocolService.getAllConnectionStatuses();
  }),
  
  getProtocolConfig: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return protocolService.getProtocolConfig(input.deviceId);
    }),
  
  reconnect: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return protocolService.reconnect(input.deviceId);
    }),
  
  disconnect: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return protocolService.disconnect(input.deviceId);
    }),
  
  // ============ Statistics ============
  
  getStats: publicProcedure.query(async () => {
    return protocolService.getProtocolStats();
  }),
  
  // ============ Auto-Reconnect ============
  
  startAutoReconnect: protectedProcedure
    .input(z.object({ intervalMs: z.number().default(30000) }))
    .mutation(async ({ input }) => {
      protocolService.startAutoReconnect(input.intervalMs);
      return { success: true, message: 'Auto-reconnect started' };
    }),
  
  stopAutoReconnect: protectedProcedure.mutation(async () => {
    protocolService.stopAutoReconnect();
    return { success: true, message: 'Auto-reconnect stopped' };
  }),
});

export default iotProtocolRouter;
