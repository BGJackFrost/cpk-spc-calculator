import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { notifyApprovalRequest, notifyApprovalResult } from "../emailService";
import { approvalWorkflows, approvalSteps, approvalRequests, approvalHistories, employeeProfiles, positions, users } from "../../drizzle/schema";
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

  // ===== APPROVAL REQUESTS =====
  createApprovalRequest: protectedProcedure
    .input(z.object({
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      entityId: z.number(),
      totalAmount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get workflow for entity type
      const [workflow] = await db.select().from(approvalWorkflows)
        .where(and(
          eq(approvalWorkflows.entityType, input.entityType),
          eq(approvalWorkflows.isActive, 1)
        ));
      
      if (!workflow) throw new Error("No active workflow found for this entity type");
      
      // Get first step
      const steps = await db.select().from(approvalSteps)
        .where(eq(approvalSteps.workflowId, workflow.id))
        .orderBy(approvalSteps.stepOrder);
      
      // Filter steps by amount
      const applicableSteps = input.totalAmount !== undefined
        ? steps.filter(step => {
            const minOk = !step.minAmount || Number(step.minAmount) <= input.totalAmount!;
            const maxOk = !step.maxAmount || Number(step.maxAmount) >= input.totalAmount!;
            return minOk && maxOk;
          })
        : steps;
      
      const firstStep = applicableSteps[0];
      
      const [result] = await db.insert(approvalRequests).values({
        workflowId: workflow.id,
        entityType: input.entityType,
        entityId: input.entityId,
        requesterId: ctx.user.id,
        currentStepId: firstStep?.id || null,
        status: "pending",
        totalAmount: input.totalAmount ? String(input.totalAmount) : null,
        notes: input.notes || null,
      });
      
      // Send email notification to approvers
      try {
        const entityTypeLabels: Record<string, string> = {
          purchase_order: "Đơn đặt hàng",
          stock_export: "Xuất kho",
          maintenance_request: "Yêu cầu bảo trì",
          leave_request: "Đơn nghỉ phép",
        };
        const entityLabel = entityTypeLabels[input.entityType] || input.entityType;
        
        // Get approver info based on first step
        let approverEmail = "";
        let approverName = "";
        
        if (firstStep) {
          if (firstStep.approverType === "user" && firstStep.approverId) {
            const [approverUser] = await db.select().from(users).where(eq(users.id, firstStep.approverId));
            if (approverUser) {
              approverEmail = approverUser.email || "";
              approverName = approverUser.name || approverUser.openId;
            }
          } else if (firstStep.approverType === "position" && firstStep.approverId) {
            // Get users with this position
            const profiles = await db.select({
              userId: employeeProfiles.userId,
              userName: users.name,
              userEmail: users.email,
            }).from(employeeProfiles)
              .innerJoin(users, eq(users.id, employeeProfiles.userId))
              .where(eq(employeeProfiles.positionId, firstStep.approverId));
            
            if (profiles.length > 0) {
              approverEmail = profiles.map(p => p.userEmail).filter(Boolean).join(",");
              approverName = profiles.map(p => p.userName).filter(Boolean).join(", ");
            }
          }
        }
        
        // Send SMTP email if approver email found
        if (approverEmail) {
          await notifyApprovalRequest({
            entityType: input.entityType,
            entityId: input.entityId,
            entityLabel,
            requesterName: ctx.user.name || ctx.user.openId,
            requesterEmail: ctx.user.email || undefined,
            totalAmount: input.totalAmount,
            notes: input.notes,
            approverName,
            approverEmail,
            stepName: firstStep?.name,
            systemUrl: process.env.VITE_APP_URL || undefined,
          });
        }
        
        // Also send notification to owner as fallback
        await notifyOwner({
          title: `[Đơn mới cần phê duyệt] ${entityLabel} #${input.entityId}`,
          content: `Có đơn mới cần phê duyệt:\n\n- Loại: ${entityLabel}\n- Mã đơn: #${input.entityId}\n- Giá trị: ${input.totalAmount ? input.totalAmount.toLocaleString("vi-VN") + " VNĐ" : "N/A"}\n- Người yêu cầu: ${ctx.user.name || ctx.user.openId}\n- Ghi chú: ${input.notes || "Không có"}\n\nVui lòng truy cập hệ thống để phê duyệt.`,
        });
      } catch (e) {
        console.error("Failed to send approval notification:", e);
      }
      
      return { id: result.insertId, workflowId: workflow.id, currentStepId: firstStep?.id };
    }),

  getApprovalRequest: protectedProcedure
    .input(z.object({
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [request] = await db.select().from(approvalRequests)
        .where(and(
          eq(approvalRequests.entityType, input.entityType),
          eq(approvalRequests.entityId, input.entityId)
        ));
      
      return request || null;
    }),

  getApprovalHistory: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      return await db.select({
        id: approvalHistories.id,
        requestId: approvalHistories.requestId,
        stepId: approvalHistories.stepId,
        approverId: approvalHistories.approverId,
        action: approvalHistories.action,
        comments: approvalHistories.comments,
        createdAt: approvalHistories.createdAt,
      }).from(approvalHistories)
        .where(eq(approvalHistories.requestId, input.requestId))
        .orderBy(approvalHistories.createdAt);
    }),

  // Check if current user can approve
  canUserApprove: protectedProcedure
    .input(z.object({
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { canApprove: false, reason: "Database not available" };
      
      // Get approval request
      const [request] = await db.select().from(approvalRequests)
        .where(and(
          eq(approvalRequests.entityType, input.entityType),
          eq(approvalRequests.entityId, input.entityId)
        ));
      
      if (!request) return { canApprove: false, reason: "No approval request found" };
      if (request.status !== "pending") return { canApprove: false, reason: "Request is not pending" };
      if (!request.currentStepId) return { canApprove: false, reason: "No current step" };
      
      // Get current step
      const [currentStep] = await db.select().from(approvalSteps)
        .where(eq(approvalSteps.id, request.currentStepId));
      
      if (!currentStep) return { canApprove: false, reason: "Step not found" };
      
      // Check based on approver type
      if (currentStep.approverType === "user") {
        // Specific user
        if (currentStep.approverId === ctx.user.id) {
          return { canApprove: true, step: currentStep };
        }
      } else if (currentStep.approverType === "position") {
        // Check if user has this position
        const [profile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, ctx.user.id));
        
        if (profile && profile.positionId === currentStep.approverId) {
          return { canApprove: true, step: currentStep };
        }
      } else if (currentStep.approverType === "manager") {
        // Check if user is manager of requester
        const [requesterProfile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, request.requesterId));
        
        if (requesterProfile && requesterProfile.managerId === ctx.user.id) {
          return { canApprove: true, step: currentStep };
        }
      } else if (currentStep.approverType === "department_head") {
        // Check if user is department head
        const [userProfile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, ctx.user.id));
        
        if (userProfile && userProfile.positionId) {
          const [position] = await db.select().from(positions)
            .where(eq(positions.id, userProfile.positionId));
          
          if (position && position.canApprove === 1) {
            return { canApprove: true, step: currentStep };
          }
        }
      }
      
      // Admin can always approve
      if (ctx.user.role === "admin") {
        return { canApprove: true, step: currentStep, isAdmin: true };
      }
      
      return { canApprove: false, reason: "User does not have permission to approve this step" };
    }),

  // Approve or reject
  processApproval: protectedProcedure
    .input(z.object({
      entityType: z.enum(["purchase_order", "stock_export", "maintenance_request", "leave_request"]),
      entityId: z.number(),
      action: z.enum(["approved", "rejected", "returned"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get approval request
      const [request] = await db.select().from(approvalRequests)
        .where(and(
          eq(approvalRequests.entityType, input.entityType),
          eq(approvalRequests.entityId, input.entityId)
        ));
      
      if (!request) throw new Error("Approval request not found");
      if (request.status !== "pending") throw new Error("Request is not pending");
      if (!request.currentStepId) throw new Error("No current step");
      
      // Record history
      await db.insert(approvalHistories).values({
        requestId: request.id,
        stepId: request.currentStepId,
        approverId: ctx.user.id,
        action: input.action,
        comments: input.comments || null,
      });
      
      if (input.action === "rejected" || input.action === "returned") {
        // Update request status
        await db.update(approvalRequests)
          .set({ status: input.action === "rejected" ? "rejected" : "pending" })
          .where(eq(approvalRequests.id, request.id));
        
        // Send notification to requester
        try {
          const entityTypeLabels: Record<string, string> = {
            purchase_order: "Đơn đặt hàng",
            stock_export: "Xuất kho",
            maintenance_request: "Yêu cầu bảo trì",
            leave_request: "Đơn nghỉ phép",
          };
          const entityLabel = entityTypeLabels[input.entityType] || input.entityType;
          const actionLabel = input.action === "rejected" ? "bị từ chối" : "được trả lại";
          
          // Get requester info for SMTP email
          if (request.requesterId) {
            const [requester] = await db.select().from(users).where(eq(users.id, request.requesterId));
            if (requester && requester.email) {
              await notifyApprovalResult({
                entityType: input.entityType,
                entityId: input.entityId,
                entityLabel,
                requesterName: requester.name || requester.openId,
                requesterEmail: requester.email,
                action: input.action,
                approverName: ctx.user.name || ctx.user.openId,
                comments: input.comments,
                totalAmount: request.totalAmount ? Number(request.totalAmount) : undefined,
                systemUrl: process.env.VITE_APP_URL || undefined,
              });
            }
          }
          
          // Also send notification to owner as fallback
          await notifyOwner({
            title: `[${entityLabel} #${input.entityId}] Đã ${actionLabel}`,
            content: `${entityLabel} #${input.entityId} đã ${actionLabel}.\n\n- Người xử lý: ${ctx.user.name || ctx.user.openId}\n- Lý do: ${input.comments || "Không có"}`,
          });
        } catch (e) {
          console.error("Failed to send rejection notification:", e);
        }
        
        return { success: true, status: input.action === "rejected" ? "rejected" : "returned" };
      }
      
      // Get all steps for this workflow
      const steps = await db.select().from(approvalSteps)
        .where(eq(approvalSteps.workflowId, request.workflowId))
        .orderBy(approvalSteps.stepOrder);
      
      // Filter by amount
      const amount = request.totalAmount ? Number(request.totalAmount) : undefined;
      const applicableSteps = amount !== undefined
        ? steps.filter(step => {
            const minOk = !step.minAmount || Number(step.minAmount) <= amount;
            const maxOk = !step.maxAmount || Number(step.maxAmount) >= amount;
            return minOk && maxOk;
          })
        : steps;
      
      // Find current step index
      const currentIndex = applicableSteps.findIndex(s => s.id === request.currentStepId);
      const nextStep = applicableSteps[currentIndex + 1];
      
      if (nextStep) {
        // Move to next step
        await db.update(approvalRequests)
          .set({ currentStepId: nextStep.id })
          .where(eq(approvalRequests.id, request.id));
        
        return { success: true, status: "pending", nextStepId: nextStep.id };
      } else {
        // All steps completed - approve
        await db.update(approvalRequests)
          .set({ status: "approved", currentStepId: null })
          .where(eq(approvalRequests.id, request.id));
        
        // Send notification to requester
        try {
          const entityTypeLabels: Record<string, string> = {
            purchase_order: "Đơn đặt hàng",
            stock_export: "Xuất kho",
            maintenance_request: "Yêu cầu bảo trì",
            leave_request: "Đơn nghỉ phép",
          };
          const entityLabel = entityTypeLabels[input.entityType] || input.entityType;
          
          // Get requester info for SMTP email
          if (request.requesterId) {
            const [requester] = await db.select().from(users).where(eq(users.id, request.requesterId));
            if (requester && requester.email) {
              await notifyApprovalResult({
                entityType: input.entityType,
                entityId: input.entityId,
                entityLabel,
                requesterName: requester.name || requester.openId,
                requesterEmail: requester.email,
                action: "approved",
                approverName: ctx.user.name || ctx.user.openId,
                comments: input.comments,
                totalAmount: request.totalAmount ? Number(request.totalAmount) : undefined,
                systemUrl: process.env.VITE_APP_URL || undefined,
              });
            }
          }
          
          // Also send notification to owner as fallback
          await notifyOwner({
            title: `[${entityLabel} #${input.entityId}] Đã được phê duyệt`,
            content: `${entityLabel} #${input.entityId} đã được phê duyệt hoàn tất.\n\n- Người phê duyệt cuối: ${ctx.user.name || ctx.user.openId}\n- Ghi chú: ${input.comments || "Không có"}`,
          });
        } catch (e) {
          console.error("Failed to send approval notification:", e);
        }
        
        return { success: true, status: "approved" };
      }
    }),

  // List all approval requests with filters
  listRequests: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      
      let query = db.select({
        id: approvalRequests.id,
        entityType: approvalRequests.entityType,
        entityId: approvalRequests.entityId,
        requesterId: approvalRequests.requesterId,
        workflowId: approvalRequests.workflowId,
        currentStepId: approvalRequests.currentStepId,
        status: approvalRequests.status,
        totalAmount: approvalRequests.totalAmount,
        notes: approvalRequests.notes,
        createdAt: approvalRequests.createdAt,
        updatedAt: approvalRequests.updatedAt,
      }).from(approvalRequests);
      
      // Build conditions
      const conditions = [];
      if (input?.entityType) {
        conditions.push(eq(approvalRequests.entityType, input.entityType as any));
      }
      if (input?.status) {
        conditions.push(eq(approvalRequests.status, input.status as any));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const requests = await query.orderBy(approvalRequests.createdAt);
      
      // Get requester names
      const results = [];
      for (const req of requests) {
        const [user] = await db.select({ name: users.name }).from(users)
          .where(eq(users.id, req.requesterId));
        
        // Count total steps
        const steps = await db.select().from(approvalSteps)
          .where(eq(approvalSteps.workflowId, req.workflowId));
        
        // Find current step order
        let currentStep = 1;
        if (req.currentStepId) {
          const [step] = await db.select().from(approvalSteps)
            .where(eq(approvalSteps.id, req.currentStepId));
          if (step) currentStep = step.stepOrder;
        }
        
        results.push({
          ...req,
          requesterName: user?.name || req.requesterId,
          totalSteps: steps.length,
          currentStep: req.status === "approved" ? steps.length : currentStep,
          totalAmount: req.totalAmount ? Number(req.totalAmount) : undefined,
        });
      }
      
      return results;
    }),

  // Get pending approvals for current user
  getMyPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    // Get all pending requests
    const pendingRequests = await db.select().from(approvalRequests)
      .where(eq(approvalRequests.status, "pending"));
    
    // For each request, check if user can approve
    const results = [];
    for (const request of pendingRequests) {
      if (!request.currentStepId) continue;
      
      const [currentStep] = await db.select().from(approvalSteps)
        .where(eq(approvalSteps.id, request.currentStepId));
      
      if (!currentStep) continue;
      
      let canApprove = false;
      
      if (currentStep.approverType === "user" && currentStep.approverId === ctx.user.id) {
        canApprove = true;
      } else if (currentStep.approverType === "position") {
        const [profile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, ctx.user.id));
        if (profile && profile.positionId === currentStep.approverId) {
          canApprove = true;
        }
      } else if (currentStep.approverType === "manager") {
        const [requesterProfile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, request.requesterId));
        if (requesterProfile && requesterProfile.managerId === ctx.user.id) {
          canApprove = true;
        }
      } else if (currentStep.approverType === "department_head") {
        const [userProfile] = await db.select().from(employeeProfiles)
          .where(eq(employeeProfiles.userId, ctx.user.id));
        if (userProfile && userProfile.positionId) {
          const [position] = await db.select().from(positions)
            .where(eq(positions.id, userProfile.positionId));
          if (position && position.canApprove === 1) {
            canApprove = true;
          }
        }
      }
      
      // Admin can always approve
      if (ctx.user.role === "admin") {
        canApprove = true;
      }
      
      if (canApprove) {
        results.push({ ...request, currentStep });
      }
    }
    
    return results;
  }),
});
