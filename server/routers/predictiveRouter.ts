import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  sensorData, predictionModels, predictions, machines, machineSensors, sensorTypes
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";

export const predictiveRouter = router({
  // Sensor Data
  listSensorData: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      sensorId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(1000),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) conditions.push(eq(sensorData.machineId, input.machineId));
      if (input.sensorId) conditions.push(eq(sensorData.sensorId, input.sensorId));
      if (input.startDate) conditions.push(gte(sensorData.recordedAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(sensorData.recordedAt, new Date(input.endDate)));

      return db
        .select({
          id: sensorData.id,
          machineId: sensorData.machineId,
          machineName: machines.name,
          sensorId: sensorData.sensorId,
          sensorCode: machineSensors.sensorCode,
          sensorTypeName: sensorTypes.name,
          value: sensorData.value,
          status: sensorData.status,
          recordedAt: sensorData.recordedAt,
        })
        .from(sensorData)
        .leftJoin(machines, eq(sensorData.machineId, machines.id))
        .leftJoin(machineSensors, eq(sensorData.sensorId, machineSensors.id))
        .leftJoin(sensorTypes, eq(machineSensors.sensorTypeId, sensorTypes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sensorData.recordedAt))
        .limit(input.limit);
    }),

  createSensorData: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      sensorId: z.number(),
      value: z.number(),
      status: z.enum(["normal", "warning", "critical"]).optional(),
      recordedAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(sensorData).values({
        machineId: input.machineId,
        sensorId: input.sensorId,
        value: String(input.value),
        status: input.status || "normal",
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      }).$returningId();

      return { id: result.id };
    }),

  // Batch insert sensor data
  batchCreateSensorData: protectedProcedure
    .input(z.object({
      data: z.array(z.object({
        machineId: z.number(),
        sensorId: z.number(),
        value: z.number(),
        status: z.enum(["normal", "warning", "critical"]).optional(),
        recordedAt: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const values = input.data.map(d => ({
        machineId: d.machineId,
        sensorId: d.sensorId,
        value: String(d.value),
        status: d.status || "normal" as const,
        recordedAt: d.recordedAt ? new Date(d.recordedAt) : new Date(),
      }));

      await db.insert(sensorData).values(values);
      return { count: values.length };
    }),

  // Sensor statistics
  getSensorStats: publicProcedure
    .input(z.object({
      machineId: z.number(),
      sensorId: z.number().optional(),
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [
        eq(sensorData.machineId, input.machineId),
        gte(sensorData.recordedAt, startDate)
      ];
      if (input.sensorId) conditions.push(eq(sensorData.sensorId, input.sensorId));

      const stats = await db
        .select({
          min: sql<number>`MIN(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          max: sql<number>`MAX(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          avg: sql<number>`AVG(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          stddev: sql<number>`STDDEV(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          count: sql<number>`COUNT(*)`,
          warningCount: sql<number>`SUM(CASE WHEN ${sensorData.status} = 'warning' THEN 1 ELSE 0 END)`,
          criticalCount: sql<number>`SUM(CASE WHEN ${sensorData.status} = 'critical' THEN 1 ELSE 0 END)`,
        })
        .from(sensorData)
        .where(and(...conditions));

      return stats[0] || null;
    }),

  // Sensor trend data
  getSensorTrend: publicProcedure
    .input(z.object({
      machineId: z.number(),
      sensorId: z.number(),
      days: z.number().default(7),
      interval: z.enum(["hour", "day"]).default("hour"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const dateFormat = input.interval === "hour" 
        ? sql`DATE_FORMAT(${sensorData.recordedAt}, '%Y-%m-%d %H:00:00')`
        : sql`DATE(${sensorData.recordedAt})`;

      return db
        .select({
          time: dateFormat,
          avg: sql<number>`AVG(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          min: sql<number>`MIN(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          max: sql<number>`MAX(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
        })
        .from(sensorData)
        .where(and(
          eq(sensorData.machineId, input.machineId),
          eq(sensorData.sensorId, input.sensorId),
          gte(sensorData.recordedAt, startDate)
        ))
        .groupBy(dateFormat)
        .orderBy(dateFormat);
    }),

  // Machine Sensors
  listSensors: publicProcedure
    .input(z.object({ machineId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(machineSensors.isActive, 1)];
      if (input.machineId) conditions.push(eq(machineSensors.machineId, input.machineId));

      return db
        .select({
          id: machineSensors.id,
          machineId: machineSensors.machineId,
          machineName: machines.name,
          sensorTypeId: machineSensors.sensorTypeId,
          sensorTypeName: sensorTypes.name,
          sensorCode: machineSensors.sensorCode,
          location: machineSensors.location,
          unit: sensorTypes.unit,
          minValue: sensorTypes.minValue,
          maxValue: sensorTypes.maxValue,
          warningThreshold: sensorTypes.warningThreshold,
          criticalThreshold: sensorTypes.criticalThreshold,
          isActive: machineSensors.isActive,
        })
        .from(machineSensors)
        .leftJoin(machines, eq(machineSensors.machineId, machines.id))
        .leftJoin(sensorTypes, eq(machineSensors.sensorTypeId, sensorTypes.id))
        .where(and(...conditions))
        .orderBy(machineSensors.sensorCode);
    }),

  createSensor: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      sensorTypeId: z.number(),
      sensorCode: z.string(),
      location: z.string().optional(),
      installDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(machineSensors).values({
        ...input,
        installDate: input.installDate ? new Date(input.installDate) : undefined,
      }).$returningId();

      return { id: result.id };
    }),

  // Sensor Types
  listSensorTypes: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(sensorTypes).where(eq(sensorTypes.isActive, 1)).orderBy(sensorTypes.name);
  }),

  createSensorType: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string(),
      unit: z.string().optional(),
      description: z.string().optional(),
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      warningThreshold: z.number().optional(),
      criticalThreshold: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(sensorTypes).values({
        ...input,
        minValue: input.minValue ? String(input.minValue) : undefined,
        maxValue: input.maxValue ? String(input.maxValue) : undefined,
        warningThreshold: input.warningThreshold ? String(input.warningThreshold) : undefined,
        criticalThreshold: input.criticalThreshold ? String(input.criticalThreshold) : undefined,
      }).$returningId();

      return { id: result.id };
    }),

  // Prediction Models
  listModels: publicProcedure
    .input(z.object({
      machineTypeId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineTypeId) conditions.push(eq(predictionModels.machineTypeId, input.machineTypeId));
      if (input.isActive !== undefined) conditions.push(eq(predictionModels.isActive, input.isActive ? 1 : 0));

      return db
        .select()
        .from(predictionModels)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(predictionModels.name);
    }),

  createModel: protectedProcedure
    .input(z.object({
      name: z.string(),
      machineTypeId: z.number().optional(),
      modelType: z.enum(["rul", "anomaly", "failure", "degradation"]),
      description: z.string().optional(),
      inputFeatures: z.any().optional(),
      modelParameters: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(predictionModels).values(input).$returningId();
      return { id: result.id };
    }),

  updateModel: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      inputFeatures: z.any().optional(),
      modelParameters: z.any().optional(),
      accuracy: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, isActive, accuracy, ...data } = input;
      await db.update(predictionModels).set({
        ...data,
        accuracy: accuracy ? String(accuracy) : undefined,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
      }).where(eq(predictionModels.id, id));

      return { success: true };
    }),

  trainModel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Simulate model training
      const accuracy = 0.85 + Math.random() * 0.1;

      await db.update(predictionModels).set({
        accuracy: String(accuracy),
        lastTrainedAt: new Date(),
      }).where(eq(predictionModels.id, input.id));

      return { success: true, accuracy };
    }),

  // Predictions
  listPredictions: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      isAcknowledged: z.boolean().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) conditions.push(eq(predictions.machineId, input.machineId));
      if (input.severity) conditions.push(eq(predictions.severity, input.severity));
      if (input.isAcknowledged !== undefined) conditions.push(eq(predictions.isAcknowledged, input.isAcknowledged ? 1 : 0));

      return db
        .select({
          id: predictions.id,
          machineId: predictions.machineId,
          machineName: machines.name,
          modelId: predictions.modelId,
          modelName: predictionModels.name,
          predictionType: predictions.predictionType,
          predictedValue: predictions.predictedValue,
          confidence: predictions.confidence,
          estimatedFailureDate: predictions.estimatedFailureDate,
          remainingUsefulLife: predictions.remainingUsefulLife,
          severity: predictions.severity,
          isAcknowledged: predictions.isAcknowledged,
          notes: predictions.notes,
          createdAt: predictions.createdAt,
        })
        .from(predictions)
        .leftJoin(machines, eq(predictions.machineId, machines.id))
        .leftJoin(predictionModels, eq(predictions.modelId, predictionModels.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(predictions.createdAt))
        .limit(input.limit);
    }),

  createPrediction: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      modelId: z.number(),
      predictionType: z.enum(["rul", "failure_probability", "anomaly_score", "health_index"]),
      predictedValue: z.number().optional(),
      confidence: z.number().optional(),
      estimatedFailureDate: z.string().optional(),
      remainingUsefulLife: z.number().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(predictions).values({
        ...input,
        predictedValue: input.predictedValue ? String(input.predictedValue) : undefined,
        confidence: input.confidence ? String(input.confidence) : undefined,
        estimatedFailureDate: input.estimatedFailureDate ? new Date(input.estimatedFailureDate) : undefined,
      }).$returningId();

      return { id: result.id };
    }),

  acknowledgePrediction: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(predictions).set({
        isAcknowledged: 1,
        acknowledgedBy: ctx.user?.id,
        acknowledgedAt: new Date(),
        notes: input.notes,
      }).where(eq(predictions.id, input.id));

      return { success: true };
    }),

  // Dashboard stats
  getStats: publicProcedure
    .input(z.object({ machineId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = input.machineId ? [eq(predictions.machineId, input.machineId)] : [];

      // Active predictions by severity
      const predStats = await db
        .select({
          severity: predictions.severity,
          count: sql<number>`COUNT(*)`,
        })
        .from(predictions)
        .where(and(
          eq(predictions.isAcknowledged, 0),
          ...(conditions.length > 0 ? conditions : [])
        ))
        .groupBy(predictions.severity);

      // Models stats
      const modelStats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`SUM(CASE WHEN ${predictionModels.isActive} = 1 THEN 1 ELSE 0 END)`,
          avgAccuracy: sql<number>`AVG(CAST(${predictionModels.accuracy} AS DECIMAL(5,4)))`,
        })
        .from(predictionModels);

      // Recent critical readings
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);
      
      const criticalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sensorData)
        .where(and(
          eq(sensorData.status, "critical"),
          gte(sensorData.recordedAt, last24h),
          ...(input.machineId ? [eq(sensorData.machineId, input.machineId)] : [])
        ));

      return {
        predictions: predStats.reduce((acc, a) => ({ ...acc, [a.severity || 'unknown']: a.count }), {}),
        models: modelStats[0] || { total: 0, active: 0, avgAccuracy: 0 },
        criticalReadings24h: criticalCount[0]?.count || 0,
      };
    }),

  // Get machine health score
  getMachineHealth: publicProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get active predictions
      const preds = await db
        .select({ severity: predictions.severity })
        .from(predictions)
        .where(and(
          eq(predictions.machineId, input.machineId),
          eq(predictions.isAcknowledged, 0)
        ));

      // Calculate health score based on predictions
      let healthScore = 100;
      for (const pred of preds) {
        switch (pred.severity) {
          case 'critical': healthScore -= 25; break;
          case 'high': healthScore -= 15; break;
          case 'medium': healthScore -= 10; break;
          case 'low': healthScore -= 5; break;
        }
      }

      // Get recent critical/warning rate
      const last24h = new Date();
      last24h.setHours(last24h.getHours() - 24);

      const statusStats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          warnings: sql<number>`SUM(CASE WHEN ${sensorData.status} = 'warning' THEN 1 ELSE 0 END)`,
          criticals: sql<number>`SUM(CASE WHEN ${sensorData.status} = 'critical' THEN 1 ELSE 0 END)`,
        })
        .from(sensorData)
        .where(and(
          eq(sensorData.machineId, input.machineId),
          gte(sensorData.recordedAt, last24h)
        ));

      const warningRate = statusStats[0]?.total 
        ? ((statusStats[0].warnings + statusStats[0].criticals) / statusStats[0].total) * 100 
        : 0;

      // Adjust health score based on warning rate
      if (warningRate > 10) healthScore -= 20;
      else if (warningRate > 5) healthScore -= 10;
      else if (warningRate > 2) healthScore -= 5;

      return {
        healthScore: Math.max(0, healthScore),
        activePredictions: preds.length,
        warningRate,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : healthScore >= 40 ? 'degraded' : 'critical',
      };
    }),

  // Predict failure
  predictFailure: publicProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get recent sensor data trends
      const last7d = new Date();
      last7d.setDate(last7d.getDate() - 7);

      const trends = await db
        .select({
          sensorId: sensorData.sensorId,
          sensorCode: machineSensors.sensorCode,
          sensorTypeName: sensorTypes.name,
          avgValue: sql<number>`AVG(CAST(${sensorData.value} AS DECIMAL(12,4)))`,
          trend: sql<number>`(MAX(CAST(${sensorData.value} AS DECIMAL(12,4))) - MIN(CAST(${sensorData.value} AS DECIMAL(12,4)))) / NULLIF(MIN(CAST(${sensorData.value} AS DECIMAL(12,4))), 0) * 100`,
        })
        .from(sensorData)
        .leftJoin(machineSensors, eq(sensorData.sensorId, machineSensors.id))
        .leftJoin(sensorTypes, eq(machineSensors.sensorTypeId, sensorTypes.id))
        .where(and(
          eq(sensorData.machineId, input.machineId),
          gte(sensorData.recordedAt, last7d)
        ))
        .groupBy(sensorData.sensorId, machineSensors.sensorCode, sensorTypes.name);

      // Simulate prediction based on trends
      const predictionResults = trends.map(t => {
        const degradationRate = Math.abs(t.trend || 0);
        const daysToFailure = degradationRate > 0 ? Math.round(100 / degradationRate * 30) : null;
        
        return {
          sensorId: t.sensorId,
          sensorCode: t.sensorCode,
          sensorTypeName: t.sensorTypeName,
          currentValue: t.avgValue,
          trend: t.trend,
          predictedDaysToFailure: daysToFailure,
          riskLevel: degradationRate > 20 ? 'high' : degradationRate > 10 ? 'medium' : 'low',
        };
      });

      return {
        machineId: input.machineId,
        predictions: predictionResults,
        overallRisk: predictionResults.some(p => p.riskLevel === 'high') ? 'high' 
          : predictionResults.some(p => p.riskLevel === 'medium') ? 'medium' : 'low',
      };
    }),
});
