import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
} from "./localAuthService";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
} from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
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

  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});

// Product Router
const productRouter = router({
  list: protectedProcedure.query(async () => {
    return await getProducts();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getProductById(input.id);
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
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
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

// Database Connection Router
const databaseConnectionRouter = router({
  list: adminProcedure.query(async () => {
    return await getDatabaseConnections();
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getDatabaseConnectionById(input.id);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      connectionString: z.string().min(1),
      databaseType: z.string().default("mysql"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createDatabaseConnection({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      connectionString: z.string().min(1).optional(),
      databaseType: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDatabaseConnection(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDatabaseConnection(input.id);
      return { success: true };
    }),

  testConnection: adminProcedure
    .input(z.object({ connectionString: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await queryExternalDatabase(input.connectionString, "SELECT 1");
        return { success: true, message: "Connection successful" };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
      }
    }),

  // Lấy danh sách bảng từ database connection
  getTables: adminProcedure
    .input(z.object({ connectionId: z.number() }))
    .query(async ({ input }) => {
      const connection = await getDatabaseConnectionById(input.connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }
      try {
        // Query to get table names based on database type
        let query = "";
        if (connection.databaseType === "mysql" || connection.databaseType === "mariadb") {
          query = "SHOW TABLES";
        } else if (connection.databaseType === "postgresql") {
          query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'";
        } else if (connection.databaseType === "mssql") {
          query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
        } else {
          query = "SHOW TABLES"; // Default to MySQL syntax
        }
        
        const result = await queryExternalDatabase(connection.connectionString, query);
        // Extract table names from result
        const tables = result.map((row: Record<string, unknown>) => {
          const values = Object.values(row);
          return values[0] as string;
        });
        return { tables };
      } catch (error) {
        throw new Error(`Failed to get tables: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  // Lấy danh sách cột từ bảng
  getColumns: adminProcedure
    .input(z.object({ connectionId: z.number(), tableName: z.string() }))
    .query(async ({ input }) => {
      const connection = await getDatabaseConnectionById(input.connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }
      try {
        let query = "";
        if (connection.databaseType === "mysql" || connection.databaseType === "mariadb") {
          query = `DESCRIBE \`${input.tableName}\``;
        } else if (connection.databaseType === "postgresql") {
          query = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${input.tableName}'`;
        } else if (connection.databaseType === "mssql") {
          query = `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${input.tableName}'`;
        } else {
          query = `DESCRIBE \`${input.tableName}\``;
        }
        
        const result = await queryExternalDatabase(connection.connectionString, query);
        // Extract column info from result
        const columns = result.map((row: Record<string, unknown>) => {
          if (connection.databaseType === "mysql" || connection.databaseType === "mariadb") {
            return {
              name: row.Field as string,
              type: row.Type as string,
            };
          } else {
            return {
              name: (row.column_name || row.COLUMN_NAME) as string,
              type: (row.data_type || row.DATA_TYPE) as string,
            };
          }
        });
        return { columns };
      } catch (error) {
        throw new Error(`Failed to get columns: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  // Test connection by ID
  testConnectionById: adminProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ input }) => {
      const connection = await getDatabaseConnectionById(input.connectionId);
      if (!connection) {
        return { success: false, message: "Connection not found" };
      }
      try {
        await queryExternalDatabase(connection.connectionString, "SELECT 1");
        return { success: true, message: "Kết nối thành công!", databaseType: connection.databaseType };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Kết nối thất bại" };
      }
    }),

  // Preview data from table with filter conditions
  previewData: adminProcedure
    .input(z.object({
      connectionId: z.number(),
      tableName: z.string(),
      columns: z.array(z.string()).optional(),
      filterConditions: z.array(z.object({
        column: z.string(),
        operator: z.enum(["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"]),
        value: z.string(),
      })).optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const connection = await getDatabaseConnectionById(input.connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }
      try {
        // Build SELECT columns
        const selectColumns = input.columns && input.columns.length > 0
          ? input.columns.map(c => `\`${c}\``).join(", ")
          : "*";
        
        // Build WHERE clause from filter conditions
        let whereClause = "";
        if (input.filterConditions && input.filterConditions.length > 0) {
          const conditions = input.filterConditions.map(fc => {
            if (fc.operator === "IN") {
              const values = fc.value.split(",").map(v => `'${v.trim()}'`).join(", ");
              return `\`${fc.column}\` IN (${values})`;
            } else if (fc.operator === "LIKE") {
              return `\`${fc.column}\` LIKE '${fc.value}'`;
            } else {
              // Check if value is numeric
              const numValue = parseFloat(fc.value);
              if (!isNaN(numValue)) {
                return `\`${fc.column}\` ${fc.operator} ${numValue}`;
              }
              return `\`${fc.column}\` ${fc.operator} '${fc.value}'`;
            }
          });
          whereClause = " WHERE " + conditions.join(" AND ");
        }
        
        const query = `SELECT ${selectColumns} FROM \`${input.tableName}\`${whereClause} LIMIT ${input.limit}`;
        const result = await queryExternalDatabase(connection.connectionString, query);
        
        return {
          data: result,
          query: query,
          rowCount: result.length,
        };
      } catch (error) {
        throw new Error(`Failed to preview data: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
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
          connection.connectionString,
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

      // Store analysis history
      const historyId = await createSpcAnalysisHistory({
        mappingId: mapping.id,
        productCode: input.productCode,
        stationName: input.stationName,
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
          connection.connectionString,
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
        stationName: mapping.stationName,
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { startTime, endTime, ...rest } = input;
      return await createSpcSamplingPlan({ 
        ...rest, 
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
    }))
    .mutation(async ({ input }) => {
      const { id, startTime, endTime, ...data } = input;
      await updateSpcSamplingPlan(id, {
        ...data,
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

// Machine Type Router - Quản lý loại máy
const machineTypeRouter = router({
  list: protectedProcedure.query(async () => {
    return await getMachineTypes();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getMachineTypeById(input.id);
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
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteMachineType(input.id);
      return { success: true };
    }),
});

// Fixture Router - Quản lý Fixture
const fixtureRouter = router({
  list: protectedProcedure
    .input(z.object({ machineId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getFixtures(input?.machineId);
    }),

  listWithMachineInfo: protectedProcedure.query(async () => {
    return await getFixturesWithMachineInfo();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getFixtureById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      code: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createFixture({
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
      position: z.number().optional(),
      status: z.enum(["active", "maintenance", "inactive"]).optional(),
      installDate: z.date().optional(),
      lastMaintenanceDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateFixture(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFixture(input.id);
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
  system: systemRouter,
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
        return result;
      }),

    // Login with local credentials
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await loginLocalUser(input);
        if (!result.success) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: result.error });
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
        role: z.enum(['user', 'admin']).optional(),
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
  }),

  user: userRouter,
  product: productRouter,
  productSpec: productSpecRouter,
  databaseConnection: databaseConnectionRouter,
  mapping: mappingRouter,
  mappingTemplate: mappingTemplateRouter,
  spc: spcRouter,
  alert: alertRouter,
  export: exportRouter,
  productionLine: productionLineRouter,
  workstation: workstationRouter,
  machine: machineRouter,
  spcRules: spcRulesRouter,
  sampling: samplingRouter,
  dashboard: dashboardRouter,
  report: reportRouter,
  dashboardConfig: dashboardConfigRouter,
  spcPlan: spcPlanRouter,
  userLine: userLineRouter,
  emailNotification: emailNotificationRouter,
  permission: permissionRouter,
  defect: defectRouter,
  machineType: machineTypeRouter,
  fixture: fixtureRouter,

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
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        const licenseKey = input.licenseKey || generateLicenseKey();
        await createLicense({
          ...input,
          licenseKey,
          isActive: 0,
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
  }),
});

export type AppRouter = typeof appRouter;
