/**
 * Vision Router
 * API endpoints cho Computer Vision Defect Detection
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

  // AI Vision Analysis - Analyze single image with LLM
  analyzeWithAI: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      productType: z.string().optional().default('general'),
      inspectionStandard: z.string().optional().default('IPC-A-610'),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
      language: z.enum(['vi', 'en']).optional().default('vi'),
      saveToDatabase: z.boolean().optional().default(false),
      machineId: z.number().optional(),
      productId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await analyzeImageWithLLM(input.imageUrl, {
        productType: input.productType,
        inspectionStandard: input.inspectionStandard,
        confidenceThreshold: input.confidenceThreshold,
        language: input.language,
        saveToDatabase: input.saveToDatabase,
        machineId: input.machineId,
        productId: input.productId,
      });
    }),

  // AI Vision Analysis - Batch analyze multiple images
  analyzeWithAIBatch: protectedProcedure
    .input(z.object({
      imageUrls: z.array(z.string().url()).max(10),
      productType: z.string().optional().default('general'),
      inspectionStandard: z.string().optional().default('IPC-A-610'),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
      language: z.enum(['vi', 'en']).optional().default('vi'),
    }))
    .mutation(async ({ input }) => {
      return await analyzeImagesBatch(input.imageUrls, {
        productType: input.productType,
        inspectionStandard: input.inspectionStandard,
        confidenceThreshold: input.confidenceThreshold,
        language: input.language,
      });
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
});

export type VisionRouter = typeof visionRouter;
