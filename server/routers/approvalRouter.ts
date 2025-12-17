import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { approvalWorkflows, approvalSteps } from "../../drizzle/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";

export const approvalRouter = router({
  // ===== WORKFLOWS =====
  listWorkflows: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(approvalWorkflows).orderBy(approvalWorkflows.name);
  }),

  getWorkflow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, input.id));
      return workflow || null;
    }),

  getWorkflowByEntityType: protectedProcedure
    .input(z.object({ entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [workflow] = await db.select().from(approvalWorkflows)
        .where(and(
          eq(approvalWorkflows.entityType, input.entityType),
          eq(approvalWorkflows.isActive, 1)
        ));
      return workflow || null;
    }),

  createWorkflow: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(approvalWorkflows).values({
        code: input.code,
        name: input.name,
        description: input.description || null,
        entityType: input.entityType,
        isActive: input.isActive !== false ? 1 : 0,
      });
      return { id: result.insertId };
    }),

  updateWorkflow: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(approvalWorkflows)
        .set({
          code: input.code,
          name: input.name,
          description: input.description || null,
          entityType: input.entityType,
          isActive: input.isActive !== false ? 1 : 0,
        })
        .where(eq(approvalWorkflows.id, input.id));
      return { success: true };
    }),

  deleteWorkflow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Delete all steps first
      await db.delete(approvalSteps).where(eq(approvalSteps.workflowId, input.id));
      // Then delete workflow
      await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, input.id));
      return { success: true };
    }),

  // ===== STEPS =====
  listSteps: protectedProcedure
    .input(z.object({ workflowId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(approvalSteps)
        .where(eq(approvalSteps.workflowId, input.workflowId))
        .orderBy(approvalSteps.stepOrder);
    }),

  createStep: protectedProcedure
    .input(z.object({
      workflowId: z.number(),
      stepOrder: z.number(),
      name: z.string().min(1),
      approverType: z.enum(["position", "user", "manager", "department_head"]),
      approverId: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(approvalSteps).values({
        workflowId: input.workflowId,
        stepOrder: input.stepOrder,
        name: input.name,
        approverType: input.approverType,
        approverId: input.approverId || null,
        minAmount: input.minAmount ? String(input.minAmount) : null,
        maxAmount: input.maxAmount ? String(input.maxAmount) : null,
        isRequired: input.isRequired !== false ? 1 : 0,
      });
      return { id: result.insertId };
    }),

  updateStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      workflowId: z.number(),
      stepOrder: z.number(),
      name: z.string().min(1),
      approverType: z.enum(["position", "user", "manager", "department_head"]),
      approverId: z.number().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(approvalSteps)
        .set({
          stepOrder: input.stepOrder,
          name: input.name,
          approverType: input.approverType,
          approverId: input.approverId || null,
          minAmount: input.minAmount ? String(input.minAmount) : null,
          maxAmount: input.maxAmount ? String(input.maxAmount) : null,
          isRequired: input.isRequired !== false ? 1 : 0,
        })
        .where(eq(approvalSteps.id, input.id));
      return { success: true };
    }),

  deleteStep: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(approvalSteps).where(eq(approvalSteps.id, input.id));
      return { success: true };
    }),

  reorderStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      direction: z.enum(["up", "down"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get current step
      const [currentStep] = await db.select().from(approvalSteps).where(eq(approvalSteps.id, input.id));
      if (!currentStep) throw new Error("Step not found");
      
      const currentOrder = currentStep.stepOrder;
      const newOrder = input.direction === "up" ? currentOrder - 1 : currentOrder + 1;
      
      // Find the step to swap with
      const [swapStep] = await db.select().from(approvalSteps)
        .where(and(
          eq(approvalSteps.workflowId, currentStep.workflowId),
          eq(approvalSteps.stepOrder, newOrder)
        ));
      
      if (swapStep) {
        // Swap orders
        await db.update(approvalSteps).set({ stepOrder: currentOrder }).where(eq(approvalSteps.id, swapStep.id));
        await db.update(approvalSteps).set({ stepOrder: newOrder }).where(eq(approvalSteps.id, input.id));
      }
      
      return { success: true };
    }),

  // ===== APPROVAL EXECUTION =====
  getApprovalStepsForEntity: protectedProcedure
    .input(z.object({
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      amount: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      // Get active workflow for entity type
      const [workflow] = await db.select().from(approvalWorkflows)
        .where(and(
          eq(approvalWorkflows.entityType, input.entityType),
          eq(approvalWorkflows.isActive, 1)
        ));
      
      if (!workflow) return [];
      
      // Get all steps for this workflow
      const steps = await db.select().from(approvalSteps)
        .where(eq(approvalSteps.workflowId, workflow.id))
        .orderBy(approvalSteps.stepOrder);
      
      // Filter by amount if provided
      if (input.amount !== undefined) {
        return steps.filter(step => {
          const minOk = !step.minAmount || Number(step.minAmount) <= input.amount!;
          const maxOk = !step.maxAmount || Number(step.maxAmount) >= input.amount!;
          return minOk && maxOk;
        });
      }
      
      return steps;
    }),
});
