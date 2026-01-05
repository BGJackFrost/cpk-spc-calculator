import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { maintenanceWorkOrderService } from "./maintenanceWorkOrderService";

export const maintenanceWorkOrderRouter = router({
  // ==================== Work Orders ====================
  
  // Get work orders
  getWorkOrders: protectedProcedure
    .input(z.object({
      status: z.enum(['created', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'verified']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      workOrderType: z.enum(['predictive', 'preventive', 'corrective', 'emergency', 'inspection']).optional(),
      assignedTo: z.number().optional(),
      deviceId: z.number().optional(),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      return maintenanceWorkOrderService.getWorkOrders(input || {});
    }),
  
  // Get work order by ID
  getWorkOrderById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return maintenanceWorkOrderService.getWorkOrderById(input.id);
    }),
  
  // Create work order
  createWorkOrder: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      deviceId: z.number(),
      predictionId: z.number().optional(),
      scheduleId: z.number().optional(),
      workOrderType: z.enum(['predictive', 'preventive', 'corrective', 'emergency', 'inspection']),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      estimatedDuration: z.number().min(1).default(60),
      estimatedCost: z.number().optional(),
      requiredSkills: z.array(z.string()).optional(),
      requiredParts: z.array(z.object({
        partId: z.number(),
        quantity: z.number(),
      })).optional(),
      assignedTo: z.number().optional(),
      assignedTeam: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return maintenanceWorkOrderService.createWorkOrder({
        ...input,
        requiredSkills: input.requiredSkills || null,
        requiredParts: input.requiredParts || null,
        createdBy: ctx.user?.id,
      });
    }),
  
  // Update work order
  updateWorkOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(['created', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'verified']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      estimatedDuration: z.number().min(1).optional(),
      actualDuration: z.number().optional(),
      estimatedCost: z.number().optional(),
      actualCost: z.number().optional(),
      requiredSkills: z.array(z.string()).optional(),
      requiredParts: z.array(z.object({
        partId: z.number(),
        quantity: z.number(),
      })).optional(),
      assignedTo: z.number().optional(),
      assignedTeam: z.string().optional(),
      dueDate: z.string().optional(),
      completionNotes: z.string().optional(),
      rootCause: z.string().optional(),
      actionsTaken: z.string().optional(),
      preventiveMeasures: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return maintenanceWorkOrderService.updateWorkOrder(id, data as any, ctx.user?.id);
    }),
  
  // Delete work order
  deleteWorkOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return maintenanceWorkOrderService.deleteWorkOrder(input.id);
    }),
  
  // Verify completed work order
  verifyWorkOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return maintenanceWorkOrderService.updateWorkOrder(input.id, {
        status: 'verified',
        verifiedBy: ctx.user?.id,
        verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }, ctx.user?.id);
    }),
  
  // Auto-assign work order
  autoAssignWorkOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return maintenanceWorkOrderService.autoAssignWorkOrder(input.id);
    }),
  
  // Create from prediction
  createFromPrediction: protectedProcedure
    .input(z.object({ predictionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return maintenanceWorkOrderService.createFromPrediction(input.predictionId, ctx.user?.id);
    }),
  
  // ==================== Tasks ====================
  
  // Add task
  addTask: protectedProcedure
    .input(z.object({
      workOrderId: z.number(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      estimatedDuration: z.number().min(1).default(15),
      assignedTo: z.number().optional(),
      checklistItems: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
      })).optional(),
      requiredTools: z.array(z.string()).optional(),
      safetyPrecautions: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return maintenanceWorkOrderService.addTask({
        ...input,
        checklistItems: input.checklistItems || null,
        requiredTools: input.requiredTools || null,
      });
    }),
  
  // Update task
  updateTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      estimatedDuration: z.number().min(1).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
      assignedTo: z.number().optional(),
      notes: z.string().optional(),
      checklistItems: z.array(z.object({
        item: z.string(),
        checked: z.boolean(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return maintenanceWorkOrderService.updateTask(id, data as any);
    }),
  
  // Complete task
  completeTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return maintenanceWorkOrderService.completeTask(input.id, ctx.user!.id, input.notes);
    }),
  
  // Delete task
  deleteTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return maintenanceWorkOrderService.deleteTask(input.id);
    }),
  
  // ==================== Comments ====================
  
  // Add comment
  addComment: protectedProcedure
    .input(z.object({
      workOrderId: z.number(),
      comment: z.string().min(1),
      isInternal: z.boolean().default(false),
      attachments: z.array(z.object({
        url: z.string(),
        name: z.string(),
        type: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return maintenanceWorkOrderService.addComment(
        input.workOrderId,
        ctx.user!.id,
        input.comment,
        input.isInternal,
        input.attachments
      );
    }),
  
  // ==================== Technicians ====================
  
  // Get technicians
  getTechnicians: protectedProcedure
    .input(z.object({
      availability: z.enum(['available', 'busy', 'on_leave', 'unavailable']).optional(),
      department: z.string().optional(),
      skill: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return maintenanceWorkOrderService.getTechnicians(input);
    }),
  
  // Get technician by user ID
  getTechnicianByUserId: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return maintenanceWorkOrderService.getTechnicianByUserId(input.userId);
    }),
  
  // Create technician
  createTechnician: protectedProcedure
    .input(z.object({
      userId: z.number(),
      employeeId: z.string().optional(),
      department: z.string().optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.object({
        name: z.string(),
        expiryDate: z.string().optional(),
      })).optional(),
      experienceYears: z.number().min(0).default(0),
      hourlyRate: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return maintenanceWorkOrderService.createTechnician({
        ...input,
        skills: input.skills || null,
        certifications: input.certifications || null,
      });
    }),
  
  // Update technician
  updateTechnician: protectedProcedure
    .input(z.object({
      id: z.number(),
      employeeId: z.string().optional(),
      department: z.string().optional(),
      skills: z.array(z.string()).optional(),
      certifications: z.array(z.object({
        name: z.string(),
        expiryDate: z.string().optional(),
      })).optional(),
      experienceYears: z.number().min(0).optional(),
      hourlyRate: z.number().optional(),
      availability: z.enum(['available', 'busy', 'on_leave', 'unavailable']).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return maintenanceWorkOrderService.updateTechnician(id, data as any);
    }),
  
  // ==================== Statistics ====================
  
  // Get statistics
  getStatistics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return maintenanceWorkOrderService.getStatistics(input);
    }),
});

export default maintenanceWorkOrderRouter;
