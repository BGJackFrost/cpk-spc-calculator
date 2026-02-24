import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { aiTrainedModels } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * AI Models Router
 * Handles trained models management, deployment, and versioning
 */
export const modelsRouter = router({
  /**
   * List all trained models with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "inactive", "archived"]).optional(),
        modelType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      let query = db.select().from(aiTrainedModels);
      
      if (input?.status) {
        query = query.where(eq(aiTrainedModels.status, input.status)) as any;
      }
      
      const models = await query.orderBy(desc(aiTrainedModels.createdAt)).limit(input?.limit || 50);
      
      return {
        models,
        total: models.length,
      };
    }),

  /**
   * Get single model by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const model = await db
        .select()
        .from(aiTrainedModels)
        .where(eq(aiTrainedModels.id, input.id))
        .limit(1);
      
      if (!model || model.length === 0) {
        throw new Error("Model not found");
      }
      
      return model[0];
    }),

  /**
   * Get model metrics and performance stats
   */
  getMetrics: protectedProcedure
    .input(z.object({ modelId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const model = await db
        .select()
        .from(aiTrainedModels)
        .where(eq(aiTrainedModels.id, input.modelId))
        .limit(1);
      
      if (!model || model.length === 0) {
        return null;
      }
      
      const metrics = model[0].metrics ? JSON.parse(model[0].metrics as string) : {};
      
      return {
        modelId: input.modelId,
        accuracy: model[0].accuracy,
        precisionScore: model[0].precisionScore,
        recallScore: model[0].recallScore,
        f1Score: model[0].f1Score,
        mse: model[0].mse,
        mae: model[0].mae,
        r2Score: model[0].r2Score,
        ...metrics,
      };
    }),

  /**
   * Deploy a trained model to production
   * TODO: Implement after creating aiDeployedModels table
   */
  /*
  deploy: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
        environment: z.enum(["production", "staging", "development"]).default("production"),
        replicas: z.number().min(1).max(10).default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Check if model exists
      const model = await db
        .select()
        .from(aiTrainedModels)
        .where(eq(aiTrainedModels.id, input.modelId))
        .limit(1);
      
      if (!model || model.length === 0) {
        throw new Error("Model not found");
      }
      
      // Create deployment record
      await db.insert(aiDeployedModels).values({
        modelId: input.modelId,
        environment: input.environment,
        replicas: input.replicas,
        status: "active",
        deployedBy: ctx.user.id,
        deployedAt: new Date().toISOString(),
      });
      
      // Update model status
      await db
        .update(aiTrainedModels)
        .set({ status: "active" })
        .where(eq(aiTrainedModels.id, input.modelId));
      
      return {
        success: true,
        message: `Model ${model[0].name} deployed to ${input.environment}`,
      };
    }),
  */

  /**
   * Undeploy a model from production
   * TODO: Implement after creating aiDeployedModels table
   */
  /*
  undeploy: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db
        .update(aiDeployedModels)
        .set({ 
          status: "inactive",
          undeployedAt: new Date().toISOString(),
        })
        .where(eq(aiDeployedModels.id, input.deploymentId));
      
      return {
        success: true,
        message: "Model undeployed successfully",
      };
    }),
  */

  /**
   * Get deployed models
   * TODO: Implement after creating aiDeployedModels table
   */
  /*
  getDeployed: protectedProcedure
    .input(
      z.object({
        environment: z.enum(["production", "staging", "development"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      let query = db
        .select()
        .from(aiDeployedModels)
        .where(eq(aiDeployedModels.status, "active"));
      
      if (input?.environment) {
        query = query.where(
          and(
            eq(aiDeployedModels.status, "active"),
            eq(aiDeployedModels.environment, input.environment)
          )
        ) as any;
      }
      
      const deployments = await query.orderBy(desc(aiDeployedModels.deployedAt));
      
      return {
        deployments,
        total: deployments.length,
      };
    }),
  */

  /**
   * Update model status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
        status: z.enum(["active", "inactive", "archived"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db
        .update(aiTrainedModels)
        .set({ status: input.status })
        .where(eq(aiTrainedModels.id, input.modelId));
      
      return {
        success: true,
        message: "Model status updated",
      };
    }),

  /**
   * Delete a model
   */
  delete: protectedProcedure
    .input(z.object({ modelId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Soft delete by setting status to archived
      await db
        .update(aiTrainedModels)
        .set({ status: "archived" })
        .where(eq(aiTrainedModels.id, input.modelId));
      
      return {
        success: true,
        message: "Model archived successfully",
      };
    }),

  /**
   * Get model versions
   */
  getVersions: protectedProcedure
    .input(z.object({ modelName: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const versions = await db
        .select()
        .from(aiTrainedModels)
        .where(eq(aiTrainedModels.name, input.modelName))
        .orderBy(desc(aiTrainedModels.version));
      
      return {
        versions,
        total: versions.length,
      };
    }),
});
