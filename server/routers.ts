import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { oeeRouter } from "./routers/oeeRouter";
import { maintenanceRouter } from "./routers/maintenanceRouter";
import { sparePartsRouter } from "./routers/sparePartsRouter";
import { organizationRouter } from "./routers/organizationRouter";
import { approvalRouter } from "./routers/approvalRouter";
import { permissionRouter as permissionModuleRouter } from "./routers/permissionRouter";
// import { predictiveRouter } from "./routers/predictiveRouter";
import { reportRouter as mmsReportRouter } from "./routers/reportRouter";
import { alertRouter as mmsAlertRouter } from "./routers/alertRouter";
import { iotDashboardRouter, iotExportRouter } from "./routers/iotDashboardRouter";
import { mqttRouter } from "./services/mqttRouter";
import { iotAlertRouter } from "./services/iotAlertRouter";
// import { opcuaRouter } from "./services/opcuaRouter";
import { aiRouter } from "./routers/aiRouter";
import { aiAdvancedRouter } from "./routers/aiAdvancedRouter";
import { aiTrainingRouter } from "./routers/aiTrainingRouter";
import { erpIntegrationRouter } from "./routers/erpIntegrationRouter";
import { securityRouter } from "./routers/securityRouter";
import { chartConfigRouter } from "./routers/chartConfigRouter";
// import { mmsDashboardConfigRouter } from "./routers/dashboardConfigRouter";
import { machineIntegrationRouter, machinePublicRouter } from "./routers/machineIntegrationRouter";
import { systemRouter } from "./_core/systemRouter";
import { themeRouter } from "./routers/themeRouter";
import { databaseConnectionRouter as dbConnectionRouter } from "./routers/databaseConnectionRouter";
import { quickAccessRouter } from "./routers/quickAccessRouter";
import { alertAnalyticsRouter } from "./routers/alertAnalyticsRouter";
import { webhookHistoryRouter } from "./routers/webhookHistoryRouter";
import { videoTutorialRouter } from "./routers/videoTutorialRouter";
import { visionRouter } from "./routers/visionRouter";
import { predictiveAnalyticsRouter } from "./routers/predictiveAnalyticsRouter";
import { predictiveAlertRouter } from "./routers/predictiveAlertRouter";
import { iotSensorRouter } from "./routers/iotSensorRouter";
import { iotDeviceManagementRouter } from "./routers/iotDeviceManagementRouter";
import { iotAlertEscalationRouter } from "./routers/iotAlertEscalationRouter";
import { iotAnalyticsRouter } from "./routers/iotAnalyticsRouter";
import { iotProtocolRouter } from "./routers/iotProtocolRouter";
import { iotCrudRouter } from "./routers/iotCrudRouter";
import { iotOeeAlertRouter } from "./routers/iotOeeAlertRouter";
import { generateHistoryExcelBuffer, generateHistoryPdfHtml } from "./historyExportService";
import { telegramRouter } from "./routers/telegramRouter";
import { floorPlanRouter } from "./routers/floorPlanRouter";
import { notificationRouter } from "./routers/notificationRouter";
import { notificationPreferencesRouter } from "./routers/notificationPreferencesRouter";
import { aiExportRouter } from "./routers/aiExportRouter";
import { cacheMonitoringRouter } from "./routers/cacheMonitoringRouter";
import { alertWebhookRouter } from "./routers/alertWebhookRouter";
import { smsRouter } from "./routers/smsRouter";
import { escalationHistoryRouter } from "./routers/escalationHistoryRouter";
import { autoResolveRouter } from "./routers/autoResolveRouter";
import { escalationWebhookRouter } from "./routers/escalationWebhookRouter";
import { escalationTemplateRouter } from "./routers/escalationTemplateRouter";
import { escalationReportRouter } from "./routers/escalationReportRouter";
import { firebasePushRouter } from "./routers/firebasePushRouter";
import { fcmIntegrationRouter } from "./routers/fcmIntegrationRouter";
import { syncRouter } from "./routers/syncRouter";
import { widgetDataRouter } from "./routers/widgetDataRouter";
import { firmwareOtaRouter } from "./routers/firmwareOtaRouter";
import { floorPlanIntegrationRouter } from "./routers/floorPlanIntegrationRouter";
import { predictiveMaintenanceRouter } from "./routers/predictiveMaintenanceRouter";
import { scheduledOtaRouter } from "./scheduledOtaRouter";
import { mttrMtbfComparisonRouter } from "./routers/mttrMtbfComparisonRouter";
import { mttrMtbfAlertRouter } from "./routers/mttrMtbfAlertRouter";
import { mttrMtbfPredictionRouter } from "./routers/mttrMtbfPredictionRouter";
import { scheduledOeeReportRouter } from "./routers/scheduledOeeReportRouter";
import { userGuideRouter } from "./routers/userGuideRouter";
import { edgeGatewayRouter } from "./routers/edgeGatewayRouter";
import { aiRootCauseRouter } from "./routers/aiRootCauseRouter";
import { timeseriesRouter } from "./routers/timeseriesRouter";
import { anomalyDetectionRouter } from "./routers/anomalyDetectionRouter";
import { anomalyAlertRouter } from "./routers/anomalyAlertRouter";
import { edgeGatewaySimulatorRouter } from "./routers/edgeGatewaySimulatorRouter";
import { modelAutoRetrainingRouter } from "./routers/modelAutoRetrainingRouter";
import { oeeThresholdsRouter } from "./routers/oeeThresholdsRouter";
import { cpkAlertRouter } from "./routers/cpkAlertRouter";
import { scheduledCpkCheckRouter } from "./routers/scheduledCpkCheckRouter";
// Phase 10 - Quality Images & Alert Email
import { qualityImageRouter } from "./routers/qualityImageRouter";
import { alertEmailRouter } from "./routers/alertEmailRouter";
// Phase 10 - Auto-capture, Webhook Notification, Quality Trend Reports
import { autoCaptureRouter } from "./routers/autoCaptureRouter";
import { unifiedWebhookRouter } from "./routers/unifiedWebhookRouter";
import { qualityTrendRouter } from "./routers/qualityTrendRouter";
import { webhookTemplateRouter } from "./routers/webhookTemplateRouter";
import { scheduledReportRouter } from "./routers/scheduledReportRouter";
import { aiVisionDashboardRouter, lineComparisonRouter } from "./routers/aiVisionDashboardRouter";
import { userNotificationRouter } from "./routers/userNotificationRouter";
import { cpkHistoryRouter } from "./routers/cpkHistoryRouter";
import { realtimeRouter } from "./routers/realtimeRouter";
import { factoryWorkshopRouter } from "./routers/factoryWorkshopRouter";
import { measurementRemarkRouter } from "./routers/measurementRemarkRouter";
import { dashboardCustomizationRouter } from "./routers/dashboardCustomizationRouter";
import { batchImageAnalysisRouter } from "./routers/batchImageAnalysisRouter";
import { customWidgetRouter } from "./routers/customWidgetRouter";
import { cameraConfigRouter } from "./routers/cameraConfigRouter";
import { snImageRouter } from "./routers/snImageRouter";
import { cameraSessionRouter } from "./routers/cameraSessionRouter";
import { imageAnnotationRouter } from "./routers/imageAnnotationRouter";
import { aiImageComparisonRouter } from "./routers/aiImageComparisonRouter";
import { cameraCaptureScheduleRouter } from "./routers/cameraCaptureScheduleRouter";
import { qualityStatisticsRouter } from "./routers/qualityStatisticsRouter";
import { heatMapYieldRouter } from "./routers/heatMapYieldRouter";
import { paretoChartRouter } from "./routers/paretoChartRouter";
import { aoiAviRouter } from "./routers/aoiAviRouter";
import { alertHistoryRouter } from "./routers/alertHistoryRouter";
import { autoNtfRouter } from "./routers/autoNtfRouter";
import { alertConfigRouter } from "./routers/alertConfigRouter";
import { maintenanceWorkOrderRouter } from "./maintenanceWorkOrderRouter";
import { mobileRouter } from "./mobileRouter";
import { triggerLicenseExpiryCheck } from "./scheduledJobs";
import { triggerWebhooks, testWebhook } from "./webhookService";
import { storagePut } from "./storage";
import {
  registerLocalUser,
  loginLocalUser,
  verifyLocalToken,
  getLocalUserById,
  listLocalUsers,
  updateLocalUser,
  deactivateLocalUser,
  ensureDefaultAdmin,
  changeLocalPassword,
  adminResetPassword,
  type LocalAuthUser,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPasswordWithToken,
} from "./localAuthService";
import {
  generateTOTPSecret,
  enable2FA,
  disable2FA,
  has2FAEnabled,
  verify2FALogin,
  generateBackupCodes,
} from "./twoFactorService";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { 
  getRateLimitStats, 
  resetRateLimitStats, 
  addToWhitelist, 
  removeFromWhitelist, 
  getWhitelist,
  getUserRateLimitInfo,
  clearAlerts,
  getRedisStatus,
  setAlertCallback,
  setRateLimitEnabled,
  isRateLimitEnabled
} from "./_core/rateLimiter";
import { notifyOwner } from "./_core/notification";
import { cache } from "./cache";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { spcDefectRecords, spcAnalysisHistory } from "../drizzle/schema";
import { eq, and, gte, lte, desc, or, count } from "drizzle-orm";
import { customAlertRules, customAlertHistory } from "../drizzle/schema";
import {
  createDatabaseConnection,
  getDatabaseConnections,
  getDatabaseConnectionById,
  updateDatabaseConnection,
  deleteDatabaseConnection,
  getAllUsers,
  updateUserRole,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createProductSpecification,
  getProductSpecifications,
  getProductSpecificationById,
  updateProductSpecification,
  deleteProductSpecification,
  createSpcSamplingPlan,
  getSpcSamplingPlans,
  getSpcSamplingPlanById,
  updateSpcSamplingPlan,
  deleteSpcSamplingPlan,
  getUserLineAssignments,
  createUserLineAssignment,
  deleteUserLineAssignment,
  getEmailNotificationSettings,
  upsertEmailNotificationSettings,
  createProductStationMapping,
  getProductStationMappings,
  getProductStationMappingById,
  findProductStationMapping,
  updateProductStationMapping,
  deleteProductStationMapping,
  getUniqueProductCodes,
  getStationsByProductCode,
  getMappingTemplates,
  getMappingTemplateById,
  createMappingTemplate,
  updateMappingTemplate,
  deleteMappingTemplate,
  seedDefaultMappingTemplates,
  getLicenses,
  getUsersWithCursor,
  getSpcAnalysisHistoryWithCursor,
  getAuditLogsWithCursor,
  getLoginHistoryWithCursor,
  getLicensesWithCursor,
  getActiveLicense,
  getLicenseByKey,
  getLicensesExpiringSoon,
  getExpiredLicenses,
  createLicense,
  activateLicense,
  deactivateLicense,
  deleteLicense,
  generateLicenseKey,
  seedDefaultLicense,
  createSpcAnalysisHistory,
  getSpcAnalysisHistory,
  getSpcAnalysisHistoryByMapping,
  getAlertSettings,
  upsertAlertSettings,
  queryExternalDatabase,
  calculateSpc,
  createProductionLine,
  getProductionLines,
  getSpcDefectCategories,
  getSpcDefectCategoryById,
  createSpcDefectCategory,
  updateSpcDefectCategory,
  deleteSpcDefectCategory,
  getSpcDefectRecords,
  getSpcDefectRecordById,
  createSpcDefectRecord,
  updateSpcDefectRecord,
  deleteSpcDefectRecord,
  getDefectStatistics,
  getDefectByRuleStatistics,
  getMachineTypes,
  getMachineTypeById,
  createMachineType,
  updateMachineType,
  deleteMachineType,
  getFixtures,
  getFixtureById,
  createFixture,
  updateFixture,
  deleteFixture,
  getFixturesWithMachineInfo,
  getJigs,
  getJigById,
  createJig,
  updateJig,
  deleteJig,
  getJigsWithMachineInfo,
  getProductionLineById,
  updateProductionLine,
  deleteProductionLine,
  createWorkstation,
  getWorkstationsByLine,
  updateWorkstation,
  deleteWorkstation,
  createMachine,
  getMachinesByWorkstation,
  updateMachine,
  deleteMachine,
  getSpcRulesConfig,
  upsertSpcRulesConfig,
  getSamplingConfigs,
  getSamplingConfigById,
  createSamplingConfig,
  updateSamplingConfig,
  deleteSamplingConfig,
  getDashboardConfig,
  upsertDashboardConfig,
  getDashboardLineSelections,
  setDashboardLineSelections,
  checkSpcRules,
  evaluateCpkStatus,
  calculateCa,
  getPermissions,
  createPermission,
  getRolePermissions,
  updateRolePermissions,
  initDefaultPermissions,
  checkUserPermission,
  getSpcAnalysisHistoryPaginated,
  getSpcRealtimeDataByPlan,
  getSpcRealtimeDataByPlanPaginated,
  getSpcSummaryStatsByPlan,
  getSpcSummaryStatsByTimeRange,
  getAuditLogsPaginated,
  getReportTemplates,
  getReportTemplateById,
  getDefaultReportTemplate,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  createExportHistory,
  getExportHistoryByUser,
  getExportHistoryById,
  deleteExportHistory,
  getExportHistoryStats,
  logLoginEvent,
  getLoginHistory,
  getLoginStats,
  getDb,
  getCustomValidationRulesByProduct,
  // Phase 98: 3D Models, Notifications, MTTR/MTBF
  get3dModels,
  get3dModelById,
  create3dModel,
  update3dModel,
  delete3dModel,
  get3dModelInstances,
  create3dModelInstance,
  update3dModelInstance,
  delete3dModelInstance,
  getTechnicianNotificationPrefs,
  upsertTechnicianNotificationPrefs,
  createWorkOrderNotification,
  updateNotificationStatus,
  getWorkOrderNotifications,
  getSmsConfig,
  upsertSmsConfig,
  getPushConfig,
  upsertPushConfig,
  getMttrMtbfStats,
  createMttrMtbfStats,
  getFailureEvents,
  createFailureEvent,
  updateFailureEvent,
  calculateMttrMtbf,
  getWorkOrderCountsByType,
} from "./db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { generateCsvContent, generateHtmlReport, ExportData } from "./exportUtils";
import { generatePdfHtml, generateExcelBuffer, generateEnhancedCsv, ExportData as EnhancedExportData } from "./exportService";
import {
  productionLineRouter,
  workstationRouter,
  machineRouter,
  spcRulesRouter,
  samplingRouter,
  dashboardRouter,
  reportRouter,
  dashboardConfigRouter,
} from "./routers-extended";
import {
  getCustomValidationRules,
  getCustomValidationRuleById,
  createCustomValidationRule,
  updateCustomValidationRule,
  deleteCustomValidationRule,
  toggleCustomValidationRule,
  getLoginCustomization,
  updateLoginCustomization,
  getAccountLockoutHistory,
  unlockAccount,
  isAccountLocked,
  logAuthAuditEvent,
  getAuthAuditLogs,
  getAuthAuditStats,
  getRecentFailedLoginsForDashboard,
  getLockedAccountsForDashboard,
  getFailedLoginsTrend,
  getSecurityOverviewStats,
  getAuthAuditLogsWithUserInfo,
  getAllUsersForFilter,
} from "./db";

// Admin procedure - only admins can access
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// User Router
const userRouter = router({
  list: adminProcedure.query(async () => {
    return await getAllUsers();
  }),

  // Cursor-based pagination endpoint
  listWithCursor: adminProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      direction: z.enum(['forward', 'backward']).default('forward'),
    }))
    .query(async ({ input }) => {
      return await getUsersWithCursor(input);
    }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "manager", "admin"]),
    }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  bulkUpdateRole: adminProcedure
    .input(z.object({
      userIds: z.array(z.number()),
      role: z.enum(["user", "manager", "admin"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Don't allow changing own role
      const filteredIds = input.userIds.filter(id => id !== ctx.user.id);
      if (filteredIds.length === 0) {
        return { updated: 0 };
      }
      
      await db.execute(sql`
        UPDATE users 
        SET role = ${input.role}, updatedAt = NOW()
        WHERE id IN (${sql.join(filteredIds.map(id => sql`${id}`), sql`, `)})
      `);
      
      return { updated: filteredIds.length };
    }),
});

// Product Router - with caching
const productRouter = router({
  list: protectedProcedure.query(async () => {
    const { getCachedProducts } = await import('./services/cachedQueries');
    return await getCachedProducts();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getCachedProductById } = await import('./services/cachedQueries');
      return await getCachedProductById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().default("pcs"),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createProduct({ ...input, createdBy: ctx.user.id });
      // Invalidate cache after create
      const { invalidateProductCache } = await import('./services/cachedQueries');
      invalidateProductCache();
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProduct(id, data);
      // Invalidate cache after update
      const { invalidateProductCache } = await import('./services/cachedQueries');
      invalidateProductCache();
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
      // Invalidate cache after delete
      const { invalidateProductCache } = await import('./services/cachedQueries');
      invalidateProductCache();
      return { success: true };
    }),
});

// Product Specification Router
const productSpecRouter = router({
  list: protectedProcedure
    .input(z.object({ productId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getProductSpecifications(input?.productId);
    }),

  create: adminProcedure
    .input(z.object({
      productId: z.number(),
      workstationId: z.number().optional(),
      parameterName: z.string().min(1),
      usl: z.number(),
      lsl: z.number(),
      target: z.number().optional(),
      unit: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createProductSpecification({ ...input, createdBy: ctx.user.id });
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      parameterName: z.string().optional(),
      usl: z.number().optional(),
      lsl: z.number().optional(),
      target: z.number().optional(),
      unit: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProductSpecification(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProductSpecification(input.id);
      return { success: true };
    }),
});

// Database Connection Router - Hỗ trợ đa loại database (legacy - use dbConnectionRouter from routers/databaseConnectionRouter.ts)
const legacyDatabaseConnectionRouter = router({
  // Lấy danh sách kết nối
  list: adminProcedure.query(async () => {
    const { getConnections } = await import("./externalDatabaseService");
    return await getConnections();
  }),

  // Lấy kết nối theo ID (không trả về password)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getConnections } = await import("./externalDatabaseService");
      const connections = await getConnections();
      return connections.find(c => c.id === input.id) || null;
    }),

  // Lấy danh sách loại database hỗ trợ
  getSupportedTypes: adminProcedure.query(async () => {
    const { getSupportedDatabaseTypes } = await import("./externalDatabaseService");
    return getSupportedDatabaseTypes();
  }),

  // Tạo kết nối mới
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      databaseType: z.enum(["mysql", "sqlserver", "oracle", "postgres", "access", "excel", "internal"]),
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      filePath: z.string().optional(),
      connectionOptions: z.record(z.string(), z.unknown()).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { createConnection } = await import("./externalDatabaseService");
      return await createConnection(input, ctx.user.id);
    }),

  // Cập nhật kết nối
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      databaseType: z.enum(["mysql", "sqlserver", "oracle", "postgres", "access", "excel", "internal"]).optional(),
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      filePath: z.string().optional(),
      connectionOptions: z.record(z.string(), z.unknown()).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const { updateConnection } = await import("./externalDatabaseService");
      return await updateConnection(id, data);
    }),

  // Xóa kết nối
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteConnection } = await import("./externalDatabaseService");
      return await deleteConnection(input.id);
    }),

  // Test kết nối mới (chưa lưu)
  testConnection: adminProcedure
    .input(z.object({
      databaseType: z.enum(["mysql", "sqlserver", "oracle", "postgres", "access", "excel", "internal"]),
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      filePath: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { testConnection } = await import("./externalDatabaseService");
      return await testConnection(input);
    }),

  // Lấy danh sách bảng từ database connection
  getTables: adminProcedure
    .input(z.object({ connectionId: z.number() }))
    .query(async ({ input }) => {
      const { getTables } = await import("./externalDatabaseService");
      const tables = await getTables(input.connectionId);
      return { tables: tables.map(t => t.name), tableInfo: tables };
    }),

  // Lấy danh sách cột từ bảng
  getColumns: adminProcedure
    .input(z.object({ connectionId: z.number(), tableName: z.string() }))
    .query(async ({ input }) => {
      const { getTableSchema } = await import("./externalDatabaseService");
      const columns = await getTableSchema(input.connectionId, input.tableName);
      return { columns };
    }),

  // Test connection by ID
  testConnectionById: adminProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ input }) => {
      const { getConnectionById, testConnection, updateConnectionTestStatus } = await import("./externalDatabaseService");
      const connection = await getConnectionById(input.connectionId);
      if (!connection) {
        return { success: false, message: "Connection not found" };
      }
      const result = await testConnection({
        name: connection.name,
        databaseType: connection.databaseType as "mysql" | "sqlserver" | "oracle" | "postgres" | "access" | "excel",
        host: connection.host || undefined,
        port: connection.port || undefined,
        database: connection.database || undefined,
        username: connection.username || undefined,
        password: connection.password || undefined,
        filePath: connection.filePath || undefined,
      });
      await updateConnectionTestStatus(input.connectionId, result.success ? "success" : "failed");
      return { ...result, databaseType: connection.databaseType };
    }),

  // Preview data from table with pagination and sorting
  previewData: adminProcedure
    .input(z.object({
      connectionId: z.number(),
      tableName: z.string(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
      sortColumn: z.string().optional(),
      sortDirection: z.enum(["asc", "desc"]).default("asc"),
    }))
    .query(async ({ input }) => {
      const { getTableData } = await import("./externalDatabaseService");
      return await getTableData(input.connectionId, input.tableName, {
        page: input.page,
        pageSize: input.pageSize,
        sortColumn: input.sortColumn,
        sortDirection: input.sortDirection,
      });
    }),
});

// Product-Station Mapping Router
const mappingRouter = router({
  list: protectedProcedure.query(async () => {
    return await getProductStationMappings();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductStationMappingById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      productCode: z.string().min(1),
      stationName: z.string().min(1),
      connectionId: z.number(),
      tableName: z.string().min(1),
      productCodeColumn: z.string().default("product_code"),
      stationColumn: z.string().default("station"),
      valueColumn: z.string().default("value"),
      timestampColumn: z.string().default("timestamp"),
      usl: z.number().optional(),
      lsl: z.number().optional(),
      target: z.number().optional(),
      filterConditions: z.string().optional(), // JSON array of filter conditions
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createProductStationMapping({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      productCode: z.string().min(1).optional(),
      stationName: z.string().min(1).optional(),
      connectionId: z.number().optional(),
      tableName: z.string().min(1).optional(),
      productCodeColumn: z.string().optional(),
      stationColumn: z.string().optional(),
      valueColumn: z.string().optional(),
      timestampColumn: z.string().optional(),
      usl: z.number().nullable().optional(),
      lsl: z.number().nullable().optional(),
      target: z.number().nullable().optional(),
      filterConditions: z.string().nullable().optional(), // JSON array of filter conditions
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProductStationMapping(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProductStationMapping(input.id);
      return { success: true };
    }),

  getProductCodes: protectedProcedure.query(async () => {
    return await getUniqueProductCodes();
  }),

  getStations: protectedProcedure
    .input(z.object({ productCode: z.string() }))
    .query(async ({ input }) => {
      return await getStationsByProductCode(input.productCode);
    }),

  // Export all mappings to JSON
  exportAll: adminProcedure.query(async () => {
    const mappings = await getProductStationMappings();
    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      count: mappings.length,
      mappings: mappings.map(m => ({
        productCode: m.productCode,
        stationName: m.stationName,
        connectionId: m.connectionId,
        tableName: m.tableName,
        productCodeColumn: m.productCodeColumn,
        stationColumn: m.stationColumn,
        valueColumn: m.valueColumn,
        timestampColumn: m.timestampColumn,
        usl: m.usl,
        lsl: m.lsl,
        target: m.target,
        filterConditions: m.filterConditions,
      })),
    };
  }),

  // Import mappings from JSON
  importAll: adminProcedure
    .input(z.object({
      mappings: z.array(z.object({
        productCode: z.string(),
        stationName: z.string(),
        connectionId: z.number(),
        tableName: z.string(),
        productCodeColumn: z.string().optional(),
        stationColumn: z.string().optional(),
        valueColumn: z.string().optional(),
        timestampColumn: z.string().optional(),
        usl: z.number().nullable().optional(),
        lsl: z.number().nullable().optional(),
        target: z.number().nullable().optional(),
        filterConditions: z.string().nullable().optional(),
      })),
      skipExisting: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      let imported = 0;
      let skipped = 0;
      for (const mapping of input.mappings) {
        // Check if mapping already exists
        const existing = await findProductStationMapping(mapping.productCode, mapping.stationName);
        if (existing && input.skipExisting) {
          skipped++;
          continue;
        }
        if (existing) {
          // Update existing
          await updateProductStationMapping(existing.id, mapping);
        } else {
          // Create new
          await createProductStationMapping({
            ...mapping,
            productCodeColumn: mapping.productCodeColumn || "product_code",
            stationColumn: mapping.stationColumn || "station",
            valueColumn: mapping.valueColumn || "value",
            timestampColumn: mapping.timestampColumn || "timestamp",
            createdBy: ctx.user.id,
          });
        }
        imported++;
      }
      return { imported, skipped, total: input.mappings.length };
    }),

  // Clone a mapping
  clone: adminProcedure
    .input(z.object({
      id: z.number(),
      newProductCode: z.string().min(1),
      newStationName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const original = await getProductStationMappingById(input.id);
      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Mapping không tồn tại" });
      }
      const newId = await createProductStationMapping({
        productCode: input.newProductCode,
        stationName: input.newStationName,
        connectionId: original.connectionId,
        tableName: original.tableName,
        productCodeColumn: original.productCodeColumn,
        stationColumn: original.stationColumn,
        valueColumn: original.valueColumn,
        timestampColumn: original.timestampColumn,
        usl: original.usl,
        lsl: original.lsl,
        target: original.target,
        filterConditions: original.filterConditions,
        createdBy: ctx.user.id,
      });
      return { id: newId };
    }),
});

// Mapping Template Router
const mappingTemplateRouter = router({
  list: protectedProcedure.query(async () => {
    return await getMappingTemplates();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getMappingTemplateById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      tableName: z.string().optional(),
      productCodeColumn: z.string().optional(),
      stationColumn: z.string().optional(),
      valueColumn: z.string().optional(),
      timestampColumn: z.string().optional(),
      defaultUsl: z.number().optional(),
      defaultLsl: z.number().optional(),
      defaultTarget: z.number().optional(),
      filterConditions: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createMappingTemplate({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      tableName: z.string().nullable().optional(),
      productCodeColumn: z.string().optional(),
      stationColumn: z.string().optional(),
      valueColumn: z.string().optional(),
      timestampColumn: z.string().optional(),
      defaultUsl: z.number().nullable().optional(),
      defaultLsl: z.number().nullable().optional(),
      defaultTarget: z.number().nullable().optional(),
      filterConditions: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMappingTemplate(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMappingTemplate(input.id);
      return { success: true };
    }),

  seedDefaults: adminProcedure.mutation(async () => {
    await seedDefaultMappingTemplates();
    return { success: true };
  }),
});

// SPC Analysis Router
const spcRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      productCode: z.string().min(1),
      stationName: z.string().min(1),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Find the mapping configuration
      const mapping = await findProductStationMapping(input.productCode, input.stationName);
      if (!mapping) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No configuration found for product ${input.productCode} and station ${input.stationName}`,
        });
      }

      // Get the database connection
      const connection = await getDatabaseConnectionById(mapping.connectionId);
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Database connection not found",
        });
      }

      // Query external database for measurement data
      const query = `
        SELECT ${mapping.valueColumn} as value, ${mapping.timestampColumn} as timestamp
        FROM ${mapping.tableName}
        WHERE ${mapping.productCodeColumn} = ?
          AND ${mapping.stationColumn} = ?
          AND ${mapping.timestampColumn} >= ?
          AND ${mapping.timestampColumn} <= ?
        ORDER BY ${mapping.timestampColumn} ASC
      `;

      let rawData: { value: number; timestamp: Date }[];
      try {
        const rows = await queryExternalDatabase(
          connection.connectionString || '',
          query,
          [input.productCode, input.stationName, input.startDate, input.endDate]
        );
        rawData = rows.map(row => ({
          value: Number(row.value),
          timestamp: new Date(row.timestamp as string),
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query external database: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      if (rawData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No data found for the specified criteria",
        });
      }

      // Calculate SPC metrics
      const spcResult = calculateSpc(rawData, mapping.usl, mapping.lsl);

      // Check alert thresholds
      const alertConfig = await getAlertSettings();
      let alertTriggered = 0;
      if (alertConfig && spcResult.cpk !== null) {
        const cpkThreshold = alertConfig.cpkWarningThreshold / 100;
        if (spcResult.cpk < cpkThreshold) {
          alertTriggered = 1;
          // Send notification to owner
          if (alertConfig.notifyOwner) {
            await notifyOwner({
              title: `CPK Alert: ${input.productCode} - ${input.stationName}`,
              content: `CPK value (${spcResult.cpk.toFixed(3)}) is below threshold (${cpkThreshold}). Immediate attention required.`,
            });
          }
          // Send email notification to configured users
          try {
            const { notifyCpkWarning } = await import("./emailService");
            await notifyCpkWarning({
              productCode: input.productCode,
              stationName: input.stationName,
              cpkValue: spcResult.cpk,
              threshold: cpkThreshold,
              mean: spcResult.mean,
              stdDev: spcResult.stdDev,
              sampleCount: spcResult.sampleCount,
              analyzedAt: new Date(),
            });
          } catch (emailError) {
            console.error("Email notification failed:", emailError);
          }
          // Trigger webhooks for CPK alert
          try {
            await triggerWebhooks("cpk_alert", {
              productCode: input.productCode,
              stationName: input.stationName,
              cpk: spcResult.cpk,
              cpkThreshold,
              severity: spcResult.cpk < cpkThreshold * 0.5 ? "critical" : "warning",
              message: `CPK value (${spcResult.cpk.toFixed(3)}) is below threshold (${cpkThreshold})`,
            });
          } catch (webhookError) {
            console.error("Webhook trigger failed:", webhookError);
          }
        }
      }

      // Check custom validation rules
      let validationResults: Array<{ ruleId: number; ruleName: string; passed: boolean; message: string }> = [];
      try {
        // Get custom validation rules for all products (or filter by workstation if available)
        const customRules = await getCustomValidationRulesByProduct(0); // Get all active rules
        for (const rule of customRules) {
          if (!rule.isActive) continue;
          let passed = true;
          let message = '';
          
          switch (rule.ruleType) {
            case 'range_check':
              const config = JSON.parse(rule.ruleConfig || '{}');
              if (config.min !== undefined && spcResult.mean < config.min) {
                passed = false;
                message = `Mean (${spcResult.mean.toFixed(3)}) is below minimum (${config.min})`;
              }
              if (config.max !== undefined && spcResult.mean > config.max) {
                passed = false;
                message = `Mean (${spcResult.mean.toFixed(3)}) is above maximum (${config.max})`;
              }
              break;
            case 'trend_check':
              // Check for trending patterns in data
              const trendConfig = JSON.parse(rule.ruleConfig || '{}');
              const consecutivePoints = trendConfig.consecutivePoints || 7;
              // Simple trend detection - check if values are consistently increasing/decreasing
              if (rawData.length >= consecutivePoints) {
                const recentData = rawData.slice(-consecutivePoints);
                let increasing = true, decreasing = true;
                for (let i = 1; i < recentData.length; i++) {
                  if (recentData[i].value <= recentData[i-1].value) increasing = false;
                  if (recentData[i].value >= recentData[i-1].value) decreasing = false;
                }
                if (increasing || decreasing) {
                  passed = false;
                  message = `Detected ${increasing ? 'increasing' : 'decreasing'} trend in last ${consecutivePoints} points`;
                }
              }
              break;
            case 'formula_check':
              const cpkConfig = JSON.parse(rule.ruleConfig || '{}');
              if (spcResult.cpk !== null && cpkConfig.threshold && spcResult.cpk < cpkConfig.threshold) {
                passed = false;
                message = `CPK (${spcResult.cpk.toFixed(3)}) is below threshold (${cpkConfig.threshold})`;
              }
              break;
          }
          
          validationResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            passed,
            message: passed ? 'Passed' : message,
          });
        }
      } catch (validationError) {
        console.error('Validation rules check failed:', validationError);
      }

      // Store analysis history
      const historyId = await createSpcAnalysisHistory({
        mappingId: mapping.id,
        productCode: input.productCode,
        stationName: input.stationName || '',
        startDate: input.startDate,
        endDate: input.endDate,
        sampleCount: spcResult.sampleCount,
        mean: Math.round(spcResult.mean * 1000),
        stdDev: Math.round(spcResult.stdDev * 1000),
        cp: spcResult.cp ? Math.round(spcResult.cp * 1000) : null,
        cpk: spcResult.cpk ? Math.round(spcResult.cpk * 1000) : null,
        ucl: Math.round(spcResult.ucl * 1000),
        lcl: Math.round(spcResult.lcl * 1000),
        usl: mapping.usl,
        lsl: mapping.lsl,
        alertTriggered,
        analyzedBy: ctx.user.id,
      });

      return {
        id: historyId,
        ...spcResult,
        usl: mapping.usl,
        lsl: mapping.lsl,
        target: mapping.target,
        alertTriggered: alertTriggered === 1,
        validationResults,
      };
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return await getSpcAnalysisHistory(input.limit);
    }),

  historyByMapping: protectedProcedure
    .input(z.object({ mappingId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return await getSpcAnalysisHistoryByMapping(input.mappingId, input.limit);
    }),

  analyzeWithMapping: protectedProcedure
    .input(z.object({
      mappingId: z.number(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get mapping by ID
      const mapping = await getProductStationMappingById(input.mappingId);
      if (!mapping) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mapping configuration not found",
        });
      }

      // Get the database connection
      const connection = await getDatabaseConnectionById(mapping.connectionId);
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Database connection not found",
        });
      }

      // Query external database for measurement data
      const query = `
        SELECT ${mapping.valueColumn} as value, ${mapping.timestampColumn} as timestamp
        FROM ${mapping.tableName}
        WHERE ${mapping.productCodeColumn} = ?
          AND ${mapping.stationColumn} = ?
          AND ${mapping.timestampColumn} >= ?
          AND ${mapping.timestampColumn} <= ?
        ORDER BY ${mapping.timestampColumn} ASC
      `;

      let rawData: { value: number; timestamp: Date }[];
      try {
        const rows = await queryExternalDatabase(
          connection.connectionString || '',
          query,
          [mapping.productCode, mapping.stationName, input.startDate, input.endDate]
        );
        rawData = rows.map(row => ({
          value: Number(row.value),
          timestamp: new Date(row.timestamp as string),
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to query external database: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }

      if (rawData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No data found for the specified criteria",
        });
      }

      // Calculate SPC metrics
      const spcResult = calculateSpc(rawData, mapping.usl, mapping.lsl);

      // Check alert thresholds
      const alertConfig = await getAlertSettings();
      let alertTriggered = 0;
      if (alertConfig && spcResult.cpk !== null) {
        const cpkThreshold = alertConfig.cpkWarningThreshold / 100;
        if (spcResult.cpk < cpkThreshold) {
          alertTriggered = 1;
          if (alertConfig.notifyOwner) {
            await notifyOwner({
              title: `CPK Alert: ${mapping.productCode} - ${mapping.stationName}`,
              content: `CPK value (${spcResult.cpk.toFixed(3)}) is below threshold (${cpkThreshold}). Immediate attention required.`,
            });
          }
          // Send email notification to configured users
          try {
            const { notifyCpkWarning } = await import("./emailService");
            await notifyCpkWarning({
              productCode: mapping.productCode,
              stationName: mapping.stationName,
              cpkValue: spcResult.cpk,
              threshold: cpkThreshold,
              mean: spcResult.mean,
              stdDev: spcResult.stdDev,
              sampleCount: spcResult.sampleCount,
              analyzedAt: new Date(),
            });
          } catch (emailError) {
            console.error("Email notification failed:", emailError);
          }
          // Trigger webhooks for CPK alert
          try {
            await triggerWebhooks("cpk_alert", {
              productCode: mapping.productCode,
              stationName: mapping.stationName,
              cpk: spcResult.cpk,
              cpkThreshold,
              severity: spcResult.cpk < cpkThreshold * 0.5 ? "critical" : "warning",
              message: `CPK value (${spcResult.cpk.toFixed(3)}) is below threshold (${cpkThreshold})`,
            });
          } catch (webhookError) {
            console.error("Webhook trigger failed:", webhookError);
          }
        }
      }

      // Store analysis history
      const historyId = await createSpcAnalysisHistory({
        mappingId: mapping.id,
        productCode: mapping.productCode,
        stationName: mapping.stationName || '',
        startDate: input.startDate,
        endDate: input.endDate,
        sampleCount: spcResult.sampleCount,
        mean: Math.round(spcResult.mean * 1000),
        stdDev: Math.round(spcResult.stdDev * 1000),
        cp: spcResult.cp ? Math.round(spcResult.cp * 1000) : null,
        cpk: spcResult.cpk ? Math.round(spcResult.cpk * 1000) : null,
        ucl: Math.round(spcResult.ucl * 1000),
        lcl: Math.round(spcResult.lcl * 1000),
        usl: mapping.usl,
        lsl: mapping.lsl,
        alertTriggered,
        analyzedBy: ctx.user.id,
      });

      return {
        id: historyId,
        ...spcResult,
        usl: mapping.usl,
        lsl: mapping.lsl,
        target: mapping.target,
        alertTriggered: alertTriggered === 1,
      };
    }),

  // Phân tích thủ công với dữ liệu nhập tay
  analyzeManual: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      data: z.array(z.number()).min(5, "Cần ít nhất 5 giá trị"),
      usl: z.number(),
      lsl: z.number(),
      target: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Chuyển dữ liệu thành format cần thiết
      const now = new Date();
      const rawData = input.data.map((value, index) => ({
        value,
        timestamp: new Date(now.getTime() - (input.data.length - index) * 60000), // Mỗi điểm cách nhau 1 phút
      }));

      // Tính toán SPC
      const spcResult = calculateSpc(rawData, input.usl, input.lsl);

      // Kiểm tra alert
      const alertConfig = await getAlertSettings();
      let alertTriggered = 0;
      if (alertConfig && spcResult.cpk !== null) {
        const cpkThreshold = alertConfig.cpkWarningThreshold / 100;
        if (spcResult.cpk < cpkThreshold) {
          alertTriggered = 1;
        }
      }

      // Lưu lịch sử phân tích
      const historyId = await createSpcAnalysisHistory({
        mappingId: 0, // Manual analysis
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: rawData[0].timestamp,
        endDate: rawData[rawData.length - 1].timestamp,
        sampleCount: spcResult.sampleCount,
        mean: Math.round(spcResult.mean * 1000),
        stdDev: Math.round(spcResult.stdDev * 1000),
        cp: spcResult.cp ? Math.round(spcResult.cp * 1000) : null,
        cpk: spcResult.cpk ? Math.round(spcResult.cpk * 1000) : null,
        ucl: Math.round(spcResult.ucl * 1000),
        lcl: Math.round(spcResult.lcl * 1000),
        usl: input.usl,
        lsl: input.lsl,
        alertTriggered,
        analyzedBy: ctx.user.id,
      });

      // Send SSE notification
      try {
        const { notifySpcAnalysisComplete, notifyCpkAlert } = await import("./sse");
        notifySpcAnalysisComplete({
          productCode: input.productCode,
          stationName: input.stationName,
          cpk: spcResult.cpk || 0,
          mean: spcResult.mean,
          alertTriggered: alertTriggered === 1,
        });
        
        // Send CPK alert if triggered
        if (alertTriggered === 1 && spcResult.cpk !== null) {
          notifyCpkAlert({
            productCode: input.productCode,
            stationName: input.stationName,
            cpk: spcResult.cpk,
            threshold: alertConfig?.cpkWarningThreshold ? alertConfig.cpkWarningThreshold / 100 : 1.0,
            severity: spcResult.cpk < 1.0 ? "critical" : "warning",
          });
        }
      } catch (e) {
        console.error("[SSE] Failed to send notification:", e);
      }

      return {
        id: historyId,
        ...spcResult,
        usl: input.usl,
        lsl: input.lsl,
        target: input.target || null,
        alertTriggered: alertTriggered === 1,
      };
    }),

  // Pagination cho lịch sử phân tích
  historyPaginated: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(20),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      return await getSpcAnalysisHistoryPaginated(
        input.page,
        input.pageSize,
        {
          productCode: input.productCode,
          stationName: input.stationName,
          startDate: input.startDate,
          endDate: input.endDate,
        }
      );
    }),

  // Export lịch sử ra Excel
  exportHistoryExcel: protectedProcedure
    .input(z.object({
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const data = await getSpcAnalysisHistoryPaginated(1, 10000, {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      const buffer = await generateHistoryExcelBuffer(data.data);
      return { base64: buffer.toString("base64"), filename: `spc-history-${Date.now()}.xlsx` };
    }),

  // Export lịch sử ra PDF HTML
  exportHistoryPdf: protectedProcedure
    .input(z.object({
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const data = await getSpcAnalysisHistoryPaginated(1, 10000, {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      const html = generateHistoryPdfHtml(data.data, {
        productCode: input.productCode,
        stationName: input.stationName,
        dateFrom: input.startDate?.toISOString().split("T")[0],
        dateTo: input.endDate?.toISOString().split("T")[0],
      });
      return { html, filename: `spc-history-${Date.now()}.html` };
    }),

  // Lấy dữ liệu realtime theo plan
  getRealtimeData: protectedProcedure
    .input(z.object({
      planId: z.number(),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      return await getSpcRealtimeDataByPlan(input.planId, input.limit);
    }),

  // Lấy dữ liệu realtime theo plan với pagination
  getRealtimeDataPaginated: protectedProcedure
    .input(z.object({
      planId: z.number(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return await getSpcRealtimeDataByPlanPaginated(input.planId, input.page, input.pageSize);
    }),

  // Lấy dữ liệu realtime cho nhiều plans cùng lúc
  getRealtimeDataMultiple: protectedProcedure
    .input(z.object({
      planIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      const result: Record<number, { cpk: number | null; mean: number | null; stdDev: number | null; sampleCount: number; lastUpdated: Date | null; status: string }> = {};
      for (const planId of input.planIds) {
        // Get summary stats instead of realtime data for CPK/Mean
        const stats = await getSpcSummaryStatsByPlan(planId, "day");
        if (stats && stats.length > 0) {
          const latest = stats[0];
          const cpkValue = latest.cpk ? latest.cpk / 1000 : null;
          result[planId] = {
            cpk: cpkValue,
            mean: latest.mean ? latest.mean / 10000 : null,
            stdDev: latest.stdDev ? latest.stdDev / 10000 : null,
            sampleCount: latest.sampleCount || 0,
            lastUpdated: latest.periodEnd,
            status: cpkValue === null ? "unknown" : cpkValue >= 1.33 ? "good" : cpkValue >= 1.0 ? "acceptable" : "poor",
          };
        }
      }
      return result;
    }),

  // Lấy thống kê tổng hợp theo plan
  getSummaryStats: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]).optional(),
    }))
    .query(async ({ input }) => {
      return await getSpcSummaryStatsByPlan(input.planId, input.periodType);
    }),

  // Lấy thống kê tổng hợp theo khoảng thời gian
  getSummaryStatsByTimeRange: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      startTime: z.date(),
      endTime: z.date(),
    }))
    .query(async ({ input }) => {
      return await getSpcSummaryStatsByTimeRange(
        input.planId,
        input.periodType,
        input.startTime,
        input.endTime
      );
    }),

  // Tổng hợp dữ liệu SPC cho một kế hoạch
  aggregatePlan: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      periodStart: z.date(),
      periodEnd: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { aggregateSpcData } = await import("./spcAggregationService");
      const success = await aggregateSpcData(
        input.planId,
        input.periodType,
        input.periodStart,
        input.periodEnd
      );
      return { success };
    }),

  // Tổng hợp dữ liệu SPC cho tất cả kế hoạch đang hoạt động
  aggregateAllActivePlans: protectedProcedure
    .input(z.object({
      periodType: z.enum(["shift", "day", "week", "month"]),
    }))
    .mutation(async ({ input }) => {
      const { aggregateAllActivePlans } = await import("./spcAggregationService");
      const count = await aggregateAllActivePlans(input.periodType);
      return { successCount: count };
    }),

  // Tổng hợp dữ liệu SPC cho một kế hoạch (tất cả các chu kỳ)
  aggregatePlanAllPeriods: protectedProcedure
    .input(z.object({
      planId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { aggregatePlanAllPeriods } = await import("./spcAggregationService");
      const success = await aggregatePlanAllPeriods(input.planId);
      return { success };
    }),

  // Backfill dữ liệu lịch sử
  backfillSummary: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { backfillSpcSummary } = await import("./spcAggregationService");
      const count = await backfillSpcSummary(
        input.planId,
        input.periodType,
        input.startDate,
        input.endDate
      );
      return { successCount: count };
    }),

  // So sánh CPK giữa các ca
  compareShiftCpk: protectedProcedure
    .input(z.object({
      planId: z.number(),
      days: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      const { compareShiftCpk } = await import("./spcAggregationService");
      return await compareShiftCpk(input.planId, input.days);
    }),

  // Lấy thống kê theo ca cho một ngày
  getShiftSummaryForDay: protectedProcedure
    .input(z.object({
      planId: z.number(),
      date: z.date(),
    }))
    .query(async ({ input }) => {
      const { getShiftSummaryForDay } = await import("./spcAggregationService");
      return await getShiftSummaryForDay(input.planId, input.date);
    }),

  // Lấy dữ liệu báo cáo SPC Summary
  getSummaryReportData: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const { getSpcSummaryReportData } = await import("./services/spcSummaryReportService");
      return await getSpcSummaryReportData(
        input.planId,
        input.periodType,
        input.startDate,
        input.endDate
      );
    }),

  // Xuất báo cáo SPC Summary dạng HTML
  exportSummaryReportHtml: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { generateSpcSummaryReportHtml } = await import("./services/spcSummaryReportService");
      const html = await generateSpcSummaryReportHtml(
        input.planId,
        input.periodType,
        input.startDate,
        input.endDate
      );
      return { html };
    }),

  // Xuất báo cáo SPC Summary dạng CSV
  exportSummaryReportCsv: protectedProcedure
    .input(z.object({
      planId: z.number(),
      periodType: z.enum(["shift", "day", "week", "month"]),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { generateSpcSummaryCsv } = await import("./services/spcSummaryReportService");
      const csv = await generateSpcSummaryCsv(
        input.planId,
        input.periodType,
        input.startDate,
        input.endDate
      );
      return { csv };
    }),

  llmAnalysis: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      spcData: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        usl: z.number().nullable(),
        lsl: z.number().nullable(),
      }),
      xBarData: z.array(z.object({
        index: z.number(),
        value: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Check if LLM is available (offline mode check)
      const { isLlmAvailable } = await import("./offlineConfig");
      
      if (!isLlmAvailable()) {
        // Return a basic analysis when LLM is not available (offline mode)
        const cpkValue = input.spcData.cpk;
        let cpkAssessment = "";
        let recommendation = "";
        
        if (cpkValue === null) {
          cpkAssessment = "Không thể tính CPK (thiếu USL/LSL)";
          recommendation = "Cần xác định giới hạn kỹ thuật (USL/LSL) để đánh giá năng lực quy trình.";
        } else if (cpkValue >= 1.67) {
          cpkAssessment = "Xuất sắc (CPK >= 1.67)";
          recommendation = "Quy trình hoạt động rất tốt. Duy trì các điều kiện hiện tại.";
        } else if (cpkValue >= 1.33) {
          cpkAssessment = "Tốt (CPK >= 1.33)";
          recommendation = "Quy trình ổn định. Tiếp tục giám sát để duy trì chất lượng.";
        } else if (cpkValue >= 1.0) {
          cpkAssessment = "Chấp nhận được (CPK >= 1.0)";
          recommendation = "Cần cải thiện quy trình. Xem xét giảm biến động hoặc điều chỉnh tâm quy trình.";
        } else {
          cpkAssessment = "Không đạt (CPK < 1.0)";
          recommendation = "Cần cải tiến ngay. Kiểm tra nguyên nhân gốc của biến động và thực hiện hành động khắc phục.";
        }
        
        return {
          analysis: `## Phân tích SPC/CPK (Chế độ Offline)

**Sản phẩm:** ${input.productCode}  
**Trạm:** ${input.stationName}

### Thống kê cơ bản
- Số mẫu: ${input.spcData.sampleCount}
- Trung bình: ${input.spcData.mean.toFixed(4)}
- Độ lệch chuẩn: ${input.spcData.stdDev.toFixed(4)}
- Cp: ${input.spcData.cp?.toFixed(3) || "N/A"}
- Cpk: ${input.spcData.cpk?.toFixed(3) || "N/A"}

### Đánh giá năng lực quy trình
${cpkAssessment}

### Khuyến nghị
${recommendation}

---
*Lưu ý: Phân tích này được tạo tự động trong chế độ offline. Để có phân tích chi tiết hơn, vui lòng kết nối internet và sử dụng tính năng phân tích AI.*`,
        };
      }
      
      const prompt = `Bạn là chuyên gia phân tích SPC/CPK trong sản xuất. Hãy phân tích dữ liệu sau và đưa ra nhận xét, khuyến nghị cải tiến:

Sản phẩm: ${input.productCode}
Trạm sản xuất: ${input.stationName}

Thống kê:
- Số mẫu: ${input.spcData.sampleCount}
- Trung bình (Mean): ${input.spcData.mean.toFixed(4)}
- Độ lệch chuẩn (Std Dev): ${input.spcData.stdDev.toFixed(4)}
- Cp: ${input.spcData.cp?.toFixed(3) || "N/A"}
- Cpk: ${input.spcData.cpk?.toFixed(3) || "N/A"}
- UCL: ${input.spcData.ucl.toFixed(4)}
- LCL: ${input.spcData.lcl.toFixed(4)}
- USL: ${input.spcData.usl || "N/A"}
- LSL: ${input.spcData.lsl || "N/A"}

Xu hướng X-bar (${input.xBarData.length} điểm):
${input.xBarData.slice(-10).map(d => `  Point ${d.index}: ${d.value.toFixed(4)}`).join("\n")}

Hãy phân tích:
1. Đánh giá năng lực quy trình (Cp, Cpk)
2. Nhận xét về xu hướng dữ liệu
3. Các điểm bất thường (nếu có)
4. Khuyến nghị cải tiến cụ thể

Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Bạn là chuyên gia phân tích SPC/CPK trong sản xuất công nghiệp." },
          { role: "user", content: prompt },
        ],
      });

      return {
        analysis: response.choices[0]?.message?.content || "Không thể phân tích dữ liệu.",
      };
    }),

  // Export CPK Comparison to Excel
  exportCpkComparisonExcel: protectedProcedure
    .input(z.object({
      data: z.array(z.object({
        name: z.string(),
        avgCpk: z.number(),
        avgCp: z.number(),
        minCpk: z.number(),
        maxCpk: z.number(),
        count: z.number(),
      })),
      compareBy: z.enum(["line", "workstation"]),
      timeRange: z.string(),
    }))
    .mutation(async ({ input }) => {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      
      // Sheet 1: Ranking
      const rankingSheet = workbook.addWorksheet('Xếp hạng CPK');
      rankingSheet.columns = [
        { header: 'Hạng', key: 'rank', width: 8 },
        { header: input.compareBy === 'line' ? 'Dây chuyền' : 'Công trạm', key: 'name', width: 25 },
        { header: 'CPK TB', key: 'avgCpk', width: 12 },
        { header: 'CP TB', key: 'avgCp', width: 12 },
        { header: 'CPK Min', key: 'minCpk', width: 12 },
        { header: 'CPK Max', key: 'maxCpk', width: 12 },
        { header: 'Số mẫu', key: 'count', width: 10 },
        { header: 'Đánh giá', key: 'rating', width: 15 },
      ];
      
      // Style header
      rankingSheet.getRow(1).font = { bold: true };
      rankingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
      rankingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      
      input.data.forEach((item, index) => {
        const rating = item.avgCpk >= 1.67 ? 'Xuất sắc' :
                       item.avgCpk >= 1.33 ? 'Tốt' :
                       item.avgCpk >= 1.0 ? 'Chấp nhận' :
                       item.avgCpk >= 0.67 ? 'Cần cải thiện' : 'Kém';
        
        const row = rankingSheet.addRow({
          rank: index + 1,
          name: item.name,
          avgCpk: item.avgCpk.toFixed(3),
          avgCp: item.avgCp.toFixed(3),
          minCpk: item.minCpk.toFixed(3),
          maxCpk: item.maxCpk.toFixed(3),
          count: item.count,
          rating,
        });
        
        // Color based on CPK
        const cpkCell = row.getCell('avgCpk');
        if (item.avgCpk >= 1.67) {
          cpkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '22C55E' } };
        } else if (item.avgCpk >= 1.33) {
          cpkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
        } else if (item.avgCpk >= 1.0) {
          cpkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F59E0B' } };
        } else {
          cpkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EF4444' } };
        }
        cpkCell.font = { color: { argb: 'FFFFFF' }, bold: true };
      });
      
      // Sheet 2: Summary
      const summarySheet = workbook.addWorksheet('Tổng hợp');
      const totalItems = input.data.length;
      const avgCpkAll = input.data.reduce((a, b) => a + b.avgCpk, 0) / totalItems;
      const excellent = input.data.filter(d => d.avgCpk >= 1.67).length;
      const good = input.data.filter(d => d.avgCpk >= 1.33 && d.avgCpk < 1.67).length;
      const acceptable = input.data.filter(d => d.avgCpk >= 1.0 && d.avgCpk < 1.33).length;
      const poor = input.data.filter(d => d.avgCpk < 1.0).length;
      
      summarySheet.addRow(['BÁO CÁO SO SÁNH CPK']);
      summarySheet.addRow([`Thời gian: ${input.timeRange} ngày qua`]);
      summarySheet.addRow([`So sánh theo: ${input.compareBy === 'line' ? 'Dây chuyền' : 'Công trạm'}`]);
      summarySheet.addRow([]);
      summarySheet.addRow(['Tổng số:', totalItems]);
      summarySheet.addRow(['CPK trung bình:', avgCpkAll.toFixed(3)]);
      summarySheet.addRow([]);
      summarySheet.addRow(['Phân loại:']);
      summarySheet.addRow(['  - Xuất sắc (>=1.67):', excellent]);
      summarySheet.addRow(['  - Tốt (>=1.33):', good]);
      summarySheet.addRow(['  - Chấp nhận (>=1.0):', acceptable]);
      summarySheet.addRow(['  - Cần cải thiện (<1.0):', poor]);
      
      const buffer = await workbook.xlsx.writeBuffer();
      const { storagePut } = await import("./storage");
      const fileName = `cpk-comparison-${Date.now()}.xlsx`;
      const { url } = await storagePut(fileName, Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      return { url, fileName };
    }),

  // Export CPK Comparison to PDF/HTML
  exportCpkComparisonPdf: protectedProcedure
    .input(z.object({
      data: z.array(z.object({
        name: z.string(),
        avgCpk: z.number(),
        avgCp: z.number(),
        minCpk: z.number(),
        maxCpk: z.number(),
        count: z.number(),
      })),
      compareBy: z.enum(["line", "workstation"]),
      timeRange: z.string(),
    }))
    .mutation(async ({ input }) => {
      const totalItems = input.data.length;
      const avgCpkAll = input.data.reduce((a, b) => a + b.avgCpk, 0) / totalItems;
      const excellent = input.data.filter(d => d.avgCpk >= 1.67).length;
      const good = input.data.filter(d => d.avgCpk >= 1.33 && d.avgCpk < 1.67).length;
      const acceptable = input.data.filter(d => d.avgCpk >= 1.0 && d.avgCpk < 1.33).length;
      const poor = input.data.filter(d => d.avgCpk < 1.0).length;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Báo cáo So sánh CPK</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e293b; }
            .summary { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
            .card { background: #f8fafc; padding: 15px; border-radius: 8px; min-width: 150px; }
            .card-value { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #3b82f6; color: white; }
            .excellent { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; }
            .good { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; }
            .acceptable { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; }
            .poor { background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>📊 Báo cáo So sánh CPK</h1>
          <p>Thời gian: ${input.timeRange} ngày qua | So sánh theo: ${input.compareBy === 'line' ? 'Dây chuyền' : 'Công trạm'}</p>
          
          <div class="summary">
            <div class="card">
              <div style="color: #64748b;">Tổng số</div>
              <div class="card-value">${totalItems}</div>
            </div>
            <div class="card">
              <div style="color: #64748b;">CPK TB</div>
              <div class="card-value" style="color: ${avgCpkAll >= 1.33 ? '#22c55e' : '#ef4444'};">${avgCpkAll.toFixed(3)}</div>
            </div>
            <div class="card">
              <div style="color: #64748b;">Xuất sắc</div>
              <div class="card-value" style="color: #22c55e;">${excellent}</div>
            </div>
            <div class="card">
              <div style="color: #64748b;">Cần cải thiện</div>
              <div class="card-value" style="color: #ef4444;">${poor}</div>
            </div>
          </div>
          
          <h2>Bảng xếp hạng</h2>
          <table>
            <tr>
              <th>Hạng</th>
              <th>${input.compareBy === 'line' ? 'Dây chuyền' : 'Công trạm'}</th>
              <th>CPK TB</th>
              <th>CP TB</th>
              <th>CPK Min</th>
              <th>CPK Max</th>
              <th>Số mẫu</th>
              <th>Đánh giá</th>
            </tr>
            ${input.data.map((item, index) => {
              const rating = item.avgCpk >= 1.67 ? 'excellent' :
                             item.avgCpk >= 1.33 ? 'good' :
                             item.avgCpk >= 1.0 ? 'acceptable' : 'poor';
              const ratingText = item.avgCpk >= 1.67 ? 'Xuất sắc' :
                                 item.avgCpk >= 1.33 ? 'Tốt' :
                                 item.avgCpk >= 1.0 ? 'Chấp nhận' : 'Cần cải thiện';
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td><strong>${item.avgCpk.toFixed(3)}</strong></td>
                  <td>${item.avgCp.toFixed(3)}</td>
                  <td>${item.minCpk.toFixed(3)}</td>
                  <td>${item.maxCpk.toFixed(3)}</td>
                  <td>${item.count}</td>
                  <td><span class="${rating}">${ratingText}</span></td>
                </tr>
              `;
            }).join('')}
          </table>
          
          <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
            Tạo lúc: ${new Date().toLocaleString('vi-VN')} | SPC/CPK Calculator
          </p>
        </body>
        </html>
      `;
      
      const { storagePut } = await import("./storage");
      const fileName = `cpk-comparison-${Date.now()}.html`;
      const { url } = await storagePut(fileName, Buffer.from(html), 'text/html');
      
      return { url, fileName };
    }),

  // Compare CPK algorithms
  compareCpkAlgorithms: protectedProcedure
    .input(z.object({
      historicalDays: z.number().default(30),
      predictionDays: z.number().default(14),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { algorithms: [], chartData: [], recommendation: null };
      
      // Get historical CPK data
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.historicalDays);
      
      const historicalData = await db
        .select({
          date: sql<string>`DATE(createdAt)`,
          avgCpk: sql<number>`AVG(cpk)`,
        })
        .from(spcAnalysisHistory)
        .where(and(
          gte(spcAnalysisHistory.createdAt, startDate),
          sql`cpk IS NOT NULL`
        ))
        .groupBy(sql`DATE(createdAt)`)
        .orderBy(sql`DATE(createdAt)`);
      
      if (historicalData.length < 5) {
        return { algorithms: [], chartData: [], recommendation: null, error: 'Không đủ dữ liệu lịch sử' };
      }
      
      const cpkValues = historicalData.map(d => Number(d.avgCpk) || 0);
      
      // Linear Regression
      const linearRegression = (data: number[]) => {
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += data[i];
          sumXY += i * data[i];
          sumX2 += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const predictions: number[] = [];
        for (let i = 0; i < input.predictionDays; i++) {
          predictions.push(slope * (n + i) + intercept);
        }
        
        const ssRes = data.reduce((a, b, i) => a + Math.pow(b - (slope * i + intercept), 2), 0);
        const mean = sumY / n;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const r2 = 1 - ssRes / ssTotal;
        const rmse = Math.sqrt(ssRes / n);
        
        return { predictions, r2: Math.max(0, r2), rmse };
      };
      
      // Moving Average
      const movingAverage = (data: number[], window: number = 7) => {
        const lastWindow = data.slice(-window);
        const avg = lastWindow.reduce((a, b) => a + b, 0) / window;
        const predictions = Array(input.predictionDays).fill(avg);
        const variance = lastWindow.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / window;
        const rmse = Math.sqrt(variance);
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const r2 = 1 - variance / (ssTotal / data.length);
        return { predictions, r2: Math.max(0, r2), rmse };
      };
      
      // Exponential Smoothing
      const exponentialSmoothing = (data: number[], alpha: number = 0.3) => {
        let forecast = data[0];
        for (let i = 1; i < data.length; i++) {
          forecast = alpha * data[i] + (1 - alpha) * forecast;
        }
        const predictions = Array(input.predictionDays).fill(forecast);
        
        let tempForecast = data[0];
        let sumSquaredError = 0;
        for (let i = 1; i < data.length; i++) {
          sumSquaredError += Math.pow(data[i] - tempForecast, 2);
          tempForecast = alpha * data[i] + (1 - alpha) * tempForecast;
        }
        const rmse = Math.sqrt(sumSquaredError / (data.length - 1));
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const r2 = 1 - sumSquaredError / ssTotal;
        
        return { predictions, r2: Math.max(0, r2), rmse };
      };
      
      const linearResult = linearRegression(cpkValues);
      const maResult = movingAverage(cpkValues);
      const esResult = exponentialSmoothing(cpkValues);
      
      const algorithms = [
        { name: 'Linear Regression', code: 'linear', predictions: linearResult.predictions, r2: linearResult.r2, rmse: linearResult.rmse },
        { name: 'Moving Average', code: 'moving_avg', predictions: maResult.predictions, r2: maResult.r2, rmse: maResult.rmse },
        { name: 'Exponential Smoothing', code: 'exp_smoothing', predictions: esResult.predictions, r2: esResult.r2, rmse: esResult.rmse },
      ];
      
      // Generate chart data
      const chartData: any[] = [];
      historicalData.forEach((d, i) => {
        chartData.push({ date: d.date, actual: Number(d.avgCpk) || 0, linear: null, movingAvg: null, expSmoothing: null });
      });
      
      for (let i = 0; i < input.predictionDays; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i + 1);
        chartData.push({
          date: futureDate.toISOString().split('T')[0],
          actual: null,
          linear: linearResult.predictions[i],
          movingAvg: maResult.predictions[i],
          expSmoothing: esResult.predictions[i],
        });
      }
      
      const bestAlgorithm = algorithms.reduce((best, current) => {
        const bestScore = best.r2 * 0.6 + (1 / (1 + best.rmse)) * 0.4;
        const currentScore = current.r2 * 0.6 + (1 / (1 + current.rmse)) * 0.4;
        return currentScore > bestScore ? current : best;
      });
      
      return {
        algorithms,
        chartData,
        recommendation: {
          algorithm: bestAlgorithm.name,
          code: bestAlgorithm.code,
          reason: `${bestAlgorithm.name} có R² = ${(bestAlgorithm.r2 * 100).toFixed(1)}% và RMSE = ${bestAlgorithm.rmse.toFixed(4)}, phù hợp nhất với dữ liệu CPK hiện tại.`,
        },
      };
    }),

  // SPC-02: Get SPC Summary Stats by time range (alternate version)
  getSummaryStatsByTimeRangeV2: protectedProcedure
    .input(z.object({
      periodType: z.enum(["shift", "day", "week", "month"]),
      startTime: z.string(),
      endTime: z.string(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { getSummaryByTimeRange } = await import("./services/spcSummaryService");
      return await getSummaryByTimeRange(
        input.periodType,
        new Date(input.startTime),
        new Date(input.endTime),
        input.productionLineId
      );
    }),

  // SPC-04: Compare CPK by shift (alternate version)
  compareShiftCpkV2: protectedProcedure
    .input(z.object({
      productionLineId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const { compareShiftCpk } = await import("./services/spcSummaryService");
      return await compareShiftCpk(
        input.productionLineId,
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // SPC-05: Get CPK forecast data
  getCpkForecastData: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      mappingId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      const conditions = [
        gte(spcAnalysisHistory.createdAt, startDate),
        sql`cpk IS NOT NULL`,
      ];
      
      if (input.mappingId) {
        conditions.push(eq(spcAnalysisHistory.mappingId, input.mappingId));
      }
      
      const data = await db
        .select({
          date: sql<string>`DATE(createdAt)`,
          cpk: sql<number>`AVG(cpk) / 1000`,
          cp: sql<number>`AVG(cp) / 1000`,
          ppk: sql<number>`AVG(COALESCE(ppk, cpk)) / 1000`,
        })
        .from(spcAnalysisHistory)
        .where(and(...conditions))
        .groupBy(sql`DATE(createdAt)`)
        .orderBy(sql`DATE(createdAt)`);
      
      return data.map(d => ({
        date: new Date(d.date),
        cpk: Number(d.cpk) || 0,
        cp: Number(d.cp) || 0,
        ppk: Number(d.ppk) || 0,
      }));
    }),

  // Get CPK trend data for chart
  getCpkTrend: protectedProcedure
    .input(z.object({
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };

      // Default date range based on groupBy
      const endDate = input.endDate || new Date();
      const startDate = input.startDate || (() => {
        const d = new Date();
        if (input.groupBy === 'day') d.setDate(d.getDate() - 30);
        else if (input.groupBy === 'week') d.setDate(d.getDate() - 90);
        else d.setMonth(d.getMonth() - 12);
        return d;
      })();

      const conditions = [
        gte(spcAnalysisHistory.createdAt, startDate),
        lte(spcAnalysisHistory.createdAt, endDate),
        sql`cpk IS NOT NULL`,
      ];

      if (input.productCode) {
        conditions.push(eq(spcAnalysisHistory.productCode, input.productCode));
      }
      if (input.stationName) {
        conditions.push(eq(spcAnalysisHistory.stationName, input.stationName));
      }

      const dateFormat = input.groupBy === 'day' 
        ? sql`DATE(createdAt)`
        : input.groupBy === 'week'
        ? sql`DATE_FORMAT(createdAt, '%Y-%u')`
        : sql`DATE_FORMAT(createdAt, '%Y-%m')`;

      const data = await db
        .select({
          date: dateFormat,
          avgCpk: sql<number>`AVG(cpk) / 1000`,
          minCpk: sql<number>`MIN(cpk) / 1000`,
          maxCpk: sql<number>`MAX(cpk) / 1000`,
          count: sql<number>`COUNT(*)`,
        })
        .from(spcAnalysisHistory)
        .where(and(...conditions))
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      return {
        items: data.map(d => ({
          date: String(d.date),
          avgCpk: Number(d.avgCpk) || 0,
          minCpk: Number(d.minCpk) || 0,
          maxCpk: Number(d.maxCpk) || 0,
          count: Number(d.count) || 0,
        })),
      };
    }),
});

// Export Router
const exportRouter = router({
  csv: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        xBarData: z.array(z.object({
          index: z.number(),
          value: z.number(),
          timestamp: z.date(),
        })),
        rangeData: z.array(z.object({
          index: z.number(),
          value: z.number(),
        })),
        rawData: z.array(z.object({
          value: z.number(),
          timestamp: z.date(),
        })),
      }),
    }))
    .mutation(async ({ input }) => {
      const exportData: ExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        spcResult: input.spcResult,
        analysisDate: new Date(),
      };
      return { content: generateCsvContent(exportData), filename: `spc_report_${input.productCode}_${Date.now()}.csv` };
    }),

  html: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        xBarData: z.array(z.object({
          index: z.number(),
          value: z.number(),
          timestamp: z.date(),
        })),
        rangeData: z.array(z.object({
          index: z.number(),
          value: z.number(),
        })),
        rawData: z.array(z.object({
          value: z.number(),
          timestamp: z.date(),
        })),
      }),
    }))
    .mutation(async ({ input }) => {
      const exportData: ExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        spcResult: input.spcResult,
        analysisDate: new Date(),
      };
      return { content: generateHtmlReport(exportData), filename: `spc_report_${input.productCode}_${Date.now()}.html` };
    }),

  pdf: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        usl: z.number().nullable().optional(),
        lsl: z.number().nullable().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const exportData: ExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        spcResult: { ...input.spcResult, xBarData: [], rangeData: [], rawData: [] },
        analysisDate: new Date(),
      };
      return { content: generateHtmlReport(exportData), filename: `spc_report_${input.productCode}_${Date.now()}.html` };
    }),

  excel: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        usl: z.number().nullable().optional(),
        lsl: z.number().nullable().optional(),
      }),
      rawData: z.array(z.object({
        value: z.number(),
        timestamp: z.date(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const exportData: ExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        spcResult: { ...input.spcResult, xBarData: [], rangeData: [], rawData: input.rawData || [] },
        analysisDate: new Date(),
      };
      return { content: generateCsvContent(exportData), filename: `spc_report_${input.productCode}_${Date.now()}.csv` };
    }),

  // Enhanced PDF export with professional formatting and template support
  pdfEnhanced: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      analysisType: z.enum(["single", "batch", "spc-plan"]).optional(),
      planName: z.string().optional(),
      usl: z.number().nullable().optional(),
      lsl: z.number().nullable().optional(),
      target: z.number().nullable().optional(),
      useTemplate: z.boolean().optional(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        xBarData: z.array(z.object({
          index: z.number(),
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
        rangeData: z.array(z.object({
          index: z.number(),
          value: z.number(),
        })).optional(),
        rawData: z.array(z.object({
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get default template if useTemplate is not explicitly false
      let template = null;
      if (input.useTemplate !== false) {
        template = await getDefaultReportTemplate();
      }
      
      const exportData: EnhancedExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        analysisType: input.analysisType,
        planName: input.planName,
        usl: input.usl,
        lsl: input.lsl,
        target: input.target,
        template: template,
        spcResult: {
          ...input.spcResult,
          xBarData: input.spcResult.xBarData || [],
          rangeData: input.spcResult.rangeData || [],
          rawData: input.spcResult.rawData || [],
        },
        analysisDate: new Date(),
      };
      const html = generatePdfHtml(exportData);
      const filename = `spc_report_${input.productCode}_${Date.now()}.html`;
      
      // Upload to S3
      let fileUrl: string | null = null;
      try {
        const s3Key = `exports/pdf/${ctx.user.id}/${filename}`;
        const { url } = await storagePut(s3Key, html, 'text/html');
        fileUrl = url;
      } catch (error) {
        console.error('Failed to upload PDF to S3:', error);
      }
      
      // Save to export history
      await createExportHistory({
        userId: ctx.user.id,
        exportType: 'pdf',
        productCode: input.productCode,
        stationName: input.stationName,
        analysisType: input.analysisType || 'single',
        startDate: input.startDate,
        endDate: input.endDate,
        sampleCount: input.spcResult.sampleCount,
        mean: Math.round(input.spcResult.mean * 10000),
        cpk: input.spcResult.cpk ? Math.round(input.spcResult.cpk * 10000) : null,
        fileName: filename,
        fileSize: html.length,
        fileUrl: fileUrl,
      });
      
      return { content: html, filename, mimeType: "text/html", fileUrl };
    }),

  // Enhanced Excel export with multiple sheets
  excelEnhanced: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      analysisType: z.enum(["single", "batch", "spc-plan"]).optional(),
      planName: z.string().optional(),
      usl: z.number().nullable().optional(),
      lsl: z.number().nullable().optional(),
      target: z.number().nullable().optional(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        xBarData: z.array(z.object({
          index: z.number(),
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
        rangeData: z.array(z.object({
          index: z.number(),
          value: z.number(),
        })).optional(),
        rawData: z.array(z.object({
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const exportData: EnhancedExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        analysisType: input.analysisType,
        planName: input.planName,
        usl: input.usl,
        lsl: input.lsl,
        target: input.target,
        spcResult: {
          ...input.spcResult,
          xBarData: input.spcResult.xBarData || [],
          rangeData: input.spcResult.rangeData || [],
          rawData: input.spcResult.rawData || [],
        },
        analysisDate: new Date(),
      };
      const buffer = await generateExcelBuffer(exportData);
      const base64 = buffer.toString("base64");
      const filename = `spc_report_${input.productCode}_${Date.now()}.xlsx`;
      
      // Upload to S3
      let fileUrl: string | null = null;
      try {
        const s3Key = `exports/excel/${ctx.user.id}/${filename}`;
        const { url } = await storagePut(s3Key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        fileUrl = url;
      } catch (error) {
        console.error('Failed to upload Excel to S3:', error);
      }
      
      // Save to export history
      await createExportHistory({
        userId: ctx.user.id,
        exportType: 'excel',
        productCode: input.productCode,
        stationName: input.stationName,
        analysisType: input.analysisType || 'single',
        startDate: input.startDate,
        endDate: input.endDate,
        sampleCount: input.spcResult.sampleCount,
        mean: Math.round(input.spcResult.mean * 10000),
        cpk: input.spcResult.cpk ? Math.round(input.spcResult.cpk * 10000) : null,
        fileName: filename,
        fileSize: buffer.length,
        fileUrl: fileUrl,
      });
      
      return { 
        content: base64, 
        filename, 
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        isBase64: true,
        fileUrl
      };
    }),

  // Enhanced CSV export
  csvEnhanced: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      analysisType: z.enum(["single", "batch", "spc-plan"]).optional(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
        xBarData: z.array(z.object({
          index: z.number(),
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
        rangeData: z.array(z.object({
          index: z.number(),
          value: z.number(),
        })).optional(),
        rawData: z.array(z.object({
          value: z.number(),
          timestamp: z.date(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const exportData: EnhancedExportData = {
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        analysisType: input.analysisType,
        spcResult: {
          ...input.spcResult,
          xBarData: input.spcResult.xBarData || [],
          rangeData: input.spcResult.rangeData || [],
          rawData: input.spcResult.rawData || [],
        },
        analysisDate: new Date(),
      };
      const csv = generateEnhancedCsv(exportData);
      return { content: csv, filename: `spc_report_${input.productCode}_${Date.now()}.csv`, mimeType: "text/csv" };
    }),

  // Send report via email
  sendReportEmail: protectedProcedure
    .input(z.object({
      recipientEmail: z.string().email(),
      productCode: z.string(),
      stationName: z.string(),
      reportType: z.enum(["pdf", "excel"]),
      fileUrl: z.string().optional(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        cpk: z.number().nullable(),
        cp: z.number().nullable(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sendEmail } = await import("./emailService");
      
      const cpkValue = input.spcResult.cpk ? input.spcResult.cpk.toFixed(2) : 'N/A';
      const cpValue = input.spcResult.cp ? input.spcResult.cp.toFixed(2) : 'N/A';
      
      const subject = `[SPC/CPK Report] ${input.productCode} - ${input.stationName}`;
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1a56db; }
    .cpk-good { color: #10b981; }
    .cpk-warning { color: #f59e0b; }
    .cpk-bad { color: #ef4444; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .download-btn { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SPC/CPK Analysis Report</h1>
      <p>${input.productCode} - ${input.stationName}</p>
    </div>
    <div class="content">
      <h2>Analysis Summary</h2>
      <div class="stats">
        <div class="stat-box">
          <div class="stat-label">Sample Count</div>
          <div class="stat-value">${input.spcResult.sampleCount}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Mean</div>
          <div class="stat-value">${input.spcResult.mean.toFixed(4)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Std Dev</div>
          <div class="stat-value">${input.spcResult.stdDev.toFixed(4)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">CPK</div>
          <div class="stat-value ${input.spcResult.cpk && input.spcResult.cpk >= 1.33 ? 'cpk-good' : input.spcResult.cpk && input.spcResult.cpk >= 1.0 ? 'cpk-warning' : 'cpk-bad'}">${cpkValue}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">CP</div>
          <div class="stat-value">${cpValue}</div>
        </div>
      </div>
      ${input.fileUrl ? `
      <p>You can download the full ${input.reportType.toUpperCase()} report using the link below:</p>
      <a href="${input.fileUrl}" class="download-btn">Download ${input.reportType.toUpperCase()} Report</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>This report was generated by SPC/CPK Calculator</p>
      <p>Sent by: ${ctx.user.name || ctx.user.email || 'Unknown'}</p>
      <p>Generated at: ${new Date().toLocaleString('vi-VN')}</p>
    </div>
  </div>
</body>
</html>
      `;
      
      const result = await sendEmail(input.recipientEmail, subject, html);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to send email',
        });
      }
      
      return { success: true, message: `Report sent to ${input.recipientEmail}` };
    }),

  // Export Fixture Comparison Report - HTML/PDF
  fixtureReportHtml: protectedProcedure
    .input(z.object({
      fixtureIds: z.array(z.number()).min(1),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateFixtureReportHtml } = await import("./services/fixtureReportService");
      const html = await generateFixtureReportHtml(input.fixtureIds, input.startDate, input.endDate);
      const filename = `fixture_comparison_report_${Date.now()}.html`;
      
      // Upload to S3
      let fileUrl: string | null = null;
      try {
        const s3Key = `exports/fixture-reports/${ctx.user.id}/${filename}`;
        const { url } = await storagePut(s3Key, html, 'text/html');
        fileUrl = url;
      } catch (error) {
        console.error('Failed to upload Fixture Report to S3:', error);
      }
      
      return { content: html, filename, mimeType: "text/html", fileUrl };
    }),

  // Export Fixture Comparison Report - Excel
  fixtureReportExcel: protectedProcedure
    .input(z.object({
      fixtureIds: z.array(z.number()).min(1),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateFixtureReportExcel } = await import("./services/fixtureReportService");
      const buffer = await generateFixtureReportExcel(input.fixtureIds, input.startDate, input.endDate);
      const base64 = buffer.toString("base64");
      const filename = `fixture_comparison_report_${Date.now()}.xlsx`;
      
      // Upload to S3
      let fileUrl: string | null = null;
      try {
        const s3Key = `exports/fixture-reports/${ctx.user.id}/${filename}`;
        const { url } = await storagePut(s3Key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        fileUrl = url;
      } catch (error) {
        console.error('Failed to upload Fixture Excel Report to S3:', error);
      }
      
      return { 
        content: base64, 
        filename, 
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        isBase64: true,
        fileUrl
      };
    }),

  // Get Fixture Comparison Data (for preview)
  getFixtureComparisonData: protectedProcedure
    .input(z.object({
      fixtureIds: z.array(z.number()).min(1),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const { getFixtureComparisonData } = await import("./services/fixtureReportService");
      return await getFixtureComparisonData(input.fixtureIds, input.startDate, input.endDate);
    }),

  // Export AI Analysis Report to PDF
  aiAnalysisPdf: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      aiAnalysis: z.string(),
      spcResult: z.object({
        sampleCount: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        min: z.number(),
        max: z.number(),
        range: z.number(),
        cp: z.number().nullable(),
        cpk: z.number().nullable(),
        cpu: z.number().nullable(),
        cpl: z.number().nullable(),
        ucl: z.number(),
        lcl: z.number(),
        uclR: z.number(),
        lclR: z.number(),
      }),
      usl: z.number().nullable().optional(),
      lsl: z.number().nullable().optional(),
      target: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateAiAnalysisPdfHtml } = await import("./services/aiReportService");
      const html = await generateAiAnalysisPdfHtml({
        productCode: input.productCode,
        stationName: input.stationName,
        startDate: input.startDate,
        endDate: input.endDate,
        aiAnalysis: input.aiAnalysis,
        spcResult: input.spcResult,
        usl: input.usl,
        lsl: input.lsl,
        target: input.target,
        generatedBy: ctx.user.name || ctx.user.email || 'Unknown',
      });
      const filename = `ai_analysis_report_${input.productCode}_${Date.now()}.html`;
      
      // Upload to S3
      let fileUrl: string | null = null;
      try {
        const s3Key = `exports/ai-reports/${ctx.user.id}/${filename}`;
        const { url } = await storagePut(s3Key, html, 'text/html');
        fileUrl = url;
      } catch (error) {
        console.error('Failed to upload AI Report to S3:', error);
      }
      
      // Save to export history
      await createExportHistory({
        userId: ctx.user.id,
        exportType: 'ai-pdf',
        productCode: input.productCode,
        stationName: input.stationName,
        analysisType: 'ai-analysis',
        startDate: input.startDate,
        endDate: input.endDate,
        sampleCount: input.spcResult.sampleCount,
        mean: Math.round(input.spcResult.mean * 10000),
        cpk: input.spcResult.cpk ? Math.round(input.spcResult.cpk * 10000) : null,
        fileName: filename,
        fileSize: html.length,
        fileUrl: fileUrl,
      });
      
      return { content: html, filename, mimeType: "text/html", fileUrl };
    }),
});

// Alert Settings Router
const alertRouter = router({
  get: adminProcedure.query(async () => {
    return await getAlertSettings();
  }),

  update: adminProcedure
    .input(z.object({
      cpkWarningThreshold: z.number().optional(),
      cpkCriticalThreshold: z.number().optional(),
      notifyOwner: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await upsertAlertSettings(input);
      return { success: true };
    }),
});

// SPC Plan Router
const spcPlanRouter = router({
  list: protectedProcedure.query(async () => {
    return await getSpcSamplingPlans();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getSpcSamplingPlanById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      productionLineId: z.number(),
      productId: z.number().optional(),
      workstationId: z.number().optional(),
      samplingConfigId: z.number(),
      specificationId: z.number().optional(),
      mappingId: z.number().optional(),
      machineId: z.number().optional(),
      fixtureId: z.number().optional(),
      startTime: z.number().optional(), // Unix timestamp in ms
      endTime: z.number().optional(), // Unix timestamp in ms, null = continuous
      isRecurring: z.boolean().optional(),
      notifyOnViolation: z.boolean().optional(),
      notifyEmail: z.string().optional(),
      enabledSpcRules: z.string().optional(), // JSON array of rule IDs
      enabledCaRules: z.string().optional(),
      enabledCpkRules: z.string().optional(),
      // CPK Alert settings
      cpkAlertEnabled: z.boolean().optional(),
      cpkLowerLimit: z.number().optional(),
      cpkUpperLimit: z.number().optional(),
      alertThresholdId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { startTime, endTime, cpkAlertEnabled, cpkLowerLimit, cpkUpperLimit, alertThresholdId, ...rest } = input;
      
      // Handle CPK alert settings
      const cpkAlertData: Record<string, any> = {};
      if (cpkAlertEnabled !== undefined) cpkAlertData.cpkAlertEnabled = cpkAlertEnabled ? 1 : 0;
      if (cpkLowerLimit !== undefined) cpkAlertData.cpkLowerLimit = cpkLowerLimit?.toString();
      if (cpkUpperLimit !== undefined) cpkAlertData.cpkUpperLimit = cpkUpperLimit?.toString();
      if (alertThresholdId !== undefined) cpkAlertData.alertThresholdId = alertThresholdId;
      
      return await createSpcSamplingPlan({ 
        ...rest, 
        ...cpkAlertData,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        createdBy: ctx.user.id 
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      productionLineId: z.number().optional(),
      productId: z.number().optional(),
      workstationId: z.number().optional(),
      samplingConfigId: z.number().optional(),
      specificationId: z.number().optional(),
      mappingId: z.number().optional(),
      machineId: z.number().optional(),
      fixtureId: z.number().optional(),
      startTime: z.number().optional(), // Unix timestamp in ms
      endTime: z.number().optional(), // Unix timestamp in ms, null = continuous
      isRecurring: z.boolean().optional(),
      notifyOnViolation: z.boolean().optional(),
      notifyEmail: z.string().optional(),
      enabledSpcRules: z.string().optional(), // JSON array of rule IDs
      enabledCaRules: z.string().optional(),
      enabledCpkRules: z.string().optional(),
      // CPK Alert settings
      cpkAlertEnabled: z.boolean().optional(),
      cpkLowerLimit: z.number().optional(),
      cpkUpperLimit: z.number().optional(),
      alertThresholdId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, startTime, endTime, cpkAlertEnabled, cpkLowerLimit, cpkUpperLimit, alertThresholdId, ...data } = input;
      
      // Handle CPK alert settings
      const cpkAlertData: Record<string, any> = {};
      if (cpkAlertEnabled !== undefined) cpkAlertData.cpkAlertEnabled = cpkAlertEnabled ? 1 : 0;
      if (cpkLowerLimit !== undefined) cpkAlertData.cpkLowerLimit = cpkLowerLimit?.toString();
      if (cpkUpperLimit !== undefined) cpkAlertData.cpkUpperLimit = cpkUpperLimit?.toString();
      if (alertThresholdId !== undefined) cpkAlertData.alertThresholdId = alertThresholdId;
      await updateSpcSamplingPlan(id, {
        ...data,
        ...cpkAlertData,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      });
      return { success: true };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "active", "paused", "completed"]),
    }))
    .mutation(async ({ input }) => {
      await updateSpcSamplingPlan(input.id, { status: input.status });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSpcSamplingPlan(input.id);
      return { success: true };
    }),

  // Phân tích SPC/CPK từ dữ liệu lấy mẫu của kế hoạch SPC
  analyzeFromPlan: protectedProcedure
    .input(z.object({
      planId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { planId } = input;
      
      // Lấy thông tin kế hoạch SPC
      const plan = await getSpcSamplingPlanById(planId);
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy kế hoạch SPC" });
      }

      // Lấy dữ liệu lấy mẫu từ bảng spc_realtime_data
      const samples = await getSpcRealtimeDataByPlan(planId, 10000);
      
      if (samples.length < 5) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cần ít nhất 5 mẫu để phân tích. Hiện tại có ${samples.length} mẫu.` 
        });
      }

      // Chuyển đổi dữ liệu (giá trị được lưu * 10000)
      const values = samples.map(s => s.sampleValue / 10000);
      
      // Lấy USL/LSL từ specification nếu có
      let usl: number | null = null;
      let lsl: number | null = null;
      let target: number | null = null;
      
      if (plan.specificationId) {
        const spec = await getProductSpecificationById(plan.specificationId);
        if (spec) {
          usl = spec.usl ? spec.usl / 10000 : null;
          lsl = spec.lsl ? spec.lsl / 10000 : null;
          target = spec.target ? spec.target / 10000 : null;
        }
      }

      // Tính toán SPC/CPK
      const n = values.length;
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      // Control limits (3-sigma)
      const ucl = mean + 3 * stdDev;
      const lcl = mean - 3 * stdDev;

      // Range chart limits
      const d2 = 2.326; // for n=5
      const d3 = 0;
      const d4 = 2.114;
      const avgRange = range;
      const uclR = d4 * avgRange;
      const lclR = d3 * avgRange;

      // Process capability
      let cp: number | null = null;
      let cpk: number | null = null;
      let cpu: number | null = null;
      let cpl: number | null = null;

      if (usl !== null && lsl !== null && stdDev > 0) {
        cp = (usl - lsl) / (6 * stdDev);
        cpu = (usl - mean) / (3 * stdDev);
        cpl = (mean - lsl) / (3 * stdDev);
        cpk = Math.min(cpu, cpl);
      } else if (usl !== null && stdDev > 0) {
        cpu = (usl - mean) / (3 * stdDev);
        cpk = cpu;
      } else if (lsl !== null && stdDev > 0) {
        cpl = (mean - lsl) / (3 * stdDev);
        cpk = cpl;
      }

      // Chuẩn bị dữ liệu biểu đồ
      const xBarData = samples.map((s, i) => ({
        index: i + 1,
        value: s.sampleValue / 10000,
        timestamp: s.sampledAt,
      }));

      const rangeData = samples.map((s, i) => ({
        index: i + 1,
        value: s.subgroupRange ? s.subgroupRange / 10000 : 0,
      }));

      const rawData = samples.map(s => ({
        value: s.sampleValue / 10000,
        timestamp: s.sampledAt,
      }));

      // Kiểm tra cảnh báo CPK
      const alertTriggered = cpk !== null && cpk < 1.0;

      return {
        id: planId,
        sampleCount: n,
        mean,
        stdDev,
        min,
        max,
        range,
        cp,
        cpk,
        cpu,
        cpl,
        ucl,
        lcl,
        uclR,
        lclR,
        usl,
        lsl,
        target,
        alertTriggered,
        xBarData,
        rangeData,
        rawData,
        planName: plan.name,
      };
    }),
    
  // Template APIs
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { spcPlanTemplates } = await import('../drizzle/schema');
    const templates = await db.select().from(spcPlanTemplates)
      .where(or(
        eq(spcPlanTemplates.isPublic, 1),
        eq(spcPlanTemplates.createdBy, ctx.user.id)
      ))
      .orderBy(desc(spcPlanTemplates.createdAt));
    return templates;
  }),
  
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      measurementName: z.string().optional(),
      usl: z.number().optional(),
      lsl: z.number().optional(),
      target: z.number().optional(),
      unit: z.string().optional(),
      sampleSize: z.number().optional(),
      sampleFrequency: z.number().optional(),
      enabledSpcRules: z.string().optional(),
      enabledCpkRules: z.string().optional(),
      enabledCaRules: z.string().optional(),
      isRecurring: z.boolean().optional(),
      notifyOnViolation: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { spcPlanTemplates } = await import('../drizzle/schema');
      const [result] = await db.insert(spcPlanTemplates).values({
        ...input,
        usl: input.usl ? String(input.usl * 10000) : null,
        lsl: input.lsl ? String(input.lsl * 10000) : null,
        target: input.target ? String(input.target * 10000) : null,
        isRecurring: input.isRecurring ? 1 : 0,
        notifyOnViolation: input.notifyOnViolation ? 1 : 0,
        isPublic: input.isPublic ? 1 : 0,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),
    
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { spcPlanTemplates } = await import('../drizzle/schema');
      // Only allow delete own templates or admin
      const [template] = await db.select().from(spcPlanTemplates).where(eq(spcPlanTemplates.id, input.id));
      if (!template) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
      if (template.createdBy !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete this template' });
      }
      await db.delete(spcPlanTemplates).where(eq(spcPlanTemplates.id, input.id));
      return { success: true };
    }),
  // Get SPC analysis data for a specific machine
  getSpcByMachine: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { analyses: [], plans: [], stats: null };
      const { spcSamplingPlans } = await import('../drizzle/schema');
      const plans = await db.select()
        .from(spcSamplingPlans)
        .where(eq(spcSamplingPlans.machineId, input.machineId))
        .orderBy(desc(spcSamplingPlans.createdAt))
        .limit(20);
      const planIds = plans.map(p => p.id);
      let analyses: any[] = [];
      if (planIds.length > 0) {
        analyses = await db.select()
          .from(spcAnalysisHistory)
          .where(sql`mapping_id IN (${sql.join(planIds.map(id => sql`${id}`), sql`,`)})`)
          .orderBy(desc(spcAnalysisHistory.createdAt))
          .limit(input.limit);
      }
      const cpkValues = analyses.filter(a => a.cpk != null);
      const stats = analyses.length > 0 ? {
        avgCp: cpkValues.length > 0 ? cpkValues.reduce((s, a) => s + Number(a.cp || 0) / 1000, 0) / cpkValues.length : 0,
        avgCpk: cpkValues.length > 0 ? cpkValues.reduce((s, a) => s + Number(a.cpk || 0) / 1000, 0) / cpkValues.length : 0,
        avgMean: analyses.reduce((s, a) => s + Number(a.mean || 0) / 1000, 0) / analyses.length,
        avgStdDev: analyses.reduce((s, a) => s + Number(a.stdDev || 0) / 1000, 0) / analyses.length,
        totalSamples: analyses.reduce((s, a) => s + (a.sampleCount || 0), 0),
        alertCount: analyses.filter(a => a.alertTriggered === 1).length,
        latestAnalysis: analyses[0] || null,
      } : null;
      return { analyses, plans, stats };
    }),
  // Get OEE loss breakdown for a machine
  getOeeLossByMachine: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { oeeRecords } = await import('../drizzle/schema');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      const records = await db.select()
        .from(oeeRecords)
        .where(and(
          eq(oeeRecords.machineId, input.machineId),
          gte(oeeRecords.recordDate, startDate)
        ))
        .orderBy(desc(oeeRecords.recordDate))
        .limit(100);
      const totalDowntime = records.reduce((s, r) => s + (r.downtime || 0), 0);
      const totalRun = records.reduce((s, r) => s + (r.actualRunTime || 0), 0);
      const defectCount = records.reduce((s, r) => s + (r.defectCount || 0), 0);
      const totalCount = records.reduce((s, r) => s + (r.totalCount || 0), 0);
      const idealCycle = records[0]?.idealCycleTime ? Number(records[0].idealCycleTime) : 0;
      const speedLoss = idealCycle > 0 ? Math.max(0, totalRun - (totalCount * idealCycle)) : 0;
      return [
        { name: "Thời gian dừng máy", value: totalDowntime, color: "#ef4444" },
        { name: "Giảm tốc độ", value: Math.round(speedLoss), color: "#f97316" },
        { name: "Sản phẩm lỗi", value: defectCount, color: "#eab308" },
        { name: "Thời gian chạy hiệu quả", value: Math.max(0, totalRun - Math.round(speedLoss)), color: "#22c55e" },
      ].filter(d => d.value > 0);
    }),
  // Get alerts for a specific machine
  getAlertsByMachine: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { realtimeAlerts } = await import('../drizzle/schema');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      return db.select().from(realtimeAlerts)
        .where(and(
          eq(realtimeAlerts.machineId, input.machineId),
          gte(realtimeAlerts.createdAt, startDate)
        ))
        .orderBy(desc(realtimeAlerts.createdAt))
        .limit(50);
    }),
});

// User Line Assignment Router
const userLineRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserLineAssignments(ctx.user.id);
  }),

  add: protectedProcedure
    .input(z.object({
      productionLineId: z.number(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await createUserLineAssignment(ctx.user.id, input.productionLineId, input.displayOrder || 0);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUserLineAssignment(input.id);
      return { success: true };
    }),
});

// Permission Router
const permissionRouter = router({
  list: protectedProcedure.query(async () => {
    return await getPermissions();
  }),

  listRolePermissions: protectedProcedure.query(async () => {
    return await getRolePermissions();
  }),

  create: adminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      module: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const id = await createPermission(input);
      return { id };
    }),

  updateRolePermissions: adminProcedure
    .input(z.object({
      role: z.string(),
      permissionIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      await updateRolePermissions(input.role, input.permissionIds);
      return { success: true };
    }),

  initDefaults: adminProcedure.mutation(async () => {
    await initDefaultPermissions();
    return { success: true };
  }),

  check: protectedProcedure
    .input(z.object({ permissionCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasPermission = await checkUserPermission(ctx.user.id, ctx.user.role, input.permissionCode);
      return { hasPermission };
    }),
});

// Machine Type Router - Quản lý loại máy (with caching)
const machineTypeRouter = router({
  list: protectedProcedure.query(async () => {
    const { getCachedMachineTypes } = await import('./services/cachedQueries');
    return await getCachedMachineTypes();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getCachedMachineTypeById } = await import('./services/cachedQueries');
      return await getCachedMachineTypeById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createMachineType({
        ...input,
        createdBy: ctx.user.id,
      });
      const { invalidateMachineTypeCache } = await import('./services/cachedQueries');
      invalidateMachineTypeCache();
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMachineType(id, data);
      const { invalidateMachineTypeCache } = await import('./services/cachedQueries');
      invalidateMachineTypeCache();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMachineType(input.id);
      const { invalidateMachineTypeCache } = await import('./services/cachedQueries');
      invalidateMachineTypeCache();
      return { success: true };
    }),
});

// Fixture Router - Quản lý Fixture (with caching)
const fixtureRouter = router({
  list: protectedProcedure
    .input(z.object({ machineId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.machineId) {
        const { getCachedFixturesByMachine } = await import('./services/cachedQueries');
        return await getCachedFixturesByMachine(input.machineId);
      }
      const { getCachedFixtures } = await import('./services/cachedQueries');
      return await getCachedFixtures();
    }),

  listWithMachineInfo: protectedProcedure.query(async () => {
    return await getFixturesWithMachineInfo();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getCachedFixtureById } = await import('./services/cachedQueries');
      return await getCachedFixtureById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createFixture({
        ...input,
        createdBy: ctx.user.id,
      });
      const { invalidateFixtureCache } = await import('./services/cachedQueries');
      invalidateFixtureCache();
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      machineId: z.number().optional(),
      code: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
      lastMaintenanceDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateFixture(id, data);
      const { invalidateFixtureCache } = await import('./services/cachedQueries');
      invalidateFixtureCache();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFixture(input.id);
      const { invalidateFixtureCache } = await import('./services/cachedQueries');
      invalidateFixtureCache();
      return { success: true };
    }),
});

// Jig Router - Quản lý Jig (tương tự Fixture)
const jigRouter = router({
  list: protectedProcedure
    .input(z.object({ machineId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getJigs(input?.machineId);
    }),

  listWithMachineInfo: protectedProcedure.query(async () => {
    return await getJigsWithMachineInfo();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getJigById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createJig({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      machineId: z.number().optional(),
      code: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
      lastMaintenanceDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateJig(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteJig(input.id);
      return { success: true };
    }),
});

// Defect Router - Quản lý lỗi SPC
const defectRouter = router({
  // Defect Categories
  listCategories: protectedProcedure.query(async () => {
    return await getSpcDefectCategories();
  }),

  getCategoryById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getSpcDefectCategoryById(input.id);
    }),

  createCategory: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createSpcDefectCategory({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSpcDefectCategory(id, data);
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSpcDefectCategory(input.id);
      return { success: true };
    }),

  // Defect Records
  listRecords: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productId: z.number().optional(),
      defectCategoryId: z.number().optional(),
      status: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getSpcDefectRecords(input);
    }),

  getRecordById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getSpcDefectRecordById(input.id);
    }),

  createRecord: protectedProcedure
    .input(z.object({
      defectCategoryId: z.number(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productId: z.number().optional(),
      spcAnalysisId: z.number().optional(),
      ruleViolated: z.string().optional(),
      quantity: z.number().optional(),
      notes: z.string().optional(),
      occurredAt: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createSpcDefectRecord({
        ...input,
        reportedBy: ctx.user.id,
      });
      return { id };
    }),

  updateRecord: protectedProcedure
    .input(z.object({
      id: z.number(),
      defectCategoryId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productId: z.number().optional(),
      ruleViolated: z.string().optional(),
      quantity: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
      rootCause: z.string().optional(),
      correctiveAction: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.status === "resolved" || data.status === "closed") {
        await updateSpcDefectRecord(id, {
          ...data,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
        });
      } else {
        await updateSpcDefectRecord(id, data);
      }
      return { success: true };
    }),

  deleteRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSpcDefectRecord(input.id);
      return { success: true };
    }),

  // Statistics for Pareto
  getStatistics: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getDefectStatistics(input);
    }),

  getByRuleStatistics: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getDefectByRuleStatistics(input);
    }),

  // Verify defect as Real NG or NTF
  verifyDefect: protectedProcedure
    .input(z.object({
      id: z.number(),
      verificationStatus: z.enum(["real_ng", "ntf"]),
      verificationNotes: z.string().optional(),
      ntfReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(spcDefectRecords).set({
        verificationStatus: input.verificationStatus,
        verifiedAt: new Date(),
        verifiedBy: ctx.user.id,
        verificationNotes: input.verificationNotes,
        ntfReason: input.ntfReason,
      }).where(eq(spcDefectRecords.id, input.id));
      
      return { success: true };
    }),

  // NTF Statistics - for trend charts
  getNtfStatistics: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      workstationId: z.number().optional(),
      productionLineId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      groupBy: z.enum(["hour", "day", "week", "month"]).default("day"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input.endDate || new Date();
      
      // Get all defects in date range
      let query = db.select({
        id: spcDefectRecords.id,
        occurredAt: spcDefectRecords.occurredAt,
        verificationStatus: spcDefectRecords.verificationStatus,
        workstationId: spcDefectRecords.workstationId,
        productionLineId: spcDefectRecords.productionLineId,
      }).from(spcDefectRecords)
        .where(and(
          gte(spcDefectRecords.occurredAt, startDate),
          lte(spcDefectRecords.occurredAt, endDate),
          input.productionLineId ? eq(spcDefectRecords.productionLineId, input.productionLineId) : undefined,
          input.workstationId ? eq(spcDefectRecords.workstationId, input.workstationId) : undefined,
        ));
      
      const defects = await query;
      
      // Group by time period
      const grouped = new Map<string, { total: number; realNg: number; ntf: number; pending: number }>();
      
      defects.forEach((d: any) => {
        const date = new Date(d.occurredAt);
        let key: string;
        
        switch (input.groupBy) {
          case "hour":
            key = `${date.toISOString().slice(0, 13)}:00`;
            break;
          case "week":
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
            break;
          case "month":
            key = date.toISOString().slice(0, 7);
            break;
          default: // day
            key = date.toISOString().slice(0, 10);
        }
        
        if (!grouped.has(key)) {
          grouped.set(key, { total: 0, realNg: 0, ntf: 0, pending: 0 });
        }
        
        const stats = grouped.get(key)!;
        stats.total++;
        
        if (d.verificationStatus === "real_ng") stats.realNg++;
        else if (d.verificationStatus === "ntf") stats.ntf++;
        else stats.pending++;
      });
      
      // Convert to array and calculate NTF rate
      const result = Array.from(grouped.entries()).map(([period, stats]) => ({
        period,
        ...stats,
        ntfRate: stats.total > 0 ? (stats.ntf / stats.total * 100).toFixed(2) : "0.00",
      })).sort((a, b) => a.period.localeCompare(b.period));
      
      // Calculate overall summary
      const summary = {
        totalDefects: defects.length,
        realNg: defects.filter((d: any) => d.verificationStatus === "real_ng").length,
        ntf: defects.filter((d: any) => d.verificationStatus === "ntf").length,
        pending: defects.filter((d: any) => d.verificationStatus === "pending" || !d.verificationStatus).length,
        overallNtfRate: defects.length > 0 
          ? (defects.filter((d: any) => d.verificationStatus === "ntf").length / defects.length * 100).toFixed(2)
          : "0.00",
      };
      
      return { data: result, summary };
    }),

  // Get pending verification defects
  getPendingVerification: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let conditions = [eq(spcDefectRecords.verificationStatus, "pending")];
      if (input.productionLineId) {
        conditions.push(eq(spcDefectRecords.productionLineId, input.productionLineId));
      }
      if (input.workstationId) {
        conditions.push(eq(spcDefectRecords.workstationId, input.workstationId));
      }
      
      const records = await db.select()
        .from(spcDefectRecords)
        .where(and(...conditions))
        .orderBy(desc(spcDefectRecords.occurredAt))
        .limit(input.limit);
      
      return records;
    }),

  // NTF Alert Configuration
  getNtfAlertConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Get from system settings or return defaults
    const { systemSettings } = await import("../drizzle/schema");
    const settings = await db.select().from(systemSettings).where(eq(systemSettings.key, "ntf_alert_config"));
    
    if (settings.length > 0 && settings[0].value) {
      return JSON.parse(settings[0].value);
    }
    
    // Default config
    return {
      threshold: 30, // 30% NTF rate
      emailEnabled: true,
      notificationEnabled: true,
      checkIntervalHours: 1,
    };
  }),

  updateNtfAlertConfig: protectedProcedure
    .input(z.object({
      threshold: z.number().min(1).max(100),
      emailEnabled: z.boolean(),
      notificationEnabled: z.boolean(),
      checkIntervalHours: z.number().min(1).max(24),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { systemSettings } = await import("../drizzle/schema");
      
      // Upsert config
      await db.delete(systemSettings).where(eq(systemSettings.key, "ntf_alert_config"));
      await db.insert(systemSettings).values({
        key: "ntf_alert_config",
        value: JSON.stringify(input),
        updatedAt: new Date(),
      });
      
      return { success: true };
    }),

  // Check NTF rate and send alert if needed
  checkNtfAlert: protectedProcedure
    .input(z.object({
      hours: z.number().optional().default(24),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const startDate = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      
      // Get defects in time range
      const defects = await db.select({
        id: spcDefectRecords.id,
        verificationStatus: spcDefectRecords.verificationStatus,
      }).from(spcDefectRecords)
        .where(gte(spcDefectRecords.occurredAt, startDate));
      
      const total = defects.length;
      const ntfCount = defects.filter((d: any) => d.verificationStatus === "ntf").length;
      const ntfRate = total > 0 ? (ntfCount / total * 100) : 0;
      
      // Get config
      const { systemSettings } = await import("../drizzle/schema");
      const configResult = await db.select().from(systemSettings).where(eq(systemSettings.key, "ntf_alert_config"));
      const config = configResult.length > 0 && configResult[0].value 
        ? JSON.parse(configResult[0].value) 
        : { threshold: 30, emailEnabled: true, notificationEnabled: true };
      
      const isAlert = ntfRate >= config.threshold;
      
      if (isAlert) {
        // Send notification to owner
        if (config.notificationEnabled) {
          await notifyOwner({
            title: `⚠️ Cảnh báo NTF Rate cao: ${ntfRate.toFixed(1)}%`,
            content: `Tỉ lệ NTF trong ${input.hours} giờ qua là ${ntfRate.toFixed(1)}%, vượt ngưỡng ${config.threshold}%.\n\nTổng lỗi: ${total}\nNTF: ${ntfCount}\n\nVui lòng kiểm tra và xác nhận các lỗi đang chờ.`,
          });
        }
        
        // Send email if configured
        if (config.emailEnabled) {
          try {
            const { sendEmail } = await import("./emailService");
            const smtpConfig = await db.select().from(systemSettings).where(eq(systemSettings.key, "smtp_config"));
            if (smtpConfig.length > 0 && smtpConfig[0].value) {
              const smtp = JSON.parse(smtpConfig[0].value);
              if (smtp.host && smtp.alertEmail) {
                await sendEmail(
                  smtp.alertEmail,
                  `[Cảnh báo] NTF Rate cao: ${ntfRate.toFixed(1)}%`,
                  `
                    <h2>⚠️ Cảnh báo NTF Rate cao</h2>
                    <p>Tỉ lệ NTF trong <strong>${input.hours} giờ</strong> qua là <strong style="color: red;">${ntfRate.toFixed(1)}%</strong>, vượt ngưỡng ${config.threshold}%.</p>
                    <table border="1" cellpadding="8" style="border-collapse: collapse;">
                      <tr><td>Tổng lỗi</td><td><strong>${total}</strong></td></tr>
                      <tr><td>NTF (Not True Fail)</td><td><strong>${ntfCount}</strong></td></tr>
                      <tr><td>Tỉ lệ NTF</td><td><strong style="color: red;">${ntfRate.toFixed(1)}%</strong></td></tr>
                    </table>
                    <p>Vui lòng kiểm tra và xác nhận các lỗi đang chờ trong hệ thống.</p>
                  `
                );
              }
            }
          } catch (e) {
            console.error("Failed to send NTF alert email:", e);
          }
        }
      }
      
      return {
        total,
        ntfCount,
        ntfRate: ntfRate.toFixed(2),
        threshold: config.threshold,
        isAlert,
        alertSent: isAlert,
      };
    }),
});

// Email Notification Router
const emailNotificationRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return await getEmailNotificationSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      notifyOnSpcViolation: z.boolean().optional(),
      notifyOnCaViolation: z.boolean().optional(),
      notifyOnCpkViolation: z.boolean().optional(),
      cpkThreshold: z.number().optional(),
      notifyFrequency: z.enum(["immediate", "hourly", "daily"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertEmailNotificationSettings(ctx.user.id, input);
      return { success: true };
    }),
});

export const appRouter = router({
  alertWebhook: alertWebhookRouter,
  firebasePush: firebasePushRouter,
  fcmIntegration: fcmIntegrationRouter,
  sync: syncRouter,
  widgetData: widgetDataRouter,
  firmwareOta: firmwareOtaRouter,
  floorPlanIntegration: floorPlanIntegrationRouter,
  predictiveMaintenance: predictiveMaintenanceRouter,
  scheduledOta: scheduledOtaRouter,
  maintenanceWorkOrder: maintenanceWorkOrderRouter,
  mobile: mobileRouter,
  system: systemRouter,
  theme: themeRouter,
  databaseConnection: dbConnectionRouter,
  legacyDbConnection: legacyDatabaseConnectionRouter,
  machineIntegration: machineIntegrationRouter,
  machineApi: machinePublicRouter,
  iotCrud: iotCrudRouter,
  iotOeeAlert: iotOeeAlertRouter,
  scheduledOeeReport: scheduledOeeReportRouter,
  quickAccess: quickAccessRouter,
  alerts: alertAnalyticsRouter,
  webhookHistory: webhookHistoryRouter,
  videoTutorial: videoTutorialRouter,
  userGuide: userGuideRouter,
  aiAdvanced: aiAdvancedRouter,
  realtime: realtimeRouter,
  userNotification: userNotificationRouter,
  cpkHistory: cpkHistoryRouter,
  factoryWorkshop: factoryWorkshopRouter,
  measurementRemark: measurementRemarkRouter,
  dashboardCustomization: dashboardCustomizationRouter,
  batchImageAnalysis: batchImageAnalysisRouter,
  cameraCaptureSchedule: cameraCaptureScheduleRouter,
  qualityStatistics: qualityStatisticsRouter,
  heatMapYield: heatMapYieldRouter,
  paretoChart: paretoChartRouter,
  aoiAvi: aoiAviRouter,
  alertHistory: alertHistoryRouter,
  autoNtf: autoNtfRouter,
  alertConfig: alertConfigRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Local authentication for offline mode
  localAuth: router({
    // Register new local user
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(100),
        password: z.string().min(6),
        name: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await registerLocalUser(input);
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        
        // Send notification to owner about new user registration
        try {
          await notifyOwner({
            title: `👤 Người dùng mới đăng ký: ${input.username}`,
            content: `Có người dùng mới đăng ký tài khoản trên hệ thống SPC/CPK Calculator.\n\n**Thông tin:**\n- Tên đăng nhập: ${input.username}\n- Họ tên: ${input.name || 'Chưa cung cấp'}\n- Email: ${input.email || 'Chưa cung cấp'}\n- Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n\nVui lòng kiểm tra và phân quyền cho người dùng nếu cần.`,
          });
        } catch (notifyError) {
          // Don't fail registration if notification fails
          console.error('Failed to send new user notification:', notifyError);
        }
        
        return result;
      }),

    // Login with local credentials
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
        twoFactorCode: z.string().optional(),
        isBackupCode: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await loginLocalUser({ username: input.username, password: input.password });
        if (!result.success) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: result.error });
        }
        
        // Check if 2FA is enabled
        const has2FA = await has2FAEnabled(result.user!.id);
        if (has2FA) {
          if (!input.twoFactorCode) {
            return {
              success: false,
              requires2FA: true,
              userId: result.user!.id,
            };
          }
          
          const verified = await verify2FALogin(result.user!.id, input.twoFactorCode, input.isBackupCode || false);
          if (!verified) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Mã xác thực 2FA không đúng' });
          }
        }
        
        // Set cookie with token
        if (result.token) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie('local_auth_token', result.token, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });
        }
        return { 
          success: true, 
          user: result.user,
          mustChangePassword: result.mustChangePassword || false,
        };
      }),

    // Change password (for logged in user)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await changeLocalPassword(
          ctx.user.id,
          input.currentPassword,
          input.newPassword
        );
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        return { success: true, message: 'Password changed successfully' };
      }),

    // Request password reset (public)
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        return await requestPasswordReset(input.email);
      }),

    // Verify password reset token (public)
    verifyResetToken: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .query(async ({ input }) => {
        return await verifyPasswordResetToken(input.token);
      }),

    // Reset password with token (public)
    resetPasswordWithToken: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        return await resetPasswordWithToken(input.token, input.newPassword);
      }),

    // Generate 2FA secret
    generate2FASecret: protectedProcedure
      .mutation(async ({ ctx }) => {
        return await generateTOTPSecret(ctx.user.id, ctx.user.name || ctx.user.openId);
      }),

    // Enable 2FA
    enable2FA: protectedProcedure
      .input(z.object({
        token: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        return await enable2FA(ctx.user.id, input.token);
      }),

    // Disable 2FA
    disable2FA: protectedProcedure
      .input(z.object({
        token: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        return await disable2FA(ctx.user.id, input.token);
      }),

    // Check 2FA status
    get2FAStatus: protectedProcedure
      .query(async ({ ctx }) => {
        const enabled = await has2FAEnabled(ctx.user.id);
        return { enabled };
      }),

    // Regenerate backup codes
    regenerateBackupCodes: protectedProcedure
      .input(z.object({
        token: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const enabled = await has2FAEnabled(ctx.user.id);
        if (!enabled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '2FA chưa được kích hoạt' });
        }
        // Verify token first
        const verified = await verify2FALogin(ctx.user.id, input.token, false);
        if (!verified) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mã xác thực không đúng' });
        }
        const codes = await generateBackupCodes(ctx.user.id);
        return { success: true, backupCodes: codes };
      }),

    // Get login customization (public)
    getLoginCustomization: publicProcedure
      .query(async () => {
        return await getLoginCustomization();
      }),

    // Update login customization (admin only)
    updateLoginCustomization: protectedProcedure
      .input(z.object({
        logoUrl: z.string().nullable().optional(),
        logoAlt: z.string().optional(),
        welcomeTitle: z.string().optional(),
        welcomeSubtitle: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        backgroundGradient: z.string().nullable().optional(),
        footerText: z.string().nullable().optional(),
        showOauth: z.boolean().optional(),
        showRegister: z.boolean().optional(),
        customCss: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return await updateLoginCustomization({ ...input, updatedBy: ctx.user.id });
      }),

    // Update profile (for logged in user)
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }
        // Update in local_users table
        await db.execute(sql`
          UPDATE local_users 
          SET name = ${input.name}, email = ${input.email}, updatedAt = NOW()
          WHERE id = ${ctx.user.id}
        `);
        // Also update in users table if exists
        await db.execute(sql`
          UPDATE users 
          SET name = ${input.name}, email = ${input.email}, updatedAt = NOW()
          WHERE id = ${ctx.user.id}
        `);
        return { success: true, message: 'Profile updated successfully' };
      }),

    // Update avatar (for logged in user)
    updateAvatar: protectedProcedure
      .input(z.object({
        avatarUrl: z.string().url().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }
        // Update in local_users table
        await db.execute(sql`
          UPDATE local_users 
          SET avatar = ${input.avatarUrl}, updatedAt = NOW()
          WHERE id = ${ctx.user.id}
        `);
        // Also update in users table if exists
        await db.execute(sql`
          UPDATE users 
          SET avatar = ${input.avatarUrl}, updatedAt = NOW()
          WHERE id = ${ctx.user.id}
        `);
        return { success: true, message: 'Avatar updated successfully', avatarUrl: input.avatarUrl };
      }),

    // Admin reset password for user
    resetPassword: protectedProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const result = await adminResetPassword(input.userId, input.newPassword);
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        return { success: true, message: 'Password reset successfully' };
      }),

    // Logout local user
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Get current user from token before clearing
      const token = ctx.req.cookies?.['local_auth_token'];
      if (token) {
        const user = verifyLocalToken(token);
        if (user) {
          await logLoginEvent({
            userId: user.id,
            username: user.username,
            authType: "local",
            eventType: "logout",
          });
        }
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie('local_auth_token', { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Get login history (admin only)
    loginHistory: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getLoginHistory(input);
      }),

    // Get login history with cursor-based pagination (admin only)
    loginHistoryWithCursor: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        direction: z.enum(['forward', 'backward']).default('forward'),
        username: z.string().optional(),
        eventType: z.enum(['login', 'logout', 'login_failed']).optional(),
        authType: z.enum(['manus', 'local']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { userId, cursor, limit, direction, username, eventType, authType, startDate, endDate } = input;
        return getLoginHistoryWithCursor(userId || null, { 
          cursor, 
          limit, 
          direction,
          username,
          eventType,
          authType,
          startDate,
          endDate,
        });
      }),

    // Get login stats
    loginStats: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && input.userId && input.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return getLoginStats(input.userId);
      }),

    // Export login history to CSV/Excel (admin only)
    exportLoginHistory: protectedProcedure
      .input(z.object({
        format: z.enum(['csv', 'excel']),
        userId: z.number().optional(),
        username: z.string().optional(),
        eventType: z.enum(['login', 'logout', 'login_failed']).optional(),
        authType: z.enum(['manus', 'local']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        
        // Get all login history (no pagination for export)
        const allHistory = await getLoginHistory({ 
          userId: input.userId, 
          page: 1, 
          pageSize: 10000 
        });
        
        // Filter by additional criteria
        let filteredRecords = allHistory.logs;
        if (input.username) {
          filteredRecords = filteredRecords.filter((r: any) => 
            r.username?.toLowerCase().includes(input.username!.toLowerCase())
          );
        }
        if (input.eventType) {
          filteredRecords = filteredRecords.filter((r: any) => r.eventType === input.eventType);
        }
        if (input.authType) {
          filteredRecords = filteredRecords.filter((r: any) => r.authType === input.authType);
        }
        if (input.startDate) {
          const start = new Date(input.startDate).getTime();
          filteredRecords = filteredRecords.filter((r: any) => new Date(r.createdAt).getTime() >= start);
        }
        if (input.endDate) {
          const end = new Date(input.endDate).getTime() + 86400000; // Include end date
          filteredRecords = filteredRecords.filter((r: any) => new Date(r.createdAt).getTime() < end);
        }
        
        // Generate content
        const headers = ['ID', 'User ID', 'Username', 'Auth Type', 'Event Type', 'IP Address', 'User Agent', 'Created At'];
        const rows = filteredRecords.map((r: any) => [
          r.id.toString(),
          r.userId?.toString() || '',
          r.username || '',
          r.authType || '',
          r.eventType || '',
          r.ipAddress || '',
          r.userAgent || '',
          new Date(r.createdAt).toISOString(),
        ]);
        
        if (input.format === 'csv') {
          const csvContent = [headers.join(','), ...rows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
          return {
            content: csvContent,
            filename: `login-history-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
          };
        } else {
          // Excel format using simple HTML table
          const htmlContent = `
            <html>
              <head><meta charset="UTF-8"></head>
              <body>
                <h1>Login History Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${filteredRecords.length}</p>
                <table border="1">
                  <tr>${headers.map((h: string) => `<th>${h}</th>`).join('')}</tr>
                  ${rows.map((row: string[]) => `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </table>
              </body>
            </html>
          `;
          return {
            content: htmlContent,
            filename: `login-history-${new Date().toISOString().split('T')[0]}.xls`,
            mimeType: 'application/vnd.ms-excel',
          };
        }
      }),

    // Get current local user from token
    me: publicProcedure.query(({ ctx }) => {
      const token = ctx.req.cookies?.['local_auth_token'];
      if (!token) return null;
      return verifyLocalToken(token);
    }),

    // List all local users (admin only)
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      return listLocalUsers();
    }),

    // Update local user (admin only)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(['user', 'manager', 'admin']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const result = await updateLocalUser(input.id, {
          name: input.name,
          email: input.email,
          password: input.password,
          role: input.role,
        });
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        return result;
      }),

    // Deactivate local user (admin only)
    deactivate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const result = await deactivateLocalUser(input.id);
        if (!result.success) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        return result;
      }),

    // Initialize default admin (first time setup)
    initAdmin: publicProcedure.mutation(async () => {
      await ensureDefaultAdmin();
      return { success: true, message: 'Default admin initialized' };
    }),

    // ============================================
    // Account Lockout Management (Admin only)
    // ============================================

    // Get account lockout history
    getAccountLockouts: protectedProcedure
      .input(z.object({
        username: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getAccountLockoutHistory(input);
      }),

    // Unlock account (admin only)
    unlockAccount: protectedProcedure
      .input(z.object({
        username: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const result = await unlockAccount(input.username, ctx.user.id);
        if (result.success) {
          await logAuthAuditEvent({
            username: input.username,
            eventType: 'account_unlocked',
            authMethod: 'local',
            details: { unlockedBy: ctx.user.name || ctx.user.openId },
            severity: 'info',
          });
        }
        return result;
      }),

    // Check if account is locked
    checkAccountLock: publicProcedure
      .input(z.object({
        username: z.string(),
      }))
      .query(async ({ input }) => {
        return isAccountLocked(input.username);
      }),

    // ============================================
    // Auth Audit Logs (Admin only)
    // ============================================

    // Get auth audit logs
    getAuthAuditLogs: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        username: z.string().optional(),
        eventType: z.enum(['login_success', 'login_failed', 'logout', 'password_change', 'password_reset', '2fa_enabled', '2fa_disabled', '2fa_verified', 'account_locked', 'account_unlocked', 'session_expired', 'token_refresh']).optional(),
        severity: z.enum(['info', 'warning', 'critical']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getAuthAuditLogs({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),

    // Get auth audit stats
    getAuthAuditStats: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getAuthAuditStats(input.days);
      }),

    // Get auth audit logs with user info (enhanced)
    getAuthAuditLogsWithUserInfo: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        username: z.string().optional(),
        eventType: z.enum(['login_success', 'login_failed', 'logout', 'password_change', 'password_reset', '2fa_enabled', '2fa_disabled', '2fa_verified', 'account_locked', 'account_unlocked', 'session_expired', 'token_refresh']).optional(),
        severity: z.enum(['info', 'warning', 'critical']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getAuthAuditLogsWithUserInfo({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),

    // Get users for filter dropdown
    getUsersForFilter: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getAllUsersForFilter();
      }),

    // Dashboard widget: Recent failed logins
    getRecentFailedLogins: protectedProcedure
      .input(z.object({
        hours: z.number().default(24),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getRecentFailedLoginsForDashboard(input.hours);
      }),

    // Dashboard widget: Locked accounts
    getLockedAccounts: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getLockedAccountsForDashboard();
      }),

    // Dashboard widget: Failed logins trend
    getFailedLoginsTrend: protectedProcedure
      .input(z.object({
        days: z.number().default(7),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getFailedLoginsTrend(input.days);
      }),

    // Dashboard widget: Security overview stats
    getSecurityOverview: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        return getSecurityOverviewStats();
      }),
  }),

  user: userRouter,
  product: productRouter,
  productSpec: productSpecRouter,
  mapping: mappingRouter,
  mappingTemplate: mappingTemplateRouter,
  spc: spcRouter,
  alert: alertRouter,
  iotDashboard: iotDashboardRouter,
  iotExport: iotExportRouter,
  mqtt: mqttRouter,
  iotAlert: iotAlertRouter,
  // opcua: opcuaRouter,
  ai: aiRouter,
  aiTraining: aiTrainingRouter,
  erpIntegration: erpIntegrationRouter,
  security: securityRouter,
  chartConfig: chartConfigRouter,
  export: exportRouter,
  productionLine: productionLineRouter,
  workstation: workstationRouter,
  machine: machineRouter,
  spcRules: spcRulesRouter,
  sampling: samplingRouter,
  dashboard: dashboardRouter,
  report: reportRouter,
  // dashboardConfig: dashboardConfigRouter,
  // mmsDashboardConfig: mmsDashboardConfigRouter,
  spcPlan: spcPlanRouter,
  userLine: userLineRouter,
  emailNotification: emailNotificationRouter,
  permission: permissionRouter,
  defect: defectRouter,
  machineType: machineTypeRouter,
  fixture: fixtureRouter,
  jig: jigRouter,

  // Report Template router
  reportTemplate: router({
    list: protectedProcedure.query(async () => {
      return await getReportTemplates();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getReportTemplateById(input.id);
      }),
    getDefault: protectedProcedure.query(async () => {
      return await getDefaultReportTemplate();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        companyName: z.string().optional(),
        companyLogo: z.string().optional(),
        headerText: z.string().optional(),
        footerText: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
        showLogo: z.number().optional(),
        showCompanyName: z.number().optional(),
        showDate: z.number().optional(),
        showCharts: z.number().optional(),
        showRawData: z.number().optional(),
        isDefault: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createReportTemplate({ ...input, createdBy: ctx.user.id });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        companyName: z.string().optional(),
        companyLogo: z.string().optional(),
        headerText: z.string().optional(),
        footerText: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
        showLogo: z.number().optional(),
        showCompanyName: z.number().optional(),
        showDate: z.number().optional(),
        showCharts: z.number().optional(),
        showRawData: z.number().optional(),
        isDefault: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateReportTemplate(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteReportTemplate(input.id);
        return { success: true };
      }),
  }),

  // Export History router
  exportHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await getExportHistoryByUser(ctx.user.id, input?.limit || 50);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const record = await getExportHistoryById(input.id);
        if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Export record not found' });
        if (record.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        return record;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const record = await getExportHistoryById(input.id);
        if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Export record not found' });
        if (record.userId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        await deleteExportHistory(input.id);
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return await getExportHistoryStats(ctx.user.id);
    }),
  }),

  // Process Config router
  processConfig: router({
    list: protectedProcedure.query(async () => {
      const { getProcessConfigs } = await import("./db");
      return await getProcessConfigs();
    }),
    create: protectedProcedure
      .input(z.object({
        processName: z.string().min(1),
        productionLineId: z.number(),
        productId: z.number(),
        workstationId: z.number(),
        processOrder: z.number().optional(),
        standardTime: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { createProcessConfig } = await import("./db");
        const id = await createProcessConfig({ ...input, createdBy: ctx.user.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        processName: z.string().optional(),
        processOrder: z.number().optional(),
        standardTime: z.number().optional(),
        description: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { updateProcessConfig } = await import("./db");
        const { id, ...data } = input;
        await updateProcessConfig(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { deleteProcessConfig } = await import("./db");
        await deleteProcessConfig(input.id);
        return { success: true };
      }),
  }),

  // Process Template router
  processTemplate: router({
    list: protectedProcedure.query(async () => {
      const { getProcessTemplates } = await import("./db");
      return await getProcessTemplates();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        version: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { createProcessTemplate } = await import("./db");
        await createProcessTemplate({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        version: z.string().optional(),
        imageUrl: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { updateProcessTemplate } = await import("./db");
        const { id, ...data } = input;
        await updateProcessTemplate(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { deleteProcessTemplate } = await import("./db");
        await deleteProcessTemplate(input.id);
        return { success: true };
      }),
    listSteps: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        const { getProcessSteps } = await import("./db");
        return await getProcessSteps(input.templateId);
      }),
    createStep: protectedProcedure
      .input(z.object({
        processTemplateId: z.number(),
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        sequenceOrder: z.number(),
        standardTime: z.number().optional(),
        isRequired: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { createProcessStep } = await import("./db");
        await createProcessStep(input);
        return { success: true };
      }),
    updateStep: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        standardTime: z.number().optional(),
        isRequired: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { updateProcessStep } = await import("./db");
        const { id, ...data } = input;
        await updateProcessStep(id, data);
        return { success: true };
      }),
    deleteStep: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { deleteProcessStep } = await import("./db");
        await deleteProcessStep(input.id);
        return { success: true };
      }),
    moveStep: protectedProcedure
      .input(z.object({ stepId: z.number(), direction: z.enum(["up", "down"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { moveProcessStep } = await import("./db");
        await moveProcessStep(input.stepId, input.direction);
        return { success: true };
      }),
    listStepMachines: protectedProcedure
      .input(z.object({ stepId: z.number() }))
      .query(async ({ input }) => {
        const { getProcessStepMachines } = await import("./db");
        return await getProcessStepMachines(input.stepId);
      }),
    createStepMachine: protectedProcedure
      .input(z.object({
        processStepId: z.number(),
        machineName: z.string().min(1),
        machineCode: z.string().optional(),
        isRequired: z.number().optional(),
        quantity: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { createProcessStepMachine } = await import("./db");
        await createProcessStepMachine(input);
        return { success: true };
      }),
    deleteStepMachine: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new Error("Admin access required");
        const { deleteProcessStepMachine } = await import("./db");
        await deleteProcessStepMachine(input.id);
        return { success: true };
      }),
  }),

  // Seed data router
  seed: router({
    initPermissions: protectedProcedure.mutation(async () => {
      const { initializePermissions } = await import("./seedData");
      return await initializePermissions();
    }),
    seedSampleData: protectedProcedure.mutation(async () => {
      const { seedSampleData } = await import("./seedData");
      return await seedSampleData();
    }),
    runAllSeeds: protectedProcedure.mutation(async () => {
      const { runAllSeeds } = await import("./seedData");
      await runAllSeeds();
      return { success: true };
    }),
    seedRules: protectedProcedure.mutation(async () => {
      const { seedAllDefaultRules } = await import("./db");
      await seedAllDefaultRules();
      return { success: true, message: "Đã khởi tạo SPC/CA/CPK Rules mặc định" };
    }),
    seedAiData: protectedProcedure.mutation(async () => {
      const { seedAiData } = await import("./seedAiData");
      await seedAiData();
      return { success: true, message: "Đã khởi tạo dữ liệu AI Training thành công" };
    }),
  }),

  // SMTP configuration router
  smtp: router({
    getConfig: protectedProcedure.query(async () => {
      const { getSmtpConfig } = await import("./emailService");
      return await getSmtpConfig();
    }),
    saveConfig: protectedProcedure
      .input(z.object({
        host: z.string(),
        port: z.number(),
        secure: z.boolean(),
        username: z.string(),
        password: z.string(),
        fromEmail: z.string().email(),
        fromName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { saveSmtpConfig } = await import("./emailService");
        await saveSmtpConfig(input);
        return { success: true };
      }),
    testEmail: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { sendEmail } = await import("./emailService");
        return await sendEmail(
          input.email,
          "[Test] SPC/CPK Calculator Email Test",
          "<h1>Test Email</h1><p>This is a test email from SPC/CPK Calculator.</p>"
        );
      }),
    testCpkAlert: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        productCode: z.string(),
        stationName: z.string(),
        cpkValue: z.number(),
        threshold: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { sendCpkWarningEmail } = await import("./emailService");
        return await sendCpkWarningEmail(input.email, {
          productCode: input.productCode,
          stationName: input.stationName,
          cpkValue: input.cpkValue,
          threshold: input.threshold,
          recommendation: input.cpkValue < 1.0 
            ? "Quy trình không đủ năng lực. Cần điều tra nguyên nhân gốc và thực hiện cải tiến ngay."
            : "Quy trình cần cải tiến để đạt mức năng lực tốt hơn.",
          timestamp: new Date(),
        });
      }),
    testSpcViolation: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        productCode: z.string(),
        stationName: z.string(),
        violationType: z.string(),
        currentValue: z.number(),
        ucl: z.number(),
        lcl: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { sendSpcViolationEmail } = await import("./emailService");
        return await sendSpcViolationEmail(input.email, {
          productCode: input.productCode,
          stationName: input.stationName,
          violationType: input.violationType,
          violationDetails: `Giá trị ${input.currentValue.toFixed(2)} ${input.currentValue > input.ucl ? 'vượt UCL' : 'dưới LCL'}`,
          currentValue: input.currentValue,
          ucl: input.ucl,
          lcl: input.lcl,
          timestamp: new Date(),
        });
      }),
  }),

  // Audit Logs router
  audit: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        action: z.string().optional(),
        module: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { getAuditLogs } = await import("./db");
        return await getAuditLogs(input);
      }),

    // Cursor-based pagination endpoint
    listWithCursor: protectedProcedure
      .input(z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        direction: z.enum(['forward', 'backward']).default('forward'),
        action: z.string().optional(),
        module: z.string().optional(),
        search: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { cursor, limit, direction, ...filters } = input;
        return await getAuditLogsWithCursor(filters, { cursor, limit, direction });
      }),
    // Advanced search with all filters
    advancedSearch: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().min(1).max(100).default(20),
        userId: z.number().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        authType: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ input }) => {
        const { getAuditLogsAdvanced } = await import("./db");
        return await getAuditLogsAdvanced(input);
      }),
    // Dashboard statistics
    stats: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getAuditLogStats } = await import("./db");
        return await getAuditLogStats(input);
      }),
    // Get distinct users for filter dropdown
    users: protectedProcedure.query(async () => {
      const { getAuditLogUsers } = await import("./db");
      return await getAuditLogUsers();
    }),
    // Get distinct modules for filter dropdown
    modules: protectedProcedure.query(async () => {
      const { getAuditLogModules } = await import("./db");
      return await getAuditLogModules();
    }),
    // Export audit logs
    export: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().max(50000).default(10000),
      }))
      .query(async ({ input }) => {
        const { getAuditLogsForExport } = await import("./db");
        return await getAuditLogsForExport(input);
      }),

    // Activity Heatmap - hourly activity data for the past N weeks
    activityHeatmap: protectedProcedure
      .input(z.object({
        weeks: z.number().min(1).max(12).default(4),
        userId: z.number().optional(),
        action: z.string().optional(),
        module: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { getActivityHeatmapData } = await import("./db");
        return await getActivityHeatmapData(input);
      }),
  }),

  // Rules Management router
  rules: router({
    // SPC Rules
    getSpcRules: protectedProcedure.query(async () => {
      const { getSpcRules } = await import("./db");
      return await getSpcRules();
    }),
    getSpcRuleById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getSpcRuleById } = await import("./db");
        return await getSpcRuleById(input.id);
      }),
    createSpcRule: protectedProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        category: z.string().default("western_electric"),
        formula: z.string().optional(),
        example: z.string().optional(),
        severity: z.enum(["warning", "critical"]).default("warning"),
        threshold: z.number().optional(),
        consecutivePoints: z.number().optional(),
        sigmaLevel: z.number().optional(),
        isEnabled: z.number().default(1),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { createSpcRule } = await import("./db");
        return await createSpcRule(input);
      }),
    updateSpcRule: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        formula: z.string().optional(),
        example: z.string().optional(),
        severity: z.enum(["warning", "critical"]).optional(),
        threshold: z.number().optional(),
        consecutivePoints: z.number().optional(),
        sigmaLevel: z.number().optional(),
        isEnabled: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateSpcRule } = await import("./db");
        await updateSpcRule(id, data);
        return { success: true };
      }),
    deleteSpcRule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteSpcRule } = await import("./db");
        await deleteSpcRule(input.id);
        return { success: true };
      }),
    toggleSpcRule: protectedProcedure
      .input(z.object({ id: z.number(), isEnabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const { toggleSpcRule } = await import("./db");
        await toggleSpcRule(input.id, input.isEnabled);
        return { success: true };
      }),

    // CA Rules
    getCaRules: protectedProcedure.query(async () => {
      const { getCaRules } = await import("./db");
      return await getCaRules();
    }),
    getCaRuleById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getCaRuleById } = await import("./db");
        return await getCaRuleById(input.id);
      }),
    createCaRule: protectedProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        formula: z.string().optional(),
        example: z.string().optional(),
        severity: z.enum(["warning", "critical"]).default("warning"),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        isEnabled: z.number().default(1),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { createCaRule } = await import("./db");
        return await createCaRule(input);
      }),
    updateCaRule: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        formula: z.string().optional(),
        example: z.string().optional(),
        severity: z.enum(["warning", "critical"]).optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        isEnabled: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateCaRule } = await import("./db");
        await updateCaRule(id, data);
        return { success: true };
      }),
    deleteCaRule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteCaRule } = await import("./db");
        await deleteCaRule(input.id);
        return { success: true };
      }),
    toggleCaRule: protectedProcedure
      .input(z.object({ id: z.number(), isEnabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const { toggleCaRule } = await import("./db");
        await toggleCaRule(input.id, input.isEnabled);
        return { success: true };
      }),

    // CPK Rules
    getCpkRules: protectedProcedure.query(async () => {
      const { getCpkRules } = await import("./db");
      return await getCpkRules();
    }),
    getCpkRuleById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getCpkRuleById } = await import("./db");
        return await getCpkRuleById(input.id);
      }),
    createCpkRule: protectedProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        minCpk: z.number().optional(),
        maxCpk: z.number().optional(),
        status: z.string(),
        color: z.string().optional(),
        action: z.string().optional(),
        severity: z.enum(["info", "warning", "critical"]).default("info"),
        isEnabled: z.number().default(1),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { createCpkRule } = await import("./db");
        return await createCpkRule(input);
      }),
    updateCpkRule: protectedProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        minCpk: z.number().optional(),
        maxCpk: z.number().optional(),
        status: z.string().optional(),
        color: z.string().optional(),
        action: z.string().optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        isEnabled: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateCpkRule } = await import("./db");
        await updateCpkRule(id, data);
        return { success: true };
      }),
    deleteCpkRule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteCpkRule } = await import("./db");
        await deleteCpkRule(input.id);
        return { success: true };
      }),
    toggleCpkRule: protectedProcedure
      .input(z.object({ id: z.number(), isEnabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const { toggleCpkRule } = await import("./db");
        await toggleCpkRule(input.id, input.isEnabled);
        return { success: true };
      }),

    // Seed default rules
    seedDefaultRules: protectedProcedure.mutation(async () => {
      const { seedAllDefaultRules } = await import("./db");
      await seedAllDefaultRules();
      return { success: true };
    }),
  }),

  // License Management router
  license: router({
    list: protectedProcedure.query(async () => {
      return await getLicenses();
    }),
    
    // Cursor-based pagination endpoint
    listWithCursor: protectedProcedure
      .input(z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        direction: z.enum(['forward', 'backward']).default('forward'),
        status: z.string().optional(),
        customerId: z.number().optional(),
        search: z.string().optional(),
        licenseType: z.string().optional(),
        currency: z.string().optional(),
        priceFilter: z.enum(['all', 'free', 'paid', 'high']).optional(),
      }))
      .query(async ({ input }) => {
        const { cursor, limit, direction, ...filters } = input;
        return await getLicensesWithCursor(filters, { cursor, limit, direction });
      }),
    getActive: publicProcedure.query(async () => {
      return await getActiveLicense();
    }),
    getByKey: protectedProcedure
      .input(z.object({ licenseKey: z.string() }))
      .query(async ({ input }) => {
        return await getLicenseByKey(input.licenseKey);
      }),
    create: protectedProcedure
      .input(z.object({
        licenseKey: z.string().optional(),
        licenseType: z.enum(["trial", "standard", "professional", "enterprise"]).default("trial"),
        companyName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        maxUsers: z.number().default(5),
        maxProductionLines: z.number().default(3),
        maxSpcPlans: z.number().default(10),
        features: z.string().optional(),
        // Accept both array and JSON string for systems
        systems: z.union([z.array(z.string()), z.string()]).optional(),
        // Accept both record and JSON string for systemFeatures
        systemFeatures: z.union([z.record(z.string(), z.array(z.string())), z.string()]).optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        const licenseKey = input.licenseKey || generateLicenseKey();
        
        // Parse systems - handle both array and JSON string
        let systemsJson: string | null = null;
        if (input.systems) {
          if (typeof input.systems === 'string') {
            // Already JSON string
            systemsJson = input.systems;
          } else {
            // Array - stringify it
            systemsJson = JSON.stringify(input.systems);
          }
        }
        
        // Parse systemFeatures - handle both record and JSON string
        let featuresJson: string | null = null;
        if (input.systemFeatures) {
          if (typeof input.systemFeatures === 'string') {
            // Already JSON string
            featuresJson = input.systemFeatures;
          } else {
            // Record - stringify it
            featuresJson = JSON.stringify(input.systemFeatures);
          }
        }
        
        await createLicense({
          ...input,
          licenseKey,
          isActive: 0,
          systems: systemsJson,
          systemFeatures: featuresJson,
        });
        return { success: true, licenseKey };
      }),
    activate: protectedProcedure
      .input(z.object({ licenseKey: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const license = await getLicenseByKey(input.licenseKey);
        if (!license) {
          throw new TRPCError({ code: "NOT_FOUND", message: "License key không hợp lệ" });
        }
        if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "License đã hết hạn" });
        }
        await activateLicense(input.licenseKey, ctx.user?.id || 0);
        return { success: true, license };
      }),
    deactivate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        await deactivateLicense(input.id);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        await deleteLicense(input.id);
        return { success: true };
      }),
    generateKey: protectedProcedure.query(() => {
      return { licenseKey: generateLicenseKey() };
    }),
    seedDefault: protectedProcedure.mutation(async () => {
      await seedDefaultLicense();
      return { success: true };
    }),
    checkExpiry: protectedProcedure
      .input(z.object({ daysBeforeExpiry: z.number().default(30) }))
      .query(async ({ input }) => {
        const expiringSoon = await getLicensesExpiringSoon(input.daysBeforeExpiry);
        const expired = await getExpiredLicenses();
        return { expiringSoon, expired };
      }),
    sendExpiryNotifications: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      
      const expiring7Days = await getLicensesExpiringSoon(7);
      const expiring30Days = await getLicensesExpiringSoon(30);
      const expired = await getExpiredLicenses();
      
      const notifications: { type: string; license: string; company: string; email: string; expiresAt: Date | null }[] = [];
      
      for (const license of expiring7Days) {
        notifications.push({
          type: "7_days_warning",
          license: license.licenseKey,
          company: license.companyName || "Unknown",
          email: license.contactEmail || "",
          expiresAt: license.expiresAt,
        });
      }
      
      for (const license of expiring30Days.filter(l => !expiring7Days.find(e => e.id === l.id))) {
        notifications.push({
          type: "30_days_warning",
          license: license.licenseKey,
          company: license.companyName || "Unknown",
          email: license.contactEmail || "",
          expiresAt: license.expiresAt,
        });
      }
      
      for (const license of expired) {
        notifications.push({
          type: "expired",
          license: license.licenseKey,
          company: license.companyName || "Unknown",
          email: license.contactEmail || "",
          expiresAt: license.expiresAt,
        });
      }
      
      return { success: true, notifications, count: notifications.length };
    }),
    
    // Trigger manual license expiry check (admin only)
    triggerCheck: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admin can trigger license check" });
      }
      
      const result = await triggerLicenseExpiryCheck();
      return {
        success: true,
        ...result,
        message: `Checked licenses: ${result.expiringSoon30} expiring in 30 days, ${result.expiringSoon7} expiring in 7 days, ${result.expired} expired`
      };
    }),
    
    // Hybrid Activation - Online activation
    activateOnline: publicProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.activateOnline(input.licenseKey, input.hardwareFingerprint);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { success: true, license: result.license };
      }),
    
    // Hybrid Activation - Generate offline license file
    generateOfflineFile: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.generateOfflineFile(input.licenseKey, input.hardwareFingerprint);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { success: true, fileContent: result.fileContent };
      }),
    
    // Generate offline license for activation flow
    generateOfflineLicense: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.generateOfflineFile(input.licenseKey, input.hardwareFingerprint);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { offlineLicenseFile: result.fileContent };
      }),
    
    // Validate offline license file
    validateOfflineLicense: publicProcedure
      .input(z.object({
        offlineLicenseFile: z.string(),
        hardwareFingerprint: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Decode and validate the offline license file
          const decoded = Buffer.from(input.offlineLicenseFile, 'base64').toString('utf-8');
          const licenseData = JSON.parse(decoded);
          
          // Check hardware fingerprint
          if (licenseData.hardwareFingerprint !== input.hardwareFingerprint) {
            return { valid: false, error: "Hardware fingerprint không khớp" };
          }
          
          // Check expiry
          if (licenseData.expiresAt && new Date(licenseData.expiresAt) < new Date()) {
            return { valid: false, error: "License đã hết hạn" };
          }
          
          return { valid: true, licenseData };
        } catch (error) {
          return { valid: false, error: "File license không hợp lệ" };
        }
      }),
    
    // Hybrid Activation - Offline activation
    activateOffline: publicProcedure
      .input(z.object({
        licenseFileContent: z.string(),
        hardwareFingerprint: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.activateOffline(input.licenseFileContent, input.hardwareFingerprint);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { success: true, license: result.license };
      }),
    
    // Hybrid Activation - Validate license
    validate: publicProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.validateLicense(input.licenseKey, input.hardwareFingerprint);
        return { valid: result.valid, error: result.error, license: result.license };
      }),
    
    // Hybrid Activation - Get statistics
    statistics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { licenseServer } = await import("./licenseServer");
      return await licenseServer.getStatistics();
    }),
    
    // Hybrid Activation - Revoke license
    revoke: protectedProcedure
      .input(z.object({ licenseKey: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { licenseServer } = await import("./licenseServer");
        const success = await licenseServer.revokeLicense(input.licenseKey);
        return { success };
      }),

    // ============ LICENSE SERVER API (For Vendors) ============
    
    // Validate license with retry mechanism
    validateWithRetry: publicProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string().optional(),
        maxRetries: z.number().default(3)
      }))
      .mutation(async ({ input }) => {
        const { licenseServer } = await import("./licenseServer");
        let lastError = "";
        
        for (let attempt = 1; attempt <= input.maxRetries; attempt++) {
          try {
            const result = await licenseServer.validateLicense(input.licenseKey, input.hardwareFingerprint);
            if (result.valid) {
              // Update last validated timestamp
              const { getDb } = await import("./db");
              const db = await getDb();
              if (db) {
                const { licenses } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                await db.update(licenses)
                  .set({ lastValidatedAt: new Date() })
                  .where(eq(licenses.licenseKey, input.licenseKey));
              }
              return { valid: true, license: result.license, attempt };
            }
            lastError = result.error || "Validation failed";
          } catch (error: any) {
            lastError = error.message || "Connection error";
            // Exponential backoff
            if (attempt < input.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        }
        
        return { valid: false, error: lastError, attempts: input.maxRetries };
      }),

    // Heartbeat - periodic license check
    heartbeat: publicProcedure
      .input(z.object({
        licenseKey: z.string(),
        hardwareFingerprint: z.string(),
        systemInfo: z.object({
          hostname: z.string().optional(),
          platform: z.string().optional(),
          uptime: z.number().optional(),
          activeUsers: z.number().optional()
        }).optional()
      }))
      .mutation(async ({ input }) => {
        const { licenseServer } = await import("./licenseServer");
        const result = await licenseServer.validateLicense(input.licenseKey, input.hardwareFingerprint);
        
        if (!result.valid) {
          return { valid: false, error: result.error };
        }
        
        // Log heartbeat
        const { getDb } = await import("./db");
        const db = await getDb();
        if (db) {
          const { licenses, licenseHeartbeats } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          
          // Update last validated
          await db.update(licenses)
            .set({ lastValidatedAt: new Date() })
            .where(eq(licenses.licenseKey, input.licenseKey));
          
          // Insert heartbeat log if table exists
          try {
            await db.insert(licenseHeartbeats).values({
              licenseKey: input.licenseKey,
              hardwareFingerprint: input.hardwareFingerprint,
              hostname: input.systemInfo?.hostname,
              platform: input.systemInfo?.platform,
              activeUsers: input.systemInfo?.activeUsers,
            });
          } catch (e) {
            // Table might not exist yet
          }
        }
        
        return {
          valid: true,
          license: result.license,
          serverTime: new Date().toISOString(),
          nextHeartbeat: 24 * 60 * 60 * 1000 // 24 hours
        };
      }),

    // Get license usage analytics (for vendor dashboard)
    getUsageAnalytics: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        licenseType: z.enum(["trial", "standard", "professional", "enterprise"]).optional()
      }).optional())
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { activations: [], revenue: [], byType: {}, byStatus: {} };
        
        const { licenses } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        
        // Get all licenses
        const allLicenses = await db.select().from(licenses);
        
        // Calculate analytics
        const byType = { trial: 0, standard: 0, professional: 0, enterprise: 0 };
        const byStatus = { active: 0, pending: 0, expired: 0, revoked: 0 };
        const monthlyActivations: Record<string, number> = {};
        
        for (const lic of allLicenses) {
          byType[lic.licenseType as keyof typeof byType]++;
          byStatus[lic.licenseStatus as keyof typeof byStatus]++;
          
          if (lic.activatedAt) {
            const month = new Date(lic.activatedAt).toISOString().substring(0, 7);
            monthlyActivations[month] = (monthlyActivations[month] || 0) + 1;
          }
        }
        
        return {
          total: allLicenses.length,
          byType,
          byStatus,
          monthlyActivations: Object.entries(monthlyActivations)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month)),
          recentActivations: allLicenses
            .filter(l => l.activatedAt)
            .sort((a, b) => new Date(b.activatedAt!).getTime() - new Date(a.activatedAt!).getTime())
            .slice(0, 10)
            .map(l => ({
              licenseKey: l.licenseKey,
              companyName: l.companyName,
              licenseType: l.licenseType,
              activatedAt: l.activatedAt
            }))
        };
      }),

    // Bulk create licenses (for vendor)
    bulkCreate: protectedProcedure
      .input(z.object({
        count: z.number().min(1).max(100),
        licenseType: z.enum(["trial", "standard", "professional", "enterprise"]),
        durationDays: z.number().optional(),
        prefix: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { licenseServer, LICENSE_FEATURES } = await import("./licenseServer");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { licenses } = await import("../drizzle/schema");
        const features = LICENSE_FEATURES[input.licenseType];
        const expiresAt = input.durationDays 
          ? new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000)
          : null;
        
        const createdKeys: string[] = [];
        
        for (let i = 0; i < input.count; i++) {
          const { generateLicenseKey } = await import("./licenseServer");
          const licenseKey = generateLicenseKey(input.licenseType);
          
          await db.insert(licenses).values({
            licenseKey,
            licenseType: input.licenseType,
            licenseStatus: "pending",
            maxUsers: features.maxUsers,
            maxProductionLines: features.maxLines,
            maxSpcPlans: features.maxPlans,
            features: JSON.stringify(features.features),
            issuedAt: new Date(),
            expiresAt,
          });
          
          createdKeys.push(licenseKey);
        }
        
        return { success: true, count: createdKeys.length, licenseKeys: createdKeys };
      }),

    // Export licenses to CSV
    exportToCsv: protectedProcedure
      .input(z.object({
        status: z.enum(["all", "active", "pending", "expired", "revoked"]).optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { licenseServer } = await import("./licenseServer");
        const allLicenses = await licenseServer.listLicenses(
          input?.status && input.status !== "all" ? { status: input.status as any } : undefined
        );
        
        const headers = ["License Key", "Type", "Status", "Company", "Email", "Max Users", "Max Lines", "Max Plans", "Issued At", "Expires At", "Activated At"];
        const rows = allLicenses.map(l => [
          l.licenseKey,
          l.type,
          l.status,
          l.companyName,
          l.contactEmail,
          l.maxUsers === -1 ? "Unlimited" : l.maxUsers,
          l.maxLines === -1 ? "Unlimited" : l.maxLines,
          l.maxPlans === -1 ? "Unlimited" : l.maxPlans,
          l.issuedAt.toISOString(),
          l.expiresAt?.toISOString() || "Never",
          l.activatedAt?.toISOString() || "Not activated"
        ]);
        
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        return { csv, count: allLicenses.length };
      }),

    // Update license details
    updateLicense: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        companyName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        maxUsers: z.number().optional(),
        maxProductionLines: z.number().optional(),
        maxSpcPlans: z.number().optional(),
        expiresAt: z.date().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { licenses } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const { licenseKey, ...updateData } = input;
        await db.update(licenses)
          .set(updateData)
          .where(eq(licenses.licenseKey, licenseKey));
        
        return { success: true };
      }),

    // Extend license expiration
    extendExpiration: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        additionalDays: z.number().min(1)
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { licenseServer } = await import("./licenseServer");
        const license = await licenseServer.getLicenseByKey(input.licenseKey);
        if (!license) {
          throw new TRPCError({ code: "NOT_FOUND", message: "License not found" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { licenses } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const currentExpiry = license.expiresAt || new Date();
        const newExpiry = new Date(currentExpiry.getTime() + input.additionalDays * 24 * 60 * 60 * 1000);
        
        await db.update(licenses)
          .set({ 
            expiresAt: newExpiry,
            licenseStatus: "active" // Reactivate if was expired
          })
          .where(eq(licenses.licenseKey, input.licenseKey));
        
        return { success: true, newExpiresAt: newExpiry };
      }),

    // Transfer license to new hardware
    transferLicense: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        newHardwareFingerprint: z.string(),
        reason: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { licenses } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await db.update(licenses)
          .set({ 
            hardwareFingerprint: input.newHardwareFingerprint,
            offlineLicenseFile: null // Invalidate old offline file
          })
          .where(eq(licenses.licenseKey, input.licenseKey));
        
        return { success: true };
      }),

    // Get license revenue statistics
    getRevenue: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return { totalVND: 0, totalUSD: 0, totalEUR: 0, byCurrency: {}, byType: {} };
      
      const { licenses } = await import("../drizzle/schema");
      const allLicenses = await db.select().from(licenses);
      
      const byCurrency: Record<string, number> = { VND: 0, USD: 0, EUR: 0 };
      const byType: Record<string, { count: number; revenue: Record<string, number> }> = {
        trial: { count: 0, revenue: { VND: 0, USD: 0, EUR: 0 } },
        standard: { count: 0, revenue: { VND: 0, USD: 0, EUR: 0 } },
        professional: { count: 0, revenue: { VND: 0, USD: 0, EUR: 0 } },
        enterprise: { count: 0, revenue: { VND: 0, USD: 0, EUR: 0 } }
      };
      
      for (const lic of allLicenses) {
        const price = Number((lic as any).price) || 0;
        const currency = (lic as any).currency || "VND";
        const licType = lic.licenseType || "standard";
        
        if (price > 0) {
          byCurrency[currency] = (byCurrency[currency] || 0) + price;
          if (byType[licType]) {
            byType[licType].count++;
            byType[licType].revenue[currency] = (byType[licType].revenue[currency] || 0) + price;
          }
        }
      }
      
      return {
        totalVND: byCurrency.VND || 0,
        totalUSD: byCurrency.USD || 0,
        totalEUR: byCurrency.EUR || 0,
        byCurrency,
        byType,
        totalLicenses: allLicenses.length,
        paidLicenses: allLicenses.filter(l => Number((l as any).price) > 0).length
      };
    }),

    // Get revenue by period (month/quarter/year)
    getRevenueByPeriod: protectedProcedure
      .input(z.object({
        period: z.enum(["month", "quarter", "year"]),
        year: z.number().optional(),
        currency: z.string().optional()
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { data: [], summary: {} };
        
        const { licenses } = await import("../drizzle/schema");
        const allLicenses = await db.select().from(licenses);
        
        const currentYear = input.year || new Date().getFullYear();
        const targetCurrency = input.currency || "all";
        
        // Group by period
        const periodData: Record<string, { revenue: Record<string, number>; count: number }> = {};
        
        for (const lic of allLicenses) {
          const price = Number((lic as any).price) || 0;
          const currency = (lic as any).currency || "VND";
          const issuedAt = lic.issuedAt ? new Date(lic.issuedAt) : null;
          
          if (price <= 0 || !issuedAt) continue;
          if (targetCurrency !== "all" && currency !== targetCurrency) continue;
          
          const licYear = issuedAt.getFullYear();
          if (licYear !== currentYear) continue;
          
          let periodKey = "";
          if (input.period === "month") {
            periodKey = `${licYear}-${String(issuedAt.getMonth() + 1).padStart(2, "0")}`;
          } else if (input.period === "quarter") {
            const quarter = Math.ceil((issuedAt.getMonth() + 1) / 3);
            periodKey = `Q${quarter} ${licYear}`;
          } else {
            periodKey = String(licYear);
          }
          
          if (!periodData[periodKey]) {
            periodData[periodKey] = { revenue: { VND: 0, USD: 0, EUR: 0 }, count: 0 };
          }
          periodData[periodKey].revenue[currency] = (periodData[periodKey].revenue[currency] || 0) + price;
          periodData[periodKey].count++;
        }
        
        // Convert to array and sort
        const data = Object.entries(periodData)
          .map(([period, stats]) => ({
            period,
            ...stats,
            totalVND: stats.revenue.VND || 0,
            totalUSD: stats.revenue.USD || 0,
            totalEUR: stats.revenue.EUR || 0
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
        
        // Calculate summary
        const summary = {
          totalVND: data.reduce((sum, d) => sum + d.totalVND, 0),
          totalUSD: data.reduce((sum, d) => sum + d.totalUSD, 0),
          totalEUR: data.reduce((sum, d) => sum + d.totalEUR, 0),
          totalCount: data.reduce((sum, d) => sum + d.count, 0),
          avgPerPeriod: data.length > 0 ? data.reduce((sum, d) => sum + d.count, 0) / data.length : 0
        };
        
        return { data, summary, year: currentYear, period: input.period };
      }),
    
    // Get licenses expiring soon (for notifications)
    getExpiringLicenses: protectedProcedure
      .input(z.object({
        daysThreshold: z.number().default(30)
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        
        const { licenses } = await import("../drizzle/schema");
        const { and, gte, lte, eq } = await import("drizzle-orm");
        
        const now = new Date();
        const threshold = new Date(now.getTime() + (input?.daysThreshold || 30) * 24 * 60 * 60 * 1000);
        
        const expiring = await db.select().from(licenses).where(
          and(
            eq(licenses.licenseStatus, "active"),
            gte(licenses.expiresAt, now),
            lte(licenses.expiresAt, threshold)
          )
        );
        
        return expiring.map(lic => ({
          ...lic,
          daysRemaining: Math.ceil((new Date(lic.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }));
      }),
    
    // Send expiry notification email
    sendExpiryNotification: protectedProcedure
      .input(z.object({
        licenseKey: z.string(),
        daysRemaining: z.number()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { licenseServer } = await import("./licenseServer");
        const license = await licenseServer.getLicenseByKey(input.licenseKey);
        
        if (!license || !license.contactEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "License not found or no contact email" });
        }
        
        // Send notification via owner notification
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `License sắp hết hạn - ${license.companyName || license.licenseKey}`,
          content: `License ${license.licenseKey} của ${license.companyName || 'khách hàng'} sẽ hết hạn trong ${input.daysRemaining} ngày.\n\nEmail liên hệ: ${license.contactEmail}\nLoại: ${license.type}\nNgày hết hạn: ${license.expiresAt?.toLocaleDateString('vi-VN')}`
        });
        
        // Log notification (skipped - table not available)
        console.log(`License expiry notification sent for ${input.licenseKey}`);
        
        return { success: true };
      }),
    
    // Get license usage statistics
    getUsageStats: protectedProcedure
      .input(z.object({
        licenseKey: z.string().optional()
      }).optional())
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return null;
        
        const { licenses, users, productionLines, spcSamplingPlans } = await import("../drizzle/schema");
        const { eq, count } = await import("drizzle-orm");
        
        // Get active license
        let license;
        if (input?.licenseKey) {
          const [lic] = await db.select().from(licenses).where(eq(licenses.licenseKey, input.licenseKey));
          license = lic;
        } else {
          const [lic] = await db.select().from(licenses).where(eq(licenses.isActive, 1));
          license = lic;
        }
        
        if (!license) return null;
        
        // Count current usage
        const [userCount] = await db.select({ count: count() }).from(users);
        const [lineCount] = await db.select({ count: count() }).from(productionLines);
        const [planCount] = await db.select({ count: count() }).from(spcSamplingPlans);
        
        return {
          licenseKey: license.licenseKey,
          licenseType: license.licenseType,
          usage: {
            users: {
              current: userCount?.count || 0,
              max: license.maxUsers || 0,
              percentage: license.maxUsers && license.maxUsers > 0 
                ? Math.round(((userCount?.count || 0) / license.maxUsers) * 100) 
                : 0
            },
            productionLines: {
              current: lineCount?.count || 0,
              max: license.maxProductionLines || 0,
              percentage: license.maxProductionLines && license.maxProductionLines > 0 
                ? Math.round(((lineCount?.count || 0) / license.maxProductionLines) * 100) 
                : 0
            },
            spcPlans: {
              current: planCount?.count || 0,
              max: license.maxSpcPlans || 0,
              percentage: license.maxSpcPlans && license.maxSpcPlans > 0 
                ? Math.round(((planCount?.count || 0) / license.maxSpcPlans) * 100) 
                : 0
            }
          },
          expiresAt: license.expiresAt,
          daysRemaining: license.expiresAt 
            ? Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null
        };
      }),
    
    // License Notification Logs
    getNotificationLogs: protectedProcedure
      .input(z.object({
        licenseId: z.number().optional(),
        notificationType: z.string().optional(),
        status: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getLicenseNotificationLogs } = await import("./db");
        return await getLicenseNotificationLogs(input || {});
      }),
    
    getNotificationStats: protectedProcedure
      .input(z.object({ days: z.number().default(30) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getLicenseNotificationStats } = await import("./db");
        return await getLicenseNotificationStats(input?.days || 30);
      }),

    // Dashboard stats
    getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getLicenseDashboardStats } = await import("./db");
      return await getLicenseDashboardStats();
    }),

    // Retry failed notification
    retryNotification: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getNotificationLogById, updateLicenseNotificationLog } = await import("./db");
        const log = await getNotificationLogById(input.id);
        
        if (!log) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Notification log not found" });
        }
        
        if (log.status !== "failed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed notifications can be retried" });
        }
        
        try {
          const { notifyOwner } = await import("./_core/notification");
          const success = await notifyOwner({
            title: log.subject || "License Notification",
            content: log.subject || "",
          });
          
          if (success) {
            await updateLicenseNotificationLog(input.id, {
              status: "sent",
              sentAt: new Date(),
              
            });
            return { success: true, message: "Notification sent successfully" };
          } else {
            await updateLicenseNotificationLog(input.id, {
              
              errorMessage: "Failed to send notification",
            });
            return { success: false, message: "Failed to send notification" };
          }
        } catch (error: any) {
          await updateLicenseNotificationLog(input.id, {
            
            errorMessage: error.message || "Unknown error",
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to retry notification" });
        }
      }),

    // Bulk retry failed notifications
    bulkRetryNotifications: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        
        const { getNotificationLogById, updateLicenseNotificationLog } = await import("./db");
        const { notifyOwner } = await import("./_core/notification");
        
        let successCount = 0;
        let failCount = 0;
        
        for (const id of input.ids) {
          const log = await getNotificationLogById(id);
          if (!log || log.status !== "failed") {
            failCount++;
            continue;
          }
          
          try {
            const success = await notifyOwner({
              title: log.subject || "License Notification",
              content: log.subject || "",
            });
            
            if (success) {
              await updateLicenseNotificationLog(id, {
                status: "sent",
                sentAt: new Date(),
                
              });
              successCount++;
            } else {
              await updateLicenseNotificationLog(id, {
                
              });
              failCount++;
            }
          } catch (error) {
            failCount++;
          }
        }
        
        return { success: true, successCount, failCount, total: input.ids.length };
      }),

    // Check and send scheduled notifications
    processExpiryNotifications: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return { processed: 0, sent: 0 };
      
      const { licenses } = await import("../drizzle/schema");
      const { and, gte, lte, eq } = await import("drizzle-orm");
      
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Get licenses expiring in 7 days
      const expiring7Days = await db.select().from(licenses).where(
        and(
          eq(licenses.licenseStatus, "active"),
          gte(licenses.expiresAt, now),
          lte(licenses.expiresAt, in7Days)
        )
      );
      
      // Get licenses expiring in 30 days
      const expiring30Days = await db.select().from(licenses).where(
        and(
          eq(licenses.licenseStatus, "active"),
          gte(licenses.expiresAt, in7Days),
          lte(licenses.expiresAt, in30Days)
        )
      );
      
      let sent = 0;
      const { notifyOwner } = await import("./_core/notification");
      
      // Send 7-day notifications
      for (const lic of expiring7Days) {
        if (lic.contactEmail) {
          const days = Math.ceil((new Date(lic.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await notifyOwner({
            title: `⚠️ License sắp hết hạn (${days} ngày)`,
            content: `License ${lic.licenseKey} của ${lic.companyName || 'khách hàng'} sẽ hết hạn trong ${days} ngày.\nEmail: ${lic.contactEmail}`
          });
          sent++;
        }
      }
      
      // Send 30-day notifications
      for (const lic of expiring30Days) {
        if (lic.contactEmail) {
          const days = Math.ceil((new Date(lic.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await notifyOwner({
            title: `License sắp hết hạn (${days} ngày)`,
            content: `License ${lic.licenseKey} của ${lic.companyName || 'khách hàng'} sẽ hết hạn trong ${days} ngày.\nEmail: ${lic.contactEmail}`
          });
          sent++;
        }
      }
      
      return {
        processed: expiring7Days.length + expiring30Days.length,
        sent,
        expiring7Days: expiring7Days.length,
        expiring30Days: expiring30Days.length
      };
    }),
  }),
  
  // Webhook router
  webhook: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { webhooks } = await import("../drizzle/schema");
      return db.select().from(webhooks).orderBy(webhooks.createdAt);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return null;
        const { webhooks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, input.id));
        return webhook || null;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        url: z.string().url(),
        webhookType: z.enum(["slack", "teams", "custom"]),
        secret: z.string().optional(),
        headers: z.string().optional(),
        events: z.array(z.enum(["cpk_alert", "rule_violation", "analysis_complete"])),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { webhooks } = await import("../drizzle/schema");
        const result = await db.insert(webhooks).values({
          name: input.name,
          url: input.url,
          webhookType: input.webhookType,
          secret: input.secret || null,
          headers: input.headers || null,
          events: JSON.stringify(input.events),
          createdBy: ctx.user.id,
        });
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        url: z.string().url().optional(),
        webhookType: z.enum(["slack", "teams", "custom"]).optional(),
        secret: z.string().optional(),
        headers: z.string().optional(),
        events: z.array(z.enum(["cpk_alert", "rule_violation", "analysis_complete"])).optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { webhooks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.url !== undefined) updateData.url = input.url;
        if (input.webhookType !== undefined) updateData.webhookType = input.webhookType;
        if (input.secret !== undefined) updateData.secret = input.secret;
        if (input.headers !== undefined) updateData.headers = input.headers;
        if (input.events !== undefined) updateData.events = JSON.stringify(input.events);
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        await db.update(webhooks).set(updateData).where(eq(webhooks.id, input.id));
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { webhooks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.delete(webhooks).where(eq(webhooks.id, input.id));
        return { success: true };
      }),
    
    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return testWebhook(input.id);
      }),
    
    getLogs: protectedProcedure
      .input(z.object({
        webhookId: z.number().optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        const { webhookLogs } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        if (input.webhookId) {
          return db.select().from(webhookLogs).where(eq(webhookLogs.webhookId, input.webhookId)).orderBy(desc(webhookLogs.sentAt)).limit(input.limit);
        }
        return db.select().from(webhookLogs).orderBy(desc(webhookLogs.sentAt)).limit(input.limit);
      }),
    
    trigger: protectedProcedure
      .input(z.object({
        eventType: z.enum(["cpk_alert", "rule_violation", "analysis_complete"]),
        data: z.object({
          productCode: z.string().optional(),
          stationName: z.string().optional(),
          cpk: z.number().optional(),
          cpkThreshold: z.number().optional(),
          ruleViolation: z.string().optional(),
          message: z.string().optional(),
          severity: z.enum(["info", "warning", "critical"]).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return triggerWebhooks(input.eventType, input.data);
      }),
    
    // Retry statistics
    retryStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getRetryStats } = await import("./webhookService");
      return getRetryStats();
    }),
    
    // Process pending retries manually
    processRetries: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { processWebhookRetries } = await import("./webhookService");
      return processWebhookRetries();
    }),
    
    // Manual retry a specific failed webhook
    retryOne: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { manualRetryWebhook } = await import("./webhookService");
        return manualRetryWebhook(input.logId);
      }),
  }),
  
  // Backup router
  backup: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        type: z.enum(["daily", "weekly", "manual"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { listBackups } = await import("./backupService");
        return listBackups(input);
      }),
    
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getBackupStats } = await import("./backupService");
      return getBackupStats();
    }),
    
    schedulerStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getSchedulerStatus } = await import("./backupService");
      return getSchedulerStatus();
    }),
    
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["daily", "weekly", "manual"]).default("manual"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { createBackup } = await import("./backupService");
        return createBackup(input.type, ctx.user.id);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteBackup } = await import("./backupService");
        return deleteBackup(input.id);
      }),
    
    // Restore backup
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { restoreBackup } = await import("./backupService");
        return restoreBackup(input.id, ctx.user.id);
      }),
    
    // Validate backup
    validate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { validateBackup } = await import("./backupService");
        return validateBackup(input.id);
      }),
    
    // Get backup config
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getBackupConfig } = await import("./backupService");
      return getBackupConfig();
    }),
    
    // Save backup config
    saveConfig: protectedProcedure
      .input(z.object({
        dailyEnabled: z.boolean().optional(),
        dailySchedule: z.string().optional(),
        weeklyEnabled: z.boolean().optional(),
        weeklySchedule: z.string().optional(),
        maxBackupsToKeep: z.number().optional(),
        retentionDays: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { saveBackupConfig } = await import("./backupService");
        const success = await saveBackupConfig(input);
        return { success };
      }),
    
    // Toggle scheduled backup
    toggleSchedule: protectedProcedure
      .input(z.object({
        type: z.enum(["daily", "weekly"]),
        enabled: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { toggleScheduledBackup } = await import("./backupService");
        const success = await toggleScheduledBackup(input.type, input.enabled);
        return { success };
      }),
    
    // Update backup schedule
    updateSchedule: protectedProcedure
      .input(z.object({
        type: z.enum(["daily", "weekly"]),
        schedule: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { updateBackupSchedule } = await import("./backupService");
        return updateBackupSchedule(input.type, input.schedule);
      }),

    // S3 Database Backup - create full SQL dump and upload to S3
    createS3Backup: protectedProcedure
      .input(z.object({
        includeSchema: z.boolean().default(true),
        includeData: z.boolean().default(true),
        retentionDays: z.number().default(30),
        excludeTables: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { createBackup } = await import("./services/databaseBackupService");
        return createBackup(input);
      }),

    // S3 Backup History
    s3History: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getBackupHistory } = await import("./services/databaseBackupService");
      return getBackupHistory();
    }),

    // S3 Backup Stats
    s3Stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getBackupStats } = await import("./services/databaseBackupService");
      return getBackupStats();
    }),

    // Generate restore script for a backup
    generateRestoreScript: protectedProcedure
      .input(z.object({ backupId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getBackupById, generateRestoreScript } = await import("./services/databaseBackupService");
        const backup = getBackupById(input.backupId);
        if (!backup) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Backup not found" });
        }
        return { script: generateRestoreScript(backup), backup };
      }),
  }),
  
  // Settings Export/Import router
  settingsExport: router({
    // Get export preview
    preview: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getExportPreview } = await import("./settingsExportService");
      return getExportPreview();
    }),
    
    // Export settings
    export: protectedProcedure
      .input(z.object({
        includeSystemConfig: z.boolean().optional(),
        includeCompanyInfo: z.boolean().optional(),
        includeAlertSettings: z.boolean().optional(),
        includeEmailSettings: z.boolean().optional(),
        includeRoles: z.boolean().optional(),
        includeMasterData: z.boolean().optional(),
        includeMappings: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { exportSettings } = await import("./settingsExportService");
        return exportSettings({ ...input, exportedBy: ctx.user.id });
      }),
    
    // Validate import data
    validate: protectedProcedure
      .input(z.object({
        data: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { validateImportData } = await import("./settingsExportService");
        return validateImportData(input.data);
      }),
    
    // Import settings
    import: protectedProcedure
      .input(z.object({
        data: z.any(),
        overwrite: z.boolean().optional(),
        sections: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { importSettings } = await import("./settingsExportService");
        return importSettings(input.data, {
          overwrite: input.overwrite,
          sections: input.sections,
          importedBy: ctx.user.id,
        });
      }),
  }),
  
  // Database Explorer router
  databaseExplorer: router({
    connectionInfo: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getConnectionInfo } = await import("./databaseExplorerService");
      return getConnectionInfo();
    }),
    
    tables: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getTables } = await import("./databaseExplorerService");
      return getTables();
    }),
    
    tableData: protectedProcedure
      .input(z.object({
        tableName: z.string(),
        page: z.number().default(1),
        pageSize: z.number().min(1).max(500).default(50),
        sortColumn: z.string().optional(),
        sortDirection: z.enum(["asc", "desc"]).default("asc"),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getTableData } = await import("./databaseExplorerService");
        return getTableData(input.tableName, {
          page: input.page,
          pageSize: input.pageSize,
          sortColumn: input.sortColumn,
          sortDirection: input.sortDirection,
        });
      }),
    
    tableSchema: protectedProcedure
      .input(z.object({ tableName: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getTableSchema } = await import("./databaseExplorerService");
        return getTableSchema(input.tableName);
      }),
    
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { getDatabaseStats } = await import("./databaseExplorerService");
      return getDatabaseStats();
    }),
  }),
  
  // Measurement Standards router
  measurementStandard: router({
    list: protectedProcedure.query(async () => {
      const { getMeasurementStandards } = await import("./db");
      return await getMeasurementStandards();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getMeasurementStandardById } = await import("./db");
        return await getMeasurementStandardById(input.id);
      }),
    
    getByProductWorkstation: protectedProcedure
      .input(z.object({
        productId: z.number(),
        workstationId: z.number(),
        machineId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const { getMeasurementStandardByProductWorkstation } = await import("./db");
        return await getMeasurementStandardByProductWorkstation(input.productId, input.workstationId, input.machineId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        measurementName: z.string(),
        productId: z.number(),
        workstationId: z.number(),
        machineId: z.number().optional(),
        usl: z.number(),
        lsl: z.number(),
        target: z.number().optional(),
        unit: z.string().optional(),
        sampleSize: z.number().default(5),
        sampleFrequency: z.number().default(60),
        samplingMethod: z.string().default("random"),
        appliedSpcRules: z.string().optional(),
        appliedCpkRules: z.string().optional(),
        appliedCaRules: z.string().optional(),
        cpkWarningThreshold: z.number().optional(),
        cpkCriticalThreshold: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { createMeasurementStandard } = await import("./db");
        const id = await createMeasurementStandard(input);
        return { success: true, id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        measurementName: z.string().optional(),
        productId: z.number().optional(),
        workstationId: z.number().optional(),
        machineId: z.number().optional(),
        usl: z.number().optional(),
        lsl: z.number().optional(),
        target: z.number().optional(),
        unit: z.string().optional(),
        sampleSize: z.number().optional(),
        sampleFrequency: z.number().optional(),
        samplingMethod: z.string().optional(),
        appliedSpcRules: z.string().optional(),
        appliedCpkRules: z.string().optional(),
        appliedCaRules: z.string().optional(),
        cpkWarningThreshold: z.number().optional(),
        cpkCriticalThreshold: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { id, ...data } = input;
        const { updateMeasurementStandard } = await import("./db");
        await updateMeasurementStandard(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteMeasurementStandard } = await import("./db");
        await deleteMeasurementStandard(input.id);
        return { success: true };
      }),
  }),

  validationRule: router({
    list: protectedProcedure.query(async () => {
      return await getCustomValidationRules();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCustomValidationRuleById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        productId: z.number().optional(),
        workstationId: z.number().optional(),
        ruleType: z.string().default("range_check"),
        ruleConfig: z.string().optional(),
        actionOnViolation: z.string().default("warning"),
        severity: z.string().default("medium"),
        violationMessage: z.string().optional(),
        priority: z.number().default(100),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createCustomValidationRule({
          ...input,
          ruleType: input.ruleType as "range_check" | "trend_check" | "pattern_check" | "comparison_check" | "formula_check" | "custom_script",
          actionOnViolation: input.actionOnViolation as "warning" | "alert" | "reject" | "log_only",
          severity: input.severity as "low" | "medium" | "high" | "critical",
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        productId: z.number().optional(),
        workstationId: z.number().optional(),
        ruleType: z.string().optional(),
        ruleConfig: z.string().optional(),
        actionOnViolation: z.string().optional(),
        severity: z.string().optional(),
        violationMessage: z.string().optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCustomValidationRule(id, data as any);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCustomValidationRule(input.id);
        return { success: true };
      }),

    toggleActive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await toggleCustomValidationRule(input.id);
        return { success: true };
      }),

    // Dashboard stats - violations by day for sparkline
    getViolationsByDay: protectedProcedure
      .input(z.object({ days: z.number().default(7) }).optional())
      .query(async ({ input }) => {
        const { getValidationViolationsByDay } = await import("./db");
        return await getValidationViolationsByDay(input?.days || 7);
      }),

    // Recent violations for dashboard
    getRecentViolations: protectedProcedure
      .input(z.object({ limit: z.number().default(5) }).optional())
      .query(async ({ input }) => {
        const { getRecentViolations } = await import("./db");
        return await getRecentViolations(input?.limit || 5);
      }),
  }),

  // License Customer Management
  licenseCustomer: router({
    list: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { licenseCustomers } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(licenseCustomers).orderBy(licenseCustomers.companyName);
    }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { licenseCustomers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return null;
        const [customer] = await db.select().from(licenseCustomers).where(eq(licenseCustomers.id, input.id));
        return customer;
      }),

    create: adminProcedure
      .input(z.object({
        companyName: z.string().min(1),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
        industry: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { licenseCustomers } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const [result] = await db.insert(licenseCustomers).values(input);
        return { id: result.insertId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
        industry: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { licenseCustomers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const { id, ...data } = input;
        await db.update(licenseCustomers).set(data).where(eq(licenseCustomers.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { licenseCustomers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        await db.delete(licenseCustomers).where(eq(licenseCustomers.id, input.id));
        return { success: true };
      }),
  }),

  // License Server Management (separate database)
  licenseServer: router({
    getConfig: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { systemSettings } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return null;
      
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, "license_server_config"));
      if (!setting) return null;
      
      try {
        return setting.value ? JSON.parse(setting.value) : null;
      } catch {
        return null;
      }
    }),

    saveConfig: adminProcedure
      .input(z.object({
        host: z.string().min(1),
        port: z.number(),
        user: z.string().min(1),
        password: z.string(),
        database: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { systemSettings } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        
        const configJson = JSON.stringify(input);
        
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.key, "license_server_config"));
        if (existing) {
          await db.update(systemSettings).set({ value: configJson }).where(eq(systemSettings.key, "license_server_config"));
        } else {
          await db.insert(systemSettings).values({ key: "license_server_config", value: configJson });
        }
        
        return { success: true };
      }),

    testConnection: adminProcedure
      .input(z.object({
        host: z.string().min(1),
        port: z.number(),
        user: z.string().min(1),
        password: z.string(),
        database: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        const { initLicenseServerDb } = await import("./licenseServerDb");
        const success = await initLicenseServerDb(input);
        return { success, error: success ? undefined : "Connection failed" };
      }),

    connect: adminProcedure.mutation(async () => {
      const { getDb } = await import("./db");
      const { systemSettings } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { initLicenseServerDb } = await import("./licenseServerDb");
      
      const db = await getDb();
      if (!db) return { success: false, error: "Main database not connected" };
      
      const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, "license_server_config"));
      if (!setting) return { success: false, error: "No config found" };
      
      try {
        if (!setting.value) return { success: false, error: "No config value" };
        const config = JSON.parse(setting.value);
        const success = await initLicenseServerDb(config);
        return { success, error: success ? undefined : "Connection failed" };
      } catch {
        return { success: false, error: "Invalid config" };
      }
    }),

    initSchema: adminProcedure.mutation(async () => {
      const { initLicenseServerSchema, isLicenseDbConnected } = await import("./licenseServerDb");
      if (!isLicenseDbConnected()) {
        return { success: false, error: "Not connected to License Server database" };
      }
      const success = await initLicenseServerSchema();
      return { success, error: success ? undefined : "Schema initialization failed" };
    }),

    getStatus: adminProcedure.query(async () => {
      const { isLicenseDbConnected } = await import("./licenseServerDb");
      return { connected: isLicenseDbConnected() };
    }),

    getStats: adminProcedure.query(async () => {
      const { getLicenseServerStats, isLicenseDbConnected } = await import("./licenseServerDb");
      if (!isLicenseDbConnected()) {
        return {
          totalLicenses: 0,
          activeLicenses: 0,
          expiredLicenses: 0,
          totalActivations: 0,
          activeActivations: 0,
          totalCustomers: 0
        };
      }
      return await getLicenseServerStats();
    }),

    // License CRUD in License Server DB
    listLicenses: adminProcedure.query(async () => {
      const { listLicensesInServer, isLicenseDbConnected } = await import("./licenseServerDb");
      if (!isLicenseDbConnected()) return [];
      return await listLicensesInServer();
    }),

    createLicense: adminProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        licenseType: z.enum(["trial", "standard", "professional", "enterprise"]),
        companyName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        maxUsers: z.number().optional(),
        maxDevices: z.number().optional(),
        features: z.string().optional(),
        expiresAt: z.date().optional(),
        notes: z.string().optional(),
        price: z.number().optional(), // Giá tiền license
        currency: z.string().optional().default("VND") // Mã tiền tệ
      }))
      .mutation(async ({ input }) => {
        const { createLicenseInServer, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "License Server not connected" });
        }
        return await createLicenseInServer(input);
      }),

    // Client API endpoints
    validateLicense: publicProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1)
      }))
      .mutation(async ({ input }) => {
        const { validateLicense, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { valid: false, error: "License Server not available" };
        }
        return await validateLicense(input.licenseKey, input.deviceId);
      }),

    activateLicense: publicProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
        deviceName: z.string().optional(),
        deviceInfo: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { activateLicense, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { success: false, error: "License Server not available" };
        }
        const ipAddress = ctx.req?.ip || ctx.req?.socket?.remoteAddress;
        return await activateLicense(input.licenseKey, input.deviceId, input.deviceName, input.deviceInfo, ipAddress);
      }),

    heartbeat: publicProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
        metadata: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { recordHeartbeat, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { success: false, error: "License Server not available" };
        }
        const ipAddress = ctx.req?.ip || ctx.req?.socket?.remoteAddress;
        return await recordHeartbeat(input.licenseKey, input.deviceId, ipAddress, input.metadata);
      }),

    deactivateLicense: publicProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        deviceId: z.string().min(1),
        reason: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { deactivateLicense, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { success: false, error: "License Server not available" };
        }
        const ipAddress = ctx.req?.ip || ctx.req?.socket?.remoteAddress;
        return await deactivateLicense(input.licenseKey, input.deviceId, input.reason, ipAddress);
      }),

    getLicenseStatus: publicProcedure
      .input(z.object({ licenseKey: z.string().min(1) }))
      .query(async ({ input }) => {
        const { getLicenseStatus, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { found: false, error: "License Server not available" };
        }
        return await getLicenseStatus(input.licenseKey);
      }),

    // Revoke license from admin
    revokeLicense: adminProcedure
      .input(z.object({
        licenseKey: z.string().min(1),
        reason: z.string().optional(),
        notifyClient: z.boolean().default(true)
      }))
      .mutation(async ({ input, ctx }) => {
        const { revokeLicense, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "License Server not connected" });
        }
        const result = await revokeLicense(input.licenseKey, input.reason, ctx.user?.name || undefined);
        
        // Send webhook notification if enabled
        if (input.notifyClient && result.success) {
          try {
            const { triggerWebhooks } = await import("./webhookService");
            await triggerWebhooks("license_revoked", {
              licenseKey: input.licenseKey,
              reason: input.reason || "No reason provided",
              revokedBy: ctx.user?.name || "Admin",
              revokedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to send revoke notification:", e);
          }
        }
        
        return result;
      }),

    // Bulk revoke licenses
    bulkRevokeLicenses: adminProcedure
      .input(z.object({
        licenseKeys: z.array(z.string().min(1)),
        reason: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { revokeLicense, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "License Server not connected" });
        }
        
        const results = await Promise.all(
          input.licenseKeys.map(key => revokeLicense(key, input.reason, ctx.user?.name || undefined))
        );
        
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        return { succeeded, failed, total: input.licenseKeys.length };
      }),

    // Check if license is revoked (public API for clients)
    checkRevoked: publicProcedure
      .input(z.object({ licenseKey: z.string().min(1) }))
      .query(async ({ input }) => {
        const { checkLicenseRevoked, isLicenseDbConnected } = await import("./licenseServerDb");
        if (!isLicenseDbConnected()) {
          return { revoked: false, error: "License Server not available" };
        }
        return await checkLicenseRevoked(input.licenseKey);
      }),
  }),

  // Realtime Machine Connection Router
  realtimeConnection: router({
    list: protectedProcedure.query(async () => {
      const { realtimeMachineConnections, machines } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const connections = await db.select()
        .from(realtimeMachineConnections)
        .leftJoin(machines, eq(realtimeMachineConnections.machineId, machines.id))
        .orderBy(desc(realtimeMachineConnections.createdAt));
      return connections.map(c => ({
        ...c.realtime_machine_connections,
        machineName: c.machines?.name
      }));
    }),

    create: adminProcedure
      .input(z.object({
        machineId: z.number(),
        connectionType: z.enum(['database', 'file', 'api', 'opcua', 'mqtt']),
        connectionConfig: z.string(),
        dataQuery: z.string().optional(),
        timestampColumn: z.string().optional(),
        measurementColumn: z.string().optional(),
        pollingIntervalMs: z.number().min(1000).default(5000),
        isActive: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const { realtimeMachineConnections } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const result = await db.insert(realtimeMachineConnections).values({
          machineId: input.machineId,
          connectionType: input.connectionType,
          connectionConfig: input.connectionConfig,
          dataQuery: input.dataQuery || null,
          timestampColumn: input.timestampColumn || 'timestamp',
          measurementColumn: input.measurementColumn || 'value',
          pollingIntervalMs: input.pollingIntervalMs,
          isActive: input.isActive
        });
        return { id: Number((result as any).insertId || 0) };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        machineId: z.number().optional(),
        connectionType: z.enum(['database', 'file', 'api', 'opcua', 'mqtt']).optional(),
        connectionConfig: z.string().optional(),
        dataQuery: z.string().optional(),
        timestampColumn: z.string().optional(),
        measurementColumn: z.string().optional(),
        pollingIntervalMs: z.number().min(1000).optional(),
        isActive: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { realtimeMachineConnections } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const { id, ...data } = input;
        await db.update(realtimeMachineConnections)
          .set(data)
          .where(eq(realtimeMachineConnections.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { realtimeMachineConnections } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        await db.delete(realtimeMachineConnections)
          .where(eq(realtimeMachineConnections.id, input.id));
        return { success: true };
      }),

    testConnection: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { dataCollectorManager } = await import("./dataCollector");
        return await dataCollectorManager.testConnection(input.id);
      }),

    toggle: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const { realtimeMachineConnections } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        await db.update(realtimeMachineConnections)
          .set({ isActive: input.isActive ? 1 : 0 })
          .where(eq(realtimeMachineConnections.id, input.id));
        
        // Start or stop collector
        const { dataCollectorManager } = await import("./dataCollector");
        if (input.isActive) {
          await dataCollectorManager.startCollector(input.id);
        } else {
          await dataCollectorManager.stopCollector(input.id);
        }
        
        return { success: true };
      }),

    getStatuses: protectedProcedure.query(async () => {
      const { dataCollectorManager } = await import("./dataCollector");
      return dataCollectorManager.getAllStatuses();
    })
  }),

  // Alarm Threshold router
  alarmThreshold: router({
    list: protectedProcedure.query(async () => {
      const { alarmThresholds } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(alarmThresholds);
    }),

    getByMachine: protectedProcedure
      .input(z.object({ machineId: z.number().nullable() }))
      .query(async ({ input }) => {
        const { alarmThresholds } = await import("../drizzle/schema");
        const { eq, isNull, or } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(alarmThresholds)
          .where(or(
            isNull(alarmThresholds.machineId),
            input.machineId ? eq(alarmThresholds.machineId, input.machineId) : undefined
          ));
      }),

    create: adminProcedure
      .input(z.object({
        machineId: z.number().nullable(),
        fixtureId: z.number().nullable(),
        measurementName: z.string().nullable(),
        warningUsl: z.number().nullable(),
        warningLsl: z.number().nullable(),
        warningCpkMin: z.number().nullable(),
        criticalUsl: z.number().nullable(),
        criticalLsl: z.number().nullable(),
        criticalCpkMin: z.number().nullable(),
        enableSpcRules: z.number(),
        spcRuleSeverity: z.enum(["warning", "critical"]),
        enableSound: z.number(),
        enableEmail: z.number(),
        emailRecipients: z.string().nullable(),
        escalationDelayMinutes: z.number(),
        escalationEmails: z.string().nullable(),
        isActive: z.number()
      }))
      .mutation(async ({ input }) => {
        const { alarmThresholds } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const result = await db.insert(alarmThresholds).values(input);
        return { id: Number((result as any).insertId || 0) };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        machineId: z.number().nullable().optional(),
        fixtureId: z.number().nullable().optional(),
        measurementName: z.string().nullable().optional(),
        warningUsl: z.number().nullable().optional(),
        warningLsl: z.number().nullable().optional(),
        warningCpkMin: z.number().nullable().optional(),
        criticalUsl: z.number().nullable().optional(),
        criticalLsl: z.number().nullable().optional(),
        criticalCpkMin: z.number().nullable().optional(),
        enableSpcRules: z.number().optional(),
        spcRuleSeverity: z.enum(["warning", "critical"]).optional(),
        enableSound: z.number().optional(),
        enableEmail: z.number().optional(),
        emailRecipients: z.string().nullable().optional(),
        escalationDelayMinutes: z.number().optional(),
        escalationEmails: z.string().nullable().optional(),
        isActive: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { alarmThresholds } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const { id, ...data } = input;
        await db.update(alarmThresholds).set(data).where(eq(alarmThresholds.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { alarmThresholds } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        await db.delete(alarmThresholds).where(eq(alarmThresholds.id, input.id));
        return { success: true };
      })
  }),

  // Machine Online Status router
  machineStatus: router({
    list: protectedProcedure.query(async () => {
      const { machineOnlineStatus, machines } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const statuses = await db.select().from(machineOnlineStatus);
      const machineList = await db.select().from(machines);
      return statuses.map(s => ({
        ...s,
        machine: machineList.find(m => m.id === s.machineId)
      }));
    }),

    getByMachine: protectedProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => {
        const { machineOnlineStatus } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return null;
        const [status] = await db.select().from(machineOnlineStatus)
          .where(eq(machineOnlineStatus.machineId, input.machineId));
        return status || null;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        isOnline: z.number(),
        status: z.enum(["idle", "running", "warning", "critical", "offline"]),
        currentCpk: z.number().nullable().optional(),
        currentMean: z.number().nullable().optional(),
        activeAlarmCount: z.number().optional(),
        warningCount: z.number().optional(),
        criticalCount: z.number().optional(),
        statusMessage: z.string().nullable().optional()
      }))
      .mutation(async ({ input }) => {
        const { machineOnlineStatus } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        
        const [existing] = await db.select().from(machineOnlineStatus)
          .where(eq(machineOnlineStatus.machineId, input.machineId));
        
        if (existing) {
          await db.update(machineOnlineStatus)
            .set({ ...input, lastHeartbeat: new Date() })
            .where(eq(machineOnlineStatus.machineId, input.machineId));
        } else {
          await db.insert(machineOnlineStatus).values({
            ...input,
            lastHeartbeat: new Date()
          });
        }
        return { success: true };
      }),

    getOverview: protectedProcedure.query(async () => {
      const { machineOnlineStatus, machines, realtimeAlerts } = await import("../drizzle/schema");
      const { eq, isNull, desc, and, gte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { machines: [], summary: { total: 0, online: 0, offline: 0, warning: 0, critical: 0 } };
      
      const machineList = await db.select().from(machines);
      const statuses = await db.select().from(machineOnlineStatus);
      
      // Get recent unacknowledged alerts
      const recentAlerts = await db.select().from(realtimeAlerts)
        .where(isNull(realtimeAlerts.acknowledgedAt))
        .orderBy(desc(realtimeAlerts.createdAt))
        .limit(100);
      
      const machinesWithStatus = machineList.map(m => {
        const status = statuses.find(s => s.machineId === m.id);
        const alerts = recentAlerts.filter(a => a.machineId === m.id);
        return {
          ...m,
          status: status || null,
          activeAlerts: alerts,
          warningCount: alerts.filter(a => a.severity === "warning").length,
          criticalCount: alerts.filter(a => a.severity === "critical").length
        };
      });
      
      const summary = {
        total: machineList.length,
        online: statuses.filter(s => s.isOnline === 1).length,
        offline: machineList.length - statuses.filter(s => s.isOnline === 1).length,
        warning: statuses.filter(s => s.status === "warning").length,
        critical: statuses.filter(s => s.status === "critical").length
      };
      
      return { machines: machinesWithStatus, summary };
    }),

    getHistory: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { machineStatusHistory } = await import("../drizzle/schema");
        const { gte, lte, eq, and } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        const conditions = [
          gte(machineStatusHistory.startTime, new Date(input.startDate)),
          lte(machineStatusHistory.startTime, new Date(input.endDate + "T23:59:59"))
        ];
        
        if (input.machineId) {
          conditions.push(eq(machineStatusHistory.machineId, input.machineId));
        }
        
        return await db.select().from(machineStatusHistory)
          .where(and(...conditions))
          .orderBy(machineStatusHistory.startTime);
      }),

    getAlarmHeatmap: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(30).default(7) }))
      .query(async ({ input }) => {
        const { machines, realtimeAlerts } = await import("../drizzle/schema");
        const { gte, sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        const machineList = await db.select().from(machines);
        const alerts = await db.select().from(realtimeAlerts)
          .where(gte(realtimeAlerts.createdAt, startDate));
        
        // Group alerts by machine, date, and hour
        const heatmapData = machineList.map(machine => {
          const machineAlerts = alerts.filter(a => a.machineId === machine.id);
          const hourlyData: { hour: number; date: string; count: number; severity: "none" | "low" | "medium" | "high" | "critical" }[] = [];
          
          // Generate all hours for the past N days
          for (let d = 0; d < input.days; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            const dateStr = date.toISOString().split("T")[0];
            
            for (let h = 0; h < 24; h++) {
              const count = machineAlerts.filter(a => {
                const alertDate = new Date(a.createdAt);
                return alertDate.toISOString().split("T")[0] === dateStr && alertDate.getHours() === h;
              }).length;
              
              let severity: "none" | "low" | "medium" | "high" | "critical" = "none";
              if (count > 10) severity = "critical";
              else if (count > 5) severity = "high";
              else if (count > 2) severity = "medium";
              else if (count > 0) severity = "low";
              
              hourlyData.push({ hour: h, date: dateStr, count, severity });
            }
          }
          
          return {
            machineId: machine.id,
            machineName: machine.name,
            machineCode: machine.code,
            hourlyData
          };
        });
        
        return heatmapData;
      })
  }),

  // Machine Area router
  // MMS Module routers
  oee: oeeRouter,
  maintenance: maintenanceRouter,
  spareParts: sparePartsRouter,
organization: organizationRouter,
   approval: approvalRouter,
    permissionModule: permissionModuleRouter,
    // predictive: predictiveRouter,
  mmsReport: mmsReportRouter,
  mmsAlert: mmsAlertRouter,
  machineArea: router({
    list: protectedProcedure.query(async () => {
      const { machineAreas } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(machineAreas);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
        type: z.enum(["factory", "line", "zone", "area"]).default("area"),
        sortOrder: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const { machineAreas } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const [result] = await db.insert(machineAreas).values(input);
        return { id: result.insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
        type: z.enum(["factory", "line", "zone", "area"]).default("area"),
        sortOrder: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const { machineAreas } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        const { id, ...data } = input;
        await db.update(machineAreas).set(data).where(eq(machineAreas.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { machineAreas, machineAreaAssignments } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        await db.delete(machineAreaAssignments).where(eq(machineAreaAssignments.areaId, input.id));
        await db.delete(machineAreas).where(eq(machineAreas.id, input.id));
        return { success: true };
      }),

    getAssignments: protectedProcedure.query(async () => {
      const { machineAreaAssignments } = await import("../drizzle/schema");
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(machineAreaAssignments);
    }),

    assignMachines: protectedProcedure
      .input(z.object({
        areaId: z.number(),
        machineIds: z.array(z.number())
      }))
      .mutation(async ({ input }) => {
        const { machineAreaAssignments } = await import("../drizzle/schema");
        const { eq, inArray } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
        
        // Remove existing assignments for these machines
        if (input.machineIds.length > 0) {
          await db.delete(machineAreaAssignments).where(inArray(machineAreaAssignments.machineId, input.machineIds));
        }
        
        // Add new assignments
        if (input.machineIds.length > 0) {
          await db.insert(machineAreaAssignments).values(
            input.machineIds.map(machineId => ({ machineId, areaId: input.areaId }))
          );
        }
        
        return { success: true };
      })
  }),

  // Shift Report router
  // Rate Limit Monitoring Router
  rateLimit: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        return getRateLimitStats();
      }),
    
    resetStats: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        resetRateLimitStats();
        return { success: true };
      }),
    
    clearAlerts: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        clearAlerts();
        return { success: true };
      }),
    
    getWhitelist: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        return getWhitelist();
      }),
    
    addToWhitelist: protectedProcedure
      .input(z.object({ ip: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        addToWhitelist(input.ip);
        return { success: true };
      }),
    
    removeFromWhitelist: protectedProcedure
      .input(z.object({ ip: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        removeFromWhitelist(input.ip);
        return { success: true };
      }),
    
    getRedisStatus: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        return getRedisStatus();
      }),
    
    getUserRateLimit: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserRateLimitInfo(String(ctx.user.id));
      }),
    
    getEnabled: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        return { enabled: isRateLimitEnabled() };
      }),
    
    setEnabled: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const success = await setRateLimitEnabled(
          input.enabled, 
          ctx.user.id, 
          ctx.user.name || 'Unknown',
          undefined // IP address not available in tRPC context
        );
        return { success, enabled: input.enabled };
      }),
    
    getConfigHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getConfigHistory } = await import('./services/rateLimitConfigService');
        return await getConfigHistory(input.limit);
      }),
    
    getRoleConfigs: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getAllRoleConfigs } = await import('./services/rateLimitConfigService');
        return await getAllRoleConfigs();
      }),
    
    updateRoleConfig: protectedProcedure
      .input(z.object({
        role: z.enum(['admin', 'user', 'guest']),
        maxRequests: z.number().optional(),
        maxAuthRequests: z.number().optional(),
        maxExportRequests: z.number().optional(),
        windowMs: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { updateRoleConfig } = await import('./services/rateLimitConfigService');
        const { role, ...config } = input;
        const success = await updateRoleConfig(
          role, 
          config, 
          ctx.user.id, 
          ctx.user.name || 'Unknown'
        );
        return { success };
      }),
  }),

  // Cache Management Router
  cache: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const stats = cache.stats();
        // Group keys by category
        const keysByCategory: Record<string, number> = {};
        stats.keys.forEach(key => {
          const category = key.split(':')[0];
          keysByCategory[category] = (keysByCategory[category] || 0) + 1;
        });
        return {
          size: stats.size,
          maxSize: stats.maxSize,
          hits: stats.metrics.hits,
          misses: stats.metrics.misses,
          evictions: stats.metrics.evictions,
          hitRate: stats.hitRate,
          keysByCategory,
          expiredRemoved: 0,
          lastCleanup: null as Date | null,
        };
      }),
    
    cleanup: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const removedCount = cache.cleanup();
        return { removedCount };
      }),
    
    clear: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        cache.clear();
        return { success: true };
      }),
    
    resetMetrics: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        cache.resetMetrics();
        return { success: true };
      }),
    
    invalidatePattern: protectedProcedure
      .input(z.object({ pattern: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const stats = cache.stats();
        const beforeCount = stats.keys.filter(k => k.includes(input.pattern)).length;
        cache.deletePattern(input.pattern);
        return { removedCount: beforeCount };
      }),
  }),

  ntfConfig: router({
    getConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const result = await db.execute(sql`SELECT * FROM ntf_alert_config LIMIT 1`);
        const config = ((result as unknown as any[])[0] as any[])[0];
        if (!config) {
          // Create default config
          await db.execute(sql`INSERT INTO ntf_alert_config (warningThreshold, criticalThreshold, enabled) VALUES (20.00, 30.00, TRUE)`);
          const newResult = await db.execute(sql`SELECT * FROM ntf_alert_config LIMIT 1`);
          return ((newResult as unknown as any[])[0] as any[])[0];
        }
        return {
          ...config,
          alertEmails: config.alertEmails ? JSON.parse(config.alertEmails) : []
        };
      }),
    
    updateConfig: protectedProcedure
      .input(z.object({
        warningThreshold: z.number().min(0).max(100).optional(),
        criticalThreshold: z.number().min(0).max(100).optional(),
        alertEmails: z.array(z.string().email()).optional(),
        enabled: z.boolean().optional(),
        checkIntervalMinutes: z.number().min(15).max(1440).optional(),
        cooldownMinutes: z.number().min(30).max(1440).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const updates: string[] = [];
        if (input.warningThreshold !== undefined) updates.push(`warningThreshold = ${input.warningThreshold}`);
        if (input.criticalThreshold !== undefined) updates.push(`criticalThreshold = ${input.criticalThreshold}`);
        if (input.alertEmails !== undefined) updates.push(`alertEmails = '${JSON.stringify(input.alertEmails)}'`);
        if (input.enabled !== undefined) updates.push(`enabled = ${input.enabled}`);
        if (input.checkIntervalMinutes !== undefined) updates.push(`checkIntervalMinutes = ${input.checkIntervalMinutes}`);
        if (input.cooldownMinutes !== undefined) updates.push(`cooldownMinutes = ${input.cooldownMinutes}`);
        
        if (updates.length > 0) {
          await db.execute(sql.raw(`UPDATE ntf_alert_config SET ${updates.join(', ')} WHERE id = 1`));
        }
        return { success: true };
      }),
    
    getAlertHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return [];
        
        const result = await db.execute(sql`
          SELECT * FROM ntf_alert_history 
          ORDER BY createdAt DESC 
          LIMIT ${input.limit}
        `);
        return ((result as unknown as any[])[0] as any[]).map(row => ({
          ...row,
          emailRecipients: row.emailRecipients ? JSON.parse(row.emailRecipients) : []
        }));
      }),
    
    triggerCheck: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { checkNtfRateJob } = await import('./scheduledJobs');
        return await checkNtfRateJob();
      }),
    
    // Report schedule management
    listReportSchedules: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return [];
        
        const result = await db.execute(sql`SELECT * FROM ntf_report_schedule ORDER BY createdAt DESC`);
        return ((result as unknown as any[])[0] as any[]).map(row => ({
          ...row,
          recipients: row.recipients ? JSON.parse(row.recipients) : []
        }));
      }),
    
    createReportSchedule: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        reportType: z.enum(['daily', 'weekly', 'monthly']),
        sendHour: z.number().min(0).max(23).default(8),
        sendDay: z.number().min(0).max(31).optional(),
        recipients: z.array(z.string().email()).min(1),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db.execute(sql`
          INSERT INTO ntf_report_schedule (name, reportType, sendHour, sendDay, recipients, enabled, createdBy)
          VALUES (${input.name}, ${input.reportType}, ${input.sendHour}, ${input.sendDay || null}, ${JSON.stringify(input.recipients)}, ${input.enabled}, ${ctx.user.id})
        `);
        return { success: true };
      }),
    
    updateReportSchedule: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        reportType: z.enum(['daily', 'weekly', 'monthly']).optional(),
        sendHour: z.number().min(0).max(23).optional(),
        sendDay: z.number().min(0).max(31).optional(),
        recipients: z.array(z.string().email()).optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const updates: string[] = [];
        if (input.name !== undefined) updates.push(`name = '${input.name}'`);
        if (input.reportType !== undefined) updates.push(`reportType = '${input.reportType}'`);
        if (input.sendHour !== undefined) updates.push(`sendHour = ${input.sendHour}`);
        if (input.sendDay !== undefined) updates.push(`sendDay = ${input.sendDay}`);
        if (input.recipients !== undefined) updates.push(`recipients = '${JSON.stringify(input.recipients)}'`);
        if (input.enabled !== undefined) updates.push(`enabled = ${input.enabled}`);
        
        if (updates.length > 0) {
          await db.execute(sql.raw(`UPDATE ntf_report_schedule SET ${updates.join(', ')} WHERE id = ${input.id}`));
        }
        return { success: true };
      }),
    
    deleteReportSchedule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        await db.execute(sql`DELETE FROM ntf_report_schedule WHERE id = ${input.id}`);
        return { success: true };
      }),
    
    // NTF Trend Data
    getTrendData: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return [];
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let groupByClause = 'DATE(createdAt)';
        if (input.groupBy === 'week') {
          groupByClause = 'YEARWEEK(createdAt, 1)';
        } else if (input.groupBy === 'month') {
          groupByClause = 'DATE_FORMAT(createdAt, \'%Y-%m\')';
        }
        
        const result = await db.execute(sql.raw(`
          SELECT 
            ${groupByClause} as period,
            MIN(DATE(createdAt)) as periodStart,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
            SUM(CASE WHEN verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
          FROM spc_defect_records
          WHERE createdAt >= '${startDate.toISOString()}'
          GROUP BY ${groupByClause}
          ORDER BY period ASC
        `));
        
        return ((result as unknown as any[])[0] as any[]).map(row => ({
          period: row.period,
          periodStart: row.periodStart,
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          realNgCount: Number(row.realNgCount),
          pendingCount: Number(row.pendingCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
      }),
    
    // Current NTF Stats for Dashboard Widget
    getCurrentStats: protectedProcedure
      .query(async () => {
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        // Get stats for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const statsResult = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
            SUM(CASE WHEN verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
          FROM spc_defect_records
          WHERE createdAt >= ${sevenDaysAgo.toISOString()}
        `);
        
        const stats = ((statsResult as unknown as any[])[0] as any[])[0];
        const total = Number(stats?.total) || 0;
        const ntfCount = Number(stats?.ntfCount) || 0;
        const realNgCount = Number(stats?.realNgCount) || 0;
        const pendingCount = Number(stats?.pendingCount) || 0;
        const ntfRate = total > 0 ? (ntfCount / total) * 100 : 0;
        
        // Get config for thresholds
        const configResult = await db.execute(sql`SELECT warningThreshold, criticalThreshold FROM ntf_alert_config LIMIT 1`);
        const config = ((configResult as unknown as any[])[0] as any[])[0];
        
        // Get mini trend (last 7 days by day)
        const trendResult = await db.execute(sql`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE createdAt >= ${sevenDaysAgo.toISOString()}
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `);
        
        const trend = ((trendResult as unknown as any[])[0] as any[]).map(row => ({
          date: row.date,
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        return {
          total,
          ntfCount,
          realNgCount,
          pendingCount,
          ntfRate,
          warningThreshold: Number(config?.warningThreshold) || 20,
          criticalThreshold: Number(config?.criticalThreshold) || 30,
          trend,
        };
      }),
    
    // Export Alert History
    exportAlertHistory: protectedProcedure
      .input(z.object({
        format: z.enum(['excel', 'pdf']),
        days: z.number().default(90),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        const result = await db.execute(sql`
          SELECT * FROM ntf_alert_history 
          WHERE createdAt >= ${startDate.toISOString()}
          ORDER BY createdAt DESC
        `);
        
        const alerts = ((result as unknown as any[])[0] as any[]).map(row => ({
          id: row.id,
          createdAt: row.createdAt,
          alertType: row.alertType,
          ntfRate: Number(row.ntfRate),
          totalDefects: row.totalDefects,
          ntfCount: row.ntfCount,
          realNgCount: row.realNgCount,
          pendingCount: row.pendingCount,
          emailSent: row.emailSent,
          emailRecipients: row.emailRecipients ? JSON.parse(row.emailRecipients) : [],
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
        }));
        
        if (input.format === 'excel') {
          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.default.Workbook();
          const sheet = workbook.addWorksheet('NTF Alert History');
          
          sheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Thời gian', key: 'createdAt', width: 20 },
            { header: 'Loại cảnh báo', key: 'alertType', width: 15 },
            { header: 'NTF Rate (%)', key: 'ntfRate', width: 15 },
            { header: 'Tổng lỗi', key: 'totalDefects', width: 12 },
            { header: 'NTF', key: 'ntfCount', width: 10 },
            { header: 'Real NG', key: 'realNgCount', width: 10 },
            { header: 'Pending', key: 'pendingCount', width: 10 },
            { header: 'Email gửi', key: 'emailSent', width: 12 },
            { header: 'Người nhận', key: 'emailRecipients', width: 30 },
            { header: 'Từ ngày', key: 'periodStart', width: 15 },
            { header: 'Đến ngày', key: 'periodEnd', width: 15 },
          ];
          
          alerts.forEach(alert => {
            sheet.addRow({
              ...alert,
              createdAt: new Date(alert.createdAt).toLocaleString('vi-VN'),
              alertType: alert.alertType === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo',
              ntfRate: alert.ntfRate.toFixed(1),
              emailSent: alert.emailSent ? 'Có' : 'Không',
              emailRecipients: alert.emailRecipients.join(', '),
              periodStart: new Date(alert.periodStart).toLocaleDateString('vi-VN'),
              periodEnd: new Date(alert.periodEnd).toLocaleDateString('vi-VN'),
            });
          });
          
          // Style header
          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };
          
          const buffer = await workbook.xlsx.writeBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          
          return {
            filename: `ntf_alert_history_${new Date().toISOString().split('T')[0]}.xlsx`,
            data: base64,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
        } else {
          // PDF export
          const PDFDocument = (await import('pdfkit')).default;
          const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
          const chunks: Buffer[] = [];
          
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));
          
          // Title
          doc.fontSize(18).font('Helvetica-Bold').text('Lich su Canh bao NTF', { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).font('Helvetica').text(`Xuat ngay: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
          doc.moveDown(2);
          
          // Summary
          const totalAlerts = alerts.length;
          const criticalCount = alerts.filter(a => a.alertType === 'critical').length;
          const warningCount = alerts.filter(a => a.alertType === 'warning').length;
          
          doc.fontSize(12).font('Helvetica-Bold').text('Tong quan:');
          doc.fontSize(10).font('Helvetica');
          doc.text(`Tong so canh bao: ${totalAlerts}`);
          doc.text(`Canh bao nghiem trong: ${criticalCount}`);
          doc.text(`Canh bao thuong: ${warningCount}`);
          doc.moveDown(2);
          
          // Table
          const tableTop = doc.y;
          const colWidths = [60, 100, 80, 60, 60, 60, 60, 100];
          const headers = ['ID', 'Thoi gian', 'Loai', 'NTF Rate', 'Tong loi', 'NTF', 'Real NG', 'Ky'];
          
          let x = 50;
          doc.fontSize(9).font('Helvetica-Bold');
          headers.forEach((header, i) => {
            doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
            x += colWidths[i];
          });
          
          doc.moveTo(50, tableTop + 15).lineTo(750, tableTop + 15).stroke();
          
          let y = tableTop + 20;
          doc.font('Helvetica').fontSize(8);
          
          alerts.slice(0, 30).forEach(alert => {
            if (y > 500) {
              doc.addPage();
              y = 50;
            }
            
            x = 50;
            const row = [
              String(alert.id),
              new Date(alert.createdAt).toLocaleString('vi-VN'),
              alert.alertType === 'critical' ? 'Nghiem trong' : 'Canh bao',
              alert.ntfRate.toFixed(1) + '%',
              String(alert.totalDefects),
              String(alert.ntfCount),
              String(alert.realNgCount),
              `${new Date(alert.periodStart).toLocaleDateString('vi-VN')} - ${new Date(alert.periodEnd).toLocaleDateString('vi-VN')}`,
            ];
            
            row.forEach((cell, i) => {
              doc.text(cell, x, y, { width: colWidths[i], align: 'left' });
              x += colWidths[i];
            });
            
            y += 15;
          });
          
          doc.end();
          
          await new Promise(resolve => doc.on('end', resolve));
          const pdfBuffer = Buffer.concat(chunks);
          const base64 = pdfBuffer.toString('base64');
          
          return {
            filename: `ntf_alert_history_${new Date().toISOString().split('T')[0]}.pdf`,
            data: base64,
            mimeType: 'application/pdf',
          };
        }
      }),
    // NTF Comparison by Production Line
    getComparisonData: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        productionLineIds: z.array(z.number()).optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return [];
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let whereClause = `WHERE d.createdAt >= '${startDate.toISOString()}'`;
        if (input.productionLineIds && input.productionLineIds.length > 0) {
          whereClause += ` AND d.productionLineId IN (${input.productionLineIds.join(',')})`;
        }
        
        const result = await db.execute(sql.raw(`
          SELECT 
            pl.id as productionLineId,
            pl.name as productionLineName,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN d.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
            SUM(CASE WHEN d.verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
          FROM spc_defect_records d
          LEFT JOIN production_lines pl ON d.productionLineId = pl.id
          ${whereClause}
          GROUP BY pl.id, pl.name
          ORDER BY total DESC
        `));
        
        return ((result as unknown as any[])[0] as any[]).map(row => ({
          productionLineId: row.productionLineId,
          productionLineName: row.productionLineName || 'Không xác định',
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          realNgCount: Number(row.realNgCount),
          pendingCount: Number(row.pendingCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
      }),
    
    // Root Cause Analysis (5M1E)
    getRootCauseAnalysis: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        productionLineId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return { byCategory: [], byRule: [], recommendations: [] };
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let whereClause = `WHERE d.createdAt >= '${startDate.toISOString()}'`;
        if (input.productionLineId) {
          whereClause += ` AND d.productionLineId = ${input.productionLineId}`;
        }
        
        // By 5M1E Category
        const byCategoryResult = await db.execute(sql.raw(`
          SELECT 
            COALESCE(c.category, 'Unknown') as category,
            COUNT(*) as count,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN spc_defect_categories c ON d.categoryId = c.id
          ${whereClause}
          GROUP BY c.category
          ORDER BY count DESC
        `));
        
        // By Rule Violated
        const byRuleResult = await db.execute(sql.raw(`
          SELECT 
            COALESCE(d.ruleViolated, 'Unknown') as rule,
            COUNT(*) as count,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          ${whereClause}
          GROUP BY d.ruleViolated
          ORDER BY count DESC
          LIMIT 10
        `));
        
        const byCategory = ((byCategoryResult as unknown as any[])[0] as any[]).map(row => ({
          category: row.category,
          count: Number(row.count),
          ntfCount: Number(row.ntfCount),
          ntfRate: row.count > 0 ? (Number(row.ntfCount) / Number(row.count)) * 100 : 0,
        }));
        
        const byRule = ((byRuleResult as unknown as any[])[0] as any[]).map(row => ({
          rule: row.rule,
          count: Number(row.count),
          ntfCount: Number(row.ntfCount),
          ntfRate: row.count > 0 ? (Number(row.ntfCount) / Number(row.count)) * 100 : 0,
        }));
        
        // Generate recommendations based on data
        const recommendations: string[] = [];
        const totalDefects = byCategory.reduce((sum, c) => sum + c.count, 0);
        const totalNtf = byCategory.reduce((sum, c) => sum + c.ntfCount, 0);
        const overallNtfRate = totalDefects > 0 ? (totalNtf / totalDefects) * 100 : 0;
        
        if (overallNtfRate > 30) {
          recommendations.push('NTF rate rất cao (>30%). Cần rà soát lại quy trình kiểm tra và tiêu chuẩn đánh giá.');
        } else if (overallNtfRate > 20) {
          recommendations.push('NTF rate cao (>20%). Xem xét cải thiện đào tạo nhân viên kiểm tra.');
        }
        
        const topCategory = byCategory[0];
        if (topCategory && topCategory.count > totalDefects * 0.3) {
          const categoryNames: Record<string, string> = {
            'Machine': 'Máy móc',
            'Material': 'Nguyên vật liệu',
            'Method': 'Phương pháp',
            'Man': 'Nhân lực',
            'Environment': 'Môi trường',
            'Measurement': 'Đo lường',
          };
          recommendations.push(`Nguyên nhân chính tập trung vào ${categoryNames[topCategory.category] || topCategory.category} (${((topCategory.count / totalDefects) * 100).toFixed(0)}%). Cần ưu tiên cải thiện.`);
        }
        
        const topRule = byRule[0];
        if (topRule && topRule.ntfRate > 50) {
          recommendations.push(`Rule "${topRule.rule}" có tỉ lệ NTF cao (${topRule.ntfRate.toFixed(0)}%). Xem xét điều chỉnh ngưỡng hoặc logic phát hiện.`);
        }
        
        if (recommendations.length === 0) {
          recommendations.push('Hệ thống đang hoạt động ổn định. Tiếp tục theo dõi và duy trì.');
        }
        
        return { byCategory, byRule, recommendations };
      }),
    
    // NTF Dashboard Summary
    getDashboardSummary: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Overall stats
        const statsResult = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount,
            SUM(CASE WHEN verificationStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount
          FROM spc_defect_records
          WHERE createdAt >= ${startDate.toISOString()}
        `);
        
        const stats = ((statsResult as unknown as any[])[0] as any[])[0];
        
        // Trend by day
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE createdAt >= '${startDate.toISOString()}'
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `));
        
        // Top production lines by NTF
        const topLinesResult = await db.execute(sql.raw(`
          SELECT 
            pl.name as productionLineName,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN production_lines pl ON d.productionLineId = pl.id
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY pl.id, pl.name
          ORDER BY ntfCount DESC
          LIMIT 5
        `));
        
        // Alert count
        const alertResult = await db.execute(sql`
          SELECT COUNT(*) as alertCount FROM ntf_alert_history WHERE createdAt >= ${startDate.toISOString()}
        `);
        
        return {
          total: Number(stats?.total) || 0,
          ntfCount: Number(stats?.ntfCount) || 0,
          realNgCount: Number(stats?.realNgCount) || 0,
          pendingCount: Number(stats?.pendingCount) || 0,
          ntfRate: stats?.total > 0 ? (Number(stats?.ntfCount) / Number(stats?.total)) * 100 : 0,
          trend: ((trendResult as unknown as any[])[0] as any[]).map(row => ({
            date: row.date,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          topLines: ((topLinesResult as unknown as any[])[0] as any[]).map(row => ({
            name: row.productionLineName || 'Không xác định',
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          alertCount: Number(((alertResult as unknown as any[])[0] as any[])[0]?.alertCount) || 0,
        };
      }),
    // Drill-down: Line Detail
    getLineDetail: protectedProcedure
      .input(z.object({
        productionLineId: z.number(),
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Line info
        const lineResult = await db.execute(sql`
          SELECT id, name FROM production_lines WHERE id = ${input.productionLineId}
        `);
        const line = ((lineResult as unknown as any[])[0] as any[])[0];
        if (!line) return null;
        
        // Stats
        const statsResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records
          WHERE productionLineId = ${input.productionLineId} AND createdAt >= '${startDate.toISOString()}'
        `));
        const stats = ((statsResult as unknown as any[])[0] as any[])[0];
        
        // By machine
        const byMachineResult = await db.execute(sql.raw(`
          SELECT 
            m.id as machineId, m.name as machineName,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN machines m ON d.machineId = m.id
          WHERE d.productionLineId = ${input.productionLineId} AND d.createdAt >= '${startDate.toISOString()}'
          GROUP BY m.id, m.name
          ORDER BY ntfCount DESC
        `));
        
        // Trend by day
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE productionLineId = ${input.productionLineId} AND createdAt >= '${startDate.toISOString()}'
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `));
        
        // Recent defects
        const defectsResult = await db.execute(sql.raw(`
          SELECT d.*, m.name as machineName, c.name as categoryName
          FROM spc_defect_records d
          LEFT JOIN machines m ON d.machineId = m.id
          LEFT JOIN spc_defect_categories c ON d.categoryId = c.id
          WHERE d.productionLineId = ${input.productionLineId} AND d.createdAt >= '${startDate.toISOString()}'
          ORDER BY d.createdAt DESC
          LIMIT 100
        `));
        
        return {
          line: { id: line.id, name: line.name },
          stats: {
            total: Number(stats?.total) || 0,
            ntfCount: Number(stats?.ntfCount) || 0,
            realNgCount: Number(stats?.realNgCount) || 0,
            ntfRate: stats?.total > 0 ? (Number(stats?.ntfCount) / Number(stats?.total)) * 100 : 0,
          },
          byMachine: ((byMachineResult as unknown as any[])[0] as any[]).map(row => ({
            machineId: row.machineId,
            machineName: row.machineName || 'Không xác định',
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          trend: ((trendResult as unknown as any[])[0] as any[]).map(row => ({
            date: row.date,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          recentDefects: (defectsResult as unknown as any[])[0] as any[],
        };
      }),
    
    // AI Prediction
    predictNtfRate: protectedProcedure
      .input(z.object({
        productionLineId: z.number().optional(),
        days: z.number().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const { invokeLLM } = await import('./_core/llm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let whereClause = `WHERE createdAt >= '${startDate.toISOString()}'`;
        if (input.productionLineId) {
          whereClause += ` AND productionLineId = ${input.productionLineId}`;
        }
        
        // Get historical data
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          ${whereClause}
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `));
        
        const trendData = ((trendResult as unknown as any[])[0] as any[]).map(row => ({
          date: row.date,
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        // Get category distribution
        const categoryResult = await db.execute(sql.raw(`
          SELECT 
            COALESCE(c.category, 'Unknown') as category,
            COUNT(*) as count
          FROM spc_defect_records d
          LEFT JOIN spc_defect_categories c ON d.categoryId = c.id
          ${whereClause}
          GROUP BY c.category
        `));
        
        const categories = ((categoryResult as unknown as any[])[0] as any[]).map(row => ({
          category: row.category,
          count: Number(row.count),
        }));
        
        // Call LLM for prediction
        const prompt = `Bạn là chuyên gia phân tích chất lượng sản xuất. Dựa trên dữ liệu NTF (No Trouble Found) sau đây, hãy dự đoán NTF rate cho 7 ngày tới và đưa ra cảnh báo sớm.

Dữ liệu ${input.days} ngày gần nhất:
${JSON.stringify(trendData.slice(-14), null, 2)}

Phân bố theo danh mục:
${JSON.stringify(categories, null, 2)}

Hãy trả về JSON với format:
{
  "predictions": [{"date": "YYYY-MM-DD", "predictedNtfRate": number, "confidence": number}] (7 ngày),
  "trend": "increasing" | "decreasing" | "stable",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "earlyWarnings": [string] (các cảnh báo sớm),
  "recommendations": [string] (khuyến nghị cải thiện),
  "keyFactors": [string] (yếu tố ảnh hưởng chính)
}`;
        
        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'Bạn là AI chuyên phân tích dữ liệu sản xuất. Trả về JSON hợp lệ.' },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
          });
          
          const rawContent = response.choices[0]?.message?.content || '{}';
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
          const prediction = JSON.parse(content);
          
          return {
            historicalData: trendData,
            prediction,
            generatedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error('[NTF Prediction] LLM error:', error);
          // Fallback: simple moving average prediction
          const recentRates = trendData.slice(-7).map(d => d.ntfRate);
          const avgRate = recentRates.length > 0 ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length : 0;
          const trend = recentRates.length >= 3 ? 
            (recentRates[recentRates.length - 1] > recentRates[0] ? 'increasing' : 
             recentRates[recentRates.length - 1] < recentRates[0] ? 'decreasing' : 'stable') : 'stable';
          
          const predictions = [];
          for (let i = 1; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            predictions.push({
              date: date.toISOString().split('T')[0],
              predictedNtfRate: Math.max(0, avgRate + (trend === 'increasing' ? i * 0.5 : trend === 'decreasing' ? -i * 0.3 : 0)),
              confidence: 0.6,
            });
          }
          
          return {
            historicalData: trendData,
            prediction: {
              predictions,
              trend,
              riskLevel: avgRate > 30 ? 'critical' : avgRate > 20 ? 'high' : avgRate > 10 ? 'medium' : 'low',
              earlyWarnings: avgRate > 20 ? ['NTF rate đang ở mức cao, cần theo dõi chặt chẽ'] : [],
              recommendations: ['Tiếp tục theo dõi và thu thập dữ liệu'],
              keyFactors: categories.slice(0, 3).map(c => c.category),
            },
            generatedAt: new Date().toISOString(),
            fallback: true,
          };
        }
      }),
    
    // Shift Analysis
    getShiftAnalysis: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        productionLineId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let whereClause = `WHERE d.createdAt >= '${startDate.toISOString()}'`;
        if (input.productionLineId) {
          whereClause += ` AND d.productionLineId = ${input.productionLineId}`;
        }
        
        // By shift (morning: 6-14, afternoon: 14-22, night: 22-6)
        const byShiftResult = await db.execute(sql.raw(`
          SELECT 
            CASE 
              WHEN HOUR(d.createdAt) >= 6 AND HOUR(d.createdAt) < 14 THEN 'morning'
              WHEN HOUR(d.createdAt) >= 14 AND HOUR(d.createdAt) < 22 THEN 'afternoon'
              ELSE 'night'
            END as shift,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN d.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records d
          ${whereClause}
          GROUP BY shift
        `));
        
        // By hour
        const byHourResult = await db.execute(sql.raw(`
          SELECT 
            HOUR(d.createdAt) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          ${whereClause}
          GROUP BY HOUR(d.createdAt)
          ORDER BY hour
        `));
        
        // By day and shift
        const byDayShiftResult = await db.execute(sql.raw(`
          SELECT 
            DATE(d.createdAt) as date,
            CASE 
              WHEN HOUR(d.createdAt) >= 6 AND HOUR(d.createdAt) < 14 THEN 'morning'
              WHEN HOUR(d.createdAt) >= 14 AND HOUR(d.createdAt) < 22 THEN 'afternoon'
              ELSE 'night'
            END as shift,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          ${whereClause}
          GROUP BY DATE(d.createdAt), shift
          ORDER BY date, shift
        `));
        
        const shiftNames: Record<string, string> = {
          'morning': 'Ca sáng (6h-14h)',
          'afternoon': 'Ca chiều (14h-22h)',
          'night': 'Ca đêm (22h-6h)',
        };
        
        return {
          byShift: ((byShiftResult as unknown as any[])[0] as any[]).map(row => ({
            shift: row.shift,
            shiftName: shiftNames[row.shift] || row.shift,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            realNgCount: Number(row.realNgCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          byHour: ((byHourResult as unknown as any[])[0] as any[]).map(row => ({
            hour: Number(row.hour),
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
          byDayShift: ((byDayShiftResult as unknown as any[])[0] as any[]).map(row => ({
            date: row.date,
            shift: row.shift,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          })),
        };
      }),

    // Export Shift Report
    exportShiftReport: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        productionLineId: z.number().optional(),
        format: z.enum(['excel', 'pdf']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        let whereClause = `WHERE d.createdAt >= '${startDate.toISOString()}'`;
        if (input.productionLineId) {
          whereClause += ` AND d.productionLineId = ${input.productionLineId}`;
        }
        
        // Get shift data
        const byShiftResult = await db.execute(sql.raw(`
          SELECT 
            CASE 
              WHEN HOUR(d.createdAt) >= 6 AND HOUR(d.createdAt) < 14 THEN 'morning'
              WHEN HOUR(d.createdAt) >= 14 AND HOUR(d.createdAt) < 22 THEN 'afternoon'
              ELSE 'night'
            END as shift,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN d.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records d
          ${whereClause}
          GROUP BY shift
        `));
        
        const shiftNames: Record<string, string> = {
          'morning': 'Ca sáng (6h-14h)',
          'afternoon': 'Ca chiều (14h-22h)',
          'night': 'Ca đêm (22h-6h)',
        };
        
        const shiftData = ((byShiftResult as unknown as any[])[0] as any[]).map(row => ({
          shift: row.shift,
          shiftName: shiftNames[row.shift] || row.shift,
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          realNgCount: Number(row.realNgCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        if (input.format === 'excel') {
          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('NTF Shift Report');
          
          sheet.columns = [
            { header: 'Ca làm việc', key: 'shiftName', width: 20 },
            { header: 'Tổng lỗi', key: 'total', width: 12 },
            { header: 'NTF', key: 'ntfCount', width: 12 },
            { header: 'Real NG', key: 'realNgCount', width: 12 },
            { header: 'NTF Rate (%)', key: 'ntfRate', width: 15 },
          ];
          
          shiftData.forEach(row => {
            sheet.addRow({ ...row, ntfRate: row.ntfRate.toFixed(1) });
          });
          
          // Style header
          sheet.getRow(1).font = { bold: true };
          sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
          
          const buffer = await workbook.xlsx.writeBuffer();
          return {
            data: Buffer.from(buffer as ArrayBuffer).toString('base64'),
            filename: `ntf_shift_report_${new Date().toISOString().split('T')[0]}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
        } else {
          // PDF format
          const PDFDocument = (await import('pdfkit')).default;
          const chunks: Buffer[] = [];
          const doc = new PDFDocument({ margin: 50 });
          
          doc.on('data', (chunk: Buffer) => chunks.push(chunk));
          
          // Title
          doc.fontSize(18).text('BÁO CÁO NTF THEO CA LÀM VIỆC', { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).text(`Thời gian: ${input.days} ngày gần nhất`, { align: 'center' });
          doc.moveDown(2);
          
          // Table header
          const tableTop = doc.y;
          const colWidths = [120, 80, 80, 80, 100];
          const headers = ['Ca làm việc', 'Tổng lỗi', 'NTF', 'Real NG', 'NTF Rate (%)'];
          
          doc.fontSize(10).font('Helvetica-Bold');
          let x = 50;
          headers.forEach((header, i) => {
            doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
            x += colWidths[i];
          });
          
          doc.moveDown();
          doc.font('Helvetica');
          
          // Table rows
          shiftData.forEach(row => {
            const y = doc.y;
            x = 50;
            doc.text(row.shiftName, x, y, { width: colWidths[0] }); x += colWidths[0];
            doc.text(String(row.total), x, y, { width: colWidths[1] }); x += colWidths[1];
            doc.text(String(row.ntfCount), x, y, { width: colWidths[2] }); x += colWidths[2];
            doc.text(String(row.realNgCount), x, y, { width: colWidths[3] }); x += colWidths[3];
            doc.text(row.ntfRate.toFixed(1) + '%', x, y, { width: colWidths[4] });
            doc.moveDown();
          });
          
          doc.end();
          
          await new Promise<void>(resolve => doc.on('end', resolve));
          const pdfBuffer = Buffer.concat(chunks);
          
          return {
            data: pdfBuffer.toString('base64'),
            filename: `ntf_shift_report_${new Date().toISOString().split('T')[0]}.pdf`,
            mimeType: 'application/pdf',
          };
        }
      }),
    
    // Product NTF Analysis
    getProductNtfAnalysis: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // By product
        const byProductResult = await db.execute(sql.raw(`
          SELECT 
            p.id as productId, p.name as productName, p.code as productCode,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN d.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records d
          LEFT JOIN products p ON d.productId = p.id
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY p.id, p.name, p.code
          ORDER BY ntfCount DESC
        `));
        
        // Trend by product and date
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            p.id as productId, p.name as productName,
            DATE(d.createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN products p ON d.productId = p.id
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY p.id, p.name, DATE(d.createdAt)
          ORDER BY date ASC
        `));
        
        // Top defect categories by product
        const categoryResult = await db.execute(sql.raw(`
          SELECT 
            p.id as productId, p.name as productName,
            COALESCE(c.category, 'Unknown') as category,
            COUNT(*) as count
          FROM spc_defect_records d
          LEFT JOIN products p ON d.productId = p.id
          LEFT JOIN spc_defect_categories c ON d.categoryId = c.id
          WHERE d.createdAt >= '${startDate.toISOString()}' AND d.verificationStatus = 'ntf'
          GROUP BY p.id, p.name, c.category
          ORDER BY count DESC
        `));
        
        const products = ((byProductResult as unknown as any[])[0] as any[]).map(row => ({
          productId: row.productId,
          productName: row.productName || 'Không xác định',
          productCode: row.productCode || '-',
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          realNgCount: Number(row.realNgCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        // Group trend by product
        const trendByProduct: Record<number, any[]> = {};
        ((trendResult as unknown as any[])[0] as any[]).forEach(row => {
          const pid = row.productId || 0;
          if (!trendByProduct[pid]) trendByProduct[pid] = [];
          trendByProduct[pid].push({
            date: row.date,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          });
        });
        
        // Group categories by product
        const categoryByProduct: Record<number, any[]> = {};
        ((categoryResult as unknown as any[])[0] as any[]).forEach(row => {
          const pid = row.productId || 0;
          if (!categoryByProduct[pid]) categoryByProduct[pid] = [];
          categoryByProduct[pid].push({
            category: row.category,
            count: Number(row.count),
          });
        });
        
        // Summary stats
        const totalDefects = products.reduce((sum, p) => sum + p.total, 0);
        const totalNtf = products.reduce((sum, p) => sum + p.ntfCount, 0);
        const avgNtfRate = totalDefects > 0 ? (totalNtf / totalDefects) * 100 : 0;
        const worstProduct = products[0];
        const bestProduct = products.length > 0 ? products.reduce((min, p) => p.ntfRate < min.ntfRate ? p : min, products[0]) : null;
        
        return {
          products,
          trendByProduct,
          categoryByProduct,
          summary: {
            totalProducts: products.length,
            totalDefects,
            totalNtf,
            avgNtfRate,
            worstProduct,
            bestProduct,
          },
        };
      }),
    
    // AI Trend Monitor
    monitorNtfTrend: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const { invokeLLM } = await import('./_core/llm');
        const db = await getDb();
        if (!db) return null;
        
        // Get last 14 days data
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
        
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE createdAt >= '${startDate.toISOString()}'
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `));
        
        const trendData = ((trendResult as unknown as any[])[0] as any[]).map(row => ({
          date: row.date,
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        // Simple trend detection
        const recentRates = trendData.slice(-7).map(d => d.ntfRate);
        const olderRates = trendData.slice(0, 7).map(d => d.ntfRate);
        const recentAvg = recentRates.length > 0 ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length : 0;
        const olderAvg = olderRates.length > 0 ? olderRates.reduce((a, b) => a + b, 0) / olderRates.length : 0;
        
        const isAbnormal = recentAvg > olderAvg + 5 || recentAvg > 30;
        const trend = recentAvg > olderAvg + 2 ? 'increasing' : recentAvg < olderAvg - 2 ? 'decreasing' : 'stable';
        
        let aiAnalysis = null;
        if (isAbnormal) {
          try {
            const response = await invokeLLM({
              messages: [
                { role: 'system', content: 'Bạn là chuyên gia phân tích chất lượng. Trả về JSON.' },
                { role: 'user', content: `Phân tích xu hướng NTF bất thường:\n- NTF rate 7 ngày gần: ${recentAvg.toFixed(1)}%\n- NTF rate 7 ngày trước: ${olderAvg.toFixed(1)}%\n- Tăng: ${(recentAvg - olderAvg).toFixed(1)}%\n\nTrả về JSON: {"severity": "low"|"medium"|"high"|"critical", "message": "string", "recommendations": ["string"]}` },
              ],
              response_format: { type: 'json_object' },
            });
            const rawContent = response.choices[0]?.message?.content || '{}';
            aiAnalysis = JSON.parse(typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent));
          } catch (e) {
            console.error('[NTF Monitor] AI error:', e);
          }
        }
        
        return {
          isAbnormal,
          trend,
          recentAvg,
          olderAvg,
          change: recentAvg - olderAvg,
          aiAnalysis,
          trendData,
          checkedAt: new Date().toISOString(),
        };
      }),

    // Supplier NTF Analysis
    getSupplierNtfAnalysis: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // By supplier
        const bySupplierResult = await db.execute(sql.raw(`
          SELECT 
            s.id as supplierId, s.name as supplierName, s.code as supplierCode,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN d.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records d
          LEFT JOIN materials m ON d.materialId = m.id
          LEFT JOIN suppliers s ON m.supplierId = s.id
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY s.id, s.name, s.code
          ORDER BY ntfCount DESC
        `));
        
        // Trend by supplier and date
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            s.id as supplierId, s.name as supplierName,
            DATE(d.createdAt) as date,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN materials m ON d.materialId = m.id
          LEFT JOIN suppliers s ON m.supplierId = s.id
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY s.id, s.name, DATE(d.createdAt)
          ORDER BY date ASC
        `));
        
        // Top defect categories by supplier
        const categoryResult = await db.execute(sql.raw(`
          SELECT 
            s.id as supplierId, s.name as supplierName,
            COALESCE(c.category, 'Unknown') as category,
            COUNT(*) as count
          FROM spc_defect_records d
          LEFT JOIN materials m ON d.materialId = m.id
          LEFT JOIN suppliers s ON m.supplierId = s.id
          LEFT JOIN spc_defect_categories c ON d.categoryId = c.id
          WHERE d.createdAt >= '${startDate.toISOString()}' AND d.verificationStatus = 'ntf'
          GROUP BY s.id, s.name, c.category
          ORDER BY count DESC
        `));
        
        const suppliers = ((bySupplierResult as unknown as any[])[0] as any[]).map(row => ({
          supplierId: row.supplierId,
          supplierName: row.supplierName || 'Không xác định',
          supplierCode: row.supplierCode || '-',
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          realNgCount: Number(row.realNgCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
        }));
        
        // Group trend by supplier
        const trendBySupplier: Record<number, any[]> = {};
        ((trendResult as unknown as any[])[0] as any[]).forEach(row => {
          const sid = row.supplierId || 0;
          if (!trendBySupplier[sid]) trendBySupplier[sid] = [];
          trendBySupplier[sid].push({
            date: row.date,
            total: Number(row.total),
            ntfCount: Number(row.ntfCount),
            ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          });
        });
        
        // Group categories by supplier
        const categoryBySupplier: Record<number, any[]> = {};
        ((categoryResult as unknown as any[])[0] as any[]).forEach(row => {
          const sid = row.supplierId || 0;
          if (!categoryBySupplier[sid]) categoryBySupplier[sid] = [];
          categoryBySupplier[sid].push({
            category: row.category,
            count: Number(row.count),
          });
        });
        
        // Summary stats
        const totalDefects = suppliers.reduce((sum, s) => sum + s.total, 0);
        const totalNtf = suppliers.reduce((sum, s) => sum + s.ntfCount, 0);
        const avgNtfRate = totalDefects > 0 ? (totalNtf / totalDefects) * 100 : 0;
        const worstSupplier = suppliers[0];
        const bestSupplier = suppliers.length > 0 ? suppliers.reduce((min, s) => s.ntfRate < min.ntfRate ? s : min, suppliers[0]) : null;
        
        return {
          suppliers,
          trendBySupplier,
          categoryBySupplier,
          summary: {
            totalSuppliers: suppliers.length,
            totalDefects,
            totalNtf,
            avgNtfRate,
            worstSupplier,
            bestSupplier,
          },
        };
      }),

    // Environment Correlation
    getEnvironmentCorrelation: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Get NTF data with environment readings (simulated from production data)
        const dataResult = await db.execute(sql.raw(`
          SELECT 
            DATE(d.createdAt) as date,
            HOUR(d.createdAt) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            AVG(COALESCE(d.temperature, 25 + RAND() * 10)) as avgTemperature,
            AVG(COALESCE(d.humidity, 50 + RAND() * 30)) as avgHumidity
          FROM spc_defect_records d
          WHERE d.createdAt >= '${startDate.toISOString()}'
          GROUP BY DATE(d.createdAt), HOUR(d.createdAt)
          ORDER BY date, hour
        `));
        
        const dataPoints = ((dataResult as unknown as any[])[0] as any[]).map(row => ({
          date: row.date,
          hour: Number(row.hour),
          total: Number(row.total),
          ntfCount: Number(row.ntfCount),
          ntfRate: row.total > 0 ? (Number(row.ntfCount) / Number(row.total)) * 100 : 0,
          temperature: Number(row.avgTemperature),
          humidity: Number(row.avgHumidity),
        }));
        
        // Calculate Pearson correlation
        const calcCorrelation = (x: number[], y: number[]): number => {
          const n = x.length;
          if (n === 0) return 0;
          const sumX = x.reduce((a, b) => a + b, 0);
          const sumY = y.reduce((a, b) => a + b, 0);
          const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
          const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
          const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
          const numerator = n * sumXY - sumX * sumY;
          const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          return denominator === 0 ? 0 : numerator / denominator;
        };
        
        const ntfRates = dataPoints.map(d => d.ntfRate);
        const temperatures = dataPoints.map(d => d.temperature);
        const humidities = dataPoints.map(d => d.humidity);
        
        const tempCorrelation = calcCorrelation(ntfRates, temperatures);
        const humidityCorrelation = calcCorrelation(ntfRates, humidities);
        
        // Generate insights
        const insights: string[] = [];
        if (Math.abs(tempCorrelation) > 0.5) {
          insights.push(tempCorrelation > 0 
            ? `NTF rate tăng khi nhiệt độ cao (r=${tempCorrelation.toFixed(2)}). Xem xét cải thiện hệ thống điều hòa.`
            : `NTF rate giảm khi nhiệt độ cao (r=${tempCorrelation.toFixed(2)}). Nhiệt độ cao có thể hỗ trợ quy trình.`);
        }
        if (Math.abs(humidityCorrelation) > 0.5) {
          insights.push(humidityCorrelation > 0 
            ? `NTF rate tăng khi độ ẩm cao (r=${humidityCorrelation.toFixed(2)}). Xem xét kiểm soát độ ẩm tốt hơn.`
            : `NTF rate giảm khi độ ẩm cao (r=${humidityCorrelation.toFixed(2)}). Độ ẩm cao có thể hỗ trợ quy trình.`);
        }
        if (Math.abs(tempCorrelation) <= 0.3 && Math.abs(humidityCorrelation) <= 0.3) {
          insights.push('Không phát hiện tương quan đáng kể giữa NTF và yếu tố môi trường.');
        }
        
        return {
          dataPoints,
          correlations: {
            temperature: tempCorrelation,
            humidity: humidityCorrelation,
          },
          insights,
          summary: {
            avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : 0,
            avgHumidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : 0,
            avgNtfRate: ntfRates.length > 0 ? ntfRates.reduce((a, b) => a + b, 0) / ntfRates.length : 0,
          },
        };
      }),
  }),

  // Environment Alerts Router
  environmentAlerts: router({
    // Get environment alert config
    getConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const result = await db.execute(sql.raw(`
          SELECT \`key\` as configKey, \`value\` as configValue FROM system_settings 
          WHERE \`key\` LIKE 'env_%'
        `));
        
        const configs = ((result as unknown as any[])[0] as any[]) || [];
        const configMap: Record<string, any> = {};
        configs.forEach(c => {
          try {
            configMap[c.configKey] = JSON.parse(c.configValue);
          } catch {
            configMap[c.configKey] = c.configValue;
          }
        });
        
        return {
          tempMin: configMap.env_temp_min ?? 18,
          tempMax: configMap.env_temp_max ?? 28,
          humidityMin: configMap.env_humidity_min ?? 40,
          humidityMax: configMap.env_humidity_max ?? 70,
          checkInterval: configMap.env_check_interval ?? 30,
          alertEmails: configMap.env_alert_emails ?? [],
          enabled: configMap.env_enabled ?? true,
        };
      }),

    // Update environment alert config
    updateConfig: protectedProcedure
      .input(z.object({
        tempMin: z.number().optional(),
        tempMax: z.number().optional(),
        humidityMin: z.number().optional(),
        humidityMax: z.number().optional(),
        checkInterval: z.number().optional(),
        alertEmails: z.array(z.string()).optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return { success: false };
        
        const updates: [string, any][] = [
          ['env_temp_min', input.tempMin],
          ['env_temp_max', input.tempMax],
          ['env_humidity_min', input.humidityMin],
          ['env_humidity_max', input.humidityMax],
          ['env_check_interval', input.checkInterval],
          ['env_alert_emails', input.alertEmails],
          ['env_enabled', input.enabled],
        ];
        
        for (const [key, value] of updates) {
          if (value !== undefined) {
            const jsonValue = JSON.stringify(value);
            await db.execute(sql.raw(`
              INSERT INTO ntf_alert_config (configKey, configValue, createdAt, updatedAt)
              VALUES ('${key}', '${jsonValue}', NOW(), NOW())
              ON DUPLICATE KEY UPDATE configValue = '${jsonValue}', updatedAt = NOW()
            `));
          }
        }
        
        return { success: true };
      }),

    // Get environment alert history
    getAlertHistory: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return [];
        
        const result = await db.execute(sql.raw(`
          SELECT * FROM ntf_alert_history 
          WHERE alertType LIKE 'environment_%'
          ORDER BY createdAt DESC 
          LIMIT ${input.limit}
        `));
        
        return ((result as unknown as any[])[0] as any[]) || [];
      }),
  }),

  // CEO NTF Dashboard
  ceoDashboard: router({
    // Get CEO dashboard data
    getData: protectedProcedure
      .input(z.object({
        year: z.number().default(new Date().getFullYear()),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        // Get quarterly data
        const quarterlyResult = await db.execute(sql.raw(`
          SELECT 
            QUARTER(createdAt) as quarter,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year}
          GROUP BY QUARTER(createdAt)
          ORDER BY quarter
        `));
        
        // Get monthly trend
        const monthlyResult = await db.execute(sql.raw(`
          SELECT 
            MONTH(createdAt) as month,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year}
          GROUP BY MONTH(createdAt)
          ORDER BY month
        `));
        
        // Get YTD stats
        const ytdResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year}
        `));
        
        // Get previous year for comparison
        const prevYearResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year - 1}
        `));
        
        // Get top issues
        const topIssuesResult = await db.execute(sql.raw(`
          SELECT 
            COALESCE(ntfReason, 'unknown') as reason,
            COUNT(*) as count
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year} AND verificationStatus = 'ntf'
          GROUP BY ntfReason
          ORDER BY count DESC
          LIMIT 5
        `));
        
        const quarterly = ((quarterlyResult as unknown as any[])[0] as any[]).map(q => ({
          quarter: `Q${q.quarter}`,
          total: Number(q.total),
          ntfCount: Number(q.ntfCount),
          realNgCount: Number(q.realNgCount),
          ntfRate: q.total > 0 ? (Number(q.ntfCount) / Number(q.total)) * 100 : 0,
        }));
        
        const monthly = ((monthlyResult as unknown as any[])[0] as any[]).map(m => ({
          month: m.month,
          monthName: new Date(input.year, m.month - 1).toLocaleDateString('vi-VN', { month: 'short' }),
          total: Number(m.total),
          ntfCount: Number(m.ntfCount),
          ntfRate: m.total > 0 ? (Number(m.ntfCount) / Number(m.total)) * 100 : 0,
        }));
        
        const ytd = ((ytdResult as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0, realNgCount: 0 };
        const prevYear = ((prevYearResult as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0 };
        const topIssues = ((topIssuesResult as unknown as any[])[0] as any[]) || [];
        
        const ytdTotal = Number(ytd.total);
        const ytdNtf = Number(ytd.ntfCount);
        const ytdRealNg = Number(ytd.realNgCount);
        const ytdNtfRate = ytdTotal > 0 ? (ytdNtf / ytdTotal) * 100 : 0;
        
        const prevTotal = Number(prevYear.total);
        const prevNtf = Number(prevYear.ntfCount);
        const prevNtfRate = prevTotal > 0 ? (prevNtf / prevTotal) * 100 : 0;
        
        // Calculate target (assume 15% is target)
        const targetNtfRate = 15;
        const targetAchieved = ytdNtfRate <= targetNtfRate;
        
        return {
          year: input.year,
          quarterly,
          monthly,
          ytd: {
            total: ytdTotal,
            ntfCount: ytdNtf,
            realNgCount: ytdRealNg,
            ntfRate: ytdNtfRate,
          },
          comparison: {
            prevYearNtfRate: prevNtfRate,
            change: ytdNtfRate - prevNtfRate,
            improved: ytdNtfRate < prevNtfRate,
          },
          kpi: {
            targetNtfRate,
            actualNtfRate: ytdNtfRate,
            targetAchieved,
            gap: ytdNtfRate - targetNtfRate,
          },
          topIssues: topIssues.map((i: any) => ({
            reason: i.reason,
            count: Number(i.count),
          })),
        };
      }),

    // Department NTF Analysis
    getDepartmentAnalysis: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        departmentId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Get departments with NTF data
        const deptQuery = input.departmentId 
          ? `AND pl.departmentId = ${input.departmentId}`
          : '';
        
        const deptResult = await db.execute(sql.raw(`
          SELECT 
            COALESCE(d.id, 0) as id,
            COALESCE(d.name, 'Không xác định') as name,
            COUNT(*) as total,
            SUM(CASE WHEN sdr.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
            SUM(CASE WHEN sdr.verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
          FROM spc_defect_records sdr
          LEFT JOIN production_lines pl ON sdr.productionLineId = pl.id
          LEFT JOIN departments d ON pl.departmentId = d.id
          WHERE sdr.createdAt >= '${startDateStr}' ${deptQuery}
          GROUP BY d.id, d.name
          ORDER BY total DESC
        `));
        
        const departments = ((deptResult as unknown as any[])[0] as any[]).map((d: any) => ({
          id: d.id,
          name: d.name,
          total: Number(d.total),
          ntfCount: Number(d.ntfCount),
          realNgCount: Number(d.realNgCount),
          ntfRate: d.total > 0 ? (Number(d.ntfCount) / Number(d.total)) * 100 : 0,
        }));
        
        // Calculate summary
        const totalDepts = departments.length;
        const avgNtfRate = totalDepts > 0 
          ? departments.reduce((sum, d) => sum + d.ntfRate, 0) / totalDepts 
          : 0;
        const sortedByRate = [...departments].sort((a, b) => a.ntfRate - b.ntfRate);
        const bestDept = sortedByRate[0]?.name || 'N/A';
        const worstDept = sortedByRate[sortedByRate.length - 1]?.name || 'N/A';
        
        // Generate recommendations
        const recommendations = departments
          .filter(d => d.ntfRate >= 20)
          .map(d => ({
            department: d.name,
            priority: d.ntfRate >= 30 ? 'high' : 'medium',
            message: d.ntfRate >= 30 
              ? `NTF rate ${d.ntfRate.toFixed(1)}% vượt ngưỡng nghiêm trọng. Cần rà soát quy trình kiểm tra ngay.`
              : `NTF rate ${d.ntfRate.toFixed(1)}% ở mức cảnh báo. Xem xét cải thiện tiêu chuẩn kiểm tra.`
          }));
        
        return {
          departments,
          summary: {
            totalDepartments: totalDepts,
            avgNtfRate,
            bestDepartment: bestDept,
            worstDepartment: worstDept,
          },
          recommendations,
          trend: [], // Simplified - can add trend data later
        };
      }),

    // Multi-year comparison
    getMultiYearComparison: protectedProcedure
      .input(z.object({
        years: z.array(z.number()).default([new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2]),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) return null;
        
        const yearlyData = [];
        for (const year of input.years) {
          const result = await db.execute(sql.raw(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount,
              SUM(CASE WHEN verificationStatus = 'real_ng' THEN 1 ELSE 0 END) as realNgCount
            FROM spc_defect_records
            WHERE YEAR(createdAt) = ${year}
          `));
          
          const quarterlyResult = await db.execute(sql.raw(`
            SELECT 
              QUARTER(createdAt) as quarter,
              COUNT(*) as total,
              SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
            FROM spc_defect_records
            WHERE YEAR(createdAt) = ${year}
            GROUP BY QUARTER(createdAt)
            ORDER BY quarter
          `));
          
          const data = ((result as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0, realNgCount: 0 };
          const quarterly = ((quarterlyResult as unknown as any[])[0] as any[]).map(q => ({
            quarter: `Q${q.quarter}`,
            total: Number(q.total),
            ntfCount: Number(q.ntfCount),
            ntfRate: q.total > 0 ? (Number(q.ntfCount) / Number(q.total)) * 100 : 0,
          }));
          
          yearlyData.push({
            year,
            total: Number(data.total),
            ntfCount: Number(data.ntfCount),
            realNgCount: Number(data.realNgCount),
            ntfRate: data.total > 0 ? (Number(data.ntfCount) / Number(data.total)) * 100 : 0,
            quarterly,
          });
        }
        
        return {
          years: input.years,
          data: yearlyData,
          trend: yearlyData.length >= 2 ? {
            improved: yearlyData[0].ntfRate < yearlyData[1].ntfRate,
            change: yearlyData[0].ntfRate - yearlyData[1].ntfRate,
          } : null,
        };
      }),

    // Export PowerPoint
    exportPowerPoint: protectedProcedure
      .input(z.object({
        year: z.number().default(new Date().getFullYear()),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        
        // Get dashboard data first
        const { getDb } = await import('./db');
        const { sql } = await import('drizzle-orm');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        // Simplified - return JSON data that frontend can use to generate PPTX
        const quarterlyResult = await db.execute(sql.raw(`
          SELECT 
            QUARTER(createdAt) as quarter,
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year}
          GROUP BY QUARTER(createdAt)
          ORDER BY quarter
        `));
        
        const ytdResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records
          WHERE YEAR(createdAt) = ${input.year}
        `));
        
        const topSuppliersResult = await db.execute(sql.raw(`
          SELECT 
            s.name as supplierName,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN materials m ON d.materialId = m.id
          LEFT JOIN suppliers s ON m.supplierId = s.id
          WHERE YEAR(d.createdAt) = ${input.year}
          GROUP BY s.id, s.name
          HAVING total > 0
          ORDER BY (ntfCount / total) DESC
          LIMIT 5
        `));
        
        const topProductsResult = await db.execute(sql.raw(`
          SELECT 
            p.name as productName,
            COUNT(*) as total,
            SUM(CASE WHEN d.verificationStatus = 'ntf' THEN 1 ELSE 0 END) as ntfCount
          FROM spc_defect_records d
          LEFT JOIN products p ON d.productId = p.id
          WHERE YEAR(d.createdAt) = ${input.year}
          GROUP BY p.id, p.name
          HAVING total > 0
          ORDER BY (ntfCount / total) DESC
          LIMIT 5
        `));
        
        const quarterly = ((quarterlyResult as unknown as any[])[0] as any[]).map(q => ({
          quarter: `Q${q.quarter}`,
          total: Number(q.total),
          ntfCount: Number(q.ntfCount),
          ntfRate: q.total > 0 ? (Number(q.ntfCount) / Number(q.total)) * 100 : 0,
        }));
        
        const ytd = ((ytdResult as unknown as any[])[0] as any[])[0] || { total: 0, ntfCount: 0 };
        const suppliers = ((topSuppliersResult as unknown as any[])[0] as any[]).map((s: any) => ({
          name: s.supplierName || 'Không xác định',
          total: Number(s.total),
          ntfCount: Number(s.ntfCount),
          ntfRate: s.total > 0 ? (Number(s.ntfCount) / Number(s.total)) * 100 : 0,
        }));
        const products = ((topProductsResult as unknown as any[])[0] as any[]).map((p: any) => ({
          name: p.productName || 'Không xác định',
          total: Number(p.total),
          ntfCount: Number(p.ntfCount),
          ntfRate: p.total > 0 ? (Number(p.ntfCount) / Number(p.total)) * 100 : 0,
        }));
        
        return {
          year: input.year,
          generatedAt: new Date().toISOString(),
          ytd: {
            total: Number(ytd.total),
            ntfCount: Number(ytd.ntfCount),
            ntfRate: ytd.total > 0 ? (Number(ytd.ntfCount) / Number(ytd.total)) * 100 : 0,
          },
          quarterly,
          topSuppliers: suppliers,
          topProducts: products,
        };
      }),
  }),

  // Notification Channels Router
  notification: router({
    // Get user's channels
    getChannels: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserChannels } = await import('./services/notificationService');
        return await getUserChannels(ctx.user.id);
      }),
    
    // Upsert channel
    upsertChannel: protectedProcedure
      .input(z.object({
        channelType: z.enum(['email', 'sms', 'push', 'webhook']),
        config: z.record(z.string(), z.any()),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const { upsertChannel } = await import('./services/notificationService');
        const id = await upsertChannel(ctx.user.id, input.channelType, input.config as Record<string, any>, input.enabled);
        return { success: true, id };
      }),
    
    // Delete channel
    deleteChannel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteChannel } = await import('./services/notificationService');
        await deleteChannel(input.id);
        return { success: true };
      }),
    
    // Get logs (admin only)
    getLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getNotificationLogs } = await import('./services/notificationService');
        return await getNotificationLogs(input.limit);
      }),
    
    // Test notification
    testNotification: protectedProcedure
      .input(z.object({
        channelType: z.enum(['email', 'sms', 'push', 'webhook']),
        recipient: z.string(),
        config: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { sendNotification } = await import('./services/notificationService');
        const success = await sendNotification({
          userId: ctx.user.id,
          channelType: input.channelType,
          recipient: input.recipient,
          subject: 'Test Notification',
          message: 'This is a test notification from CPK/SPC Calculator.',
          config: input.config,
        });
        return { success };
      }),
  }),

  // Query Performance Monitoring Router
  queryPerformance: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getQueryStats } = await import('./services/queryPerformanceService');
        return getQueryStats();
      }),

    getSlowQueries: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getSlowQueries } = await import('./services/queryPerformanceService');
        return getSlowQueries(input.limit);
      }),

    analyzeQuery: protectedProcedure
      .input(z.object({ query: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { analyzeQuery } = await import('./services/queryPerformanceService');
        return await analyzeQuery(input.query);
      }),

    getIndexUsageStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getIndexUsageStats } = await import('./services/queryPerformanceService');
        return await getIndexUsageStats();
      }),

    getTableStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getTableStats } = await import('./services/queryPerformanceService');
        return await getTableStats();
      }),
  }),

  // Connection Pool Monitoring Router
  connectionPool: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getPoolStats } = await import('./services/connectionPoolService');
        return await getPoolStats();
      }),

    getHealth: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getPoolHealth } = await import('./services/connectionPoolService');
        return await getPoolHealth();
      }),

    getRecommendedConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        }
        const { getRecommendedPoolConfig } = await import('./services/connectionPoolService');
        return await getRecommendedPoolConfig();
      }),
  }),

  shiftReport: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        shiftType: z.enum(["morning", "afternoon", "night"]).optional(),
        productionLineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { getShiftReports } = await import("./services/shiftReportService");
        return await getShiftReports(input);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getShiftReportById } = await import("./services/shiftReportService");
        return await getShiftReportById(input.id);
      }),
    generate: protectedProcedure
      .input(z.object({
        shiftDate: z.string(),
        shiftType: z.enum(["morning", "afternoon", "night"]),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { generateShiftReport } = await import("./services/shiftReportService");
        const reportId = await generateShiftReport(
          new Date(input.shiftDate),
          input.shiftType,
          input.productionLineId,
          input.machineId
        );
        return { success: true, reportId };
      }),
    sendEmail: protectedProcedure
      .input(z.object({
        reportId: z.number(),
        recipients: z.array(z.string().email())
      }))
      .mutation(async ({ input }) => {
        const { sendShiftReportEmail } = await import("./services/shiftReportService");
        const success = await sendShiftReportEmail(input.reportId, input.recipients);
        return { success };
      })
  }),

  // Shift Manager Dashboard router
  shiftManager: router({
    // Get shift KPI data with filters
    getShiftKPIs: protectedProcedure
      .input(z.object({
        date: z.date(),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { getShiftKPIData } = await import("./services/shiftManagerService");
        return await getShiftKPIData(input);
      }),

    // Get machine performance data
    getMachinePerformance: protectedProcedure
      .input(z.object({
        date: z.date(),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { getMachinePerformanceData } = await import("./services/shiftManagerService");
        return await getMachinePerformanceData(input);
      }),

    // Get daily trend data
    getDailyTrend: protectedProcedure
      .input(z.object({
        date: z.date(),
        days: z.number().default(7),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { getDailyTrendData } = await import("./services/shiftManagerService");
        return await getDailyTrendData(input);
      }),

    // Get weekly comparison data
    getWeeklyCompare: protectedProcedure
      .input(z.object({
        date: z.date(),
        weeks: z.number().default(4),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { getWeeklyCompareData } = await import("./services/shiftManagerService");
        return await getWeeklyCompareData(input);
      }),

    // Compare KPI with previous week (for alerts)
    compareWithPreviousWeek: protectedProcedure
      .input(z.object({
        date: z.date(),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .query(async ({ input }) => {
        const { compareKPIWithPreviousWeek } = await import("./services/shiftManagerService");
        return await compareKPIWithPreviousWeek(input);
      }),

    // Export to Excel
    exportExcel: protectedProcedure
      .input(z.object({
        date: z.date(),
        days: z.number().default(7),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { exportShiftManagerExcel } = await import("./services/shiftManagerService");
        return await exportShiftManagerExcel(input);
      }),

    // Export to PDF
    exportPdf: protectedProcedure
      .input(z.object({
        date: z.date(),
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .mutation(async ({ input }) => {
        const { exportShiftManagerPdf } = await import("./services/shiftManagerService");
        return await exportShiftManagerPdf(input);
      }),

    // Manually trigger KPI alert check
    triggerKPIAlertCheck: protectedProcedure
      .input(z.object({
        productionLineId: z.number().optional(),
        machineId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { checkAndSendKPIAlerts } = await import("./services/kpiAlertService");
        return await checkAndSendKPIAlerts(input.productionLineId, input.machineId);
      }),

    // KPI Alert Thresholds CRUD
    getAlertThresholds: protectedProcedure.query(async () => {
      const { getKpiAlertThresholds } = await import("./services/kpiAlertThresholdService");
      return await getKpiAlertThresholds();
    }),

    getAlertThresholdByLine: protectedProcedure
      .input(z.object({ lineId: z.number() }))
      .query(async ({ input }) => {
        const { getKpiAlertThresholdByLineId } = await import("./services/kpiAlertThresholdService");
        return await getKpiAlertThresholdByLineId(input.lineId);
      }),

    getEffectiveThresholds: protectedProcedure
      .input(z.object({ lineId: z.number() }))
      .query(async ({ input }) => {
        const { getEffectiveThresholds } = await import("./services/kpiAlertThresholdService");
        return await getEffectiveThresholds(input.lineId);
      }),

    getLinesWithoutThresholds: protectedProcedure.query(async () => {
      const { getLinesWithoutThresholds } = await import("./services/kpiAlertThresholdService");
      return await getLinesWithoutThresholds();
    }),

    createAlertThreshold: protectedProcedure
      .input(z.object({
        productionLineId: z.number(),
        cpkWarning: z.number().optional(),
        cpkCritical: z.number().optional(),
        oeeWarning: z.number().optional(),
        oeeCritical: z.number().optional(),
        defectRateWarning: z.number().optional(),
        defectRateCritical: z.number().optional(),
        weeklyDeclineThreshold: z.number().optional(),
        emailAlertEnabled: z.boolean().optional(),
        alertEmails: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { createKpiAlertThreshold } = await import("./services/kpiAlertThresholdService");
        return await createKpiAlertThreshold({ ...input, createdBy: ctx.user.id });
      }),

    updateAlertThreshold: protectedProcedure
      .input(z.object({
        id: z.number(),
        cpkWarning: z.number().optional(),
        cpkCritical: z.number().optional(),
        oeeWarning: z.number().optional(),
        oeeCritical: z.number().optional(),
        defectRateWarning: z.number().optional(),
        defectRateCritical: z.number().optional(),
        weeklyDeclineThreshold: z.number().optional(),
        emailAlertEnabled: z.boolean().optional(),
        alertEmails: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { id, ...data } = input;
        const { updateKpiAlertThreshold } = await import("./services/kpiAlertThresholdService");
        return await updateKpiAlertThreshold(id, data);
      }),

    deleteAlertThreshold: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteKpiAlertThreshold } = await import("./services/kpiAlertThresholdService");
        return await deleteKpiAlertThreshold(input.id);
      }),

    // Weekly KPI Trend
    getWeeklyTrend: protectedProcedure
      .input(z.object({
        lineId: z.number().nullable(),
        weeks: z.number().default(12)
      }))
      .query(async ({ input }) => {
        const { getWeeklyTrendData } = await import("./services/weeklyKpiService");
        return await getWeeklyTrendData(input.lineId, input.weeks);
      }),

    getAllLinesWeeklyKpi: protectedProcedure.query(async () => {
      const { getAllLinesWeeklyKpi } = await import("./services/weeklyKpiService");
      return await getAllLinesWeeklyKpi();
    }),

    getWeekComparison: protectedProcedure
      .input(z.object({
        lineId: z.number().nullable(),
        weeksToCompare: z.array(z.number())
      }))
      .query(async ({ input }) => {
        const { getWeekComparison } = await import("./services/weeklyKpiService");
        return await getWeekComparison(input.lineId, input.weeksToCompare);
      }),

    // Scheduled KPI Reports
    getScheduledReports: protectedProcedure.query(async () => {
      const { getScheduledKpiReports } = await import("./services/scheduledKpiReportService");
      return await getScheduledKpiReports();
    }),

    getScheduledReportById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getScheduledKpiReportById } = await import("./services/scheduledKpiReportService");
        return await getScheduledKpiReportById(input.id);
      }),

    createScheduledReport: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        timeOfDay: z.string().optional(),
        productionLineIds: z.array(z.number()).optional(),
        reportType: z.enum(["shift_summary", "kpi_comparison", "trend_analysis", "full_report"]).optional(),
        includeCharts: z.boolean().optional(),
        includeDetails: z.boolean().optional(),
        recipients: z.array(z.string().email()),
        ccRecipients: z.array(z.string().email()).optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { createScheduledKpiReport } = await import("./services/scheduledKpiReportService");
        return await createScheduledKpiReport({ ...input, createdBy: ctx.user.id });
      }),

    updateScheduledReport: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        timeOfDay: z.string().optional(),
        productionLineIds: z.array(z.number()).optional(),
        reportType: z.enum(["shift_summary", "kpi_comparison", "trend_analysis", "full_report"]).optional(),
        includeCharts: z.boolean().optional(),
        includeDetails: z.boolean().optional(),
        recipients: z.array(z.string().email()).optional(),
        ccRecipients: z.array(z.string().email()).optional(),
        isEnabled: z.boolean().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { id, ...data } = input;
        const { updateScheduledKpiReport } = await import("./services/scheduledKpiReportService");
        return await updateScheduledKpiReport(id, data);
      }),

    deleteScheduledReport: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteScheduledKpiReport } = await import("./services/scheduledKpiReportService");
        return await deleteScheduledKpiReport(input.id);
      }),

    toggleScheduledReport: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { toggleScheduledReport } = await import("./services/scheduledKpiReportService");
        return await toggleScheduledReport(input.id, input.enabled);
      }),

    sendReportNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { sendScheduledReport } = await import("./services/scheduledKpiReportService");
        return await sendScheduledReport(input.id);
      }),

    getReportHistory: protectedProcedure
      .input(z.object({
        reportId: z.number().optional(),
        limit: z.number().default(50)
      }))
      .query(async ({ input }) => {
        const { getReportHistory } = await import("./services/scheduledKpiReportService");
        return await getReportHistory(input.reportId, input.limit);
      })
  }),

  // Query Cache Management router
  queryCache: router({
    // Get cache statistics
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { queryCache } = await import("./services/queryCacheService");
      return queryCache.getStats();
    }),
    
    // Get cache entries
    getEntries: protectedProcedure
      .input(z.object({
        limit: z.number().default(100),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        const entries = queryCache.getEntries();
        return entries.slice(0, input.limit);
      }),
    
    // Clear all cache
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { queryCache } = await import("./services/queryCacheService");
      queryCache.clear();
      return { success: true, message: "Cache cleared successfully" };
    }),
    
    // Invalidate specific query
    invalidateQuery: protectedProcedure
      .input(z.object({ queryId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        const count = queryCache.invalidateQuery(input.queryId);
        return { success: true, invalidatedCount: count };
      }),
    
    // Invalidate by pattern
    invalidatePattern: protectedProcedure
      .input(z.object({ pattern: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        const count = queryCache.invalidatePattern(input.pattern);
        return { success: true, invalidatedCount: count };
      }),
    
    // Cleanup expired entries
    cleanup: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { queryCache } = await import("./services/queryCacheService");
      const count = queryCache.cleanup();
      return { success: true, cleanedCount: count };
    }),
    
    // Evict LRU entries
    evictLRU: protectedProcedure
      .input(z.object({ count: z.number().default(10) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        const evicted = queryCache.evictLRU(input.count);
        return { success: true, evictedCount: evicted };
      }),
    
    // Configure TTL for category
    setTTL: protectedProcedure
      .input(z.object({
        category: z.string(),
        ttlSeconds: z.number().min(1).max(3600),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        queryCache.setTTLConfig(input.category, input.ttlSeconds * 1000);
        return { success: true };
      }),
    
    // Set max entries
    setMaxEntries: protectedProcedure
      .input(z.object({ maxEntries: z.number().min(100).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { queryCache } = await import("./services/queryCacheService");
        queryCache.setMaxEntries(input.maxEntries);
        return { success: true };
      }),
  }),

  // Performance Alert Router
  performanceAlert: router({
    // Get all alert rules
    getRules: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getAlertRules } = await import("./services/performanceAlertService");
        return getAlertRules();
      }),

    // Create alert rule
    createRule: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["slow_query_threshold", "pool_utilization", "pool_queue_length", "error_rate", "cache_hit_rate", "memory_usage"]),
        threshold: z.number(),
        severity: z.enum(["info", "warning", "critical"]),
        enabled: z.boolean().default(true),
        notifyEmail: z.boolean().default(false),
        notifyWebhook: z.boolean().default(false),
        cooldownMinutes: z.number().min(1).default(5),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { createAlertRule } = await import("./services/performanceAlertService");
        return createAlertRule(input);
      }),

    // Update alert rule
    updateRule: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        threshold: z.number().optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        enabled: z.boolean().optional(),
        notifyEmail: z.boolean().optional(),
        notifyWebhook: z.boolean().optional(),
        cooldownMinutes: z.number().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { updateAlertRule } = await import("./services/performanceAlertService");
        const { id, ...updates } = input;
        const result = updateAlertRule(id, updates);
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        }
        return result;
      }),

    // Delete alert rule
    deleteRule: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteAlertRule } = await import("./services/performanceAlertService");
        const success = deleteAlertRule(input.id);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        }
        return { success: true };
      }),

    // Toggle alert rule
    toggleRule: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { toggleAlertRule } = await import("./services/performanceAlertService");
        const success = toggleAlertRule(input.id, input.enabled);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert rule not found" });
        }
        return { success: true };
      }),

    // Get alerts
    getAlerts: protectedProcedure
      .input(z.object({
        severity: z.enum(["info", "warning", "critical"]).optional(),
        type: z.enum(["slow_query_threshold", "pool_utilization", "pool_queue_length", "error_rate", "cache_hit_rate", "memory_usage"]).optional(),
        acknowledged: z.boolean().optional(),
        limit: z.number().default(100),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getAlerts } = await import("./services/performanceAlertService");
        return getAlerts(input);
      }),

    // Get alert stats
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getAlertStats } = await import("./services/performanceAlertService");
        return getAlertStats();
      }),

    // Acknowledge alert
    acknowledgeAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { acknowledgeAlert } = await import("./services/performanceAlertService");
        const success = acknowledgeAlert(input.alertId, ctx.user.id);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
        }
        return { success: true };
      }),

    // Acknowledge multiple alerts
    acknowledgeAlerts: protectedProcedure
      .input(z.object({ alertIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { acknowledgeAlerts } = await import("./services/performanceAlertService");
        const count = acknowledgeAlerts(input.alertIds, ctx.user.id);
        return { count };
      }),

    // Run performance checks manually
    runChecks: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { runPerformanceChecks } = await import("./services/performanceAlertService");
        return await runPerformanceChecks();
      }),

    // Clear all alerts
    clearAlerts: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { clearAlerts } = await import("./services/performanceAlertService");
        clearAlerts();
        return { success: true };
      }),

    // Clear old alerts
    clearOldAlerts: protectedProcedure
      .input(z.object({ days: z.number().min(1).default(30) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { clearOldAlerts } = await import("./services/performanceAlertService");
        const count = clearOldAlerts(input.days);
        return { count };
      }),

    // Export performance report
    exportReport: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        includeSlowQueries: z.boolean().default(true),
        includePoolStats: z.boolean().default(true),
        includeAlerts: z.boolean().default(true),
        includeCacheStats: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { generatePerformanceReport } = await import("./services/performanceReportService");
        return await generatePerformanceReport({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          includeSlowQueries: input.includeSlowQueries,
          includePoolStats: input.includePoolStats,
          includeAlerts: input.includeAlerts,
          includeCacheStats: input.includeCacheStats,
        });
      }),

    // Get report data (without export)
    getReportData: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { generatePerformanceReportData } = await import("./services/performanceReportService");
        return await generatePerformanceReportData({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    // === Scheduled Performance Checks ===
    
    // Get scheduled check config
    getScheduledCheckConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getScheduledCheckConfig } = await import("./services/scheduledPerformanceChecks");
        return getScheduledCheckConfig();
      }),

    // Update scheduled check config
    updateScheduledCheckConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        intervalMinutes: z.number().min(1).max(60).optional(),
        notifyEmail: z.boolean().optional(),
        notifyOwner: z.boolean().optional(),
        emailRecipients: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { updateScheduledCheckConfig } = await import("./services/scheduledPerformanceChecks");
        return updateScheduledCheckConfig(input);
      }),

    // Get check history
    getCheckHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getCheckHistory } = await import("./services/scheduledPerformanceChecks");
        return getCheckHistory({ limit: input.limit });
      }),

    // Get check stats
    getCheckStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getCheckStats } = await import("./services/scheduledPerformanceChecks");
        return getCheckStats();
      }),

    // Run single check manually
    runSingleCheck: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { runSingleCheck } = await import("./services/scheduledPerformanceChecks");
        return await runSingleCheck();
      }),

    // Clear check history
    clearCheckHistory: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { clearCheckHistory } = await import("./services/scheduledPerformanceChecks");
        clearCheckHistory();
        return { success: true };
      }),

    // === Notification Channels ===
    
    // Get all notification channels
    getChannels: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getChannels } = await import("./services/notificationChannelService");
        return getChannels();
      }),

    // Get channel stats
    getChannelStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { getChannelStats } = await import("./services/notificationChannelService");
        return getChannelStats();
      }),

    // Create notification channel
    createChannel: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["email", "webhook", "owner"]),
        config: z.record(z.string(), z.any()),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { createChannel } = await import("./services/notificationChannelService");
        return createChannel(input);
      }),

    // Toggle channel enabled status
    toggleChannel: protectedProcedure
      .input(z.object({ id: z.number(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { toggleChannel } = await import("./services/notificationChannelService");
        const success = toggleChannel(input.id, input.enabled);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" });
        }
        return { success: true };
      }),

    // Delete notification channel
    deleteChannel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { deleteChannel } = await import("./services/notificationChannelService");
        const success = deleteChannel(input.id);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" });
        }
        return { success: true };
      }),

    // Test notification channel
    testChannel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        const { testChannel } = await import("./services/notificationChannelService");
        return await testChannel(input.id);
      }),
  }),

  // KPI Alert Stats Router - Thống kê cảnh báo KPI
  kpiAlertStats: router({
    // Get alert stats with filters
    getAlerts: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        productionLineId: z.number().optional(),
        alertType: z.string().optional(),
        severity: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        const { getKpiAlertStats } = await import("./services/kpiAlertStatsService");
        return await getKpiAlertStats({
          startDate: input?.startDate ? new Date(input.startDate) : undefined,
          endDate: input?.endDate ? new Date(input.endDate) : undefined,
          productionLineId: input?.productionLineId,
          alertType: input?.alertType,
          severity: input?.severity,
          limit: input?.limit || 100,
          offset: input?.offset || 0,
        });
      }),

    // Get summary statistics
    getSummary: protectedProcedure
      .input(z.object({ days: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        const { getKpiAlertSummary } = await import("./services/kpiAlertStatsService");
        return await getKpiAlertSummary(input?.days || 30);
      }),

    // Get daily stats
    getByDay: protectedProcedure
      .input(z.object({ days: z.number().default(7) }).optional())
      .query(async ({ input }) => {
        const { getKpiAlertStatsByDay } = await import("./services/kpiAlertStatsService");
        return await getKpiAlertStatsByDay(input?.days || 7);
      }),

    // Get weekly stats
    getByWeek: protectedProcedure
      .input(z.object({ weeks: z.number().default(4) }).optional())
      .query(async ({ input }) => {
        const { getKpiAlertStatsByWeek } = await import("./services/kpiAlertStatsService");
        return await getKpiAlertStatsByWeek(input?.weeks || 4);
      }),

    // Record new alert
    recordAlert: protectedProcedure
      .input(z.object({
        productionLineId: z.number().optional(),
        machineId: z.number().optional(),
        alertType: z.enum(["cpk_decline", "oee_decline", "cpk_below_warning", "cpk_below_critical", "oee_below_warning", "oee_below_critical"]),
        severity: z.enum(["warning", "critical"]),
        currentValue: z.number().optional(),
        previousValue: z.number().optional(),
        thresholdValue: z.number().optional(),
        changePercent: z.number().optional(),
        alertMessage: z.string().optional(),
        sendEmail: z.boolean().default(false),
        sendNotification: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const { recordKpiAlert, sendKpiAlertPushNotification, sendKpiAlertEmail } = await import("./services/kpiAlertStatsService");
        const alertId = await recordKpiAlert({
          ...input,
          emailSent: false,
          notificationSent: false,
        });
        
        if (alertId) {
          // Send notification if requested
          if (input.sendNotification) {
            await sendKpiAlertPushNotification(alertId);
          }
          // Send email if requested (would need recipients)
          // if (input.sendEmail) {
          //   await sendKpiAlertEmail(alertId, recipients);
          // }
        }
        
        return { success: !!alertId, alertId };
      }),

    // Export to Excel
    exportExcel: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        productionLineId: z.number().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const { exportKpiAlertStatsToExcel } = await import("./services/kpiAlertStatsService");
        const buffer = await exportKpiAlertStatsToExcel({
          startDate: input?.startDate ? new Date(input.startDate) : undefined,
          endDate: input?.endDate ? new Date(input.endDate) : undefined,
          productionLineId: input?.productionLineId,
        });
        
        // Upload to S3
        const { storagePut } = await import("./storage");
        const filename = `kpi-alert-stats-${Date.now()}.xlsx`;
        const { url } = await storagePut(`exports/${filename}`, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        
        return { url, filename };
      }),

    // Export to PDF (HTML)
    exportPdf: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        productionLineId: z.number().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const { exportKpiAlertStatsToPdf } = await import("./services/kpiAlertStatsService");
        const html = await exportKpiAlertStatsToPdf({
          startDate: input?.startDate ? new Date(input.startDate) : undefined,
          endDate: input?.endDate ? new Date(input.endDate) : undefined,
          productionLineId: input?.productionLineId,
        });
        
        // Upload HTML as PDF-ready file
        const { storagePut } = await import("./storage");
        const filename = `kpi-alert-stats-${Date.now()}.html`;
        const { url } = await storagePut(`exports/${filename}`, Buffer.from(html), "text/html");
        
        return { url, filename, html };
      }),

    // Acknowledge alert
    acknowledgeAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        await db.update(kpiAlertStats)
          .set({ 
            acknowledgedBy: ctx.user.id,
            acknowledgedAt: new Date()
          })
          .where(eq(kpiAlertStats.id, input.alertId));
        
        return { success: true };
      }),

    // Resolve alert
    resolveAlert: protectedProcedure
      .input(z.object({ 
        alertId: z.number(),
        resolutionNotes: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        await db.update(kpiAlertStats)
          .set({ 
            resolvedBy: ctx.user.id,
            resolvedAt: new Date(),
            resolutionNotes: input.resolutionNotes || null
          })
          .where(eq(kpiAlertStats.id, input.alertId));
        
        return { success: true };
      }),
  }),

  // KPI Alert Router - API cho Alert Dashboard
  kpiAlert: router({
    // Get alert stats for dashboard
    getStats: protectedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats, productionLines } = await import("../drizzle/schema");
        const { eq, gte, sql, and, isNull, isNotNull } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) return { total: 0, pending: 0, acknowledged: 0, resolved: 0, critical: 0, warning: 0, byType: [], byDay: [], avgResolveTime: 0 };
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Get all alerts in period
        const alerts = await db.select()
          .from(kpiAlertStats)
          .where(gte(kpiAlertStats.createdAt, startDate));
        
        const total = alerts.length;
        const pending = alerts.filter(a => !a.acknowledgedAt && !a.resolvedAt).length;
        const acknowledged = alerts.filter(a => a.acknowledgedAt && !a.resolvedAt).length;
        const resolved = alerts.filter(a => a.resolvedAt).length;
        const critical = alerts.filter(a => a.severity === 'critical').length;
        const warning = alerts.filter(a => a.severity === 'warning').length;
        
        // By type
        const byTypeMap = new Map<string, number>();
        alerts.forEach(a => {
          byTypeMap.set(a.alertType, (byTypeMap.get(a.alertType) || 0) + 1);
        });
        const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count }));
        
        // By day
        const byDayMap = new Map<string, { critical: number; warning: number }>();
        alerts.forEach(a => {
          const date = new Date(a.createdAt).toISOString().split('T')[0];
          const existing = byDayMap.get(date) || { critical: 0, warning: 0 };
          if (a.severity === 'critical') existing.critical++;
          else existing.warning++;
          byDayMap.set(date, existing);
        });
        const byDay = Array.from(byDayMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
        
        // Avg resolve time
        const resolvedAlerts = alerts.filter(a => a.resolvedAt);
        const avgResolveTime = resolvedAlerts.length > 0
          ? resolvedAlerts.reduce((sum, a) => sum + (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()) / 60000, 0) / resolvedAlerts.length
          : 0;
        
        return { total, pending, acknowledged, resolved, critical, warning, byType, byDay, avgResolveTime };
      }),

    // Get pending alerts
    getPending: protectedProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { kpiAlertStats, productionLines, machines } = await import("../drizzle/schema");
      const { eq, isNull, and, desc } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) return [];
      
      const alerts = await db.select({
        id: kpiAlertStats.id,
        alertType: kpiAlertStats.alertType,
        severity: kpiAlertStats.severity,
        alertMessage: kpiAlertStats.alertMessage,
        currentValue: kpiAlertStats.currentValue,
        thresholdValue: kpiAlertStats.thresholdValue,
        productionLineId: kpiAlertStats.productionLineId,
        machineId: kpiAlertStats.machineId,
        createdAt: kpiAlertStats.createdAt,
        acknowledgedAt: kpiAlertStats.acknowledgedAt,
        escalationLevel: sql<number>`COALESCE(${kpiAlertStats.id}, 0)`.as('escalationLevel'),
      })
        .from(kpiAlertStats)
        .where(isNull(kpiAlertStats.resolvedAt))
        .orderBy(desc(kpiAlertStats.createdAt))
        .limit(50);
      
      // Get production line names
      const lineIds = [...new Set(alerts.filter(a => a.productionLineId).map(a => a.productionLineId!))];
      const lines = lineIds.length > 0 
        ? await db.select({ id: productionLines.id, name: productionLines.name }).from(productionLines)
        : [];
      const lineMap = new Map(lines.map(l => [l.id, l.name]));
      
      return alerts.map(a => ({
        ...a,
        currentValue: Number(a.currentValue),
        thresholdValue: Number(a.thresholdValue),
        productionLineName: a.productionLineId ? lineMap.get(a.productionLineId) : undefined,
        escalationLevel: 0, // Will be updated when escalation is implemented
      }));
    }),

    // Acknowledge alert
    acknowledge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        await db.update(kpiAlertStats)
          .set({ acknowledgedBy: ctx.user.id, acknowledgedAt: new Date() })
          .where(eq(kpiAlertStats.id, input.id));
        
        return { success: true };
      }),

    // Resolve alert
    resolve: protectedProcedure
      .input(z.object({ id: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        await db.update(kpiAlertStats)
          .set({ resolvedBy: ctx.user.id, resolvedAt: new Date(), resolutionNotes: input.notes || null })
          .where(eq(kpiAlertStats.id, input.id));
        
        return { success: true };
      }),

    // Send critical alert notification (email + SMS)
    sendCriticalNotification: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { kpiAlertStats, productionLines } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { sendCriticalAlertNotification } = await import("./services/criticalAlertNotificationService");
        
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get alert details
        const [alert] = await db.select().from(kpiAlertStats).where(eq(kpiAlertStats.id, input.alertId));
        if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
        
        // Get production line name
        let productionLineName: string | undefined;
        if (alert.productionLineId) {
          const [line] = await db.select().from(productionLines).where(eq(productionLines.id, alert.productionLineId));
          productionLineName = line?.name;
        }
        
        const result = await sendCriticalAlertNotification({
          id: alert.id,
          alertType: alert.alertType,
          severity: alert.severity as 'warning' | 'critical',
          alertMessage: alert.alertMessage || '',
          currentValue: Number(alert.currentValue),
          thresholdValue: Number(alert.thresholdValue),
          productionLineId: alert.productionLineId || undefined,
          productionLineName,
          createdAt: new Date(alert.createdAt),
        });
        
        return result;
      }),
  }),

  // Critical Alert SMS Router
  criticalAlertSms: router({
    // Get SMS config
    getSmsConfig: protectedProcedure.query(async () => {
      const { getSmsConfig } = await import("./services/criticalAlertSmsService");
      return await getSmsConfig();
    }),

    // Save SMS config
    saveSmsConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        provider: z.enum(['twilio', 'nexmo', 'custom']).optional(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        fromNumber: z.string().optional(),
        customEndpoint: z.string().optional(),
        timeoutMinutes: z.number().optional(),
        recipients: z.array(z.string()).optional(),
        escalationEnabled: z.boolean().optional(),
        escalationIntervalMinutes: z.number().optional(),
        maxEscalations: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { saveSmsConfig } = await import("./services/criticalAlertSmsService");
        const success = await saveSmsConfig(input);
        return { success };
      }),

    // Test SMS
    testSms: protectedProcedure
      .input(z.object({
        phoneNumber: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { getSmsConfig } = await import("./services/criticalAlertSmsService");
        const config = await getSmsConfig();
        
        if (!config.enabled) {
          return { success: false, error: "SMS notifications are disabled" };
        }
        
        // Send test SMS based on provider
        try {
          let success = false;
          
          if (config.provider === 'twilio' && config.apiKey && config.apiSecret && config.fromNumber) {
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: input.phoneNumber,
                  From: config.fromNumber,
                  Body: input.message,
                }),
              }
            );
            success = response.ok;
          } else if (config.provider === 'nexmo' && config.apiKey && config.apiSecret) {
            const response = await fetch('https://rest.nexmo.com/sms/json', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: config.apiKey,
                api_secret: config.apiSecret,
                to: input.phoneNumber,
                from: config.fromNumber || 'SPC-CPK',
                text: input.message,
              }),
            });
            const data = await response.json();
            success = data.messages?.[0]?.status === '0';
          } else if (config.provider === 'custom' && config.customEndpoint) {
            const response = await fetch(config.customEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
              },
              body: JSON.stringify({
                to: input.phoneNumber,
                message: input.message,
                from: config.fromNumber,
              }),
            });
            success = response.ok;
          }
          
          return { success, error: success ? undefined : "Failed to send SMS" };
        } catch (error: any) {
          return { success: false, error: error.message || "Unknown error" };
        }
      }),

    // Get SMS stats
    getSmsStats: protectedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const { getSmsStats } = await import("./services/criticalAlertSmsService");
        return await getSmsStats(input.days);
      }),
  }),

  // Line Comparison Export Router
  lineComparisonExport: router({
    // Get comparison data
    getData: protectedProcedure
      .input(z.object({
        lineIds: z.array(z.number()),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const { getLineComparisonData } = await import("./services/lineComparisonExportService");
        return await getLineComparisonData({
          lineIds: input.lineIds,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    // Export to Excel
    exportExcel: protectedProcedure
      .input(z.object({
        lineIds: z.array(z.number()),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { exportLineComparisonExcel } = await import("./services/lineComparisonExportService");
        const buffer = await exportLineComparisonExcel({
          lineIds: input.lineIds,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
        
        // Upload to S3
        const filename = `line-comparison-${Date.now()}.xlsx`;
        const { url } = await storagePut(filename, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return { url, filename };
      }),

    // Export to PDF (HTML)
    exportPdf: protectedProcedure
      .input(z.object({
        lineIds: z.array(z.number()),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { exportLineComparisonPdf } = await import("./services/lineComparisonExportService");
        const html = await exportLineComparisonPdf({
          lineIds: input.lineIds,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
        
        // Upload HTML as file
        const filename = `line-comparison-${Date.now()}.html`;
        const { url } = await storagePut(filename, Buffer.from(html), 'text/html');
        
        return { url, filename, html };
      }),
  }),

  // Performance Drop Alert Router
  performanceDropAlert: router({
    // Get config
    getConfig: protectedProcedure.query(async () => {
      const { getPerformanceDropConfig } = await import("./services/performanceDropAlertService");
      return await getPerformanceDropConfig();
    }),

    // Save config
    saveConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        oeeDropThreshold: z.number().optional(),
        cpkDropThreshold: z.number().optional(),
        comparisonPeriodHours: z.number().optional(),
        checkIntervalMinutes: z.number().optional(),
        notifyOwner: z.boolean().optional(),
        notifyEmail: z.boolean().optional(),
        notifySms: z.boolean().optional(),
        minSamplesRequired: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { savePerformanceDropConfig } = await import("./services/performanceDropAlertService");
        const success = await savePerformanceDropConfig(input);
        return { success };
      }),

    // Get unresolved alerts
    getUnresolvedAlerts: protectedProcedure.query(async () => {
      const { getUnresolvedPerformanceDropAlerts } = await import("./services/performanceDropAlertService");
      return await getUnresolvedPerformanceDropAlerts();
    }),

    // Resolve alert
    resolveAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { resolvePerformanceDropAlert } = await import("./services/performanceDropAlertService");
        const success = await resolvePerformanceDropAlert(input.alertId, ctx.user.name || ctx.user.id);
        return { success };
      }),

    // Get stats
    getStats: protectedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const { getPerformanceDropStats } = await import("./services/performanceDropAlertService");
        return await getPerformanceDropStats(input.days);
      }),

    // Manually trigger check
    checkNow: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { checkPerformanceDrops } = await import("./services/performanceDropAlertService");
      const alerts = await checkPerformanceDrops();
      return { alertsFound: alerts.length, alerts };
    }),
  }),

  // Escalation Router
  escalation: router({
    // Get escalation config
    getConfig: protectedProcedure.query(async () => {
      const { getEscalationConfig } = await import("./services/alertEscalationService");
      return await getEscalationConfig();
    }),

    // Save escalation config
    saveConfig: protectedProcedure
      .input(z.object({
        enabled: z.boolean(),
        failureThreshold: z.number().optional().default(3),
        levels: z.array(z.object({
          level: z.number(),
          name: z.string(),
          timeoutMinutes: z.number(),
          notifyEmails: z.array(z.string()),
          notifyPhones: z.array(z.string()),
          notifyOwner: z.boolean(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        const { saveEscalationConfig } = await import("./services/alertEscalationService");
        await saveEscalationConfig(input);
        return { success: true };
      }),

    // Test escalation for a specific level
    test: protectedProcedure
      .input(z.object({ level: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
        }
        try {
          const { testEscalation } = await import("./services/alertEscalationService");
          await testEscalation(input.level, ctx.user.email || ctx.user.name);
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    // Get escalation stats
    getStats: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        const { getEscalationStats } = await import("./services/alertEscalationService");
        return await getEscalationStats(input.days);
      }),

    // Get escalation history for an alert
    getHistory: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .query(async ({ input }) => {
        const { getEscalationHistory } = await import("./services/alertEscalationService");
        return await getEscalationHistory(input.alertId);
      }),

    // Manually trigger escalation processing
    processEscalations: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { processEscalations } = await import("./services/alertEscalationService");
      return await processEscalations();
    }),
  }),

  // Computer Vision - Defect Detection
  vision: visionRouter,

  // Predictive Analytics - OEE Forecasting & Defect Prediction
  predictiveAnalytics: predictiveAnalyticsRouter,

  // Predictive Alert Thresholds - Auto Alert Configuration
  predictiveAlert: predictiveAlertRouter,
  // IoT Sensor - Real-time sensor data and alerts
  iotSensor: iotSensorRouter,
  // IoT Device Management - Groups, Templates, Health, Maintenance
  iotDeviceManagement: iotDeviceManagementRouter,
  // IoT Alert Escalation - Rules, Correlations, Processing
  iotAlertEscalation: iotAlertEscalationRouter,
  // IoT Analytics - Reports, Widgets, Data Aggregation
  iotAnalytics: iotAnalyticsRouter,
  // IoT Protocol - MQTT, OPC-UA, Modbus Connection Management
  iotProtocol: iotProtocolRouter,
  // Push Notifications
  pushNotification: notificationRouter,
  // Notification Preferences - User notification settings
  notificationPreferences: notificationPreferencesRouter,
  // AI Export - PDF/Excel reports
  aiExport: aiExportRouter,
  // Cache Monitoring - Monitor and manage cache
  cacheMonitoring: cacheMonitoringRouter,
  // SMS Notification
  sms: smsRouter,
  // Escalation History Dashboard
  escalationHistory: escalationHistoryRouter,
  // Auto-resolve Configuration
  autoResolve: autoResolveRouter,
  // Escalation Webhook (Slack, Teams, Discord)
  escalationWebhook: escalationWebhookRouter,
  // Escalation Templates
  escalationTemplate: escalationTemplateRouter,
  // Escalation Reports
  escalationReport: escalationReportRouter,
  // Telegram Bot Integration
  telegram: telegramRouter,
  // Floor Plan Management
  floorPlan: floorPlanRouter,

  // Webhook Escalation Rules
  webhookEscalation: router({
    // List all escalation rules
    list: protectedProcedure.query(async () => {
      const { getEscalationRules } = await import('./db');
      return await getEscalationRules();
    }),

    // Get single rule by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getEscalationRuleById } = await import('./db');
        return await getEscalationRuleById(input.id);
      }),

    // Create new escalation rule
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sourceWebhookId: z.number(),
        triggerAfterFailures: z.number().default(3),
        triggerAfterMinutes: z.number().default(15),
        level1Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).default([]),
        level1DelayMinutes: z.number().default(0),
        level2Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).optional(),
        level2DelayMinutes: z.number().default(15),
        level3Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).optional(),
        level3DelayMinutes: z.number().default(30),
        autoResolveOnSuccess: z.boolean().default(true),
        notifyOnEscalate: z.boolean().default(true),
        notifyOnResolve: z.boolean().default(true),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createEscalationRule } = await import('./db');
        const id = await createEscalationRule({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    // Update escalation rule
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        triggerAfterFailures: z.number().optional(),
        triggerAfterMinutes: z.number().optional(),
        level1Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).optional(),
        level1DelayMinutes: z.number().optional(),
        level2Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).optional(),
        level2DelayMinutes: z.number().optional(),
        level3Targets: z.array(z.object({
          type: z.enum(['webhook', 'email']),
          value: z.string(),
        })).optional(),
        level3DelayMinutes: z.number().optional(),
        autoResolveOnSuccess: z.boolean().optional(),
        notifyOnEscalate: z.boolean().optional(),
        notifyOnResolve: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateEscalationRule } = await import('./db');
        const { id, ...data } = input;
        await updateEscalationRule(id, data);
        return { success: true };
      }),

    // Delete escalation rule
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteEscalationRule } = await import('./db');
        await deleteEscalationRule(input.id);
        return { success: true };
      }),

    // Get escalation logs
    getLogs: protectedProcedure
      .input(z.object({
        ruleId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const { getEscalationLogs } = await import('./db');
        return await getEscalationLogs(input);
      }),

    // Get pending escalations
    getPending: protectedProcedure.query(async () => {
      const { getPendingEscalations } = await import('./db');
      return await getPendingEscalations();
    }),

    // Resolve escalation
    resolve: protectedProcedure
      .input(z.object({
        id: z.number(),
        resolutionNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateEscalationLog } = await import('./db');
        await updateEscalationLog(input.id, {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
          resolutionNote: input.resolutionNote,
        });
        return { success: true };
      }),

    // Acknowledge escalation
    acknowledge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { updateEscalationLog } = await import('./db');
        await updateEscalationLog(input.id, {
          status: 'acknowledged',
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.user.id,
        });
        return { success: true };
      }),
  }),

  // Latency Monitoring
  latency: router({
    // Record latency metric
    record: protectedProcedure
      .input(z.object({
        sourceType: z.enum(['iot_device', 'webhook', 'api', 'database', 'mqtt']),
        sourceId: z.string(),
        sourceName: z.string().optional(),
        latencyMs: z.number(),
        endpoint: z.string().optional(),
        statusCode: z.number().optional(),
        isSuccess: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const { recordLatencyMetric } = await import('./db');
        const id = await recordLatencyMetric(input);
        return { id };
      }),

    // Get heatmap data
    getHeatmap: protectedProcedure
      .input(z.object({
        sourceType: z.string().optional(),
        sourceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const { getLatencyHeatmapData } = await import('./db');
        return await getLatencyHeatmapData(input);
      }),

    // Get latency statistics
    getStats: protectedProcedure
      .input(z.object({
        sourceType: z.string().optional(),
        sourceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const { getLatencyStats } = await import('./db');
        return await getLatencyStats(input);
      }),

    // Get time series data
    getTimeSeries: protectedProcedure
      .input(z.object({
        sourceType: z.string().optional(),
        sourceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        interval: z.enum(['hour', 'day', 'week']).default('hour'),
      }))
      .query(async ({ input }) => {
        const { getLatencyTimeSeries } = await import('./db');
        return await getLatencyTimeSeries(input);
      }),

    // Get all sources
    getSources: protectedProcedure.query(async () => {
      const { getLatencySources } = await import('./db');
      return await getLatencySources();
    }),

    // Get percentile trends (P50, P95, P99)
    getPercentileTrends: protectedProcedure
      .input(z.object({
        sourceType: z.string().optional(),
        sourceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        interval: z.enum(['hour', 'day', 'week']).default('hour'),
      }))
      .query(async ({ input }) => {
        const { getLatencyPercentileTrends } = await import('./db');
        return await getLatencyPercentileTrends(input);
      }),
  }),

  // ============================================
  // Phase 98: IoT Enhancement - 3D Model Upload, Work Order Notifications, MTTR/MTBF Report
  // ============================================

  // 3D Model Management Router
  model3d: router({
    // Get all 3D models
    getAll: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await get3dModels(input || {});
      }),

    // Get single 3D model
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await get3dModelById(input.id);
      }),

    // Create 3D model
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(['machine', 'equipment', 'building', 'zone', 'furniture', 'custom']).optional(),
        modelUrl: z.string().url(),
        modelFormat: z.enum(['gltf', 'glb']).optional(),
        thumbnailUrl: z.string().optional(),
        fileSize: z.number().optional(),
        defaultScale: z.number().optional(),
        defaultRotationX: z.number().optional(),
        defaultRotationY: z.number().optional(),
        defaultRotationZ: z.number().optional(),
        boundingBoxWidth: z.number().optional(),
        boundingBoxHeight: z.number().optional(),
        boundingBoxDepth: z.number().optional(),
        manufacturer: z.string().optional(),
        modelNumber: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.any().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await create3dModel({
          ...input,
          uploadedBy: ctx.user?.id,
        });
      }),

    // Update 3D model
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(['machine', 'equipment', 'building', 'zone', 'furniture', 'custom']).optional(),
        modelUrl: z.string().url().optional(),
        modelFormat: z.enum(['gltf', 'glb']).optional(),
        thumbnailUrl: z.string().optional(),
        fileSize: z.number().optional(),
        defaultScale: z.number().optional(),
        defaultRotationX: z.number().optional(),
        defaultRotationY: z.number().optional(),
        defaultRotationZ: z.number().optional(),
        boundingBoxWidth: z.number().optional(),
        boundingBoxHeight: z.number().optional(),
        boundingBoxDepth: z.number().optional(),
        manufacturer: z.string().optional(),
        modelNumber: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.any().optional(),
        isPublic: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await update3dModel(id, data);
      }),

    // Delete 3D model
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await delete3dModel(input.id);
      }),

    // Upload 3D model file to S3
    uploadFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        contentType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `3d-models/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url, fileKey, fileSize: buffer.length };
      }),

    // Get instances for a floor plan
    getInstances: protectedProcedure
      .input(z.object({ floorPlan3dId: z.number() }))
      .query(async ({ input }) => {
        return await get3dModelInstances(input.floorPlan3dId);
      }),

    // Create instance
    createInstance: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        floorPlan3dId: z.number(),
        deviceId: z.number().optional(),
        machineId: z.number().optional(),
        name: z.string().optional(),
        positionX: z.number(),
        positionY: z.number(),
        positionZ: z.number(),
        rotationX: z.number().optional(),
        rotationY: z.number().optional(),
        rotationZ: z.number().optional(),
        scaleX: z.number().optional(),
        scaleY: z.number().optional(),
        scaleZ: z.number().optional(),
        visible: z.boolean().optional(),
        opacity: z.number().optional(),
        wireframe: z.boolean().optional(),
        castShadow: z.boolean().optional(),
        receiveShadow: z.boolean().optional(),
        clickable: z.boolean().optional(),
        tooltip: z.string().optional(),
        popupContent: z.string().optional(),
        animationEnabled: z.boolean().optional(),
        animationType: z.enum(['none', 'rotate', 'pulse', 'bounce', 'custom']).optional(),
        animationSpeed: z.number().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        return await create3dModelInstance(input);
      }),

    // Update instance
    updateInstance: protectedProcedure
      .input(z.object({
        id: z.number(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        positionZ: z.number().optional(),
        rotationX: z.number().optional(),
        rotationY: z.number().optional(),
        rotationZ: z.number().optional(),
        scaleX: z.number().optional(),
        scaleY: z.number().optional(),
        scaleZ: z.number().optional(),
        visible: z.boolean().optional(),
        opacity: z.number().optional(),
        wireframe: z.boolean().optional(),
        castShadow: z.boolean().optional(),
        receiveShadow: z.boolean().optional(),
        clickable: z.boolean().optional(),
        tooltip: z.string().optional(),
        popupContent: z.string().optional(),
        animationEnabled: z.boolean().optional(),
        animationType: z.enum(['none', 'rotate', 'pulse', 'bounce', 'custom']).optional(),
        animationSpeed: z.number().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await update3dModelInstance(id, data);
      }),

    // Delete instance
    deleteInstance: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await delete3dModelInstance(input.id);
      }),
  }),

  // Work Order Notification Router
  workOrderNotification: router({
    // Get technician notification preferences
    getPrefs: protectedProcedure
      .input(z.object({ technicianId: z.number() }))
      .query(async ({ input }) => {
        return await getTechnicianNotificationPrefs(input.technicianId);
      }),

    // Update technician notification preferences
    updatePrefs: protectedProcedure
      .input(z.object({
        technicianId: z.number(),
        pushEnabled: z.boolean().optional(),
        pushToken: z.string().optional(),
        pushPlatform: z.enum(['web', 'android', 'ios']).optional(),
        smsEnabled: z.boolean().optional(),
        phoneNumber: z.string().optional(),
        phoneCountryCode: z.string().optional(),
        emailEnabled: z.boolean().optional(),
        email: z.string().email().optional(),
        notifyNewWorkOrder: z.boolean().optional(),
        notifyAssigned: z.boolean().optional(),
        notifyStatusChange: z.boolean().optional(),
        notifyDueSoon: z.boolean().optional(),
        notifyOverdue: z.boolean().optional(),
        notifyComment: z.boolean().optional(),
        minPriorityForPush: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        minPriorityForSms: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { technicianId, ...data } = input;
        return await upsertTechnicianNotificationPrefs(technicianId, data);
      }),

    // Get notifications for a work order
    getByWorkOrder: protectedProcedure
      .input(z.object({ workOrderId: z.number() }))
      .query(async ({ input }) => {
        return await getWorkOrderNotifications(input.workOrderId);
      }),

    // Send notification (internal use)
    send: protectedProcedure
      .input(z.object({
        workOrderId: z.number(),
        technicianId: z.number(),
        notificationType: z.enum(['new_work_order', 'assigned', 'status_change', 'due_soon', 'overdue', 'comment', 'escalation']),
        channel: z.enum(['push', 'sms', 'email']),
        title: z.string(),
        message: z.string(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createWorkOrderNotification(input);
      }),

    // Update notification status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'sent', 'delivered', 'failed', 'read']),
        externalMessageId: z.string().optional(),
        failureReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await updateNotificationStatus(input.id, input.status, input.externalMessageId, input.failureReason);
      }),

    // Get SMS config
    getSmsConfig: protectedProcedure.query(async () => {
      return await getSmsConfig();
    }),

    // Update SMS config
    updateSmsConfig: protectedProcedure
      .input(z.object({
        provider: z.enum(['twilio', 'nexmo', 'aws_sns']).optional(),
        accountSid: z.string().optional(),
        authToken: z.string().optional(),
        fromNumber: z.string().optional(),
        maxSmsPerDay: z.number().optional(),
        maxSmsPerHour: z.number().optional(),
        cooldownMinutes: z.number().optional(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await upsertSmsConfig(input);
      }),

    // Get Push config
    getPushConfig: protectedProcedure.query(async () => {
      return await getPushConfig();
    }),

    // Update Push config
    updatePushConfig: protectedProcedure
      .input(z.object({
        provider: z.enum(['firebase', 'onesignal', 'pusher']).optional(),
        projectId: z.string().optional(),
        serverKey: z.string().optional(),
        vapidPublicKey: z.string().optional(),
        vapidPrivateKey: z.string().optional(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await upsertPushConfig(input);
      }),

    // Test SMS configuration
    testSms: protectedProcedure
      .input(z.object({ phoneNumber: z.string() }))
      .mutation(async ({ input }) => {
        const { workOrderNotificationService } = await import('./workOrderNotificationService');
        return await workOrderNotificationService.testSmsConfig(input.phoneNumber);
      }),

    // Test Push configuration
    testPush: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const { workOrderNotificationService } = await import('./workOrderNotificationService');
        return await workOrderNotificationService.testPushConfig(input.token);
      }),

    // Send notification to technician
    sendNotification: protectedProcedure
      .input(z.object({
        workOrderId: z.number(),
        technicianId: z.number(),
        notificationType: z.enum(['new_work_order', 'assigned', 'status_change', 'due_soon', 'overdue', 'comment', 'escalation']),
        title: z.string(),
        message: z.string(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { workOrderNotificationService } = await import('./workOrderNotificationService');
        return await workOrderNotificationService.sendNotification(input);
      }),

    // Trigger scheduled notification check (admin only)
    triggerScheduledCheck: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
        }
        const { triggerWorkOrderNotificationCheck } = await import('./scheduledJobs');
        return await triggerWorkOrderNotificationCheck();
      }),
  }),

  // MTTR/MTBF Report Router
  mttrMtbf: router({
    // Get MTTR/MTBF statistics
    getStats: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await getMttrMtbfStats(input);
      }),

    // Calculate and create MTTR/MTBF stats for a period
    calculate: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        periodType: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
        periodStart: z.date(),
        periodEnd: z.date(),
      }))
      .mutation(async ({ input }) => {
        // Calculate MTTR/MTBF from failure events
        const mttrMtbfData = await calculateMttrMtbf(
          input.targetType,
          input.targetId,
          input.periodStart,
          input.periodEnd
        );

        if (!mttrMtbfData) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to calculate MTTR/MTBF' });
        }

        // Get work order counts
        const workOrderCounts = await getWorkOrderCountsByType(
          input.targetType,
          input.targetId,
          input.periodStart,
          input.periodEnd
        );

        // Create stats record
        return await createMttrMtbfStats({
          targetType: input.targetType,
          targetId: input.targetId,
          periodType: input.periodType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          ...mttrMtbfData,
          ...workOrderCounts,
        });
      }),

    // Get failure events
    getFailureEvents: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']).optional(),
        targetId: z.number().optional(),
        workOrderId: z.number().optional(),
        failureType: z.enum(['breakdown', 'degradation', 'intermittent', 'planned_stop']).optional(),
        severity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getFailureEvents(input);
      }),

    // Create failure event
    createFailureEvent: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        workOrderId: z.number().optional(),
        failureCode: z.string().optional(),
        failureType: z.enum(['breakdown', 'degradation', 'intermittent', 'planned_stop']).optional(),
        severity: z.enum(['minor', 'moderate', 'major', 'critical']).optional(),
        description: z.string().optional(),
        failureStartAt: z.date(),
        failureEndAt: z.date().optional(),
        repairStartAt: z.date().optional(),
        repairEndAt: z.date().optional(),
        downtimeDuration: z.number().optional(),
        repairDuration: z.number().optional(),
        waitingDuration: z.number().optional(),
        rootCauseCategory: z.enum(['mechanical', 'electrical', 'software', 'operator_error', 'wear', 'environmental', 'unknown']).optional(),
        rootCause: z.string().optional(),
        resolutionType: z.enum(['repair', 'replace', 'adjust', 'reset', 'other']).optional(),
        resolution: z.string().optional(),
        previousFailureId: z.number().optional(),
        timeSincePreviousFailure: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await createFailureEvent({
          ...input,
          reportedBy: ctx.user?.id,
        });
      }),

    // Update failure event
    updateFailureEvent: protectedProcedure
      .input(z.object({
        id: z.number(),
        failureEndAt: z.date().optional(),
        repairStartAt: z.date().optional(),
        repairEndAt: z.date().optional(),
        downtimeDuration: z.number().optional(),
        repairDuration: z.number().optional(),
        waitingDuration: z.number().optional(),
        rootCauseCategory: z.enum(['mechanical', 'electrical', 'software', 'operator_error', 'wear', 'environmental', 'unknown']).optional(),
        rootCause: z.string().optional(),
        resolutionType: z.enum(['repair', 'replace', 'adjust', 'reset', 'other']).optional(),
        resolution: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await updateFailureEvent(id, {
          ...data,
          verifiedBy: ctx.user?.id,
        });
      }),

    // Get summary report
    getSummaryReport: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        // Get MTTR/MTBF data
        const mttrMtbfData = await calculateMttrMtbf(
          input.targetType,
          input.targetId,
          input.startDate,
          input.endDate
        );

        // Get work order counts
        const workOrderCounts = await getWorkOrderCountsByType(
          input.targetType,
          input.targetId,
          input.startDate,
          input.endDate
        );

        // Get failure events
        const failureEvents = await getFailureEvents({
          targetType: input.targetType,
          targetId: input.targetId,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        // Get historical stats for trend
        const historicalStats = await getMttrMtbfStats({
          targetType: input.targetType,
          targetId: input.targetId,
          startDate: new Date(input.startDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days before
          endDate: input.endDate,
        });

        return {
          current: {
            ...mttrMtbfData,
            ...workOrderCounts,
          },
          failureEvents,
          historicalStats,
          period: {
            start: input.startDate,
            end: input.endDate,
          },
        };
      }),

    // Compare MTTR/MTBF across multiple targets
    compare: protectedProcedure
      .input(z.object({
        targets: z.array(z.object({
          targetType: z.enum(['device', 'machine', 'production_line']),
          targetId: z.number(),
          name: z.string(),
        })),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const results = await Promise.all(
          input.targets.map(async (target) => {
            const mttrMtbfData = await calculateMttrMtbf(
              target.targetType,
              target.targetId,
              input.startDate,
              input.endDate
            );
            const workOrderCounts = await getWorkOrderCountsByType(
              target.targetType,
              target.targetId,
              input.startDate,
              input.endDate
            );
            return {
              ...target,
              ...mttrMtbfData,
              ...workOrderCounts,
            };
          })
        );
        return results;
      }),

    // Export to Excel
    exportExcel: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        targetName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { mttrMtbfExportService } = await import('./mttrMtbfExportService');
        const buffer = await mttrMtbfExportService.exportToExcel(
          input.targetType,
          input.targetId,
          input.startDate,
          input.endDate,
          input.targetName
        );
        return {
          data: buffer.toString('base64'),
          filename: `mttr-mtbf-report-${input.targetType}-${input.targetId}-${Date.now()}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      }),

    // Export to PDF
    exportPdf: protectedProcedure
      .input(z.object({
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        targetName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { mttrMtbfExportService } = await import('./mttrMtbfExportService');
        const buffer = await mttrMtbfExportService.exportToPdf(
          input.targetType,
          input.targetId,
          input.startDate,
          input.endDate,
          input.targetName
        );
        return {
          data: buffer.toString('base64'),
          filename: `mttr-mtbf-report-${input.targetType}-${input.targetId}-${Date.now()}.pdf`,
          contentType: 'application/pdf',
        };
      }),
  }),

  // Scheduled MTTR/MTBF Reports Router
  scheduledMttrMtbf: router({
    // Get all scheduled configs
    getConfigs: protectedProcedure
      .query(async ({ ctx }) => {
        const { getScheduledMttrMtbfConfigs } = await import('./services/scheduledMttrMtbfService');
        return getScheduledMttrMtbfConfigs(ctx.user?.id);
      }),

    // Create new scheduled config
    createConfig: protectedProcedure
      .input(z.object({
        name: z.string().min(1, 'Tên không được để trống'),
        targetType: z.enum(['device', 'machine', 'production_line']),
        targetId: z.number(),
        targetName: z.string(),
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        timeOfDay: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        recipients: z.array(z.string().email()),
        format: z.enum(['excel', 'pdf', 'both']),
        notificationChannel: z.enum(['email', 'telegram', 'both']).default('email'),
        telegramConfigId: z.number().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createScheduledMttrMtbfConfig } = await import('./services/scheduledMttrMtbfService');
        const id = await createScheduledMttrMtbfConfig({
          ...input,
          createdBy: ctx.user?.id,
        });
        if (!id) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Không thể tạo cấu hình' });
        }
        return { id };
      }),

    // Update scheduled config
    updateConfig: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        targetType: z.enum(['device', 'machine', 'production_line']).optional(),
        targetId: z.number().optional(),
        targetName: z.string().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        dayOfWeek: z.number().min(0).max(6).optional().nullable(),
        dayOfMonth: z.number().min(1).max(31).optional().nullable(),
        timeOfDay: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        recipients: z.array(z.string().email()).optional(),
        format: z.enum(['excel', 'pdf', 'both']).optional(),
        notificationChannel: z.enum(['email', 'telegram', 'both']).optional(),
        telegramConfigId: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateScheduledMttrMtbfConfig } = await import('./services/scheduledMttrMtbfService');
        const { id, ...data } = input;
        const success = await updateScheduledMttrMtbfConfig(id, data as any);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Không thể cập nhật cấu hình' });
        }
        return { success: true };
      }),

    // Delete scheduled config
    deleteConfig: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteScheduledMttrMtbfConfig } = await import('./services/scheduledMttrMtbfService');
        const success = await deleteScheduledMttrMtbfConfig(input.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Không thể xóa cấu hình' });
        }
        return { success: true };
      }),

    // Send report manually
    sendNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getScheduledMttrMtbfConfigs, sendScheduledMttrMtbfReport, updateScheduledMttrMtbfConfig } = await import('./services/scheduledMttrMtbfService');
        const configs = await getScheduledMttrMtbfConfigs();
        const config = configs.find(c => c.id === input.id);
        if (!config) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy cấu hình' });
        }
        const result = await sendScheduledMttrMtbfReport(config);
        await updateScheduledMttrMtbfConfig(input.id, {
          lastSentAt: new Date().toISOString(),
          lastSentStatus: result.success ? 'success' : 'failed',
          lastSentError: result.error,
        });
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Lỗi gửi báo cáo' });
        }
        return { success: true };
      }),
  }),

  // MTTR/MTBF Comparison Export
  mttrMtbfComparison: mttrMtbfComparisonRouter,

  // MTTR/MTBF Alert Thresholds
  mttrMtbfAlert: mttrMtbfAlertRouter,

  // MTTR/MTBF AI Prediction
  mttrMtbfPrediction: mttrMtbfPredictionRouter,
  // OEE Thresholds by Production Line
  oeeThresholds: oeeThresholdsRouter,

  // Phase 14 - Edge Gateway, TimescaleDB, Anomaly Detection
  edgeGateway: edgeGatewayRouter,
  aiRootCause: aiRootCauseRouter,
  timeseries: timeseriesRouter,
  anomalyDetectionAI: anomalyDetectionRouter,

  // Phase 17 - Alert System, Edge Simulator, Auto-Retraining
  anomalyAlert: anomalyAlertRouter,
  edgeSimulator: edgeGatewaySimulatorRouter,
  modelAutoRetrain: modelAutoRetrainingRouter,

  // Phase 22 - CPK Alert Management
  cpkAlert: cpkAlertRouter,
  scheduledCpkCheck: scheduledCpkCheckRouter,

  // Phase 10 - Quality Images & Alert Email
  qualityImage: qualityImageRouter,
  alertEmail: alertEmailRouter,

  // Phase 10 - Auto-capture, Webhook Notification, Quality Trend Reports
  autoCapture: autoCaptureRouter,
  unifiedWebhook: unifiedWebhookRouter,
  qualityTrend: qualityTrendRouter,
  webhookTemplate: webhookTemplateRouter,

  // Phase 10 - Scheduled Reports, AI Vision Dashboard, Line Comparison
  scheduledReport: scheduledReportRouter,
  aiVisionDashboard: aiVisionDashboardRouter,
  lineComparison: lineComparisonRouter,

  // Phase 72 - Custom Widgets, Camera Integration, SN Images
  customWidget: customWidgetRouter,
  cameraConfig: cameraConfigRouter,
  snImage: snImageRouter,
  cameraSession: cameraSessionRouter,
  imageAnnotation: imageAnnotationRouter,
  aiImageComparison: aiImageComparisonRouter,
  wsMonitor: router({
    stats: protectedProcedure.query(async () => {
      const { wsServer } = await import("./websocket");
      return wsServer.getDetailedStats();
    }),
    eventLog: protectedProcedure.input(z.object({ limit: z.number().min(10).max(200).default(50) })).query(async ({ input }) => {
      const { wsServer } = await import("./websocket");
      return wsServer.getEventLog(input.limit);
    }),
    rooms: protectedProcedure.query(async () => {
      const { wsServer } = await import("./websocket");
      const rooms = wsServer.getRooms();
      return Object.fromEntries(rooms);
    }),
    clientsInRoom: protectedProcedure.input(z.object({ room: z.string() })).query(async ({ input }) => {
      const { wsServer } = await import("./websocket");
      return wsServer.getClientsInRoom(input.room);
    }),
    broadcast: protectedProcedure.input(z.object({ type: z.string(), data: z.any(), room: z.string().optional(), userId: z.string().optional() })).mutation(async ({ input }) => {
      const { wsServer } = await import("./websocket");
      let count = 0;
      if (input.userId) count = wsServer.broadcastToUser(input.userId, input.type, input.data);
      else if (input.room) count = wsServer.broadcastToRoom(input.room, input.type, input.data);
      else count = wsServer.broadcastAll(input.type, input.data);
      return { sent: count };
    }),
    clearEventLog: protectedProcedure.mutation(async () => {
      const { wsServer } = await import("./websocket");
      wsServer.clearEventLog();
      return { success: true };
    }),
  }),
  customAlert: router({
    list: protectedProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(20), metricType: z.string().optional(), severity: z.string().optional(), isActive: z.boolean().optional() })).query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [];
      if (input.metricType) conditions.push(eq(customAlertRules.metricType, input.metricType));
      if (input.severity) conditions.push(eq(customAlertRules.severity, input.severity));
      if (input.isActive !== undefined) conditions.push(eq(customAlertRules.isActive, input.isActive));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(customAlertRules).where(where);
      const rules = await db.select().from(customAlertRules).where(where).orderBy(desc(customAlertRules.createdAt)).limit(input.limit).offset((input.page - 1) * input.limit);
      return { rules, total: total?.count ?? 0, page: input.page, totalPages: Math.ceil((total?.count ?? 0) / input.limit) };
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      const [rule] = await db.select().from(customAlertRules).where(eq(customAlertRules.id, input.id));
      return rule ?? null;
    }),
    create: protectedProcedure.input(z.object({ name: z.string().min(1), description: z.string().optional(), metricType: z.string(), operator: z.string(), threshold: z.number(), thresholdMax: z.number().optional(), severity: z.string().default("warning"), evaluationIntervalMinutes: z.number().default(5), cooldownMinutes: z.number().default(30), consecutiveBreachesRequired: z.number().default(1), notificationChannels: z.string().optional(), recipients: z.string().optional(), webhookUrl: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const now = Date.now();
      const [result] = await db.insert(customAlertRules).values({ ...input, createdBy: ctx.user?.openId ?? "system", createdAt: now, updatedAt: now });
      return { id: result.insertId, success: true };
    }),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), metricType: z.string().optional(), operator: z.string().optional(), threshold: z.number().optional(), thresholdMax: z.number().optional(), severity: z.string().optional(), evaluationIntervalMinutes: z.number().optional(), cooldownMinutes: z.number().optional(), consecutiveBreachesRequired: z.number().optional(), notificationChannels: z.string().optional(), recipients: z.string().optional(), webhookUrl: z.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db.update(customAlertRules).set({ ...data, updatedAt: Date.now() }).where(eq(customAlertRules.id, id));
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(customAlertRules).where(eq(customAlertRules.id, input.id));
      return { success: true };
    }),
    toggle: protectedProcedure.input(z.object({ id: z.number(), isActive: z.boolean() })).mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(customAlertRules).set({ isActive: input.isActive, updatedAt: Date.now() }).where(eq(customAlertRules.id, input.id));
      return { success: true };
    }),
    evaluate: protectedProcedure.mutation(async () => {
      const { evaluateAllRules } = await import("./services/customAlertEngine");
      return evaluateAllRules();
    }),
    history: protectedProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(20), ruleId: z.number().optional(), severity: z.string().optional(), status: z.string().optional() })).query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [];
      if (input.ruleId) conditions.push(eq(customAlertHistory.ruleId, input.ruleId));
      if (input.severity) conditions.push(eq(customAlertHistory.severity, input.severity));
      if (input.status) conditions.push(eq(customAlertHistory.status, input.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(customAlertHistory).where(where);
      const alerts = await db.select().from(customAlertHistory).where(where).orderBy(desc(customAlertHistory.triggeredAt)).limit(input.limit).offset((input.page - 1) * input.limit);
      return { alerts, total: total?.count ?? 0, page: input.page, totalPages: Math.ceil((total?.count ?? 0) / input.limit) };
    }),
    stats: protectedProcedure.query(async () => {
      const { getAlertStats } = await import("./services/customAlertEngine");
      return getAlertStats();
    }),
    acknowledge: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(customAlertHistory).set({ status: "acknowledged", acknowledgedAt: Date.now(), acknowledgedBy: ctx.user?.name ?? "admin" }).where(eq(customAlertHistory.id, input.id));
      return { success: true };
    }),
    resolve: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(customAlertHistory).set({ status: "resolved", resolvedAt: Date.now(), resolvedBy: ctx.user?.name ?? "admin" }).where(eq(customAlertHistory.id, input.id));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
