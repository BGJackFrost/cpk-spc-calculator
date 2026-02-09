import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Image source URL */
  src: string;
  /** Low-quality placeholder (base64 or tiny URL) */
  placeholder?: string;
  /** Responsive srcSet for different screen sizes */
  srcSet?: string;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Whether to use WebP format via optimization endpoint */
  optimized?: boolean;
  /** Desired width for optimized images */
  optimizedWidth?: number;
  /** Desired quality for optimized images (1-100) */
  optimizedQuality?: number;
  /** Root margin for intersection observer (load before visible) */
  rootMargin?: string;
  /** Blur-up animation duration in ms */
  blurDuration?: number;
  /** Fallback content when image fails to load */
  fallback?: React.ReactNode;
}

/**
 * LazyImage - Performant image component with:
 * - Intersection Observer lazy loading
 * - Blur-up placeholder animation
 * - WebP/AVIF auto-negotiation
 * - Error fallback
 * - Native loading="lazy" as fallback
 */
export function LazyImage({
  src,
  placeholder,
  srcSet,
  sizes,
  optimized = false,
  optimizedWidth,
  optimizedQuality = 80,
  rootMargin = '200px 0px',
  blurDuration = 300,
  fallback,
  className,
  alt = '',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    // If IntersectionObserver not supported, load immediately
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin]);

  // Build optimized URL if requested
  const getOptimizedSrc = (originalSrc: string): string => {
    if (!optimized || !originalSrc) return originalSrc;
    
    // If it's already an external URL, return as-is
    if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
      return originalSrc;
    }

    const params = new URLSearchParams();
    if (optimizedWidth) params.set('w', String(optimizedWidth));
    if (optimizedQuality !== 80) params.set('q', String(optimizedQuality));
    
    return `/api/image-optimize${originalSrc}?${params.toString()}`;
  };

  const actualSrc = isInView ? getOptimizedSrc(src) : undefined;

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={props.style}
    >
      {/* Placeholder (blur-up effect) */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={actualSrc}
        srcSet={isInView ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          transitionDuration: `${blurDuration}ms`,
        }}
        {...props}
      />

      {/* Loading skeleton */}
      {!isLoaded && !placeholder && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Error state */}
      {hasError && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Generate responsive srcSet for common breakpoints
 */
export function generateSrcSet(
  baseSrc: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map((w) => {
      const params = new URLSearchParams();
      params.set('w', String(w));
      return `/api/image-optimize${baseSrc}?${params.toString()} ${w}w`;
    })
    .join(', ');
}

export default LazyImage;
