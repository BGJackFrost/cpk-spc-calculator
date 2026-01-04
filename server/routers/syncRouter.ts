/**
 * Sync Router - Offline Sync Service với IndexedDB
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';

// Types
interface SyncConflict {
  id: string;
  changeId: string;
  entityType: string;
  entityId: string;
  clientData: any;
  serverData: any;
  clientTimestamp: number;
  serverTimestamp: number;
  status: 'pending' | 'resolved';
  resolution?: 'client_wins' | 'server_wins' | 'merge';
  resolvedData?: any;
  createdAt: number;
}

interface SyncHistoryRecord {
  id: number;
  userId: string;
  clientId: string;
  action: 'push' | 'pull' | 'resolve';
  changesCount: number;
  conflictsCount: number;
  status: 'success' | 'partial' | 'failed';
  duration: number;
  timestamp: number;
}

// In-Memory Storage
const syncVersions = new Map<string, { entityType: string; entityId: string; version: number; updatedAt: number }>();
const pendingConflicts = new Map<string, SyncConflict>();
const syncHistory: SyncHistoryRecord[] = [];
let historyIdCounter = 1;

function generateConflictId(): string {
  return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getEntityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export const syncRouter = router({
  // Get sync status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const userConflicts = Array.from(pendingConflicts.values()).filter(c => c.status === 'pending');
    const userHistory = syncHistory.filter(h => h.userId === userId).slice(-10);

    return {
      pendingConflicts: userConflicts.length,
      lastSync: userHistory.length > 0 ? userHistory[userHistory.length - 1].timestamp : null,
      syncHistory: userHistory,
      serverTime: Date.now(),
    };
  }),

  // Get server time
  getServerTime: publicProcedure.query(async () => {
    return { serverTime: Date.now(), timezone: 'UTC' };
  }),

  // Push changes from client
  pushChanges: protectedProcedure
    .input(z.object({
      clientId: z.string().min(1),
      changes: z.array(z.object({
        id: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        action: z.enum(['create', 'update', 'delete']),
        data: z.any(),
        clientTimestamp: z.number(),
        version: z.number(),
      })),
      lastSyncTimestamp: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      const userId = ctx.user.id;
      const results: Array<{ changeId: string; status: 'applied' | 'conflict' | 'error'; conflictId?: string; error?: string }> = [];
      const conflicts: SyncConflict[] = [];

      for (const change of input.changes) {
        const key = getEntityKey(change.entityType, change.entityId);
        const serverVersion = syncVersions.get(key);

        if (serverVersion && serverVersion.updatedAt > change.clientTimestamp) {
          const conflict: SyncConflict = {
            id: generateConflictId(),
            changeId: change.id,
            entityType: change.entityType,
            entityId: change.entityId,
            clientData: change.data,
            serverData: null,
            clientTimestamp: change.clientTimestamp,
            serverTimestamp: serverVersion.updatedAt,
            status: 'pending',
            createdAt: Date.now(),
          };
          pendingConflicts.set(conflict.id, conflict);
          conflicts.push(conflict);
          results.push({ changeId: change.id, status: 'conflict', conflictId: conflict.id });
        } else {
          syncVersions.set(key, {
            entityType: change.entityType,
            entityId: change.entityId,
            version: change.version + 1,
            updatedAt: Date.now(),
          });
          results.push({ changeId: change.id, status: 'applied' });
        }
      }

      syncHistory.push({
        id: historyIdCounter++,
        userId,
        clientId: input.clientId,
        action: 'push',
        changesCount: input.changes.length,
        conflictsCount: conflicts.length,
        status: conflicts.length === 0 ? 'success' : 'partial',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

      return {
        success: true,
        results,
        conflicts: conflicts.map(c => ({ id: c.id, entityType: c.entityType, entityId: c.entityId, serverTimestamp: c.serverTimestamp })),
        serverTime: Date.now(),
      };
    }),

  // Pull changes from server
  pullChanges: protectedProcedure
    .input(z.object({
      clientId: z.string().min(1),
      lastSyncTimestamp: z.number(),
      entityTypes: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      const userId = ctx.user.id;
      const changes: Array<{ entityType: string; entityId: string; version: number; updatedAt: number; data: any }> = [];

      for (const [key, value] of syncVersions.entries()) {
        if (value.updatedAt > input.lastSyncTimestamp) {
          if (!input.entityTypes || input.entityTypes.includes(value.entityType)) {
            changes.push({ entityType: value.entityType, entityId: value.entityId, version: value.version, updatedAt: value.updatedAt, data: null });
          }
        }
      }

      syncHistory.push({
        id: historyIdCounter++,
        userId,
        clientId: input.clientId,
        action: 'pull',
        changesCount: changes.length,
        conflictsCount: 0,
        status: 'success',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

      return { success: true, changes, serverTime: Date.now(), hasMore: false };
    }),

  // Get pending conflicts
  getConflicts: protectedProcedure.query(async () => {
    const conflicts = Array.from(pendingConflicts.values())
      .filter(c => c.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt);
    return { conflicts, total: conflicts.length };
  }),

  // Get conflict details
  getConflictDetails: protectedProcedure
    .input(z.object({ conflictId: z.string() }))
    .query(async ({ input }) => {
      const conflict = pendingConflicts.get(input.conflictId);
      if (!conflict) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conflict not found' });
      return conflict;
    }),

  // Resolve conflict
  resolveConflict: protectedProcedure
    .input(z.object({
      conflictId: z.string(),
      resolution: z.enum(['client_wins', 'server_wins', 'merge']),
      mergedData: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conflict = pendingConflicts.get(input.conflictId);
      if (!conflict) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conflict not found' });
      if (conflict.status === 'resolved') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conflict already resolved' });

      let resolvedData: any;
      switch (input.resolution) {
        case 'client_wins': resolvedData = conflict.clientData; break;
        case 'server_wins': resolvedData = conflict.serverData; break;
        case 'merge':
          if (!input.mergedData) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Merged data required' });
          resolvedData = input.mergedData;
          break;
      }

      conflict.status = 'resolved';
      conflict.resolution = input.resolution;
      conflict.resolvedData = resolvedData;

      const key = getEntityKey(conflict.entityType, conflict.entityId);
      const currentVersion = syncVersions.get(key);
      syncVersions.set(key, {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        version: (currentVersion?.version || 0) + 1,
        updatedAt: Date.now(),
      });

      syncHistory.push({
        id: historyIdCounter++,
        userId: ctx.user.id,
        clientId: 'web',
        action: 'resolve',
        changesCount: 1,
        conflictsCount: 1,
        status: 'success',
        duration: 0,
        timestamp: Date.now(),
      });

      return { success: true, conflict: { id: conflict.id, status: conflict.status, resolution: conflict.resolution } };
    }),

  // Get sync history
  getHistory: protectedProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page || 1;
      const pageSize = input?.pageSize || 20;
      const userId = ctx.user.id;
      const filtered = syncHistory.filter(h => h.userId === userId);
      const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
      const start = (page - 1) * pageSize;
      const items = sorted.slice(start, start + pageSize);

      return { items, total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) };
    }),

  // Get statistics
  getStatistics: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days || 7;
      const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
      const userId = ctx.user.id;
      const filtered = syncHistory.filter(h => h.userId === userId && h.timestamp >= startTime);

      return {
        totalOperations: filtered.length,
        pushOperations: filtered.filter(h => h.action === 'push').length,
        pullOperations: filtered.filter(h => h.action === 'pull').length,
        resolveOperations: filtered.filter(h => h.action === 'resolve').length,
        totalChanges: filtered.reduce((sum, h) => sum + h.changesCount, 0),
        totalConflicts: filtered.reduce((sum, h) => sum + h.conflictsCount, 0),
        successRate: filtered.length > 0
          ? Math.round((filtered.filter(h => h.status === 'success').length / filtered.length) * 100)
          : 100,
      };
    }),

  // Create test conflict
  createTestConflict: protectedProcedure
    .input(z.object({ entityType: z.string().default('spc_analysis'), entityId: z.string().default('test-123') }))
    .mutation(async ({ input }) => {
      const conflict: SyncConflict = {
        id: generateConflictId(),
        changeId: `change-${Date.now()}`,
        entityType: input.entityType,
        entityId: input.entityId,
        clientData: { name: 'Client Version', value: 100, updatedAt: Date.now() - 1000 },
        serverData: { name: 'Server Version', value: 200, updatedAt: Date.now() },
        clientTimestamp: Date.now() - 1000,
        serverTimestamp: Date.now(),
        status: 'pending',
        createdAt: Date.now(),
      };

      pendingConflicts.set(conflict.id, conflict);
      return { success: true, conflict: { id: conflict.id, entityType: conflict.entityType, entityId: conflict.entityId } };
    }),
});

export default syncRouter;
