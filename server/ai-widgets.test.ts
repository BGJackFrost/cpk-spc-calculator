import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('AI Widgets - CPK Forecasting & Defect Detection', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const ctx: TrpcContext = {
      user: { 
        id: 1, 
        openId: 'test-user', 
        name: 'Test User', 
        role: 'admin',
        email: 'test@example.com',
        loginMethod: 'manus',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date()
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(ctx);
  });

  describe('CPK Forecasting API', () => {
    it('should have predictCpk procedure', () => {
      expect(caller.ai.predict.predictCpk).toBeDefined();
      expect(typeof caller.ai.predict.predictCpk).toBe('function');
    });

    it('should have batchPredict procedure', () => {
      expect(caller.ai.predict.batchPredict).toBeDefined();
      expect(typeof caller.ai.predict.batchPredict).toBe('function');
    });

    it('should have getPredictionHistory procedure', () => {
      expect(caller.ai.predict.getPredictionHistory).toBeDefined();
      expect(typeof caller.ai.predict.getPredictionHistory).toBe('function');
    });
  });

  describe('Defect Detection API', () => {
    it('should have detectDefects procedure', () => {
      expect(caller.ai.predict.detectDefects).toBeDefined();
      expect(typeof caller.ai.predict.detectDefects).toBe('function');
    });

    it('should have classifyDefect procedure', () => {
      expect(caller.ai.predict.classifyDefect).toBeDefined();
      expect(typeof caller.ai.predict.classifyDefect).toBe('function');
    });
  });

  describe('Widget Integration', () => {
    it('should have all required procedures for widgets', () => {
      // CPK Forecasting widget needs
      expect(caller.ai.predict.predictCpk).toBeDefined();
      expect(caller.ai.predict.batchPredict).toBeDefined();
      expect(caller.ai.predict.getPredictionHistory).toBeDefined();
      
      // Defect Detection widget needs
      expect(caller.ai.predict.detectDefects).toBeDefined();
      expect(caller.ai.predict.classifyDefect).toBeDefined();
    });
  });
});
