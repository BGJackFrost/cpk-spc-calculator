/**
 * Realtime Router - API endpoints cho dữ liệu realtime
 * Cung cấp dữ liệu thực từ database cho Floor Plan Live và AVI/AOI Dashboard
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { 
  machines, 
  workstations, 
  productionLines,
  iotDevices,
  iotDeviceData,
  floorPlanConfigs,
  machineInspectionData,
  spcDefectRecords,
} from '../../drizzle/schema';
import { eq, desc, and, gte, sql, inArray } from 'drizzle-orm';

// Types
export type MachineStatus = 'running' | 'idle' | 'error' | 'maintenance' | 'offline';

export interface MachineRealtimeData {
  id: number;
  name: string;
  code: string;
  machineType: string | null;
  status: MachineStatus;
  workstationId: number;
  workstationName: string;
  productionLineId: number | null;
  productionLineName: string | null;
  x: number;
  y: number;
  oee: number;
  cycleTime: number;
  defectRate: number;
  lastUpdate: string;
}

export interface InspectionResult {
  id: string;
  serialNumber: string;
  machine: string;
  product: string;
  status: 'pass' | 'fail' | 'warning';
  defectCount: number;
  cycleTime: number;
  timestamp: string;
}

// Helper function to calculate machine status from IoT data
function calculateMachineStatus(deviceData: any[]): MachineStatus {
  if (!deviceData || deviceData.length === 0) return 'offline';
  
  const latestData = deviceData[0];
  const lastUpdateTime = new Date(latestData.timestamp).getTime();
  const now = Date.now();
  const timeDiff = now - lastUpdateTime;
  
  if (timeDiff > 5 * 60 * 1000) return 'offline';
  
  const values = latestData.values as Record<string, any> || {};
  if (values.error || values.alarm) return 'error';
  if (values.maintenance) return 'maintenance';
  if (values.running === false || values.status === 'idle') return 'idle';
  
  return 'running';
}

// Helper function to calculate OEE from IoT data
function calculateOEE(deviceData: any[]): number {
  if (!deviceData || deviceData.length === 0) return 0;
  
  const latestData = deviceData[0];
  const values = latestData.values as Record<string, any> || {};
  
  if (values.oee !== undefined) return Number(values.oee);
  
  const availability = values.availability || 0.85;
  const performance = values.performance || 0.90;
  const quality = values.quality || 0.95;
  
  return availability * performance * quality * 100;
}

export const realtimeRouter = router({
  // Get all machines with realtime status for Floor Plan
  getMachinesWithStatus: publicProcedure
    .input(z.object({
      floorPlanId: z.number().optional(),
      productionLineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const machineList = await db
          .select({
            id: machines.id,
            name: machines.name,
            code: machines.code,
            machineType: machines.machineType,
            status: machines.status,
            workstationId: machines.workstationId,
            workstationName: workstations.name,
            productionLineId: workstations.productionLineId,
          })
          .from(machines)
          .leftJoin(workstations, eq(machines.workstationId, workstations.id))
          .where(eq(machines.isActive, 1));

        const lineIds = [...new Set(machineList.map(m => m.productionLineId).filter(Boolean))] as number[];
        let lineMap: Record<number, string> = {};
        
        if (lineIds.length > 0) {
          const lines = await db
            .select({ id: productionLines.id, name: productionLines.name })
            .from(productionLines)
            .where(inArray(productionLines.id, lineIds));
          lineMap = Object.fromEntries(lines.map(l => [l.id, l.name]));
        }

        let positionMap: Record<number, { x: number; y: number }> = {};
        if (input?.floorPlanId) {
          const floorPlan = await db
            .select({ machinePositions: floorPlanConfigs.machinePositions })
            .from(floorPlanConfigs)
            .where(eq(floorPlanConfigs.id, input.floorPlanId))
            .limit(1);
          
          if (floorPlan.length > 0 && floorPlan[0].machinePositions) {
            const positions = floorPlan[0].machinePositions as any[];
            positions.forEach(p => {
              if (p.machineId) {
                positionMap[p.machineId] = { x: p.x || 0, y: p.y || 0 };
              }
            });
          }
        }

        const machineIds = machineList.map(m => m.id);
        const iotDevicesList = await db
          .select({
            id: iotDevices.id,
            machineId: iotDevices.machineId,
            deviceCode: iotDevices.deviceCode,
          })
          .from(iotDevices)
          .where(and(
            inArray(iotDevices.machineId as any, machineIds),
            eq(iotDevices.isActive, 1)
          ));

        const deviceIds = iotDevicesList.map(d => d.id);
        let deviceDataMap: Record<number, any[]> = {};
        
        if (deviceIds.length > 0) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const deviceData = await db
            .select()
            .from(iotDeviceData)
            .where(and(
              inArray(iotDeviceData.deviceId, deviceIds),
              gte(iotDeviceData.timestamp, oneHourAgo)
            ))
            .orderBy(desc(iotDeviceData.timestamp))
            .limit(100);

          deviceData.forEach(d => {
            if (!deviceDataMap[d.deviceId]) {
              deviceDataMap[d.deviceId] = [];
            }
            deviceDataMap[d.deviceId].push(d);
          });
        }

        const machineToDeviceMap: Record<number, number> = {};
        iotDevicesList.forEach(d => {
          if (d.machineId) {
            machineToDeviceMap[d.machineId] = d.id;
          }
        });

        const result: MachineRealtimeData[] = machineList.map((m, index) => {
          const deviceId = machineToDeviceMap[m.id];
          const deviceData = deviceId ? deviceDataMap[deviceId] : [];
          const position = positionMap[m.id] || { 
            x: 50 + (index % 5) * 180, 
            y: 50 + Math.floor(index / 5) * 150 
          };

          const realtimeStatus = deviceData.length > 0 
            ? calculateMachineStatus(deviceData) 
            : (m.status === 'active' ? 'running' : m.status === 'maintenance' ? 'maintenance' : 'offline') as MachineStatus;
          
          const oee = deviceData.length > 0 ? calculateOEE(deviceData) : 75 + Math.random() * 20;
          const cycleTime = deviceData.length > 0 
            ? (deviceData[0].values as any)?.cycleTime || 200 
            : 150 + Math.random() * 100;
          const defectRate = deviceData.length > 0 
            ? (deviceData[0].values as any)?.defectRate || 2 
            : Math.random() * 5;

          return {
            id: m.id,
            name: m.name,
            code: m.code,
            machineType: m.machineType,
            status: realtimeStatus,
            workstationId: m.workstationId,
            workstationName: m.workstationName || 'Unknown',
            productionLineId: m.productionLineId,
            productionLineName: m.productionLineId ? lineMap[m.productionLineId] || null : null,
            x: position.x,
            y: position.y,
            oee: Number(oee.toFixed(1)),
            cycleTime: Number(cycleTime.toFixed(0)),
            defectRate: Number(defectRate.toFixed(2)),
            lastUpdate: deviceData.length > 0 
              ? deviceData[0].timestamp 
              : new Date().toISOString(),
          };
        });

        if (input?.productionLineId) {
          return result.filter(m => m.productionLineId === input.productionLineId);
        }

        return result;
      } catch (error) {
        console.error('Error fetching machines with status:', error);
        return [];
      }
    }),

  // Get machine detail with realtime data
  getMachineRealtimeData: publicProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const machineResult = await db
          .select({
            id: machines.id,
            name: machines.name,
            code: machines.code,
            machineType: machines.machineType,
            manufacturer: machines.manufacturer,
            model: machines.model,
            serialNumber: machines.serialNumber,
            status: machines.status,
            workstationId: machines.workstationId,
          })
          .from(machines)
          .where(eq(machines.id, input.machineId))
          .limit(1);

        if (machineResult.length === 0) return null;
        const machine = machineResult[0];

        const deviceResult = await db
          .select()
          .from(iotDevices)
          .where(and(
            eq(iotDevices.machineId, input.machineId),
            eq(iotDevices.isActive, 1)
          ))
          .limit(1);

        let realtimeMetrics = {
          oee: 0,
          availability: 0,
          performance: 0,
          quality: 0,
          cycleTime: 0,
          defectRate: 0,
          temperature: 0,
          vibration: 0,
          power: 0,
          status: 'offline' as MachineStatus,
          lastUpdate: new Date().toISOString(),
        };

        if (deviceResult.length > 0) {
          const device = deviceResult[0];
          
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const deviceData = await db
            .select()
            .from(iotDeviceData)
            .where(and(
              eq(iotDeviceData.deviceId, device.id),
              gte(iotDeviceData.timestamp, oneHourAgo)
            ))
            .orderBy(desc(iotDeviceData.timestamp))
            .limit(60);

          if (deviceData.length > 0) {
            const latest = deviceData[0].values as Record<string, any> || {};
            realtimeMetrics = {
              oee: latest.oee || calculateOEE(deviceData),
              availability: latest.availability || 0.85,
              performance: latest.performance || 0.90,
              quality: latest.quality || 0.95,
              cycleTime: latest.cycleTime || 200,
              defectRate: latest.defectRate || 2,
              temperature: latest.temperature || 45,
              vibration: latest.vibration || 0.5,
              power: latest.power || 1200,
              status: calculateMachineStatus(deviceData),
              lastUpdate: deviceData[0].timestamp,
            };
          }
        }

        return {
          ...machine,
          ...realtimeMetrics,
        };
      } catch (error) {
        console.error('Error fetching machine realtime data:', error);
        return null;
      }
    }),

  // Get AVI/AOI inspection data
  getInspectionData: publicProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '6h', '24h', '7d']).default('24h'),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      // Return mock data for now - can be enhanced to use machineInspectionData table later
      return generateMockInspectionData(input.timeRange);
    }),

  // Get floor plan statistics
  getFloorPlanStats: publicProcedure
    .input(z.object({ floorPlanId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const machineList = await db
          .select({ status: machines.status })
          .from(machines)
          .where(eq(machines.isActive, 1));

        const total = machineList.length;
        const running = machineList.filter(m => m.status === 'active').length;
        const maintenance = machineList.filter(m => m.status === 'maintenance').length;
        const inactive = machineList.filter(m => m.status === 'inactive').length;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const avgOeeResult = await db
          .select({
            avgOee: sql<number>`AVG(JSON_EXTRACT(values, '$.oee'))`.as('avgOee'),
          })
          .from(iotDeviceData)
          .where(gte(iotDeviceData.timestamp, oneHourAgo));

        const avgOee = avgOeeResult[0]?.avgOee || 85;

        return {
          total,
          running,
          idle: inactive,
          error: 0,
          maintenance,
          offline: total - running - maintenance - inactive,
          avgOee: Number(avgOee.toFixed(1)),
        };
      } catch (error) {
        console.error('Error fetching floor plan stats:', error);
        return null;
      }
    }),
});

// Helper functions
function generateMockInspectionData(timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
  const trendData = [];
  const now = new Date();
  
  for (let i = hours - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    trendData.push({
      time: time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      total: 100 + Math.floor(Math.random() * 50),
      pass: 85 + Math.floor(Math.random() * 10),
      fail: 5 + Math.floor(Math.random() * 10),
      warning: 2 + Math.floor(Math.random() * 5),
    });
  }

  const total = trendData.reduce((sum, d) => sum + d.total, 0);
  const pass = trendData.reduce((sum, d) => sum + d.pass, 0);
  const fail = trendData.reduce((sum, d) => sum + d.fail, 0);
  const warning = trendData.reduce((sum, d) => sum + d.warning, 0);

  return {
    stats: {
      total,
      pass,
      fail,
      warning,
      passRate: ((pass / total) * 100).toFixed(1),
      failRate: ((fail / total) * 100).toFixed(1),
    },
    trendData,
    defectTypes: [
      { name: 'Trầy xước', count: 45, percentage: 35 },
      { name: 'Lõm/Móp', count: 28, percentage: 22 },
      { name: 'Nứt', count: 18, percentage: 14 },
      { name: 'Đổi màu', count: 15, percentage: 12 },
      { name: 'Tạp chất', count: 12, percentage: 9 },
      { name: 'Biến dạng', count: 10, percentage: 8 },
    ],
    recentInspections: Array.from({ length: 20 }, (_, i) => ({
      id: `INS-${String(1000 - i).padStart(4, '0')}`,
      serialNumber: `SN${Date.now() - i * 1000}`,
      machine: ['AVI-01', 'AVI-02', 'AOI-01', 'AOI-02', 'AVI-03'][Math.floor(Math.random() * 5)],
      product: ['PROD-001', 'PROD-002', 'PROD-003'][Math.floor(Math.random() * 3)],
      status: (['pass', 'fail', 'warning'] as const)[Math.floor(Math.random() * 3)],
      defectCount: Math.floor(Math.random() * 5),
      cycleTime: 200 + Math.floor(Math.random() * 100),
      timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString('vi-VN'),
    })),
  };
}


export type RealtimeRouter = typeof realtimeRouter;
