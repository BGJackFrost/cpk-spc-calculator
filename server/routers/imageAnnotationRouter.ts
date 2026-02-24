import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { imageAnnotations, annotationTemplates, snImages } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const imageAnnotationRouter = router({
  // List annotations for an image
  listByImage: protectedProcedure
    .input(z.object({
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const items = await db.select()
        .from(imageAnnotations)
        .where(and(
          eq(imageAnnotations.imageId, input.imageId),
          eq(imageAnnotations.imageType, input.imageType)
        ))
        .orderBy(desc(imageAnnotations.createdAt));
      return items;
    }),

  // Get single annotation
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [annotation] = await db.select()
        .from(imageAnnotations)
        .where(eq(imageAnnotations.id, input.id));
      return annotation;
    }),

  // Create annotation
  create: protectedProcedure
    .input(z.object({
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
      annotationType: z.enum(['rectangle', 'circle', 'ellipse', 'arrow', 'freehand', 'text', 'highlight', 'measurement']),
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      endX: z.number().optional(),
      endY: z.number().optional(),
      pathData: z.any().optional(),
      color: z.string().optional().default('#ff0000'),
      strokeWidth: z.number().optional().default(2),
      fillColor: z.string().optional(),
      opacity: z.number().optional().default(1),
      label: z.string().optional(),
      description: z.string().optional(),
      measurementValue: z.number().optional(),
      measurementUnit: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(imageAnnotations).values({
        imageId: input.imageId,
        imageType: input.imageType,
        userId: ctx.user.id,
        annotationType: input.annotationType,
        x: String(input.x),
        y: String(input.y),
        width: input.width ? String(input.width) : null,
        height: input.height ? String(input.height) : null,
        endX: input.endX ? String(input.endX) : null,
        endY: input.endY ? String(input.endY) : null,
        pathData: input.pathData,
        color: input.color,
        strokeWidth: input.strokeWidth,
        fillColor: input.fillColor,
        opacity: input.opacity ? String(input.opacity) : '1.00',
        label: input.label,
        description: input.description,
        measurementValue: input.measurementValue ? String(input.measurementValue) : null,
        measurementUnit: input.measurementUnit,
      });
      return { id: result.insertId };
    }),

  // Create multiple annotations at once
  createBatch: protectedProcedure
    .input(z.object({
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
      annotations: z.array(z.object({
        annotationType: z.enum(['rectangle', 'circle', 'ellipse', 'arrow', 'freehand', 'text', 'highlight', 'measurement']),
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        endX: z.number().optional(),
        endY: z.number().optional(),
        pathData: z.any().optional(),
        color: z.string().optional().default('#ff0000'),
        strokeWidth: z.number().optional().default(2),
        fillColor: z.string().optional(),
        opacity: z.number().optional().default(1),
        label: z.string().optional(),
        description: z.string().optional(),
        measurementValue: z.number().optional(),
        measurementUnit: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const values = input.annotations.map(ann => ({
        imageId: input.imageId,
        imageType: input.imageType,
        userId: ctx.user.id,
        annotationType: ann.annotationType,
        x: String(ann.x),
        y: String(ann.y),
        width: ann.width ? String(ann.width) : null,
        height: ann.height ? String(ann.height) : null,
        endX: ann.endX ? String(ann.endX) : null,
        endY: ann.endY ? String(ann.endY) : null,
        pathData: ann.pathData,
        color: ann.color,
        strokeWidth: ann.strokeWidth,
        fillColor: ann.fillColor,
        opacity: ann.opacity ? String(ann.opacity) : '1.00',
        label: ann.label,
        description: ann.description,
        measurementValue: ann.measurementValue ? String(ann.measurementValue) : null,
        measurementUnit: ann.measurementUnit,
      }));
      
      await db.insert(imageAnnotations).values(values);
      return { success: true, count: values.length };
    }),

  // Update annotation
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      endX: z.number().optional(),
      endY: z.number().optional(),
      pathData: z.any().optional(),
      color: z.string().optional(),
      strokeWidth: z.number().optional(),
      fillColor: z.string().optional(),
      opacity: z.number().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      measurementValue: z.number().optional(),
      measurementUnit: z.string().optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {};
      if (data.x !== undefined) updateData.x = String(data.x);
      if (data.y !== undefined) updateData.y = String(data.y);
      if (data.width !== undefined) updateData.width = String(data.width);
      if (data.height !== undefined) updateData.height = String(data.height);
      if (data.endX !== undefined) updateData.endX = String(data.endX);
      if (data.endY !== undefined) updateData.endY = String(data.endY);
      if (data.pathData !== undefined) updateData.pathData = data.pathData;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.strokeWidth !== undefined) updateData.strokeWidth = data.strokeWidth;
      if (data.fillColor !== undefined) updateData.fillColor = data.fillColor;
      if (data.opacity !== undefined) updateData.opacity = String(data.opacity);
      if (data.label !== undefined) updateData.label = data.label;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.measurementValue !== undefined) updateData.measurementValue = String(data.measurementValue);
      if (data.measurementUnit !== undefined) updateData.measurementUnit = data.measurementUnit;
      if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;

      await db.update(imageAnnotations)
        .set(updateData)
        .where(eq(imageAnnotations.id, id));
      
      return { success: true };
    }),

  // Delete annotation
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(imageAnnotations).where(eq(imageAnnotations.id, input.id));
      return { success: true };
    }),

  // Delete all annotations for an image
  deleteByImage: protectedProcedure
    .input(z.object({ 
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(imageAnnotations).where(and(
        eq(imageAnnotations.imageId, input.imageId),
        eq(imageAnnotations.imageType, input.imageType)
      ));
      return { success: true };
    }),

  // ============ Annotation Templates ============

  // List templates
  listTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conditions = [];
      
      // Get user's templates and public templates
      conditions.push(sql`(${annotationTemplates.userId} = ${ctx.user.id} OR ${annotationTemplates.isPublic} = true)`);
      
      if (input?.category) {
        conditions.push(eq(annotationTemplates.category, input.category));
      }

      const items = await db.select()
        .from(annotationTemplates)
        .where(and(...conditions))
        .orderBy(desc(annotationTemplates.createdAt));
      
      return items;
    }),

  // Create template
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
      templateData: z.any(),
      isPublic: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(annotationTemplates).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        category: input.category,
        templateData: input.templateData,
        isPublic: input.isPublic,
      });
      return { id: result.insertId };
    }),

  // Apply template to image
  applyTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
      offsetX: z.number().optional().default(0),
      offsetY: z.number().optional().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Get template
      const [template] = await db.select()
        .from(annotationTemplates)
        .where(eq(annotationTemplates.id, input.templateId));
      
      if (!template || !template.templateData) {
        throw new Error('Template không tồn tại');
      }

      const templateAnnotations = template.templateData as any[];
      
      // Create annotations from template
      const values = templateAnnotations.map((ann: any) => ({
        imageId: input.imageId,
        imageType: input.imageType,
        userId: ctx.user.id,
        annotationType: ann.annotationType,
        x: String((ann.x || 0) + input.offsetX),
        y: String((ann.y || 0) + input.offsetY),
        width: ann.width ? String(ann.width) : null,
        height: ann.height ? String(ann.height) : null,
        color: ann.color,
        strokeWidth: ann.strokeWidth,
        label: ann.label,
      }));

      await db.insert(imageAnnotations).values(values);
      
      return { success: true, count: values.length };
    }),

  // Delete template
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      // Only allow deleting own templates
      await db.delete(annotationTemplates)
        .where(and(
          eq(annotationTemplates.id, input.id),
          eq(annotationTemplates.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Export annotations as JSON
  exportAnnotations: protectedProcedure
    .input(z.object({ 
      imageId: z.number(),
      imageType: z.enum(['sn_image', 'quality_image', 'comparison']).optional().default('sn_image'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Get image info
      const [image] = await db.select()
        .from(snImages)
        .where(eq(snImages.id, input.imageId));
      
      // Get annotations
      const annotations = await db.select()
        .from(imageAnnotations)
        .where(and(
          eq(imageAnnotations.imageId, input.imageId),
          eq(imageAnnotations.imageType, input.imageType)
        ))
        .orderBy(imageAnnotations.createdAt);

      return {
        image: {
          id: image?.id,
          serialNumber: image?.serialNumber,
          imageUrl: image?.imageUrl,
        },
        annotations: annotations.map(a => ({
          type: a.annotationType,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          endX: a.endX,
          endY: a.endY,
          pathData: a.pathData,
          color: a.color,
          strokeWidth: a.strokeWidth,
          fillColor: a.fillColor,
          opacity: a.opacity,
          label: a.label,
          description: a.description,
          measurementValue: a.measurementValue,
          measurementUnit: a.measurementUnit,
        })),
        exportedAt: new Date().toISOString(),
      };
    }),
});
