/**
 * Model3DViewerLazy - Lazy loaded wrapper for Model3DViewer
 * Code splits Three.js và @react-three/fiber để giảm bundle size
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Types - re-export from Model3DViewer
export interface Model3DViewerProps {
  modelUrl?: string;
  modelType?: 'gltf' | 'glb' | 'obj' | 'fbx';
  autoRotate?: boolean;
  rotationSpeed?: number;
  backgroundColor?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  cameraPosition?: { x: number; y: number; z: number };
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  className?: string;
  height?: string | number;
  width?: string | number;
}

// Loading component for 3D viewer
function Viewer3DLoader() {
  return (
    <Card className="w-full h-full min-h-[300px]">
      <CardContent className="flex items-center justify-center h-full p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium text-sm">Đang tải trình xem 3D...</p>
            <p className="text-xs text-muted-foreground">
              Đang tải thư viện đồ họa
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lazy load with retry logic
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Model3DViewer] Retry ${i + 1}/${retries} failed:`, error);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

// Lazy loaded Model3DViewer component
const LazyModel3DViewer = lazyWithRetry(() => import('./Model3DViewer'));

// Main wrapper component
export default function Model3DViewerLazy(props: Model3DViewerProps) {
  return (
    <Suspense fallback={<Viewer3DLoader />}>
      <LazyModel3DViewer {...props} />
    </Suspense>
  );
}

// Named export for explicit usage
export { Model3DViewerLazy };
