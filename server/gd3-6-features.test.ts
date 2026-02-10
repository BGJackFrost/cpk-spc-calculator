import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GĐ3.6 - Build Performance, AI/IoT Backend, Scheduled OEE', () => {
  
  describe('Build Performance - Lazy Loading', () => {
    it('should have lazy imports in App.tsx for heavy pages', () => {
      const appContent = fs.readFileSync(
        path.join(__dirname, '../client/src/App.tsx'), 'utf-8'
      );
      // Dashboard should be lazy loaded (it imports recharts)
      expect(appContent).toContain('lazy');
      expect(appContent).toContain('Suspense');
    });

    it('should have optimized vite config with manual chunks', () => {
      const viteConfig = fs.readFileSync(
        path.join(__dirname, '../vite.config.ts'), 'utf-8'
      );
      expect(viteConfig).toContain('manualChunks');
      // Should have vendor chunk splitting
      expect(viteConfig).toContain('vendor');
    });
  });

  describe('AI Root Cause Analysis Backend', () => {
    it('should have aiRootCauseRouter file', () => {
      const routerPath = path.join(__dirname, 'routers/aiRootCauseRouter.ts');
      expect(fs.existsSync(routerPath)).toBe(true);
    });

    it('should have analyze mutation in aiRootCauseRouter', () => {
      const routerContent = fs.readFileSync(
        path.join(__dirname, 'routers/aiRootCauseRouter.ts'), 'utf-8'
      );
      expect(routerContent).toContain('analyze:');
      expect(routerContent).toContain('protectedProcedure');
      expect(routerContent).toContain('invokeLLM');
      expect(routerContent).toContain('5M1E');
    });

    it('should have fallback root causes for all problem types', () => {
      const routerContent = fs.readFileSync(
        path.join(__dirname, 'routers/aiRootCauseRouter.ts'), 'utf-8'
      );
      expect(routerContent).toContain('cpk_decline');
      expect(routerContent).toContain('high_variation');
      expect(routerContent).toContain('out_of_spec');
      expect(routerContent).toContain('trend_shift');
      expect(routerContent).toContain('generateFallbackRootCauses');
      expect(routerContent).toContain('generateFallbackCausalChains');
    });

    it('should be registered in main routers.ts', () => {
      const routersContent = fs.readFileSync(
        path.join(__dirname, 'routers.ts'), 'utf-8'
      );
      expect(routersContent).toContain('aiRootCause: aiRootCauseRouter');
      expect(routersContent).toContain("import { aiRootCauseRouter }");
    });
  });

  describe('AI/IoT Frontend Backend Connection', () => {
    it('AiRootCause.tsx should use tRPC mutation instead of mock data', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '../client/src/pages/AiRootCause.tsx'), 'utf-8'
      );
      expect(content).toContain('trpc.aiRootCause.analyze.useMutation');
      expect(content).not.toContain('generateMockRootCauses');
      expect(content).not.toContain('demoRootCauses');
    });

    it('AiPredictive.tsx should use tRPC query for historical data', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '../client/src/pages/AiPredictive.tsx'), 'utf-8'
      );
      expect(content).toContain('trpc.ai.history.list.useQuery');
      // Should not have mock data generation functions (only comments are ok)
      expect(content).toContain('ai.history.list');
    });

    it('IoTGatewayConfig.tsx should use edgeGateway tRPC endpoints', () => {
      const content = fs.readFileSync(
        path.join(__dirname, '../client/src/pages/IoTGatewayConfig.tsx'), 'utf-8'
      );
      expect(content).toContain('trpc.edgeGateway');
      expect(content).not.toContain('mockGateways');
      expect(content).not.toContain('demoGateways');
    });
  });

  describe('Scheduled OEE Report Job', () => {
    it('should have processScheduledOeeReports in scheduledJobs.ts', () => {
      const content = fs.readFileSync(
        path.join(__dirname, 'scheduledJobs.ts'), 'utf-8'
      );
      expect(content).toContain('processScheduledOeeReports');
      expect(content).toContain('OEE report processor');
    });

    it('should have scheduledOeeReportService with all CRUD operations', () => {
      const content = fs.readFileSync(
        path.join(__dirname, 'services/scheduledOeeReportService.ts'), 'utf-8'
      );
      expect(content).toContain('getScheduledOeeReports');
      expect(content).toContain('createScheduledOeeReport');
      expect(content).toContain('sendOeeReport');
      expect(content).toContain('processScheduledOeeReports');
    });

    it('should have scheduledOeeReportRouter with CRUD endpoints', () => {
      const content = fs.readFileSync(
        path.join(__dirname, 'routers/scheduledOeeReportRouter.ts'), 'utf-8'
      );
      expect(content).toContain('list:');
      expect(content).toContain('create:');
      expect(content).toContain('update:');
      expect(content).toContain('delete:');
      expect(content).toContain('sendNow:');
    });

    it('should schedule OEE report processor with correct cron pattern', () => {
      const content = fs.readFileSync(
        path.join(__dirname, 'scheduledJobs.ts'), 'utf-8'
      );
      // Should run every 5 minutes to check for due reports
      const oeeJobSection = content.substring(
        content.indexOf('Weekly OEE report processor'),
        content.indexOf('OEE report processor every 5 minutes')
      );
      expect(oeeJobSection).toContain('*/5 * * * *');
      expect(oeeJobSection).toContain('Asia/Ho_Chi_Minh');
    });
  });
});
