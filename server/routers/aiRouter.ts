import { router, protectedProcedure } from "../_core/trpc";
import { modelsRouter } from "./ai/modelsRouter";
import { trainingRouter } from "./ai/trainingRouter";
import { analyticsRouter } from "./ai/analyticsRouter";
import { predictionsRouter } from "./ai/predictionsRouter";
import { settingsRouter } from "./ai/settingsRouter";
import { healthMonitoringRouter } from "./ai/healthMonitoringRouter";
import { predictionRouter } from "./ai/predictionRouter";
import { naturalLanguageRouter } from "./ai/naturalLanguageRouter";
import { aiExportRouter } from "./ai/aiExportRouter";
import { aiPredictiveRouter } from "./ai/aiPredictiveRouter";
import { aiPredictionThresholdsRouter } from "./ai/aiPredictionThresholdsRouter";
import { aiPredictionHistoryRouter } from "./ai/aiPredictionHistoryRouter";

/**
 * AI Router - Main entry point for all AI-related operations
 * 
 * Structure:
 * - ai.models.*      - Model management, deployment, versioning
 * - ai.training.*    - Training jobs, datasets, history
 * - ai.analytics.*   - Dashboard stats, insights, trends
 * - ai.predictions.* - Predictions, batch predict, history
 * - ai.settings.*    - Configuration, thresholds, alert rules
 * - ai.export.*      - Export AI reports to PDF/Excel
 * - ai.predictive.*  - Real-time CPK/OEE predictions with historical data
 * 
 * Usage examples:
 * - trpc.ai.models.list.useQuery()
 * - trpc.ai.training.startJob.useMutation()
 * - trpc.ai.analytics.getDashboardStats.useQuery()
 * - trpc.ai.predictions.predict.useMutation()
 * - trpc.ai.settings.getConfig.useQuery()
 * - trpc.ai.export.exportModelsReportExcel.useMutation()
 * - trpc.ai.predictive.predictCpk.useQuery()
 */
export const aiRouter = router({
  models: modelsRouter,
  training: trainingRouter,
  analytics: analyticsRouter,
  predictions: predictionsRouter,
  settings: settingsRouter,
  health: healthMonitoringRouter,
  predict: predictionRouter, // New prediction API
  naturalLanguage: naturalLanguageRouter, // AI chatbot
  export: aiExportRouter, // Export AI reports
  predictive: aiPredictiveRouter, // Real-time predictions
  thresholds: aiPredictionThresholdsRouter, // Custom alert thresholds
  history: aiPredictionHistoryRouter, // Prediction history & accuracy
});
