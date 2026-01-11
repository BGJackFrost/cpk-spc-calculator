import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import {
  createBatchImageJob,
  getBatchImageJobs,
  getBatchImageJobById,
  updateBatchImageJob,
  addBatchImageItem,
  getBatchImageItems,
  updateBatchImageItem,
  getNextPendingBatchItem,
  getBatchImageStats,
} from "../db";

// AI Image Analysis function
async function analyzeImageWithAI(imageUrl: string, analysisType: string): Promise<{
  result: 'ok' | 'ng' | 'warning';
  qualityScore: number;
  confidence: number;
  defectsFound: number;
  defectTypes: string[];
  defectLocations: any[];
  analysis: any;
}> {
  try {
    const systemPrompt = `Bạn là chuyên gia phân tích hình ảnh chất lượng sản phẩm công nghiệp (AVI/AOI).
Phân tích hình ảnh và trả về kết quả JSON với cấu trúc sau:
{
  "result": "ok" | "ng" | "warning",
  "qualityScore": số từ 0-100,
  "confidence": số từ 0-1,
  "defectsFound": số lượng lỗi phát hiện,
  "defectTypes": ["loại lỗi 1", "loại lỗi 2"],
  "defectLocations": [{"x": 0, "y": 0, "width": 100, "height": 100, "type": "loại lỗi"}],
  "summary": "mô tả ngắn gọn kết quả phân tích"
}

Các loại lỗi thường gặp:
- scratch: vết xước
- dent: vết lõm
- crack: vết nứt
- stain: vết bẩn
- missing_component: thiếu linh kiện
- misalignment: lệch vị trí
- solder_defect: lỗi hàn
- color_defect: lỗi màu sắc
- surface_defect: lỗi bề mặt

Quy tắc đánh giá:
- qualityScore >= 90 và defectsFound = 0: result = "ok"
- qualityScore >= 70 và defectsFound <= 2 (minor): result = "warning"
- qualityScore < 70 hoặc defectsFound > 2: result = "ng"`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: `Phân tích hình ảnh này theo tiêu chuẩn ${analysisType}:` },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "image_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              result: { type: "string", enum: ["ok", "ng", "warning"] },
              qualityScore: { type: "number" },
              confidence: { type: "number" },
              defectsFound: { type: "integer" },
              defectTypes: { type: "array", items: { type: "string" } },
              defectLocations: { 
                type: "array", 
                items: { 
                  type: "object",
                  properties: {
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    type: { type: "string" }
                  },
                  required: ["x", "y", "width", "height", "type"],
                  additionalProperties: false
                }
              },
              summary: { type: "string" }
            },
            required: ["result", "qualityScore", "confidence", "defectsFound", "defectTypes", "defectLocations", "summary"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(content);
    return {
      result: analysis.result,
      qualityScore: analysis.qualityScore,
      confidence: analysis.confidence,
      defectsFound: analysis.defectsFound,
      defectTypes: analysis.defectTypes,
      defectLocations: analysis.defectLocations,
      analysis: analysis,
    };
  } catch (error) {
    console.error("[BatchImageAnalysis] AI analysis failed:", error);
    // Return default values on error
    return {
      result: 'warning',
      qualityScore: 50,
      confidence: 0,
      defectsFound: 0,
      defectTypes: [],
      defectLocations: [],
      analysis: { error: String(error) },
    };
  }
}

export const batchImageAnalysisRouter = router({
  // Create new batch analysis job
  createJob: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      analysisType: z.enum(['defect_detection', 'quality_inspection', 'comparison', 'ocr', 'custom']),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const jobId = await createBatchImageJob({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        analysisType: input.analysisType,
        productCode: input.productCode,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        totalImages: 0,
      });

      return { success: true, jobId };
    }),

  // Get user's batch jobs
  getJobs: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const jobs = await getBatchImageJobs(ctx.user.id, input);
      return jobs.map(job => ({
        ...job,
        defectsSummary: job.defects_summary ? JSON.parse(job.defects_summary) : null,
      }));
    }),

  // Get job details
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Get items and stats
      const items = await getBatchImageItems(input.jobId);
      const stats = await getBatchImageStats(input.jobId);

      return {
        ...job,
        defectsSummary: job.defects_summary ? JSON.parse(job.defects_summary) : null,
        items: items.map(item => ({
          ...item,
          defectTypes: item.defect_types ? JSON.parse(item.defect_types) : [],
          defectLocations: item.defect_locations ? JSON.parse(item.defect_locations) : [],
          aiAnalysis: item.ai_analysis ? JSON.parse(item.ai_analysis) : null,
        })),
        stats,
      };
    }),

  // Add images to job
  addImages: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      images: z.array(z.object({
        fileName: z.string(),
        fileSize: z.number().optional(),
        imageUrl: z.string(),
        imageKey: z.string().optional(),
        thumbnailUrl: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Add images
      const itemIds: number[] = [];
      for (let i = 0; i < input.images.length; i++) {
        const img = input.images[i];
        const itemId = await addBatchImageItem({
          jobId: input.jobId,
          fileName: img.fileName,
          fileSize: img.fileSize,
          imageUrl: img.imageUrl,
          imageKey: img.imageKey,
          thumbnailUrl: img.thumbnailUrl,
          processOrder: i,
        });
        itemIds.push(itemId);
      }

      // Update total images count
      await updateBatchImageJob(input.jobId, {
        totalImages: job.total_images + input.images.length,
      });

      return { success: true, itemIds };
    }),

  // Start batch analysis
  startAnalysis: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status !== 'pending') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job is already processing or completed" });
      }

      // Update job status
      await updateBatchImageJob(input.jobId, {
        status: 'processing',
        startedAt: new Date(),
      });

      // Start async processing (don't await)
      processBatchJob(input.jobId, job.analysis_type).catch(err => {
        console.error("[BatchImageAnalysis] Processing error:", err);
        updateBatchImageJob(input.jobId, {
          status: 'failed',
          errorMessage: String(err),
        });
      });

      return { success: true, message: "Analysis started" };
    }),

  // Get job progress
  getProgress: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      const stats = await getBatchImageStats(input.jobId);

      return {
        status: job.status,
        totalImages: job.total_images,
        processedImages: job.processed_images,
        successImages: job.success_images,
        failedImages: job.failed_images,
        okCount: job.ok_count,
        ngCount: job.ng_count,
        warningCount: job.warning_count,
        avgQualityScore: job.avg_quality_score,
        progress: job.total_images > 0 ? Math.round((job.processed_images / job.total_images) * 100) : 0,
        stats,
      };
    }),

  // Cancel job
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status === 'completed' || job.status === 'cancelled') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job cannot be cancelled" });
      }

      await updateBatchImageJob(input.jobId, {
        status: 'cancelled',
        completedAt: new Date(),
      });

      return { success: true };
    }),

  // Get job items
  getItems: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const items = await getBatchImageItems(input.jobId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return items.map(item => ({
        ...item,
        defectTypes: item.defect_types ? JSON.parse(item.defect_types) : [],
        defectLocations: item.defect_locations ? JSON.parse(item.defect_locations) : [],
        aiAnalysis: item.ai_analysis ? JSON.parse(item.ai_analysis) : null,
      }));
    }),

  // Upload image and add to job
  uploadImage: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      fileName: z.string(),
      base64Data: z.string(),
      contentType: z.string().default('image/jpeg'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const job = await getBatchImageJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.base64Data, 'base64');
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `batch-analysis/${input.jobId}/${timestamp}-${randomSuffix}-${input.fileName}`;
      
      const { url } = await storagePut(fileKey, buffer, input.contentType);

      // Add to batch items
      const itemId = await addBatchImageItem({
        jobId: input.jobId,
        fileName: input.fileName,
        fileSize: buffer.length,
        imageUrl: url,
        imageKey: fileKey,
        processOrder: job.total_images,
      });

      // Update total count
      await updateBatchImageJob(input.jobId, {
        totalImages: job.total_images + 1,
      });

      return { success: true, itemId, imageUrl: url };
    }),
});

// Background processing function
async function processBatchJob(jobId: number, analysisType: string) {
  const startTime = Date.now();
  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  let okCount = 0;
  let ngCount = 0;
  let warningCount = 0;
  let totalQualityScore = 0;
  const defectsSummary: Record<string, number> = {};

  try {
    while (true) {
      // Check if job was cancelled
      const job = await getBatchImageJobById(jobId);
      if (!job || job.status === 'cancelled') {
        break;
      }

      // Get next pending item
      const item = await getNextPendingBatchItem(jobId);
      if (!item) {
        break; // No more items
      }

      // Mark as processing
      await updateBatchImageItem(item.id, { status: 'processing' });

      const itemStartTime = Date.now();

      try {
        // Analyze image with AI
        const result = await analyzeImageWithAI(item.image_url, analysisType);

        // Update item with results
        await updateBatchImageItem(item.id, {
          status: 'completed',
          result: result.result,
          qualityScore: result.qualityScore,
          confidence: result.confidence,
          defectsFound: result.defectsFound,
          defectTypes: result.defectTypes,
          defectLocations: result.defectLocations,
          aiAnalysis: result.analysis,
          aiModelUsed: 'gpt-4-vision',
          processingTimeMs: Date.now() - itemStartTime,
          analyzedAt: new Date(),
        });

        successCount++;
        totalQualityScore += result.qualityScore;

        // Update counts
        if (result.result === 'ok') okCount++;
        else if (result.result === 'ng') ngCount++;
        else warningCount++;

        // Update defects summary
        for (const defectType of result.defectTypes) {
          defectsSummary[defectType] = (defectsSummary[defectType] || 0) + 1;
        }
      } catch (error) {
        console.error(`[BatchImageAnalysis] Failed to analyze item ${item.id}:`, error);
        await updateBatchImageItem(item.id, {
          status: 'failed',
          errorMessage: String(error),
          processingTimeMs: Date.now() - itemStartTime,
          retryCount: (item.retry_count || 0) + 1,
        });
        failedCount++;
      }

      processedCount++;

      // Update job progress
      await updateBatchImageJob(jobId, {
        processedImages: processedCount,
        successImages: successCount,
        failedImages: failedCount,
        okCount,
        ngCount,
        warningCount,
        avgQualityScore: successCount > 0 ? totalQualityScore / successCount : 0,
        defectsSummary,
      });

      // Small delay to prevent overwhelming the AI API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark job as completed
    await updateBatchImageJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    });

    console.log(`[BatchImageAnalysis] Job ${jobId} completed: ${successCount} success, ${failedCount} failed`);
  } catch (error) {
    console.error(`[BatchImageAnalysis] Job ${jobId} failed:`, error);
    await updateBatchImageJob(jobId, {
      status: 'failed',
      errorMessage: String(error),
      completedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    });
  }
}
