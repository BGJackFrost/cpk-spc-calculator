import { describe, it, expect, vi } from 'vitest';

// Mock sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    avif: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image-data')),
    metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
  }));
  return { default: mockSharp };
});

describe('imageOptimizationService', () => {
  it('should export optimizeImage function', async () => {
    const { optimizeImage } = await import('./imageOptimizationService');
    expect(typeof optimizeImage).toBe('function');
  });

  it('should optimize image to webp by default', async () => {
    const { optimizeImage } = await import('./imageOptimizationService');
    const input = Buffer.from('test-image-data');
    const result = await optimizeImage(input, { format: 'webp' });

    expect(result).toBeDefined();
    expect(result.contentType).toBe('image/webp');
    expect(result.buffer).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
  });

  it('should optimize image to avif format', async () => {
    const { optimizeImage } = await import('./imageOptimizationService');
    const input = Buffer.from('test-image-data');
    const result = await optimizeImage(input, { format: 'avif' });

    expect(result.contentType).toBe('image/avif');
  });

  it('should optimize image to jpeg format', async () => {
    const { optimizeImage } = await import('./imageOptimizationService');
    const input = Buffer.from('test-image-data');
    const result = await optimizeImage(input, { format: 'jpeg' });

    expect(result.contentType).toBe('image/jpeg');
  });

  it('should export getBestFormat function', async () => {
    const { getBestFormat } = await import('./imageOptimizationService');

    expect(getBestFormat('image/avif,image/webp,*/*')).toBe('avif');
    expect(getBestFormat('image/webp,*/*')).toBe('webp');
    expect(getBestFormat('text/html,*/*')).toBe('jpeg');
    expect(getBestFormat(undefined)).toBe('jpeg');
  });

  it('should export generateResponsiveVariants function', async () => {
    const { generateResponsiveVariants } = await import('./imageOptimizationService');
    expect(typeof generateResponsiveVariants).toBe('function');

    const input = Buffer.from('test-image-data');
    const result = await generateResponsiveVariants(input);

    expect(result.thumbnail).toBeDefined();
    expect(result.small).toBeDefined();
    expect(result.medium).toBeDefined();
    expect(result.large).toBeDefined();
  });

  it('should export createImageOptimizationMiddleware function', async () => {
    const { createImageOptimizationMiddleware } = await import('./imageOptimizationService');
    expect(typeof createImageOptimizationMiddleware).toBe('function');

    const middleware = createImageOptimizationMiddleware('/tmp');
    expect(typeof middleware).toBe('function');
  });
});
