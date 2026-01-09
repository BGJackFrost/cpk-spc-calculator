/**
 * FloorPlan3DLazy - Lazy loaded wrapper for FloorPlan3D
 * Code splits Three.js và @react-three/fiber để giảm bundle size
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Types - re-export from FloorPlan3D
export interface DevicePosition {
  id: number;
  deviceId: number;
  deviceName: string;
  deviceType: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  animationType?: 'none' | 'pulse' | 'rotate' | 'bounce' | 'glow';
  metrics?: {
    temperature?: number;
    humidity?: number;
    power?: number;
    [key: string]: number | undefined;
  };
}

export interface FloorPlan3DProps {
  modelUrl?: string;
  devices: DevicePosition[];
  onDeviceClick?: (device: DevicePosition) => void;
  gridEnabled?: boolean;
  gridSize?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  selectedDeviceId?: number;
  showLabels?: boolean;
  showMetrics?: boolean;
}

// Loading component for 3D scene
function Scene3DLoader() {
  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardContent className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">Đang tải mô hình 3D...</p>
            <p className="text-sm text-muted-foreground">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Error fallback
function Scene3DError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardContent className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">!</span>
          </div>
          <div>
            <p className="font-medium">Không thể tải mô hình 3D</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
          <button
            onClick={retry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Thử lại
          </button>
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
        console.warn(`[FloorPlan3D] Retry ${i + 1}/${retries} failed:`, error);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

// Lazy loaded FloorPlan3D component
const LazyFloorPlan3D = lazyWithRetry(() => import('./FloorPlan3D'));

// Main wrapper component
export default function FloorPlan3DLazy(props: FloorPlan3DProps) {
  return (
    <Suspense fallback={<Scene3DLoader />}>
      <LazyFloorPlan3D {...props} />
    </Suspense>
  );
}

// Named export for explicit usage
export { FloorPlan3DLazy };
