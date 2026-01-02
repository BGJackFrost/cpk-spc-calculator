import { router } from "../_core/trpc";
import { modelsRouter } from "./ai/modelsRouter";
import { trainingRouter } from "./ai/trainingRouter";
import { analyticsRouter } from "./ai/analyticsRouter";
import { predictionsRouter } from "./ai/predictionsRouter";
import { settingsRouter } from "./ai/settingsRouter";

/**
 * AI Router - Main entry point for all AI-related operations
 * 
 * Structure:
 * - ai.models.*      - Model management, deployment, versioning
 * - ai.training.*    - Training jobs, datasets, history
 * - ai.analytics.*   - Dashboard stats, insights, trends
 * - ai.predictions.* - Predictions, batch predict, history
 * - ai.settings.*    - Configuration, thresholds, alert rules
 * 
 * Usage examples:
 * - trpc.ai.models.list.useQuery()
 * - trpc.ai.training.startJob.useMutation()
 * - trpc.ai.analytics.getDashboardStats.useQuery()
 * - trpc.ai.predictions.predict.useMutation()
 * - trpc.ai.settings.getConfig.useQuery()
 */
export const aiRouter = router({
  models: modelsRouter,
  training: trainingRouter,
  analytics: analyticsRouter,
  predictions: predictionsRouter,
  settings: settingsRouter,
});
