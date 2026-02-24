/**
 * Cursor-based Pagination Utilities
 * 
 * This module provides utilities for implementing cursor-based pagination
 * which is more efficient than offset-based pagination for large datasets.
 */

// Cursor encoding/decoding
export function encodeCursor(data: { id: number; createdAt?: Date | string }): string {
  const payload = {
    id: data.id,
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor(cursor: string): { id: number; createdAt?: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Pagination input type
export interface CursorPaginationInput {
  cursor?: string | null;
  limit?: number;
  direction?: 'forward' | 'backward';
}

// Pagination result type
export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Validate and normalize pagination input
export function normalizePaginationInput(input: CursorPaginationInput): {
  cursor: { id: number; createdAt?: string } | null;
  limit: number;
  direction: 'forward' | 'backward';
} {
  const limit = Math.min(Math.max(input.limit || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const direction = input.direction || 'forward';
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;
  
  return { cursor, limit, direction };
}

// Build pagination result
export function buildPaginationResult<T extends { id: number; createdAt?: Date | string }>(
  items: T[],
  limit: number,
  direction: 'forward' | 'backward',
  totalCount?: number
): CursorPaginationResult<T> {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;
  
  // For backward pagination, reverse the items
  if (direction === 'backward') {
    paginatedItems.reverse();
  }
  
  const firstItem = paginatedItems[0];
  const lastItem = paginatedItems[paginatedItems.length - 1];
  
  return {
    items: paginatedItems,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem) : null,
    prevCursor: firstItem ? encodeCursor(firstItem) : null,
    hasMore,
    totalCount,
  };
}

// SQL helper for cursor-based queries
export function getCursorCondition(
  cursor: { id: number; createdAt?: string } | null,
  direction: 'forward' | 'backward',
  orderByCreatedAt: boolean = true
): string {
  if (!cursor) return '';
  
  if (orderByCreatedAt && cursor.createdAt) {
    const op = direction === 'forward' ? '<' : '>';
    return `(createdAt ${op} '${cursor.createdAt}' OR (createdAt = '${cursor.createdAt}' AND id ${op} ${cursor.id}))`;
  }
  
  const op = direction === 'forward' ? '<' : '>';
  return `id ${op} ${cursor.id}`;
}
