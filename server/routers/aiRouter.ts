import { router } from "../_core/trpc";
import { modelsRouter } from "./ai/modelsRouter";
import { trainingRouter } from "./ai/trainingRouter";
import { analyticsRouter } from "./ai/analyticsRouter";

/**
 * AI Router - Main entry point for all AI-related operations
 * 
 * Structure:
 * - ai.models.*      - Model management, deployment, versioning
 * - ai.training.*    - Training jobs, datasets, history
 * - ai.analytics.*   - Dashboard stats, insights, trends
 * 
 * Usage examples:
 * - trpc.ai.models.list.useQuery()
 * - trpc.ai.training.startJob.useMutation()
 * - trpc.ai.analytics.getDashboardStats.useQuery()
 */
export const aiRouter = router({
  models: modelsRouter,
  training: trainingRouter,
  analytics: analyticsRouter,
});
