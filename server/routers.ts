import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
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
} from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { generateCsvContent, generateHtmlReport, ExportData } from "./exportUtils";
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

  user: userRouter,
  product: productRouter,
  productSpec: productSpecRouter,
  databaseConnection: databaseConnectionRouter,
  mapping: mappingRouter,
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
});

export type AppRouter = typeof appRouter;
