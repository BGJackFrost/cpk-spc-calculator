/**
 * Quality Image Router
 * API endpoints cho quản lý hình ảnh chất lượng, so sánh trước/sau và camera capture
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { storagePut } from '../storage';
import { invokeLLM } from '../_core/llm';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { qualityImages, imageComparisons } from '../../drizzle/schema';

// Helper to generate unique file key
function generateFileKey(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || 'jpg';
  return `quality-images/${prefix}/${timestamp}-${random}.${ext}`;
}

export const qualityImageRouter = router({
  // Upload quality image
  uploadImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      filename: z.string(),
      mimeType: z.string().default('image/jpeg'),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      batchNumber: z.string().optional(),
      imageType: z.enum(['before', 'after', 'reference', 'defect', 'camera_capture']).default('before'),
      notes: z.string().optional(),
      analyzeWithAi: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.imageBase64, 'base64');
      const fileKey = generateFileKey(ctx.user.id.toString(), input.filename);
      
      const { url, key } = await storagePut(fileKey, buffer, input.mimeType);

      let aiAnalysis = null;
      let qualityScore = null;
      let defectsFound = 0;
      let severity: 'none' | 'minor' | 'major' | 'critical' = 'none';

      // Analyze with AI if requested
      if (input.analyzeWithAi) {
        try {
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `Bạn là chuyên gia phân tích chất lượng sản phẩm. Phân tích hình ảnh và đánh giá:
1. Điểm chất lượng (0-10)
2. Các lỗi phát hiện được (nếu có)
3. Mức độ nghiêm trọng (none/minor/major/critical)
4. Đề xuất cải thiện

Trả về JSON với format:
{
  "qualityScore": number,
  "defects": [{"type": string, "description": string, "location": string}],
  "overallSeverity": "none" | "minor" | "major" | "critical",
  "recommendations": [string],
  "summary": string
}`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Phân tích hình ảnh chất lượng sản phẩm. Mã sản phẩm: ${input.productCode || 'N/A'}. Loại: ${input.imageType}` },
                  { type: 'image_url', image_url: { url } }
                ]
              }
            ],
          });

          const content = llmResponse.choices[0]?.message?.content;
          if (content) {
            try {
              aiAnalysis = JSON.parse(content);
              qualityScore = aiAnalysis.qualityScore;
              defectsFound = aiAnalysis.defects?.length || 0;
              severity = aiAnalysis.overallSeverity || 'none';
            } catch {
              aiAnalysis = { summary: content };
            }
          }
        } catch (error) {
          console.error('AI analysis failed:', error);
        }
      }

      // Insert into database
      const [result] = await db.insert(qualityImages).values({
        userId: ctx.user.id,
        imageUrl: url,
        imageKey: key,
        imageType: input.imageType,
        productCode: input.productCode,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        batchNumber: input.batchNumber,
        captureSource: 'upload',
        aiAnalysis,
        qualityScore: qualityScore?.toString(),
        defectsFound,
        severity,
        notes: input.notes,
      });

      return {
        id: result.insertId,
        imageUrl: url,
        imageKey: key,
        aiAnalysis,
        qualityScore,
        defectsFound,
        severity,
      };
    }),

  // Capture from camera (base64 image from frontend)
  captureFromCamera: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      batchNumber: z.string().optional(),
      analyzeWithAi: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Upload to S3
      const buffer = Buffer.from(input.imageBase64, 'base64');
      const fileKey = generateFileKey(ctx.user.id.toString(), 'camera-capture.jpg');
      
      const { url, key } = await storagePut(fileKey, buffer, 'image/jpeg');

      let aiAnalysis = null;
      let qualityScore = null;
      let defectsFound = 0;
      let severity: 'none' | 'minor' | 'major' | 'critical' = 'none';

      // Analyze with AI
      if (input.analyzeWithAi) {
        try {
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `Bạn là chuyên gia phân tích chất lượng sản phẩm realtime. Phân tích nhanh hình ảnh từ camera và đánh giá chất lượng. Trả về JSON với format:
{
  "qualityScore": number (0-10),
  "defects": [{"type": string, "description": string, "location": string}],
  "overallSeverity": "none" | "minor" | "major" | "critical",
  "recommendations": [string],
  "summary": string,
  "passQc": boolean
}`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Phân tích hình ảnh từ camera. Mã sản phẩm: ${input.productCode || 'N/A'}` },
                  { type: 'image_url', image_url: { url } }
                ]
              }
            ],
          });

          const content = llmResponse.choices[0]?.message?.content;
          if (content) {
            try {
              aiAnalysis = JSON.parse(content);
              qualityScore = aiAnalysis.qualityScore;
              defectsFound = aiAnalysis.defects?.length || 0;
              severity = aiAnalysis.overallSeverity || 'none';
            } catch {
              aiAnalysis = { summary: content, passQc: true };
            }
          }
        } catch (error) {
          console.error('AI analysis failed:', error);
        }
      }

      // Insert into database
      const [result] = await db.insert(qualityImages).values({
        userId: ctx.user.id,
        imageUrl: url,
        imageKey: key,
        imageType: 'camera_capture',
        productCode: input.productCode,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        batchNumber: input.batchNumber,
        captureSource: 'camera',
        aiAnalysis,
        qualityScore: qualityScore?.toString(),
        defectsFound,
        severity,
      });

      return {
        id: result.insertId,
        imageUrl: url,
        imageKey: key,
        aiAnalysis,
        qualityScore,
        defectsFound,
        severity,
        passQc: aiAnalysis?.passQc ?? true,
      };
    }),

  // Get images list
  getImages: protectedProcedure
    .input(z.object({
      imageType: z.enum(['before', 'after', 'reference', 'defect', 'camera_capture']).optional(),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { images: [], total: 0 };

      const conditions = [eq(qualityImages.userId, ctx.user.id)];
      
      if (input.imageType) {
        conditions.push(eq(qualityImages.imageType, input.imageType));
      }
      if (input.productCode) {
        conditions.push(eq(qualityImages.productCode, input.productCode));
      }
      if (input.productionLineId) {
        conditions.push(eq(qualityImages.productionLineId, input.productionLineId));
      }
      if (input.startDate) {
        conditions.push(gte(qualityImages.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(qualityImages.createdAt, input.endDate));
      }

      const images = await db.select()
        .from(qualityImages)
        .where(and(...conditions))
        .orderBy(desc(qualityImages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(qualityImages)
        .where(and(...conditions));

      return {
        images,
        total: countResult?.count || 0,
      };
    }),

  // Create comparison
  createComparison: protectedProcedure
    .input(z.object({
      beforeImageId: z.number(),
      afterImageId: z.number(),
      comparisonType: z.enum(['quality_improvement', 'defect_fix', 'process_change', 'before_after']).default('before_after'),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get both images
      const [beforeImage] = await db.select()
        .from(qualityImages)
        .where(eq(qualityImages.id, input.beforeImageId))
        .limit(1);

      const [afterImage] = await db.select()
        .from(qualityImages)
        .where(eq(qualityImages.id, input.afterImageId))
        .limit(1);

      if (!beforeImage || !afterImage) {
        throw new Error('One or both images not found');
      }

      // Create comparison record
      const [result] = await db.insert(imageComparisons).values({
        userId: ctx.user.id,
        beforeImageId: input.beforeImageId,
        afterImageId: input.afterImageId,
        comparisonType: input.comparisonType,
        productCode: input.productCode,
        productionLineId: input.productionLineId,
        beforeScore: beforeImage.qualityScore,
        afterScore: afterImage.qualityScore,
        status: 'analyzing',
        notes: input.notes,
      });

      // Analyze comparison with AI
      try {
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `Bạn là chuyên gia so sánh chất lượng sản phẩm. So sánh 2 hình ảnh TRƯỚC và SAU để đánh giá mức độ cải thiện. Trả về JSON:
{
  "improvementScore": number (-10 to 10, negative = worse, positive = better),
  "beforeAnalysis": { "score": number, "issues": [string] },
  "afterAnalysis": { "score": number, "improvements": [string] },
  "comparison": {
    "changesDetected": [string],
    "qualityDelta": number,
    "overallAssessment": string
  },
  "recommendations": [string],
  "summary": string
}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: `So sánh 2 hình ảnh. Loại so sánh: ${input.comparisonType}. Mã sản phẩm: ${input.productCode || 'N/A'}` },
                { type: 'text', text: 'Hình ảnh TRƯỚC:' },
                { type: 'image_url', image_url: { url: beforeImage.imageUrl } },
                { type: 'text', text: 'Hình ảnh SAU:' },
                { type: 'image_url', image_url: { url: afterImage.imageUrl } }
              ]
            }
          ],
        });

        const content = llmResponse.choices[0]?.message?.content;
        if (content) {
          let aiResult;
          try {
            aiResult = JSON.parse(content);
          } catch {
            aiResult = { summary: content, improvementScore: 0 };
          }
          
          await db.update(imageComparisons)
            .set({
              aiComparisonResult: aiResult,
              improvementScore: aiResult.improvementScore?.toString(),
              beforeScore: aiResult.beforeAnalysis?.score?.toString() || beforeImage.qualityScore,
              afterScore: aiResult.afterAnalysis?.score?.toString() || afterImage.qualityScore,
              summary: aiResult.summary,
              recommendations: aiResult.recommendations,
              status: 'completed',
            })
            .where(eq(imageComparisons.id, result.insertId));

          return {
            id: result.insertId,
            status: 'completed',
            aiComparisonResult: aiResult,
          };
        }
      } catch (error) {
        console.error('Comparison analysis failed:', error);
        await db.update(imageComparisons)
          .set({ status: 'failed' })
          .where(eq(imageComparisons.id, result.insertId));
      }

      return {
        id: result.insertId,
        status: 'analyzing',
      };
    }),

  // Get comparisons list
  getComparisons: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'analyzing', 'completed', 'failed']).optional(),
      productCode: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { comparisons: [], total: 0 };

      const conditions = [eq(imageComparisons.userId, ctx.user.id)];
      
      if (input.status) {
        conditions.push(eq(imageComparisons.status, input.status));
      }
      if (input.productCode) {
        conditions.push(eq(imageComparisons.productCode, input.productCode));
      }

      const comparisons = await db.select()
        .from(imageComparisons)
        .where(and(...conditions))
        .orderBy(desc(imageComparisons.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(imageComparisons)
        .where(and(...conditions));

      return {
        comparisons,
        total: countResult?.count || 0,
      };
    }),

  // Get single comparison with images
  getComparisonDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [comparison] = await db.select()
        .from(imageComparisons)
        .where(and(
          eq(imageComparisons.id, input.id),
          eq(imageComparisons.userId, ctx.user.id)
        ))
        .limit(1);

      if (!comparison) return null;

      const [beforeImage] = await db.select()
        .from(qualityImages)
        .where(eq(qualityImages.id, comparison.beforeImageId))
        .limit(1);

      const [afterImage] = await db.select()
        .from(qualityImages)
        .where(eq(qualityImages.id, comparison.afterImageId))
        .limit(1);

      return {
        ...comparison,
        beforeImage,
        afterImage,
      };
    }),

  // Delete image
  deleteImage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.delete(qualityImages)
        .where(and(
          eq(qualityImages.id, input.id),
          eq(qualityImages.userId, ctx.user.id)
        ));

      return { success: true };
    }),
});
