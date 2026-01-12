import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiImageComparisonResults, snImages } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const aiImageComparisonRouter = router({
  // List comparison results
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
      analysisType: z.enum(['difference', 'quality', 'defect', 'measurement', 'similarity']).optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conditions = [eq(aiImageComparisonResults.userId, ctx.user.id)];
      
      if (input?.status) {
        conditions.push(eq(aiImageComparisonResults.status, input.status));
      }
      if (input?.analysisType) {
        conditions.push(eq(aiImageComparisonResults.analysisType, input.analysisType));
      }

      const items = await db.select()
        .from(aiImageComparisonResults)
        .where(and(...conditions))
        .orderBy(desc(aiImageComparisonResults.createdAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(aiImageComparisonResults)
        .where(and(...conditions));

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get single comparison result
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [result] = await db.select()
        .from(aiImageComparisonResults)
        .where(eq(aiImageComparisonResults.id, input.id));
      return result;
    }),

  // Compare two images using AI
  compare: protectedProcedure
    .input(z.object({
      image1Id: z.number(),
      image2Id: z.number(),
      analysisType: z.enum(['difference', 'quality', 'defect', 'measurement', 'similarity']).optional().default('difference'),
      customPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const startTime = Date.now();

      // Get both images
      const [image1] = await db.select()
        .from(snImages)
        .where(eq(snImages.id, input.image1Id));
      
      const [image2] = await db.select()
        .from(snImages)
        .where(eq(snImages.id, input.image2Id));

      if (!image1 || !image2) {
        throw new Error('Khong tim thay mot hoac ca hai anh');
      }

      // Create comparison record
      const [comparisonResult] = await db.insert(aiImageComparisonResults).values({
        userId: ctx.user.id,
        image1Id: input.image1Id,
        image2Id: input.image2Id,
        image1Url: image1.imageUrl,
        image2Url: image2.imageUrl,
        analysisType: input.analysisType,
        status: 'processing',
      });

      const comparisonId = comparisonResult.insertId;

      try {
        // Build prompt based on analysis type
        let systemPrompt = 'You are an industrial image analysis expert. Compare two images and find differences. Return JSON with: similarityScore (0-100), differenceScore (0-100), differences array, summary, recommendations.';

        const userPrompt = input.customPrompt || 'Please analyze and compare these two images.';

        // Call LLM with vision
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: image1.imageUrl, detail: 'high' } },
                { type: 'image_url', image_url: { url: image2.imageUrl, detail: 'high' } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        });

        const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
        const processingTime = Date.now() - startTime;

        // Extract highlighted regions from differences
        const highlightedRegions = (aiResponse.differences || []).map((d: any, i: number) => ({
          id: i + 1,
          location: d.location || 'unknown',
          type: d.type || d.severity || 'info',
          description: d.description || '',
        }));

        // Update comparison result
        await db.update(aiImageComparisonResults)
          .set({
            status: 'completed',
            similarityScore: aiResponse.similarityScore || 0,
            differenceScore: aiResponse.differenceScore || (100 - (aiResponse.similarityScore || 0)),
            differencesCount: (aiResponse.differences || []).length,
            highlightedRegions,
            aiAnalysis: aiResponse,
            processingTime,
            completedAt: new Date().toISOString(),
          })
          .where(eq(aiImageComparisonResults.id, comparisonId));

        return {
          id: comparisonId,
          status: 'completed',
          similarityScore: aiResponse.similarityScore || 0,
          differenceScore: aiResponse.differenceScore || 0,
          differencesCount: (aiResponse.differences || []).length,
          highlightedRegions,
          aiAnalysis: aiResponse,
          processingTime,
        };

      } catch (error: any) {
        // Update status to failed
        await db.update(aiImageComparisonResults)
          .set({
            status: 'failed',
            aiAnalysis: { error: error.message },
            completedAt: new Date().toISOString(),
          })
          .where(eq(aiImageComparisonResults.id, comparisonId));

        throw new Error(`AI analysis error: ${error.message}`);
      }
    }),

  // Delete comparison result
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(aiImageComparisonResults).where(eq(aiImageComparisonResults.id, input.id));
      return { success: true };
    }),

  // Get comparison statistics
  getStatistics: protectedProcedure
    .input(z.object({
      days: z.number().optional().default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - (input?.days || 30));

      const stats = await db.select({
        totalComparisons: sql<number>`count(*)`,
        avgSimilarityScore: sql<number>`avg(${aiImageComparisonResults.similarityScore})`,
        avgDifferenceScore: sql<number>`avg(${aiImageComparisonResults.differenceScore})`,
        avgProcessingTime: sql<number>`avg(${aiImageComparisonResults.processingTime})`,
      })
        .from(aiImageComparisonResults)
        .where(and(
          eq(aiImageComparisonResults.userId, ctx.user.id),
          sql`${aiImageComparisonResults.createdAt} >= ${daysAgo.toISOString()}`
        ));

      return stats[0] || {
        totalComparisons: 0,
        avgSimilarityScore: 0,
        avgDifferenceScore: 0,
        avgProcessingTime: 0,
      };
    }),
});
