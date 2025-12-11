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
      isRecurring: z.boolean().optional(),
      notifyOnViolation: z.boolean().optional(),
      notifyEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await createSpcSamplingPlan({ ...input, createdBy: ctx.user.id });
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
      isRecurring: z.boolean().optional(),
      notifyOnViolation: z.boolean().optional(),
      notifyEmail: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSpcSamplingPlan(id, data);
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
  spcPlan: spcPlanRouter,
  userLine: userLineRouter,
  emailNotification: emailNotificationRouter,
});

export type AppRouter = typeof appRouter;
