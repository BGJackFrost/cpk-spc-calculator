import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Image Optimization Service
 * - Convert images to WebP/AVIF formats on-the-fly
 * - Generate responsive image variants (thumbnails, medium, large)
 * - Cache optimized images to avoid re-processing
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'original';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  size: number;
}

// In-memory cache for optimized images (LRU-like)
const imageCache = new Map<string, { data: OptimizedImage; timestamp: number }>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 3600000; // 1 hour

function getCacheKey(inputPath: string, options: ImageOptimizationOptions): string {
  return `${inputPath}:${options.width || 'auto'}x${options.height || 'auto'}:${options.format || 'webp'}:${options.quality || 80}:${options.fit || 'cover'}`;
}

function cleanCache(): void {
  if (imageCache.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  const entries = Array.from(imageCache.entries());
  // Remove expired entries first
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  // If still too large, remove oldest entries
  if (imageCache.size > MAX_CACHE_SIZE) {
    const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, sorted.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      imageCache.delete(key);
    }
  }
}

/**
 * Optimize an image buffer with given options
 */
export async function optimizeImage(
  input: Buffer | string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'cover'
  } = options;

  // Check cache
  const cacheKey = typeof input === 'string' ? getCacheKey(input, options) : '';
  if (cacheKey) {
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  let pipeline = sharp(input);

  // Resize if dimensions specified
  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit,
      withoutEnlargement: true,
    });
  }

  // Convert format
  let contentType: string;
  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      contentType = 'image/webp';
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, effort: 4 });
      contentType = 'image/avif';
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      contentType = 'image/jpeg';
      break;
    case 'png':
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      contentType = 'image/png';
      break;
    default:
      contentType = 'image/webp';
      pipeline = pipeline.webp({ quality });
  }

  const buffer = await pipeline.toBuffer();
  const metadata = await sharp(buffer).metadata();

  const result: OptimizedImage = {
    buffer,
    contentType,
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: buffer.length,
  };

  // Cache result
  if (cacheKey) {
    cleanCache();
    imageCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }

  return result;
}

/**
 * Generate responsive image variants
 */
export async function generateResponsiveVariants(
  input: Buffer | string,
  options: { quality?: number; format?: 'webp' | 'avif' } = {}
): Promise<{
  thumbnail: OptimizedImage;
  small: OptimizedImage;
  medium: OptimizedImage;
  large: OptimizedImage;
}> {
  const { quality = 80, format = 'webp' } = options;

  const [thumbnail, small, medium, large] = await Promise.all([
    optimizeImage(input, { width: 150, height: 150, quality, format, fit: 'cover' }),
    optimizeImage(input, { width: 400, quality, format }),
    optimizeImage(input, { width: 800, quality, format }),
    optimizeImage(input, { width: 1200, quality, format }),
  ]);

  return { thumbnail, small, medium, large };
}

/**
 * Get best format based on Accept header
 */
export function getBestFormat(acceptHeader: string | undefined): 'avif' | 'webp' | 'jpeg' {
  if (!acceptHeader) return 'jpeg';
  if (acceptHeader.includes('image/avif')) return 'avif';
  if (acceptHeader.includes('image/webp')) return 'webp';
  return 'jpeg';
}

/**
 * Express middleware for on-the-fly image optimization
 * Usage: app.get('/optimized-image/*', imageOptimizationMiddleware(uploadsDir))
 */
export function createImageOptimizationMiddleware(baseDir: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const imagePath = req.params[0] || req.path;
      const fullPath = path.resolve(baseDir, imagePath);

      // Security: prevent path traversal
      if (!fullPath.startsWith(path.resolve(baseDir))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check file exists
      if (!fs.existsSync(fullPath)) {
        return next();
      }

      // Parse query params
      const width = req.query.w ? parseInt(req.query.w) : undefined;
      const height = req.query.h ? parseInt(req.query.h) : undefined;
      const quality = req.query.q ? parseInt(req.query.q) : 80;
      const format = (req.query.f as 'webp' | 'avif' | 'jpeg') || getBestFormat(req.headers.accept);

      const optimized = await optimizeImage(fullPath, {
        width,
        height,
        quality,
        format,
      });

      res.setHeader('Content-Type', optimized.contentType);
      res.setHeader('Content-Length', optimized.size);
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('Vary', 'Accept');
      res.send(optimized.buffer);
    } catch (error) {
      next(error);
    }
  };
}
