/**
 * Firmware OTA Router
 * API endpoints cho quản lý firmware và OTA deployments
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createFirmwarePackage,
  getFirmwarePackages,
  getFirmwarePackageById,
  updateFirmwarePackage,
  deleteFirmwarePackage,
  publishFirmwarePackage,
  createOtaDeployment,
  getOtaDeployments,
  getOtaDeploymentById,
  updateOtaDeployment,
  startOtaDeployment,
  pauseOtaDeployment,
  cancelOtaDeployment,
  getOtaDeviceStatuses,
  updateOtaDeviceStatus,
  simulateOtaUpdate,
  uploadFirmwareFile,
} from "../services/firmwareOtaService";

// Admin procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const firmwareOtaRouter = router({
  // ============================================
  // Firmware Package APIs
  // ============================================

  // List firmware packages
  listPackages: protectedProcedure
    .input(
      z.object({
        deviceType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getFirmwarePackages(input);
    }),

  // Get firmware package by ID
  getPackage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pkg = await getFirmwarePackageById(input.id);
      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Firmware package not found" });
      }
      return pkg;
    }),

  // Create firmware package
  createPackage: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        version: z.string().min(1),
        description: z.string().optional(),
        deviceType: z.enum(["plc", "sensor", "gateway", "hmi", "scada", "other"]),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        fileUrl: z.string().url(),
        fileSize: z.number().positive(),
        checksum: z.string().min(1),
        checksumType: z.enum(["md5", "sha1", "sha256"]).optional(),
        releaseNotes: z.string().optional(),
        minRequiredVersion: z.string().optional(),
        isStable: z.boolean().optional(),
        isBeta: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createFirmwarePackage({
        ...input,
        isStable: input.isStable ? 1 : 0,
        isBeta: input.isBeta ? 1 : 0,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  // Update firmware package
  updatePackage: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        version: z.string().optional(),
        description: z.string().optional(),
        releaseNotes: z.string().optional(),
        minRequiredVersion: z.string().optional(),
        isStable: z.boolean().optional(),
        isBeta: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isStable, isBeta, ...data } = input;
      await updateFirmwarePackage(id, {
        ...data,
        ...(isStable !== undefined && { isStable: isStable ? 1 : 0 }),
        ...(isBeta !== undefined && { isBeta: isBeta ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Delete firmware package
  deletePackage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFirmwarePackage(input.id);
      return { success: true };
    }),

  // Publish firmware package
  publishPackage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await publishFirmwarePackage(input.id, ctx.user.id);
      return { success: true };
    }),

  // Upload firmware file (returns URL and checksum)
  uploadFile: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default("application/octet-stream"),
      })
    )
    .mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      const result = await uploadFirmwareFile(
        fileBuffer,
        input.fileName,
        input.contentType
      );
      return result;
    }),

  // ============================================
  // OTA Deployment APIs
  // ============================================

  // List deployments
  listDeployments: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        firmwarePackageId: z.number().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getOtaDeployments(input);
    }),

  // Get deployment by ID
  getDeployment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const deployment = await getOtaDeploymentById(input.id);
      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
      }
      return deployment;
    }),

  // Create deployment
  createDeployment: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        firmwarePackageId: z.number(),
        deploymentType: z.enum(["immediate", "scheduled", "phased"]).optional(),
        targetDeviceIds: z.array(z.number()).min(1),
        targetGroupIds: z.array(z.number()).optional(),
        scheduledAt: z.string().optional(),
        phasedConfig: z.any().optional(),
        rollbackEnabled: z.boolean().optional(),
        rollbackOnFailurePercent: z.number().optional(),
        notifyOnComplete: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createOtaDeployment({
        ...input,
        targetDeviceIds: input.targetDeviceIds,
        targetGroupIds: input.targetGroupIds || null,
        phasedConfig: input.phasedConfig || null,
        rollbackEnabled: input.rollbackEnabled !== false ? 1 : 0,
        notifyOnComplete: input.notifyOnComplete !== false ? 1 : 0,
        notifyOnFailure: input.notifyOnFailure !== false ? 1 : 0,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  // Update deployment
  updateDeployment: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        scheduledAt: z.string().optional(),
        rollbackEnabled: z.boolean().optional(),
        rollbackOnFailurePercent: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, rollbackEnabled, ...data } = input;
      await updateOtaDeployment(id, {
        ...data,
        ...(rollbackEnabled !== undefined && { rollbackEnabled: rollbackEnabled ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Start deployment
  startDeployment: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await startOtaDeployment(input.id);
      return { success: true };
    }),

  // Pause deployment
  pauseDeployment: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await pauseOtaDeployment(input.id);
      return { success: true };
    }),

  // Cancel deployment
  cancelDeployment: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await cancelOtaDeployment(input.id);
      return { success: true };
    }),

  // ============================================
  // Device Status APIs
  // ============================================

  // Get device statuses for a deployment
  getDeviceStatuses: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .query(async ({ input }) => {
      return await getOtaDeviceStatuses(input.deploymentId);
    }),

  // Update device status (for device callbacks)
  updateDeviceStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "pending",
          "downloading",
          "downloaded",
          "installing",
          "verifying",
          "completed",
          "failed",
          "rollback",
        ]).optional(),
        progress: z.number().optional(),
        downloadProgress: z.number().optional(),
        installProgress: z.number().optional(),
        errorCode: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateOtaDeviceStatus(id, data);
      return { success: true };
    }),

  // Retry failed device update
  retryDevice: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateOtaDeviceStatus(input.id, {
        status: "pending",
        progress: 0,
        downloadProgress: 0,
        installProgress: 0,
        errorCode: null,
        errorMessage: null,
        retryCount: 0,
      });
      return { success: true };
    }),

  // Rollback device to previous version
  rollbackDevice: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateOtaDeviceStatus(input.id, {
        status: "rollback",
        rolledBackAt: new Date().toISOString(),
      });
      return { success: true };
    }),

  // Simulate OTA update (for demo/testing)
  simulateUpdate: adminProcedure
    .input(
      z.object({
        deploymentId: z.number(),
        deviceId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Run simulation in background
      simulateOtaUpdate(input.deploymentId, input.deviceId).catch(console.error);
      return { success: true, message: "Simulation started" };
    }),

  // Simulate all pending devices in a deployment
  simulateAllPending: adminProcedure
    .input(z.object({ deploymentId: z.number() }))
    .mutation(async ({ input }) => {
      const statuses = await getOtaDeviceStatuses(input.deploymentId);
      const pendingDevices = statuses.filter((s) => s.status === "pending");

      // Start simulation for all pending devices
      for (const device of pendingDevices) {
        simulateOtaUpdate(input.deploymentId, device.deviceId).catch(console.error);
      }

      return { success: true, count: pendingDevices.length };
    }),
});
