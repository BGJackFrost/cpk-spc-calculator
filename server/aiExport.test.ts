import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getDb: vi.fn(() => null), // Return null to use mock data
}));

// Import after mocking
import { getAiReportData, generateAiReportHtml, generateAiReportExcel } from './services/aiExportService';

describe('AI Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAiReportData', () => {
    it('should return AI report data structure', async () => {
      // When database is not available, it should throw or return default data
      // Based on the implementation, it throws when db is not available
      await expect(getAiReportData()).rejects.toThrow('Database not available');
    });
  });

  describe('generateAiReportHtml', () => {
    it('should generate HTML report from data', async () => {
      const mockData = {
        title: 'Test Report',
        generatedAt: new Date(),
        models: [
          {
            id: '1',
            name: 'Test Model',
            type: 'classification',
            accuracy: 85,
            status: 'active',
            createdAt: new Date(),
            predictions: 100,
          },
        ],
        predictions: [],
        trainingJobs: [
          {
            id: '1',
            name: 'Training Job 1',
            status: 'completed',
            progress: 100,
            accuracy: 90,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
        statistics: {
          totalModels: 1,
          activeModels: 1,
          avgAccuracy: 85,
          totalPredictions: 100,
          totalTrainingJobs: 1,
          completedJobs: 1,
        },
      };

      const html = await generateAiReportHtml(mockData);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Report');
      expect(html).toContain('Test Model');
      expect(html).toContain('Training Job 1');
    });

    it('should include statistics in HTML report', async () => {
      const mockData = {
        title: 'Stats Report',
        generatedAt: new Date(),
        models: [],
        predictions: [],
        trainingJobs: [],
        statistics: {
          totalModels: 5,
          activeModels: 3,
          avgAccuracy: 75.5,
          totalPredictions: 500,
          totalTrainingJobs: 10,
          completedJobs: 8,
        },
      };

      const html = await generateAiReportHtml(mockData);

      expect(html).toContain('5'); // totalModels
      expect(html).toContain('3'); // activeModels
      expect(html).toContain('75.5'); // avgAccuracy
    });
  });

  describe('generateAiReportExcel', () => {
    it('should generate Excel buffer from data', async () => {
      const mockData = {
        title: 'Excel Report',
        generatedAt: new Date(),
        models: [
          {
            id: '1',
            name: 'Model A',
            type: 'regression',
            accuracy: 92,
            status: 'active',
            createdAt: new Date(),
            predictions: 50,
          },
        ],
        predictions: [],
        trainingJobs: [],
        statistics: {
          totalModels: 1,
          activeModels: 1,
          avgAccuracy: 92,
          totalPredictions: 50,
          totalTrainingJobs: 0,
          completedJobs: 0,
        },
      };

      const buffer = await generateAiReportExcel(mockData);

      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check for Excel file signature (PK for ZIP-based formats like xlsx)
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4B); // 'K'
    });

    it('should handle empty data gracefully', async () => {
      const mockData = {
        title: 'Empty Report',
        generatedAt: new Date(),
        models: [],
        predictions: [],
        trainingJobs: [],
        statistics: {
          totalModels: 0,
          activeModels: 0,
          avgAccuracy: 0,
          totalPredictions: 0,
          totalTrainingJobs: 0,
          completedJobs: 0,
        },
      };

      const buffer = await generateAiReportExcel(mockData);

      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
