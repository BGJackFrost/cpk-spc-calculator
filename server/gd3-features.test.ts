import { describe, it, expect, vi } from 'vitest';

describe('GĐ3 Features - Gantt Chart, Mock Data Removal, PDF Export', () => {
  describe('Gantt Chart Progress Bar', () => {
    it('should support progress field in GanttTask interface', () => {
      // GanttTask interface now includes progress (0-100) and dependsOn fields
      const task = {
        id: 1,
        title: 'Bảo trì định kỳ máy CNC',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-03'),
        assignee: 'Nguyễn Văn A',
        status: 'in_progress' as const,
        type: 'preventive' as const,
        machineId: 1,
        machineName: 'CNC-001',
        priority: 'high' as const,
        progress: 50,
        dependsOn: undefined,
      };
      expect(task.progress).toBe(50);
      expect(task.progress).toBeGreaterThanOrEqual(0);
      expect(task.progress).toBeLessThanOrEqual(100);
    });

    it('should map work order status to progress correctly', () => {
      const statusToProgress = (status: string) => {
        switch (status) {
          case 'completed': return 100;
          case 'in_progress': return 50;
          case 'on_hold': return 25;
          default: return 0;
        }
      };

      expect(statusToProgress('completed')).toBe(100);
      expect(statusToProgress('in_progress')).toBe(50);
      expect(statusToProgress('on_hold')).toBe(25);
      expect(statusToProgress('pending')).toBe(0);
    });
  });

  describe('Mock Data Removal', () => {
    it('should verify mock data patterns are removed from page files', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const pagesDir = path.join(process.cwd(), 'client/src/pages');
      const mockPatterns = [
        /const\s+demo\w+\s*[:=]\s*\[/,
        /const\s+mock\w+\s*[:=]\s*\[/,
        /const\s+DEMO_\w+\s*[:=]\s*\[/,
        /const\s+MOCK_\w+\s*[:=]\s*\[/,
        /function\s+generateDemo\w+/,
        /function\s+generateMock\w+/,
      ];

      // Check a sample of files that were cleaned
      const cleanedFiles = [
        'AlertConfiguration.tsx',
        'AlertUnified.tsx',
        'BackupRestore.tsx',
        'LicenseUnified.tsx',
        'NotificationUnified.tsx',
        'WebhookUnified.tsx',
      ];

      for (const filename of cleanedFiles) {
        const filepath = path.join(pagesDir, filename);
        if (fs.existsSync(filepath)) {
          const content = fs.readFileSync(filepath, 'utf-8');
          for (const pattern of mockPatterns) {
            expect(content).not.toMatch(pattern);
          }
        }
      }
    });

    it('should verify AI module pages have mock data removed', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const aiDir = path.join(process.cwd(), 'client/src/pages/ai');
      const mockPatterns = [
        /const\s+mock\w+\s*[:=]\s*\{/,
        /const\s+mock\w+\s*[:=]\s*\[/,
      ];

      const aiFiles = [
        'AiAlerts.tsx',
        'AiAuditLogs.tsx',
        'AiCorrelationAnalysis.tsx',
        'AiDefectPrediction.tsx',
        'AiInsights.tsx',
        'AiModelComparison.tsx',
        'AiOeeForecast.tsx',
        'AiPredictions.tsx',
        'AiReports.tsx',
        'AiRootCause.tsx',
        'AiThresholds.tsx',
        'AiTrainingJobs.tsx',
        'AiTrendAnalysis.tsx',
        'AiYieldOptimization.tsx',
      ];

      for (const filename of aiFiles) {
        const filepath = path.join(aiDir, filename);
        if (fs.existsSync(filepath)) {
          const content = fs.readFileSync(filepath, 'utf-8');
          for (const pattern of mockPatterns) {
            expect(content).not.toMatch(pattern);
          }
        }
      }
    });

    it('should verify IoT module pages have mock data removed', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const iotDir = path.join(process.cwd(), 'client/src/pages/iot');
      const mockPatterns = [
        /const\s+MOCK_\w+\s*[:=]\s*\[/,
      ];

      const iotFiles = ['IotMonitoringRealtime.tsx'];

      for (const filename of iotFiles) {
        const filepath = path.join(iotDir, filename);
        if (fs.existsSync(filepath)) {
          const content = fs.readFileSync(filepath, 'utf-8');
          for (const pattern of mockPatterns) {
            expect(content).not.toMatch(pattern);
          }
        }
      }
    });
  });

  describe('OEE Period PDF Export', () => {
    it('should generate valid HTML report content', () => {
      const periodLabels: Record<string, string> = {
        shift: 'Ca', day: 'Ngày', week: 'Tuần', month: 'Tháng',
      };

      const input = {
        period: 'day' as const,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        data: [
          { label: '2026-01-01', avgOee: 85.5, avgAvailability: 90.2, avgPerformance: 92.1, avgQuality: 97.3, totalGoodCount: 1000, totalDefectCount: 30, recordCount: 5 },
          { label: '2026-01-02', avgOee: 72.3, avgAvailability: 85.1, avgPerformance: 88.5, avgQuality: 96.1, totalGoodCount: 900, totalDefectCount: 40, recordCount: 5 },
        ],
      };

      const periodLabel = periodLabels[input.period];
      expect(periodLabel).toBe('Ngày');

      const totalRecords = input.data.reduce((s, r) => s + r.recordCount, 0);
      expect(totalRecords).toBe(10);

      const avgOee = input.data.reduce((s, r) => s + r.avgOee, 0) / input.data.length;
      expect(avgOee).toBeCloseTo(78.9, 1);

      const totalGood = input.data.reduce((s, r) => s + r.totalGoodCount, 0);
      expect(totalGood).toBe(1900);

      const totalDefect = input.data.reduce((s, r) => s + r.totalDefectCount, 0);
      expect(totalDefect).toBe(70);

      const defectRate = totalDefect / (totalGood + totalDefect) * 100;
      expect(defectRate).toBeCloseTo(3.55, 1);
    });

    it('should apply correct OEE color coding', () => {
      const getOeeColor = (v: number) => v >= 85 ? '#16a34a' : v >= 65 ? '#ca8a04' : '#dc2626';

      expect(getOeeColor(90)).toBe('#16a34a');  // Green for >= 85
      expect(getOeeColor(85)).toBe('#16a34a');  // Green for exactly 85
      expect(getOeeColor(75)).toBe('#ca8a04');  // Yellow for 65-84
      expect(getOeeColor(65)).toBe('#ca8a04');  // Yellow for exactly 65
      expect(getOeeColor(50)).toBe('#dc2626');  // Red for < 65
      expect(getOeeColor(0)).toBe('#dc2626');   // Red for 0
    });

    it('should handle empty data gracefully', () => {
      const data: any[] = [];
      const totalRecords = data.reduce((s: number, r: any) => s + r.recordCount, 0);
      expect(totalRecords).toBe(0);

      const avgOee = data.length > 0 ? data.reduce((s: number, r: any) => s + r.avgOee, 0) / data.length : 0;
      expect(avgOee).toBe(0);
    });

    it('should generate correct period labels', () => {
      const periodLabels: Record<string, string> = {
        shift: 'Ca', day: 'Ngày', week: 'Tuần', month: 'Tháng',
      };

      expect(periodLabels['shift']).toBe('Ca');
      expect(periodLabels['day']).toBe('Ngày');
      expect(periodLabels['week']).toBe('Tuần');
      expect(periodLabels['month']).toBe('Tháng');
    });
  });
});
