/**
 * OPC-UA Router - API endpoints cho OPC-UA service
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getOpcuaManager, OpcuaService } from './opcuaService';
import { getDb } from '../db';
import { opcuaConnections, opcuaNodes } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const opcuaRouter = router({
  // === Connection Management ===

  // Lấy danh sách connections từ database
  getConnections: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(opcuaConnections);
    }),

  // Lấy connection theo ID
  getConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [conn] = await db
        .select()
        .from(opcuaConnections)
        .where(eq(opcuaConnections.id, input.id))
        .limit(1);

      return conn || null;
    }),

  // Tạo connection mới
  createConnection: protectedProcedure
    .input(z.object({
      name: z.string(),
      endpointUrl: z.string(),
      securityMode: z.enum(['None', 'Sign', 'SignAndEncrypt']).default('None'),
      securityPolicy: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      applicationName: z.string().optional(),
      sessionTimeout: z.number().default(60000),
      keepAliveInterval: z.number().default(10000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [result] = await db.insert(opcuaConnections).values({
        name: input.name,
        endpointUrl: input.endpointUrl,
        securityMode: input.securityMode,
        securityPolicy: input.securityPolicy,
        username: input.username,
        password: input.password, // TODO: Encrypt
        applicationName: input.applicationName || 'SPC Calculator',
        sessionTimeout: input.sessionTimeout,
        keepAliveInterval: input.keepAliveInterval,
        isActive: 1,
      });

      return { success: true, id: result.insertId };
    }),

  // Cập nhật connection
  updateConnection: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      endpointUrl: z.string().optional(),
      securityMode: z.enum(['None', 'Sign', 'SignAndEncrypt']).optional(),
      securityPolicy: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      sessionTimeout: z.number().optional(),
      keepAliveInterval: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { id, ...updateData } = input;
      const cleanData: Record<string, any> = {};
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'isActive') {
            cleanData[key] = value ? 1 : 0;
          } else {
            cleanData[key] = value;
          }
        }
      });

      await db
        .update(opcuaConnections)
        .set(cleanData)
        .where(eq(opcuaConnections.id, id));

      return { success: true };
    }),

  // Xóa connection
  deleteConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Disconnect if active
      const manager = getOpcuaManager();
      await manager.removeConnection(`conn-${input.id}`);

      // Delete nodes first
      await db.delete(opcuaNodes).where(eq(opcuaNodes.connectionId, input.id));
      
      // Delete connection
      await db.delete(opcuaConnections).where(eq(opcuaConnections.id, input.id));

      return { success: true };
    }),

  // === Runtime Connection ===

  // Kết nối đến OPC-UA server
  connect: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get connection config
      const [conn] = await db
        .select()
        .from(opcuaConnections)
        .where(eq(opcuaConnections.id, input.connectionId))
        .limit(1);

      if (!conn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      // Create/get service
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`, {
        endpointUrl: conn.endpointUrl,
        securityMode: conn.securityMode as any,
        securityPolicy: conn.securityPolicy || undefined,
        username: conn.username || undefined,
        password: conn.password || undefined,
        applicationName: conn.applicationName || undefined,
        sessionTimeout: conn.sessionTimeout,
        keepAliveInterval: conn.keepAliveInterval,
      });

      if (!service) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create service' });
      }

      // Connect
      const success = await service.connect();

      if (success) {
        // Update last connected
        await db
          .update(opcuaConnections)
          .set({ lastConnectedAt: new Date(), lastError: null })
          .where(eq(opcuaConnections.id, input.connectionId));
      }

      return { success, status: service.getStatus() };
    }),

  // Ngắt kết nối
  disconnect: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ input }) => {
      const manager = getOpcuaManager();
      await manager.removeConnection(`conn-${input.connectionId}`);
      return { success: true };
    }),

  // Lấy trạng thái kết nối
  getConnectionStatus: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .query(({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);
      
      if (!service) {
        return { connected: false, endpointUrl: '', subscribedNodes: [] };
      }

      return service.getStatus();
    }),

  // === Node Management ===

  // Lấy danh sách nodes
  getNodes: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(opcuaNodes)
        .where(eq(opcuaNodes.connectionId, input.connectionId));
    }),

  // Tạo node mới
  createNode: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
      displayName: z.string(),
      browseName: z.string().optional(),
      dataType: z.string().optional(),
      unit: z.string().optional(),
      samplingInterval: z.number().default(1000),
      queueSize: z.number().default(10),
      mappedDeviceId: z.number().optional(),
      mappedMetric: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [result] = await db.insert(opcuaNodes).values({
        connectionId: input.connectionId,
        nodeId: input.nodeId,
        displayName: input.displayName,
        browseName: input.browseName,
        dataType: input.dataType,
        unit: input.unit,
        samplingInterval: input.samplingInterval,
        queueSize: input.queueSize,
        discardOldest: 1,
        mappedDeviceId: input.mappedDeviceId,
        mappedMetric: input.mappedMetric,
        isActive: 1,
      });

      return { success: true, id: result.insertId };
    }),

  // Xóa node
  deleteNode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db.delete(opcuaNodes).where(eq(opcuaNodes.id, input.id));
      return { success: true };
    }),

  // === Data Operations ===

  // Browse nodes từ server
  browseNodes: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string().default('RootFolder'),
    }))
    .query(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      return await service.browseNodes(input.nodeId);
    }),

  // Đọc giá trị từ node
  readNode: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
    }))
    .query(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      return await service.readNode(input.nodeId);
    }),

  // Đọc nhiều nodes
  readNodes: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeIds: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      return await service.readNodes(input.nodeIds);
    }),

  // Ghi giá trị vào node
  writeNode: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
      value: z.any(),
    }))
    .mutation(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      const success = await service.writeNode(input.nodeId, input.value);
      return { success };
    }),

  // Subscribe node
  subscribeNode: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
      displayName: z.string(),
      samplingInterval: z.number().default(1000),
    }))
    .mutation(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      const success = await service.subscribeNode({
        nodeId: input.nodeId,
        displayName: input.displayName,
        samplingInterval: input.samplingInterval,
      });

      return { success };
    }),

  // Unsubscribe node
  unsubscribeNode: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected' });
      }

      await service.unsubscribeNode(input.nodeId);
      return { success: true };
    }),

  // Lấy history
  getHistory: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      nodeId: z.string(),
      limit: z.number().default(100),
    }))
    .query(({ input }) => {
      const manager = getOpcuaManager();
      const service = manager.getConnection(`conn-${input.connectionId}`);

      if (!service) {
        return [];
      }

      return service.getHistory(input.nodeId, input.limit);
    }),

  // === Demo/Test ===

  // Test connection
  testConnection: protectedProcedure
    .input(z.object({
      endpointUrl: z.string(),
      securityMode: z.enum(['None', 'Sign', 'SignAndEncrypt']).default('None'),
      username: z.string().optional(),
      password: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const testService = new (await import('./opcuaService')).OpcuaService({
        endpointUrl: input.endpointUrl,
        securityMode: input.securityMode,
        username: input.username,
        password: input.password,
      });

      try {
        const success = await testService.connect();
        if (success) {
          await testService.disconnect();
        }
        return { success, message: success ? 'Connection successful' : 'Connection failed' };
      } catch (error) {
        return { 
          success: false, 
          message: error instanceof Error ? error.message : 'Connection failed' 
        };
      }
    }),
});

export type OpcuaRouter = typeof opcuaRouter;
