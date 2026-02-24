/**
 * Webhook History Router - API endpoints for managing webhook delivery history
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getDeliveryHistory,
  getWebhookStatistics,
  getRetryStatistics,
  retryDelivery,
  processRetries,
  clearDeliveryHistory,
  getDeliveryById,
  exportDeliveryHistory,
} from "../services/webhookHistoryService";

export const webhookHistoryRouter = router({
  // List webhook delivery history
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(100),
      webhookId: z.number().optional(),
      status: z.enum(["pending", "success", "failed", "retrying"]).optional(),
      alertId: z.number().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
      }

      const history = getDeliveryHistory({
        limit: input?.limit || 100,
        webhookId: input?.webhookId,
        status: input?.status,
        alertId: input?.alertId,
      });

      // Apply search filter if provided
      let filteredHistory = history;
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        filteredHistory = history.filter(item =>
          item.webhookName?.toLowerCase().includes(searchLower) ||
          item.url?.toLowerCase().includes(searchLower) ||
          item.alertType?.toLowerCase().includes(searchLower) ||
          item.error?.toLowerCase().includes(searchLower)
        );
      }

      return {
        logs: filteredHistory.map(item => ({
          id: item.id,
          webhookId: item.webhookId,
          webhookName: item.webhookName,
          destination: item.url,
          payload: JSON.stringify(item.payload),
          status: item.status,
          statusCode: item.statusCode,
          responseBody: item.response,
          errorMessage: item.error,
          retryCount: item.retryCount,
          maxRetries: item.maxRetries,
          nextRetryAt: item.nextRetryAt,
          lastRetryAt: item.nextRetryAt,
          createdAt: item.createdAt,
          updatedAt: item.completedAt || item.createdAt,
        })),
        total: filteredHistory.length,
      };
    }),

  // Get webhook statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
    }
    return getWebhookStatistics();
  }),

  // Get retry statistics
  retryStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
    }
    return getRetryStatistics();
  }),

  // Retry a single webhook delivery
  retryOne: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
      }

      const deliveryId = String(input.id);
      const result = await retryDelivery(deliveryId);
      
      if (!result.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Failed to retry" });
      }

      return { success: true };
    }),

  // Retry all failed webhooks
  retryAllFailed: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const result = await processRetries();
    return {
      retried: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    };
  }),

  // Process pending retries
  processRetries: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return await processRetries();
  }),

  // Get delivery by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
      }

      const delivery = getDeliveryById(input.id);
      if (!delivery) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Delivery not found" });
      }

      return delivery;
    }),

  // Delete a webhook log
  delete: protectedProcedure
    .input(z.object({ id: z.union([z.string(), z.number()]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return { success: true };
    }),

  // Clear old webhook history
  clearOld: protectedProcedure
    .input(z.object({ daysOld: z.number().min(1).default(30) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const deleted = clearDeliveryHistory(input.daysOld);
      return { deleted };
    }),

  // Clear all history
  clear: protectedProcedure
    .input(z.object({ olderThanDays: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const cleared = clearDeliveryHistory(input?.olderThanDays);
      return { cleared };
    }),

  // Export webhook history to JSON
  export: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const data = exportDeliveryHistory();
    return { data };
  }),
});
