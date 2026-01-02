/**
 * IoT Sensor Router - API endpoints cho IoT sensors
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import iotSensorService from '../services/iotSensorService';
import { notifyOwner } from '../_core/notification';
import { sendSseEvent } from '../sse';

export const iotSensorRouter = router({
  // Get all sensors with filters
  getSensors: publicProcedure
    .input(z.object({
      lineId: z.number().optional(),
      machineId: z.number().optional(),
      sensorType: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return iotSensorService.getAllSensors(input);
    }),

  // Get sensor readings history
  getReadings: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      timeRange: z.enum(['1h', '6h', '24h', '7d']).default('1h'),
    }))
    .query(async ({ input }) => {
      return iotSensorService.getSensorReadings(input.deviceId, input.timeRange);
    }),

  // Get active alerts
  getAlerts: publicProcedure
    .input(z.object({
      severity: z.enum(['warning', 'critical']).optional(),
      acknowledged: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return iotSensorService.getActiveAlerts(input);
    }),

  // Get sensor statistics
  getStatistics: publicProcedure
    .query(async () => {
      return iotSensorService.getSensorStatistics();
    }),

  // Record new sensor reading
  recordReading: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      sensorType: z.string(),
      value: z.number(),
      unit: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await iotSensorService.recordSensorReading(
        input.deviceId,
        input.sensorType,
        input.value,
        input.unit
      );

      // Send SSE event for new reading
      sendSseEvent('iot_sensor_reading', {
        deviceId: input.deviceId,
        reading: result.reading,
      });

      // If alert was created, send notification
      if (result.alert) {
        sendSseEvent('iot_sensor_alert', result.alert);
        
        // Send push notification for critical alerts
        if (result.alert.severity === 'critical') {
          await notifyOwner({
            title: `🚨 Cảnh báo Critical: ${result.alert.deviceName}`,
            content: result.alert.message,
          });
        }
      }

      return result;
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const success = await iotSensorService.acknowledgeAlert(input.alertId);
      
      if (success) {
        sendSseEvent('iot_alert_acknowledged', { alertId: input.alertId });
      }
      
      return { success };
    }),

  // Batch acknowledge alerts
  batchAcknowledgeAlerts: protectedProcedure
    .input(z.object({
      alertIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.all(
        input.alertIds.map(id => iotSensorService.acknowledgeAlert(id))
      );
      
      const successCount = results.filter(r => r).length;
      
      sendSseEvent('iot_alerts_batch_acknowledged', { 
        alertIds: input.alertIds,
        successCount,
      });
      
      return { 
        success: successCount === input.alertIds.length,
        successCount,
        totalCount: input.alertIds.length,
      };
    }),

  // Get realtime data for dashboard
  getRealtimeData: publicProcedure
    .input(z.object({
      sensorIds: z.array(z.number()).optional(),
      limit: z.number().default(10),
    }).optional())
    .query(async ({ input }) => {
      const sensors = await iotSensorService.getAllSensors();
      const alerts = await iotSensorService.getActiveAlerts({ acknowledged: false });
      const stats = await iotSensorService.getSensorStatistics();

      // Filter sensors if specific IDs provided
      let filteredSensors = sensors;
      if (input?.sensorIds && input.sensorIds.length > 0) {
        filteredSensors = sensors.filter(s => input.sensorIds!.includes(s.id));
      }

      // Limit results
      filteredSensors = filteredSensors.slice(0, input?.limit || 10);

      return {
        sensors: filteredSensors,
        alerts: alerts.slice(0, 10),
        statistics: stats,
        timestamp: new Date(),
      };
    }),

  // Subscribe to sensor updates (for SSE)
  subscribeToSensor: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // In a real implementation, this would register the user for SSE updates
      return { 
        success: true, 
        message: `Subscribed to sensor ${input.deviceId}`,
        deviceId: input.deviceId,
      };
    }),

  // Unsubscribe from sensor updates
  unsubscribeFromSensor: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return { 
        success: true, 
        message: `Unsubscribed from sensor ${input.deviceId}`,
        deviceId: input.deviceId,
      };
    }),
});

export default iotSensorRouter;
