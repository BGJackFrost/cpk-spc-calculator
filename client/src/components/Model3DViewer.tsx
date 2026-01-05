import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Grid, 
  Html,
  useGLTF,
  Center,
  ContactShadows,
  Stage,
  Bounds,
  useBounds,
} from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Box, 
  Maximize2,
  Grid3X3,
  Sun,
  Moon,
  Info,
  Loader2,
} from 'lucide-react';

interface Model3DViewerProps {
  modelUrl: string;
  modelName?: string;
  modelFormat?: 'gltf' | 'glb';
  defaultScale?: number;
  defaultRotationX?: number;
  defaultRotationY?: number;
  defaultRotationZ?: number;
  onModelLoaded?: (info: ModelInfo) => void;
  onError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
  showInfo?: boolean;
  autoRotate?: boolean;
  backgroundColor?: string;
}

interface ModelInfo {
  vertices: number;
  faces: number;
  materials: number;
  textures: number;
  animations: number;
  boundingBox: {
    width: number;
    height: number;
    depth: number;
  };
}

// Loading component
function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Đang tải model...</span>
      </div>
    </Html>
  );
}

// Error component
function ErrorIndicator({ message }: { message: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-red-400 bg-red-900/50 px-4 py-3 rounded-lg">
        <Box className="w-8 h-8" />
        <span className="text-sm">{message}</span>
      </div>
    </Html>
  );
}

// Model component with GLTF loader
function Model({ 
  url, 
  scale = 1, 
  rotation = [0, 0, 0],
  onLoaded,
  onError,
}: { 
  url: string; 
  scale?: number;
  rotation?: [number, number, number];
  onLoaded?: (info: ModelInfo) => void;
  onError?: (error: string) => void;
}) {
  const { scene, animations, materials } = useGLTF(url, true, true, (loader) => {
    loader.manager.onError = (url) => {
      onError?.(`Failed to load: ${url}`);
    };
  });
  
  const modelRef = useRef<THREE.Group>(null);
  const bounds = useBounds();
  
  useEffect(() => {
    if (scene && modelRef.current) {
      // Calculate model info
      let vertices = 0;
      let faces = 0;
      let materialsCount = 0;
      let texturesCount = 0;
      const materialsSet = new Set<THREE.Material>();
      const texturesSet = new Set<THREE.Texture>();
      
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geometry = child.geometry;
          if (geometry.attributes.position) {
            vertices += geometry.attributes.position.count;
          }
          if (geometry.index) {
            faces += geometry.index.count / 3;
          } else if (geometry.attributes.position) {
            faces += geometry.attributes.position.count / 3;
          }
          
          // Count materials
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat) {
              materialsSet.add(mat);
              // Count textures
              Object.values(mat).forEach((value) => {
                if (value instanceof THREE.Texture) {
                  texturesSet.add(value);
                }
              });
            }
          });
        }
      });
      
      materialsCount = materialsSet.size;
      texturesCount = texturesSet.size;
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      onLoaded?.({
        vertices,
        faces: Math.floor(faces),
        materials: materialsCount,
        textures: texturesCount,
        animations: animations?.length || 0,
        boundingBox: {
          width: parseFloat(size.x.toFixed(2)),
          height: parseFloat(size.y.toFixed(2)),
          depth: parseFloat(size.z.toFixed(2)),
        },
      });
      
      // Fit model to view
      bounds.refresh(modelRef.current).fit();
    }
  }, [scene, bounds, onLoaded, animations]);
  
  return (
    <group ref={modelRef} scale={scale} rotation={rotation}>
      <primitive object={scene.clone()} />
    </group>
  );
}

// Scene component
function Scene({
  modelUrl,
  scale = 1,
  rotation = [0, 0, 0],
  autoRotate = false,
  showGrid = true,
  darkMode = true,
  onModelLoaded,
  onError,
}: {
  modelUrl: string;
  scale?: number;
  rotation?: [number, number, number];
  autoRotate?: boolean;
  showGrid?: boolean;
  darkMode?: boolean;
  onModelLoaded?: (info: ModelInfo) => void;
  onError?: (error: string) => void;
}) {
  const controlsRef = useRef<any>(null);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        maxPolarAngle={Math.PI / 1.5}
      />
      
      {/* Lighting */}
      <ambientLight intensity={darkMode ? 0.3 : 0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={darkMode ? 0.8 : 1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      
      {/* Environment */}
      <Environment preset={darkMode ? "night" : "studio"} />
      
      {/* Grid */}
      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={darkMode ? "#374151" : "#d1d5db"}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={darkMode ? "#4b5563" : "#9ca3af"}
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
      
      {/* Contact shadows */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.5}
        scale={20}
        blur={2}
        far={10}
      />
      
      {/* Model */}
      <Bounds fit clip observe margin={1.5}>
        <Suspense fallback={<LoadingIndicator />}>
          <Model 
            url={modelUrl} 
            scale={scale}
            rotation={rotation}
            onLoaded={onModelLoaded}
            onError={onError}
          />
        </Suspense>
      </Bounds>
    </>
  );
}

// Main component
export function Model3DViewer({
  modelUrl,
  modelName,
  modelFormat = 'glb',
  defaultScale = 1,
  defaultRotationX = 0,
  defaultRotationY = 0,
  defaultRotationZ = 0,
  onModelLoaded,
  onError,
  className = '',
  showControls = true,
  showInfo = true,
  autoRotate = false,
  backgroundColor,
}: Model3DViewerProps) {
  const [isAutoRotate, setIsAutoRotate] = useState(autoRotate);
  const [showGrid, setShowGrid] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const rotation: [number, number, number] = [
    (defaultRotationX * Math.PI) / 180,
    (defaultRotationY * Math.PI) / 180,
    (defaultRotationZ * Math.PI) / 180,
  ];
  
  const handleModelLoaded = (info: ModelInfo) => {
    setModelInfo(info);
    setError(null);
    onModelLoaded?.(info);
  };
  
  const handleError = (err: string) => {
    setError(err);
    onError?.(err);
  };
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  const bgColor = backgroundColor || (darkMode ? '#111827' : '#f3f4f6');
  
  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full min-h-[400px] rounded-lg overflow-hidden ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Canvas */}
      <Canvas shadows>
        <color attach="background" args={[bgColor]} />
        <Scene
          modelUrl={modelUrl}
          scale={defaultScale}
          rotation={rotation}
          autoRotate={isAutoRotate}
          showGrid={showGrid}
          darkMode={darkMode}
          onModelLoaded={handleModelLoaded}
          onError={handleError}
        />
      </Canvas>
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-red-900/90 text-white px-4 py-3 rounded-lg max-w-md text-center">
            <Box className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Model name */}
      {modelName && (
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {modelName}
          </Badge>
        </div>
      )}
      
      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            title={isAutoRotate ? "Dừng xoay" : "Tự động xoay"}
          >
            <RotateCcw className={`w-4 h-4 ${isAutoRotate ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setShowGrid(!showGrid)}
            title={showGrid ? "Ẩn lưới" : "Hiện lưới"}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-black/50 hover:bg-black/70 text-white"
            onClick={toggleFullscreen}
            title="Toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Model info */}
      {showInfo && modelInfo && (
        <div className="absolute top-3 right-3 bg-black/50 text-white text-xs rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 font-medium mb-2">
            <Info className="w-3 h-3" />
            Thông tin Model
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-400">Vertices:</span>
            <span>{modelInfo.vertices.toLocaleString()}</span>
            <span className="text-gray-400">Faces:</span>
            <span>{modelInfo.faces.toLocaleString()}</span>
            <span className="text-gray-400">Materials:</span>
            <span>{modelInfo.materials}</span>
            <span className="text-gray-400">Textures:</span>
            <span>{modelInfo.textures}</span>
            <span className="text-gray-400">Animations:</span>
            <span>{modelInfo.animations}</span>
          </div>
          <div className="border-t border-white/20 pt-1 mt-1">
            <span className="text-gray-400">Bounding Box:</span>
            <div className="text-[10px]">
              {modelInfo.boundingBox.width} x {modelInfo.boundingBox.height} x {modelInfo.boundingBox.depth}
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-3 right-3 text-white/50 text-[10px]">
        <div>Chuột trái: Xoay</div>
        <div>Chuột phải: Di chuyển</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  );
}

export default Model3DViewer;
