/**
 * Timeseries Router
 * API endpoints cho time-series data queries
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as timeseriesService from "../services/timeseriesService";

export const timeseriesRouter = router({
  // Query time-series data
  query: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      startTime: z.number(),
      endTime: z.number(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return timeseriesService.queryTimeseriesData(
        input.deviceId,
        input.startTime,
        input.endTime,
        input.limit
      );
    }),

  // Get hourly aggregates
  hourlyAggregates: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      startTime: z.number(),
      endTime: z.number(),
    }))
    .query(async ({ input }) => {
      return timeseriesService.getHourlyAggregates(
        input.deviceId,
        input.startTime,
        input.endTime
      );
    }),

  // Get daily aggregates
  dailyAggregates: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      startTime: z.number(),
      endTime: z.number(),
    }))
    .query(async ({ input }) => {
      return timeseriesService.getDailyAggregates(
        input.deviceId,
        input.startTime,
        input.endTime
      );
    }),

  // Get device statistics
  statistics: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      timeRange: z.enum(['1h', '24h', '7d', '30d']).optional(),
    }))
    .query(async ({ input }) => {
      return timeseriesService.getDeviceStatistics(
        input.deviceId,
        input.timeRange
      );
    }),

  // Get downsampled data for visualization
  downsampled: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      startTime: z.number(),
      endTime: z.number(),
      targetPoints: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return timeseriesService.getDownsampledData(
        input.deviceId,
        input.startTime,
        input.endTime,
        input.targetPoints
      );
    }),

  // Insert single data point
  insert: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      value: z.number(),
      timestamp: z.number().optional(),
      gatewayId: z.number().optional(),
      sensorType: z.string().optional(),
      unit: z.string().optional(),
      quality: z.enum(['good', 'uncertain', 'bad']).optional(),
      sourceType: z.enum(['edge', 'direct', 'import']).optional(),
      sourceId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { deviceId, value, timestamp, ...options } = input;
      return timeseriesService.insertTimeseriesData(deviceId, value, timestamp, options);
    }),

  // Insert batch data
  insertBatch: protectedProcedure
    .input(z.object({
      data: z.array(z.object({
        deviceId: z.number(),
        timestamp: z.number(),
        value: z.number(),
        gatewayId: z.number().optional(),
        quality: z.enum(['good', 'uncertain', 'bad']).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return timeseriesService.insertBatchTimeseriesData(input.data);
    }),

  // Compute hourly aggregates
  computeHourly: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      hourBucket: z.number(),
    }))
    .mutation(async ({ input }) => {
      return timeseriesService.computeHourlyAggregates(input.deviceId, input.hourBucket);
    }),

  // Compute daily aggregates
  computeDaily: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      dayBucket: z.number(),
    }))
    .mutation(async ({ input }) => {
      return timeseriesService.computeDailyAggregates(input.deviceId, input.dayBucket);
    }),
});
