import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { userChartConfigs, chartAnnotations } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const chartConfigRouter = router({
  // Lấy danh sách cấu hình biểu đồ của user
  list: protectedProcedure
    .input(z.object({
      chartType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const conditions = [eq(userChartConfigs.userId, ctx.user.id)];
      if (input?.chartType) {
        conditions.push(eq(userChartConfigs.chartType, input.chartType));
      }
      
      const configs = await db
        .select()
        .from(userChartConfigs)
        .where(and(...conditions))
        .orderBy(desc(userChartConfigs.isDefault), desc(userChartConfigs.updatedAt));
      
      return configs.map(c => ({
        ...c,
        config: JSON.parse(c.config || "{}"),
      }));
    }),

  // Lấy cấu hình mặc định
  getDefault: protectedProcedure
    .input(z.object({
      chartType: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [config] = await db
        .select()
        .from(userChartConfigs)
        .where(and(
          eq(userChartConfigs.userId, ctx.user.id),
          eq(userChartConfigs.chartType, input.chartType),
          eq(userChartConfigs.isDefault, 1)
        ))
        .limit(1);
      
      if (!config) return null;
      return {
        ...config,
        config: JSON.parse(config.config || "{}"),
      };
    }),

  // Tạo cấu hình mới
  create: protectedProcedure
    .input(z.object({
      chartType: z.string(),
      configName: z.string(),
      config: z.record(z.string(), z.unknown()),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Nếu đặt làm mặc định, bỏ mặc định của các config khác
      if (input.isDefault) {
        await db
          .update(userChartConfigs)
          .set({ isDefault: 0 })
          .where(and(
            eq(userChartConfigs.userId, ctx.user.id),
            eq(userChartConfigs.chartType, input.chartType)
          ));
      }
      
      const [result] = await db.insert(userChartConfigs).values({
        userId: ctx.user.id,
        chartType: input.chartType,
        configName: input.configName,
        config: JSON.stringify(input.config),
        isDefault: input.isDefault ? 1 : 0,
      });
      
      return { id: result.insertId, success: true };
    }),

  // Cập nhật cấu hình
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      configName: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Kiểm tra quyền sở hữu
      const [existing] = await db
        .select()
        .from(userChartConfigs)
        .where(and(
          eq(userChartConfigs.id, input.id),
          eq(userChartConfigs.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!existing) throw new Error("Config not found");
      
      // Nếu đặt làm mặc định, bỏ mặc định của các config khác
      if (input.isDefault) {
        await db
          .update(userChartConfigs)
          .set({ isDefault: 0 })
          .where(and(
            eq(userChartConfigs.userId, ctx.user.id),
            eq(userChartConfigs.chartType, existing.chartType)
          ));
      }
      
      const updateData: Record<string, unknown> = {};
      if (input.configName) updateData.configName = input.configName;
      if (input.config) updateData.config = JSON.stringify(input.config);
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? 1 : 0;
      
      await db
        .update(userChartConfigs)
        .set(updateData)
        .where(eq(userChartConfigs.id, input.id));
      
      return { success: true };
    }),

  // Xóa cấu hình
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(userChartConfigs)
        .where(and(
          eq(userChartConfigs.id, input.id),
          eq(userChartConfigs.userId, ctx.user.id)
        ));
      
      return { success: true };
    }),

  // === Chart Annotations ===
  
  // Lấy annotations cho biểu đồ
  getAnnotations: protectedProcedure
    .input(z.object({
      mappingId: z.number(),
      chartType: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const annotations = await db
        .select()
        .from(chartAnnotations)
        .where(and(
          eq(chartAnnotations.mappingId, input.mappingId),
          eq(chartAnnotations.chartType, input.chartType)
        ))
        .orderBy(desc(chartAnnotations.createdAt));
      
      return annotations;
    }),

  // Thêm annotation
  addAnnotation: protectedProcedure
    .input(z.object({
      mappingId: z.number(),
      chartType: z.string(),
      annotationType: z.enum(["point", "line", "area", "text"]),
      xValue: z.number().optional(),
      yValue: z.number().optional(),
      xStart: z.number().optional(),
      xEnd: z.number().optional(),
      yStart: z.number().optional(),
      yEnd: z.number().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [result] = await db.insert(chartAnnotations).values({
        mappingId: input.mappingId,
        chartType: input.chartType,
        annotationType: input.annotationType,
        xValue: input.xValue?.toString(),
        yValue: input.yValue?.toString(),
        xStart: input.xStart?.toString(),
        xEnd: input.xEnd?.toString(),
        yStart: input.yStart?.toString(),
        yEnd: input.yEnd?.toString(),
        label: input.label,
        description: input.description,
        color: input.color || "#ff0000",
        createdBy: ctx.user.id,
      });
      
      return { id: result.insertId, success: true };
    }),

  // Xóa annotation
  deleteAnnotation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(chartAnnotations)
        .where(and(
          eq(chartAnnotations.id, input.id),
          eq(chartAnnotations.createdBy, ctx.user.id)
        ));
      
      return { success: true };
    }),
});
