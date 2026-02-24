/**
 * Floor Plan Integration Router
 * API endpoints cho quản lý sơ đồ mặt bằng và vị trí thiết bị
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createFloorPlan,
  getFloorPlans,
  getFloorPlanById,
  updateFloorPlan,
  deleteFloorPlan,
  createFloorPlanZone,
  getFloorPlanZones,
  getFloorPlanZoneById,
  updateFloorPlanZone,
  deleteFloorPlanZone,
  createDevicePosition,
  getDevicePositions,
  updateDevicePosition,
  deleteDevicePosition,
  removeDeviceFromFloorPlan,
  getFloorPlanWithData,
  getZoneAlertStats,
  uploadFloorPlanImage,
  getDevicesNotOnFloorPlan,
} from "../services/floorPlanService";

// Admin procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const floorPlanIntegrationRouter = router({
  // ============================================
  // Floor Plan APIs
  // ============================================

  // List floor plans
  list: protectedProcedure
    .input(
      z.object({
        buildingName: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getFloorPlans(input);
    }),

  // Get floor plan by ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const floorPlan = await getFloorPlanById(input.id);
      if (!floorPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Floor plan not found" });
      }
      return floorPlan;
    }),

  // Get floor plan with all data (zones, devices)
  getWithData: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const data = await getFloorPlanWithData(input.id);
      if (!data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Floor plan not found" });
      }
      return data;
    }),

  // Create floor plan
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        buildingName: z.string().optional(),
        floorNumber: z.number().optional(),
        imageUrl: z.string().url(),
        imageWidth: z.number().positive(),
        imageHeight: z.number().positive(),
        scaleMetersPerPixel: z.number().optional(),
        originX: z.number().optional(),
        originY: z.number().optional(),
        rotation: z.number().optional(),
        metadata: z.any().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createFloorPlan({
        ...input,
        scaleMetersPerPixel: input.scaleMetersPerPixel?.toString(),
        isActive: 1,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  // Update floor plan
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        buildingName: z.string().optional(),
        floorNumber: z.number().optional(),
        imageUrl: z.string().url().optional(),
        imageWidth: z.number().positive().optional(),
        imageHeight: z.number().positive().optional(),
        scaleMetersPerPixel: z.number().optional(),
        originX: z.number().optional(),
        originY: z.number().optional(),
        rotation: z.number().optional(),
        metadata: z.any().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isActive, scaleMetersPerPixel, ...data } = input;
      await updateFloorPlan(id, {
        ...data,
        ...(scaleMetersPerPixel !== undefined && {
          scaleMetersPerPixel: scaleMetersPerPixel.toString(),
        }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Delete floor plan
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFloorPlan(input.id);
      return { success: true };
    }),

  // Upload floor plan image
  uploadImage: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default("image/png"),
      })
    )
    .mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const result = await uploadFloorPlanImage(
        fileBuffer,
        input.fileName,
        input.contentType
      );
      return result;
    }),

  // ============================================
  // Zone APIs
  // ============================================

  // List zones for a floor plan
  listZones: protectedProcedure
    .input(z.object({ floorPlanId: z.number() }))
    .query(async ({ input }) => {
      return await getFloorPlanZones(input.floorPlanId);
    }),

  // Get zone by ID
  getZone: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const zone = await getFloorPlanZoneById(input.id);
      if (!zone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found" });
      }
      return zone;
    }),

  // Create zone
  createZone: adminProcedure
    .input(
      z.object({
        floorPlanId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        zoneType: z
          .enum(["production", "warehouse", "office", "maintenance", "restricted", "common"])
          .optional(),
        coordinates: z.array(z.object({ x: z.number(), y: z.number() })),
        color: z.string().optional(),
        opacity: z.number().optional(),
        borderColor: z.string().optional(),
        borderWidth: z.number().optional(),
        isClickable: z.boolean().optional(),
        alertThreshold: z.number().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { isClickable, opacity, ...data } = input;
      const id = await createFloorPlanZone({
        ...data,
        coordinates: input.coordinates,
        opacity: opacity?.toString(),
        isClickable: isClickable !== false ? 1 : 0,
        isActive: 1,
      });
      return { id };
    }),

  // Update zone
  updateZone: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        zoneType: z
          .enum(["production", "warehouse", "office", "maintenance", "restricted", "common"])
          .optional(),
        coordinates: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
        color: z.string().optional(),
        opacity: z.number().optional(),
        borderColor: z.string().optional(),
        borderWidth: z.number().optional(),
        isClickable: z.boolean().optional(),
        alertThreshold: z.number().optional(),
        metadata: z.any().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isClickable, isActive, opacity, ...data } = input;
      await updateFloorPlanZone(id, {
        ...data,
        ...(opacity !== undefined && { opacity: opacity.toString() }),
        ...(isClickable !== undefined && { isClickable: isClickable ? 1 : 0 }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Delete zone
  deleteZone: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFloorPlanZone(input.id);
      return { success: true };
    }),

  // Get zone alert statistics
  getZoneAlertStats: protectedProcedure
    .input(z.object({ floorPlanId: z.number() }))
    .query(async ({ input }) => {
      return await getZoneAlertStats(input.floorPlanId);
    }),

  // ============================================
  // Device Position APIs
  // ============================================

  // List device positions for a floor plan
  listDevicePositions: protectedProcedure
    .input(z.object({ floorPlanId: z.number() }))
    .query(async ({ input }) => {
      return await getDevicePositions(input.floorPlanId);
    }),

  // Place device on floor plan
  placeDevice: adminProcedure
    .input(
      z.object({
        deviceId: z.number(),
        floorPlanId: z.number(),
        zoneId: z.number().optional(),
        positionX: z.number(),
        positionY: z.number(),
        rotation: z.number().optional(),
        iconSize: z.number().optional(),
        iconType: z.string().optional(),
        labelPosition: z.enum(["top", "bottom", "left", "right", "none"]).optional(),
        showLabel: z.boolean().optional(),
        showStatus: z.boolean().optional(),
        customIcon: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { showLabel, showStatus, ...data } = input;
      const id = await createDevicePosition({
        ...data,
        showLabel: showLabel !== false ? 1 : 0,
        showStatus: showStatus !== false ? 1 : 0,
      });
      return { id };
    }),

  // Update device position
  updateDevicePosition: adminProcedure
    .input(
      z.object({
        id: z.number(),
        zoneId: z.number().optional().nullable(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        rotation: z.number().optional(),
        iconSize: z.number().optional(),
        iconType: z.string().optional(),
        labelPosition: z.enum(["top", "bottom", "left", "right", "none"]).optional(),
        showLabel: z.boolean().optional(),
        showStatus: z.boolean().optional(),
        customIcon: z.string().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, showLabel, showStatus, ...data } = input;
      await updateDevicePosition(id, {
        ...data,
        ...(showLabel !== undefined && { showLabel: showLabel ? 1 : 0 }),
        ...(showStatus !== undefined && { showStatus: showStatus ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Remove device from floor plan
  removeDevice: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDevicePosition(input.id);
      return { success: true };
    }),

  // Remove device by deviceId and floorPlanId
  removeDeviceByIds: adminProcedure
    .input(
      z.object({
        deviceId: z.number(),
        floorPlanId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await removeDeviceFromFloorPlan(input.deviceId, input.floorPlanId);
      return { success: true };
    }),

  // Get devices not on floor plan
  getAvailableDevices: protectedProcedure
    .input(z.object({ floorPlanId: z.number() }))
    .query(async ({ input }) => {
      return await getDevicesNotOnFloorPlan(input.floorPlanId);
    }),

  // Batch update device positions (for drag-drop multiple)
  batchUpdatePositions: adminProcedure
    .input(
      z.object({
        positions: z.array(
          z.object({
            id: z.number(),
            positionX: z.number(),
            positionY: z.number(),
            zoneId: z.number().optional().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      for (const pos of input.positions) {
        await updateDevicePosition(pos.id, {
          positionX: pos.positionX,
          positionY: pos.positionY,
          zoneId: pos.zoneId,
        });
      }
      return { success: true, count: input.positions.length };
    }),
});
