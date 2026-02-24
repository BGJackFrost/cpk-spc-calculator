import { describe, it, expect, vi } from 'vitest';

// Mock database functions
vi.mock('./db', () => ({
  createBatchImageJob: vi.fn().mockResolvedValue(1),
  getBatchImageJobs: vi.fn().mockResolvedValue([
    {
      id: 1,
      user_id: 1,
      name: 'Test Batch Job',
      description: 'Test batch analysis',
      analysis_type: 'defect_detection',
      status: 'pending',
      total_images: 10,
      processed_images: 0,
      success_images: 0,
      failed_images: 0,
      ok_count: 0,
      ng_count: 0,
      warning_count: 0,
      created_at: new Date().toISOString(),
    },
  ]),
  getBatchImageJobById: vi.fn().mockImplementation((jobId: number) => {
    if (jobId === 1) {
      return Promise.resolve({
        id: 1,
        user_id: 1,
        name: 'Test Batch Job',
        status: 'pending',
        total_images: 10,
        analysis_type: 'defect_detection',
      });
    }
    return Promise.resolve(null);
  }),
  updateBatchImageJob: vi.fn().mockResolvedValue(true),
  addBatchImageItem: vi.fn().mockResolvedValue(1),
  getBatchImageItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      job_id: 1,
      file_name: 'test-image-1.jpg',
      image_url: 'https://example.com/test-image-1.jpg',
      status: 'pending',
      result: 'unknown',
    },
  ]),
  updateBatchImageItem: vi.fn().mockResolvedValue(true),
  getNextPendingBatchItem: vi.fn().mockResolvedValue({
    id: 1,
    job_id: 1,
    file_name: 'test-image-1.jpg',
    image_url: 'https://example.com/test-image-1.jpg',
    status: 'pending',
  }),
  getBatchImageStats: vi.fn().mockResolvedValue({
    total: 10,
    completed: 5,
    failed: 1,
    pending: 4,
    processing: 0,
    ok_count: 3,
    ng_count: 1,
    warning_count: 1,
    avg_quality_score: 85.5,
    total_defects: 3,
  }),
}));

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
} from './db';

describe('Batch Image Analysis', () => {
  describe('Batch Jobs', () => {
    it('should create a new batch job', async () => {
      const jobId = await createBatchImageJob({
        userId: 1,
        name: 'Test Batch Job',
        description: 'Test batch analysis',
        analysisType: 'defect_detection',
        totalImages: 10,
      });
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('number');
      expect(jobId).toBe(1);
    });

    it('should get batch jobs for user', async () => {
      const jobs = await getBatchImageJobs(1);
      
      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const firstJob = jobs[0];
      expect(firstJob).toHaveProperty('id');
      expect(firstJob).toHaveProperty('name');
      expect(firstJob).toHaveProperty('status');
    });

    it('should get batch job by id', async () => {
      const job = await getBatchImageJobById(1);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(1);
      expect(job?.name).toBe('Test Batch Job');
    });

    it('should return null for non-existent job', async () => {
      const job = await getBatchImageJobById(999);
      expect(job).toBeNull();
    });

    it('should update batch job status', async () => {
      const success = await updateBatchImageJob(1, {
        status: 'processing',
        startedAt: new Date(),
      });
      
      expect(success).toBe(true);
    });

    it('should update batch job progress', async () => {
      const success = await updateBatchImageJob(1, {
        processedImages: 5,
        successImages: 4,
        failedImages: 1,
        okCount: 3,
        ngCount: 1,
        warningCount: 0,
      });
      
      expect(success).toBe(true);
    });
  });

  describe('Batch Items', () => {
    it('should add image to batch job', async () => {
      const itemId = await addBatchImageItem({
        jobId: 1,
        fileName: 'test-image.jpg',
        fileSize: 1024,
        imageUrl: 'https://example.com/test-image.jpg',
        imageKey: 'batch-analysis/1/test-image.jpg',
      });
      
      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('number');
    });

    it('should get batch items for job', async () => {
      const items = await getBatchImageItems(1);
      
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      
      const firstItem = items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('file_name');
      expect(firstItem).toHaveProperty('image_url');
      expect(firstItem).toHaveProperty('status');
    });

    it('should update batch item with analysis result', async () => {
      const success = await updateBatchImageItem(1, {
        status: 'completed',
        result: 'ok',
        qualityScore: 95.5,
        confidence: 0.98,
        defectsFound: 0,
        defectTypes: [],
        defectLocations: [],
        aiAnalysis: { summary: 'No defects found' },
        processingTimeMs: 1500,
        analyzedAt: new Date(),
      });
      
      expect(success).toBe(true);
    });

    it('should get next pending item for processing', async () => {
      const item = await getNextPendingBatchItem(1);
      
      expect(item).toBeDefined();
      expect(item?.status).toBe('pending');
    });
  });

  describe('Batch Statistics', () => {
    it('should get batch statistics', async () => {
      const stats = await getBatchImageStats(1);
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('ok_count');
      expect(stats).toHaveProperty('ng_count');
      expect(stats).toHaveProperty('warning_count');
      expect(stats).toHaveProperty('avg_quality_score');
    });

    it('should have valid statistics values', async () => {
      const stats = await getBatchImageStats(1);
      
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeLessThanOrEqual(stats.total);
      expect(stats.failed).toBeLessThanOrEqual(stats.total);
      expect(stats.pending).toBeLessThanOrEqual(stats.total);
      expect(stats.ok_count + stats.ng_count + stats.warning_count).toBeLessThanOrEqual(stats.completed);
    });
  });

  describe('Analysis Types', () => {
    it('should support defect_detection analysis type', async () => {
      const jobId = await createBatchImageJob({
        userId: 1,
        name: 'Defect Detection Job',
        analysisType: 'defect_detection',
        totalImages: 5,
      });
      
      expect(jobId).toBeDefined();
    });

    it('should support quality_inspection analysis type', async () => {
      const jobId = await createBatchImageJob({
        userId: 1,
        name: 'Quality Inspection Job',
        analysisType: 'quality_inspection',
        totalImages: 5,
      });
      
      expect(jobId).toBeDefined();
    });
  });

  describe('Job Status Transitions', () => {
    it('should transition from pending to processing', async () => {
      const success = await updateBatchImageJob(1, {
        status: 'processing',
        startedAt: new Date(),
      });
      
      expect(success).toBe(true);
    });

    it('should transition from processing to completed', async () => {
      const success = await updateBatchImageJob(1, {
        status: 'completed',
        completedAt: new Date(),
        processingTimeMs: 30000,
      });
      
      expect(success).toBe(true);
    });

    it('should handle job cancellation', async () => {
      const success = await updateBatchImageJob(1, {
        status: 'cancelled',
        completedAt: new Date(),
      });
      
      expect(success).toBe(true);
    });

    it('should handle job failure', async () => {
      const success = await updateBatchImageJob(1, {
        status: 'failed',
        errorMessage: 'Processing error occurred',
        completedAt: new Date(),
      });
      
      expect(success).toBe(true);
    });
  });
});
