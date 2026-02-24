/**
 * Test utility functions for creating test contexts
 */
import type { TrpcContext } from './context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

export function createMockUser(overrides: Partial<AuthenticatedUser> & { userId?: string | number } = {}): AuthenticatedUser {
  const { userId, ...rest } = overrides;
  return {
    id: userId !== undefined ? userId as any : (rest.id !== undefined ? rest.id : 999),
    openId: 'test-user-' + Math.random().toString(36).substring(7),
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...rest,
  };
}

// Sync version - returns context without caller (for tests that only check ctx properties)
export function createTestContext(user?: any): TrpcContext & { caller?: any } {
  const resolvedUser = createMockUser(user || {});
  
  const ctx: TrpcContext & { caller?: any } = {
    user: resolvedUser,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };

  return ctx;
}

// Async version - returns context with caller attached
export async function createTestContextWithCaller(user?: any): Promise<TrpcContext & { caller: any }> {
  const ctx = createTestContext(user);
  
  try {
    const { appRouter } = await import('../routers');
    ctx.caller = appRouter.createCaller(ctx);
  } catch {
    // Router may not be available in all test contexts
  }

  return ctx as TrpcContext & { caller: any };
}
