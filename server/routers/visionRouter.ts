/**
 * Vision Router
 * API endpoints cho Computer Vision Defect Detection và AI Vision Analysis
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import {
  detectDefects,
  detectDefectsBatch,
  getDefectCategories,
  getDefaultVisionConfig,
  getDefectStatistics,
} from '../services/computerVisionService';
import {
  analyzeImageWithLLM,
  analyzeImagesBatch,
  compareImages,
} from '../services/aiVisionService';
import { sendAiVisionNotifications } from '../services/aiVisionNotificationService';
import { storagePut } from '../storage';
import { getDb } from '../db';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';

export const visionRouter = router({
  // Detect defects in a single image
  detectDefects: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      useSimulation: z.boolean().optional().default(true),
      config: z.object({
        confidenceThreshold: z.number().min(0).max(1).optional(),
        enableAutoAnnotation: z.boolean().optional(),
        qualityPassThreshold: z.number().min(0).max(100).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      return await detectDefects(input.imageUrl, {
        useSimulation: input.useSimulation,
        config: input.config,
      });
    }),

  // Detect defects in multiple images
  detectDefectsBatch: protectedProcedure
    .input(z.object({
      imageUrls: z.array(z.string().url()).min(1).max(20),
      useSimulation: z.boolean().optional().default(true),
      config: z.object({
        confidenceThreshold: z.number().min(0).max(1).optional(),
        enableAutoAnnotation: z.boolean().optional(),
        qualityPassThreshold: z.number().min(0).max(100).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      return await detectDefectsBatch(input.imageUrls, {
        useSimulation: input.useSimulation,
        config: input.config,
      });
    }),

  // Simulate detection for demo
  simulateDetection: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(10).optional().default(1),
    }))
    .mutation(async ({ input }) => {
      const results = [];
      for (let i = 0; i < input.count; i++) {
        const result = await detectDefects(`https://example.com/sample_${i}.jpg`, {
          useSimulation: true,
        });
        results.push(result);
      }
      return { results, statistics: getDefectStatistics(results) };
    }),

  // Get defect categories
  getDefectCategories: publicProcedure.query(() => {
    return getDefectCategories();
  }),

  // Get default configuration
  getDefaultConfig: publicProcedure.query(() => {
    return getDefaultVisionConfig();
  }),

  // Get detection statistics
  getStatistics: protectedProcedure
    .input(z.object({
      productId: z.number().nullable().optional(),
      workstationId: z.number().nullable().optional(),
      days: z.number().min(1).max(365).optional().default(30),
    }))
    .query(async () => {
      // For demo, generate some sample statistics
      return {
        totalInspections: 1250,
        totalDefectsFound: 87,
        passRate: 93.04,
        averageProcessingTime: 245,
        defectsByCategory: [
          { category: 'Trầy xước', count: 32, percentage: 36.8 },
          { category: 'Lõm/Móp', count: 18, percentage: 20.7 },
          { category: 'Nứt', count: 12, percentage: 13.8 },
          { category: 'Đổi màu', count: 10, percentage: 11.5 },
          { category: 'Tạp chất', count: 8, percentage: 9.2 },
          { category: 'Biến dạng', count: 7, percentage: 8.0 },
        ],
        trendData: Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toISOString().split('T')[0],
            inspections: 150 + Math.floor(Math.random() * 50),
            defects: 8 + Math.floor(Math.random() * 8),
            passRate: 90 + Math.random() * 8,
          };
        }),
      };
    }),

  // Upload image to S3 for AI Vision analysis
  uploadImage: protectedProcedure
    .input(z.object({
      base64Data: z.string(),
      fileName: z.string(),
      mimeType: z.string().default('image/jpeg'),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || 'anonymous';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const extension = input.fileName.split('.').pop() || 'jpg';
      const fileKey = `ai-vision/${userId}/${timestamp}-${randomSuffix}.${extension}`;
      
      // Strip data URL prefix if present
      const base64Only = input.base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Only, 'base64');
      
      const result = await storagePut(fileKey, buffer, input.mimeType);
      
      return {
        key: result.key,
        url: result.url,
        fileName: input.fileName,
        size: buffer.length,
        mimeType: input.mimeType,
      };
    }),

  // Upload multiple images to S3
  uploadImages: protectedProcedure
    .input(z.object({
      images: z.array(z.object({
        base64Data: z.string(),
        fileName: z.string(),
        mimeType: z.string().default('image/jpeg'),
      })).max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || 'anonymous';
      const results = [];
      
      for (const image of input.images) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const extension = image.fileName.split('.').pop() || 'jpg';
        const fileKey = `ai-vision/${userId}/${timestamp}-${randomSuffix}.${extension}`;
        
        const base64Only = image.base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Only, 'base64');
        
        const result = await storagePut(fileKey, buffer, image.mimeType);
        
        results.push({
          key: result.key,
          url: result.url,
          fileName: image.fileName,
          size: buffer.length,
          mimeType: image.mimeType,
        });
      }
      
      return results;
    }),

  // AI Vision Analysis - Analyze single image with LLM
  analyzeWithAI: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      productType: z.string().optional().default('general'),
      inspectionStandard: z.string().optional().default('IPC-A-610'),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
      language: z.enum(['vi', 'en']).optional().default('vi'),
      saveToHistory: z.boolean().optional().default(true),
      machineId: z.number().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      batchId: z.string().optional(),
      serialNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await analyzeImageWithLLM(input.imageUrl, {
        productType: input.productType,
        inspectionStandard: input.inspectionStandard,
        confidenceThreshold: input.confidenceThreshold,
        language: input.language,
      });
      
      // Save to history if requested
      if (input.saveToHistory) {
        try {
          const db = await getDb();
          if (db) {
            await db.execute(sql`
              INSERT INTO ai_vision_history (
                analysis_id, user_id, image_url, status, confidence, quality_score,
                defect_count, defects, summary, recommendations, processing_time_ms,
                product_type, inspection_standard, machine_id, product_id,
                production_line_id, batch_id, serial_number, raw_llm_response, analyzed_at
              ) VALUES (
                \${result.id}, \${ctx.user?.id || null}, \${input.imageUrl}, \${result.status},
                \${result.confidence}, \${result.analysis.qualityScore}, \${result.defects.length},
                \${JSON.stringify(result.defects)}, \${result.analysis.summary},
                \${JSON.stringify(result.analysis.recommendations)}, \${result.processingTime},
                \${input.productType}, \${input.inspectionStandard}, \${input.machineId || null},
                \${input.productId || null}, \${input.productionLineId || null},
                \${input.batchId || null}, \${input.serialNumber || null},
                \${result.rawLlmResponse || null}, NOW()
              )
            `);
          }
        } catch (error) {
          console.error('[AI Vision] Error saving to history:', error);
        }
      }
      
      // Send notifications for critical defects
      if (result.status === 'fail' || result.defects.some(d => d.severity === 'critical' || d.severity === 'high')) {
        try {
          await sendAiVisionNotifications({
            analysisId: result.id,
            imageUrl: input.imageUrl,
            status: result.status as 'pass' | 'fail' | 'warning',
            qualityScore: result.analysis.qualityScore,
            defectCount: result.defects.length,
            defects: result.defects.map(d => ({
              type: d.type,
              severity: d.severity,
              description: d.description,
              confidence: d.confidence,
            })),
            summary: result.analysis.summary,
            recommendations: result.analysis.recommendations,
            productType: input.productType,
            inspectionStandard: input.inspectionStandard,
            serialNumber: input.serialNumber,
            analyzedAt: new Date(),
          });
        } catch (error) {
          console.error('[AI Vision] Error sending notifications:', error);
        }
      }
      
      return result;
    }),

  // AI Vision Analysis - Batch analyze multiple images
  analyzeWithAIBatch: protectedProcedure
    .input(z.object({
      imageUrls: z.array(z.string().url()).max(10),
      productType: z.string().optional().default('general'),
      inspectionStandard: z.string().optional().default('IPC-A-610'),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
      language: z.enum(['vi', 'en']).optional().default('vi'),
      saveToHistory: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = await analyzeImagesBatch(input.imageUrls, {
        productType: input.productType,
        inspectionStandard: input.inspectionStandard,
        confidenceThreshold: input.confidenceThreshold,
        language: input.language,
      });
      
      // Save to history if requested
      if (input.saveToHistory) {
        try {
          const db = await getDb();
          if (db) {
            for (const result of results.results) {
              await db.execute(sql`
                INSERT INTO ai_vision_history (
                  analysis_id, user_id, image_url, status, confidence, quality_score,
                  defect_count, defects, summary, recommendations, processing_time_ms,
                  product_type, inspection_standard, analyzed_at
                ) VALUES (
                  \${result.id}, \${ctx.user?.id || null}, \${result.imageUrl}, \${result.status},
                  \${result.confidence}, \${result.analysis.qualityScore}, \${result.defects.length},
                  \${JSON.stringify(result.defects)}, \${result.analysis.summary},
                  \${JSON.stringify(result.analysis.recommendations)}, \${result.processingTime},
                  \${input.productType}, \${input.inspectionStandard}, NOW()
                )
              `);
            }
          }
        } catch (error) {
          console.error('[AI Vision] Error saving batch to history:', error);
        }
      }
      
      return results;
    }),

  // AI Vision Analysis - Compare reference and inspection images
  compareWithAI: protectedProcedure
    .input(z.object({
      referenceImageUrl: z.string().url(),
      inspectionImageUrl: z.string().url(),
      productType: z.string().optional().default('general'),
      language: z.enum(['vi', 'en']).optional().default('vi'),
    }))
    .mutation(async ({ input }) => {
      return await compareImages(
        input.referenceImageUrl,
        input.inspectionImageUrl,
        {
          productType: input.productType,
          language: input.language,
        }
      );
    }),

  // Get AI Vision analysis history
  getAnalysisHistory: protectedProcedure
    .input(z.object({
      page: z.number().min(1).optional().default(1),
      pageSize: z.number().min(1).max(100).optional().default(20),
      status: z.enum(['pass', 'fail', 'warning']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      machineId: z.number().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { items: [], total: 0, page: input.page, pageSize: input.pageSize, totalPages: 0 };
        }
        
        const offset = (input.page - 1) * input.pageSize;
        
        // Build WHERE conditions
        let whereConditions = '1=1';
        const params: any[] = [];
        
        if (input.status) {
          whereConditions += ' AND status = ?';
          params.push(input.status);
        }
        if (input.startDate) {
          whereConditions += ' AND analyzed_at >= ?';
          params.push(input.startDate);
        }
        if (input.endDate) {
          whereConditions += ' AND analyzed_at <= ?';
          params.push(input.endDate);
        }
        if (input.machineId) {
          whereConditions += ' AND machine_id = ?';
          params.push(input.machineId);
        }
        if (input.productId) {
          whereConditions += ' AND product_id = ?';
          params.push(input.productId);
        }
        if (input.productionLineId) {
          whereConditions += ' AND production_line_id = ?';
          params.push(input.productionLineId);
        }
        
        // Get total count
        const countResult = await db.execute(sql.raw(`
          SELECT COUNT(*) as total FROM ai_vision_history WHERE ${whereConditions}
        `));
        const total = (countResult as any)[0]?.[0]?.total || 0;
        
        // Get items
        const itemsResult = await db.execute(sql.raw(`
          SELECT * FROM ai_vision_history 
          WHERE ${whereConditions}
          ORDER BY analyzed_at DESC
          LIMIT ${input.pageSize} OFFSET ${offset}
        `));
        
        const items = (itemsResult as any)[0] || [];
        
        return {
          items: items.map((item: any) => ({
            id: item.id,
            analysisId: item.analysis_id,
            imageUrl: item.image_url,
            status: item.status,
            confidence: item.confidence,
            qualityScore: item.quality_score,
            defectCount: item.defect_count,
            defects: typeof item.defects === 'string' ? JSON.parse(item.defects) : item.defects,
            summary: item.summary,
            recommendations: typeof item.recommendations === 'string' ? JSON.parse(item.recommendations) : item.recommendations,
            processingTimeMs: item.processing_time_ms,
            productType: item.product_type,
            inspectionStandard: item.inspection_standard,
            machineId: item.machine_id,
            productId: item.product_id,
            productionLineId: item.production_line_id,
            batchId: item.batch_id,
            serialNumber: item.serial_number,
            analyzedAt: item.analyzed_at,
            createdAt: item.created_at,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      } catch (error) {
        console.error('[AI Vision] Error getting history:', error);
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize, totalPages: 0 };
      }
    }),

  // Get AI Vision analysis statistics
  getAnalysisStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).optional().default(30),
      machineId: z.number().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            totalAnalyses: 0,
            passCount: 0,
            failCount: 0,
            warningCount: 0,
            passRate: 0,
            avgConfidence: 0,
            avgProcessingTime: 0,
            avgQualityScore: 0,
            trendData: [],
          };
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Build WHERE conditions
        let whereConditions = `analyzed_at >= '${startDate.toISOString()}'`;
        if (input.machineId) whereConditions += ` AND machine_id = ${input.machineId}`;
        if (input.productId) whereConditions += ` AND product_id = ${input.productId}`;
        if (input.productionLineId) whereConditions += ` AND production_line_id = ${input.productionLineId}`;
        
        // Get overall stats
        const statsResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as pass_count,
            SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as fail_count,
            SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_count,
            AVG(confidence) as avg_confidence,
            AVG(processing_time_ms) as avg_processing_time,
            AVG(quality_score) as avg_quality_score
          FROM ai_vision_history
          WHERE ${whereConditions}
        `));
        
        const stats = (statsResult as any)[0]?.[0] || {};
        const total = Number(stats.total) || 0;
        const passCount = Number(stats.pass_count) || 0;
        const failCount = Number(stats.fail_count) || 0;
        const warningCount = Number(stats.warning_count) || 0;
        
        // Get trend data (daily)
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            DATE(analyzed_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as pass_count,
            SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as fail_count,
            AVG(quality_score) as avg_quality_score
          FROM ai_vision_history
          WHERE ${whereConditions}
          GROUP BY DATE(analyzed_at)
          ORDER BY date DESC
          LIMIT 30
        `));
        
        const trendData = ((trendResult as any)[0] || []).map((row: any) => ({
          date: row.date,
          total: Number(row.total) || 0,
          passCount: Number(row.pass_count) || 0,
          failCount: Number(row.fail_count) || 0,
          avgQualityScore: Number(row.avg_quality_score) || 0,
        })).reverse();
        
        return {
          totalAnalyses: total,
          passCount,
          failCount,
          warningCount,
          passRate: total > 0 ? (passCount / total) * 100 : 0,
          avgConfidence: Number(stats.avg_confidence) || 0,
          avgProcessingTime: Number(stats.avg_processing_time) || 0,
          avgQualityScore: Number(stats.avg_quality_score) || 0,
          trendData,
        };
      } catch (error) {
        console.error('[AI Vision] Error getting stats:', error);
        return {
          totalAnalyses: 0,
          passCount: 0,
          failCount: 0,
          warningCount: 0,
          passRate: 0,
          avgConfidence: 0,
          avgProcessingTime: 0,
          avgQualityScore: 0,
          trendData: [],
        };
      }
    }),

  // Get AI Vision analysis trend data
  getAnalysisTrend: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).optional().default(30),
      groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
      machineId: z.number().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { trendData: [], summary: { totalAnalyses: 0, avgPassRate: 0, avgQualityScore: 0 } };
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Build WHERE conditions
        let whereConditions = `analyzed_at >= '${startDate.toISOString()}'`;
        if (input.machineId) whereConditions += ` AND machine_id = ${input.machineId}`;
        if (input.productId) whereConditions += ` AND product_id = ${input.productId}`;
        if (input.productionLineId) whereConditions += ` AND production_line_id = ${input.productionLineId}`;
        
        // Group by clause based on input
        let groupByClause = 'DATE(analyzed_at)';
        let dateFormat = 'DATE(analyzed_at)';
        if (input.groupBy === 'week') {
          groupByClause = "DATE_FORMAT(analyzed_at, '%Y-%u')";
          dateFormat = "DATE_FORMAT(analyzed_at, '%Y-W%u')";
        } else if (input.groupBy === 'month') {
          groupByClause = "DATE_FORMAT(analyzed_at, '%Y-%m')";
          dateFormat = "DATE_FORMAT(analyzed_at, '%Y-%m')";
        }
        
        // Get trend data
        const trendResult = await db.execute(sql.raw(`
          SELECT 
            ${dateFormat} as period,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as pass_count,
            SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as fail_count,
            SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_count,
            AVG(quality_score) as avg_quality_score,
            AVG(confidence) as avg_confidence,
            SUM(defect_count) as total_defects
          FROM ai_vision_history
          WHERE ${whereConditions}
          GROUP BY ${groupByClause}
          ORDER BY period ASC
        `));
        
        const trendData = ((trendResult as any)[0] || []).map((row: any) => {
          const total = Number(row.total) || 0;
          const passCount = Number(row.pass_count) || 0;
          const failCount = Number(row.fail_count) || 0;
          const warningCount = Number(row.warning_count) || 0;
          return {
            period: row.period,
            total,
            passCount,
            failCount,
            warningCount,
            passRate: total > 0 ? (passCount / total) * 100 : 0,
            failRate: total > 0 ? (failCount / total) * 100 : 0,
            avgQualityScore: Number(row.avg_quality_score) || 0,
            avgConfidence: Number(row.avg_confidence) || 0,
            totalDefects: Number(row.total_defects) || 0,
          };
        });
        
        // Calculate summary
        const totalAnalyses = trendData.reduce((sum: number, d: any) => sum + d.total, 0);
        const totalPass = trendData.reduce((sum: number, d: any) => sum + d.passCount, 0);
        const avgPassRate = totalAnalyses > 0 ? (totalPass / totalAnalyses) * 100 : 0;
        const avgQualityScore = trendData.length > 0 
          ? trendData.reduce((sum: number, d: any) => sum + d.avgQualityScore, 0) / trendData.length 
          : 0;
        
        return {
          trendData,
          summary: {
            totalAnalyses,
            avgPassRate,
            avgQualityScore,
            totalDefects: trendData.reduce((sum: number, d: any) => sum + d.totalDefects, 0),
          },
        };
      } catch (error) {
        console.error('[AI Vision] Error getting trend:', error);
        return { trendData: [], summary: { totalAnalyses: 0, avgPassRate: 0, avgQualityScore: 0 } };
      }
    }),

  // Export AI Vision analysis report
  exportReport: protectedProcedure
    .input(z.object({
      format: z.enum(['pdf', 'excel']),
      days: z.number().min(1).max(365).optional().default(30),
      status: z.enum(['pass', 'fail', 'warning']).optional(),
      machineId: z.number().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database not available' };
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        // Build WHERE conditions
        let whereConditions = `analyzed_at >= '${startDate.toISOString()}'`;
        if (input.status) whereConditions += ` AND status = '${input.status}'`;
        if (input.machineId) whereConditions += ` AND machine_id = ${input.machineId}`;
        if (input.productId) whereConditions += ` AND product_id = ${input.productId}`;
        if (input.productionLineId) whereConditions += ` AND production_line_id = ${input.productionLineId}`;
        
        // Get data
        const dataResult = await db.execute(sql.raw(`
          SELECT * FROM ai_vision_history 
          WHERE ${whereConditions}
          ORDER BY analyzed_at DESC
          LIMIT 1000
        `));
        
        const items = ((dataResult as any)[0] || []).map((item: any) => ({
          id: item.id,
          analysisId: item.analysis_id,
          imageUrl: item.image_url,
          status: item.status,
          confidence: item.confidence,
          qualityScore: item.quality_score,
          defectCount: item.defect_count,
          summary: item.summary,
          productType: item.product_type,
          inspectionStandard: item.inspection_standard,
          serialNumber: item.serial_number,
          analyzedAt: item.analyzed_at,
        }));
        
        // Get stats
        const statsResult = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as pass_count,
            SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as fail_count,
            SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning_count,
            AVG(quality_score) as avg_quality_score
          FROM ai_vision_history
          WHERE ${whereConditions}
        `));
        
        const stats = (statsResult as any)[0]?.[0] || {};
        
        return {
          success: true,
          data: {
            items,
            stats: {
              total: Number(stats.total) || 0,
              passCount: Number(stats.pass_count) || 0,
              failCount: Number(stats.fail_count) || 0,
              warningCount: Number(stats.warning_count) || 0,
              avgQualityScore: Number(stats.avg_quality_score) || 0,
            },
            exportedAt: new Date().toISOString(),
            format: input.format,
            days: input.days,
          },
        };
      } catch (error) {
        console.error('[AI Vision] Error exporting report:', error);
        return { success: false, error: 'Export failed' };
      }
    }),

  // Delete analysis record
  deleteAnalysis: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false };
        
        await db.execute(sql`DELETE FROM ai_vision_history WHERE id = \${input.id}`);
        return { success: true };
      } catch (error) {
        console.error('[AI Vision] Error deleting analysis:', error);
        return { success: false };
      }
    }),
});

export type VisionRouter = typeof visionRouter;
