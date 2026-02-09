/**
 * Test utility functions - alias for test-utils.ts
 * For scheduledReport.test.ts which uses async createTestContext with caller
 */
import type { TrpcContext } from './context';
export { createMockUser } from './test-utils';

// Re-export createTestContext as async version with caller for backward compatibility
// scheduledReport.test.ts uses: ctx = await createTestContext(mockUser) and ctx.caller.*
export async function createTestContext(user?: any): Promise<TrpcContext & { caller?: any }> {
  const { createTestContextWithCaller } = await import('./test-utils');
  return createTestContextWithCaller(user);
}
