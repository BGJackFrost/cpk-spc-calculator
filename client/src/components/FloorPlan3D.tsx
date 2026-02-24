import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Grid, 
  Html,
  useGLTF,
  Center,
  Text,
  Box,
  Sphere,
  Cylinder,
} from '@react-three/drei';
import * as THREE from 'three';

// Types
interface DevicePosition {
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

interface FloorPlan3DProps {
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

// Status colors
const statusColors: Record<string, string> = {
  online: '#22c55e',
  offline: '#6b7280',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Device type icons/models
const deviceTypeModels: Record<string, 'box' | 'sphere' | 'cylinder'> = {
  plc: 'box',
  sensor: 'sphere',
  gateway: 'cylinder',
  hmi: 'box',
  scada: 'box',
  other: 'sphere',
};

// Animated device component
function AnimatedDevice({ 
  device, 
  onClick, 
  isSelected,
  showLabel,
  showMetrics,
}: { 
  device: DevicePosition; 
  onClick?: () => void;
  isSelected?: boolean;
  showLabel?: boolean;
  showMetrics?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseColor = statusColors[device.status] || statusColors.offline;
  
  // Animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    switch (device.animationType) {
      case 'pulse':
        const scale = 1 + Math.sin(time * 3) * 0.1;
        meshRef.current.scale.setScalar(scale * (device.scale || 1));
        break;
      case 'rotate':
        meshRef.current.rotation.y = time;
        break;
      case 'bounce':
        meshRef.current.position.y = device.position.y + Math.abs(Math.sin(time * 2)) * 0.3;
        break;
      case 'glow':
        // Glow effect handled by material
        break;
      default:
        break;
    }
  });
  
  const modelType = deviceTypeModels[device.deviceType] || 'sphere';
  const scale = device.scale || 1;
  
  const DeviceModel = () => {
    const commonProps = {
      ref: meshRef,
      position: [device.position.x, device.position.y, device.position.z] as [number, number, number],
      onClick: (e: any) => {
        e.stopPropagation();
        onClick?.();
      },
      onPointerOver: () => setHovered(true),
      onPointerOut: () => setHovered(false),
    };
    
    const material = (
      <meshStandardMaterial 
        color={hovered || isSelected ? '#3b82f6' : baseColor}
        emissive={device.animationType === 'glow' ? baseColor : '#000000'}
        emissiveIntensity={device.animationType === 'glow' ? 0.5 : 0}
        metalness={0.3}
        roughness={0.7}
      />
    );
    
    switch (modelType) {
      case 'box':
        return (
          <Box {...commonProps} args={[0.8 * scale, 0.5 * scale, 0.6 * scale]}>
            {material}
          </Box>
        );
      case 'cylinder':
        return (
          <Cylinder {...commonProps} args={[0.3 * scale, 0.3 * scale, 0.8 * scale, 16]}>
            {material}
          </Cylinder>
        );
      case 'sphere':
      default:
        return (
          <Sphere {...commonProps} args={[0.3 * scale, 16, 16]}>
            {material}
          </Sphere>
        );
    }
  };
  
  return (
    <group>
      <DeviceModel />
      
      {/* Label */}
      {(showLabel || hovered || isSelected) && (
        <Html
          position={[device.position.x, device.position.y + 1, device.position.z]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`
            px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap
            ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white'}
            shadow-lg
          `}>
            <div className="font-semibold">{device.deviceName}</div>
            <div className="text-[10px] opacity-80">{device.deviceType}</div>
            {showMetrics && device.metrics && (
              <div className="mt-1 text-[10px] border-t border-white/20 pt-1">
                {device.metrics.temperature !== undefined && (
                  <div>🌡️ {device.metrics.temperature}°C</div>
                )}
                {device.metrics.humidity !== undefined && (
                  <div>💧 {device.metrics.humidity}%</div>
                )}
                {device.metrics.power !== undefined && (
                  <div>⚡ {device.metrics.power}W</div>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
      
      {/* Status indicator ring */}
      <mesh
        position={[device.position.x, device.position.y - 0.3, device.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.4 * scale, 0.5 * scale, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// Factory floor model (placeholder when no custom model)
function FactoryFloor({ size = 20 }: { size?: number }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Walls */}
      <group>
        {/* Back wall */}
        <mesh position={[0, 2, -size/2]}>
          <boxGeometry args={[size, 4, 0.2]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        {/* Left wall */}
        <mesh position={[-size/2, 2, 0]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[size, 4, 0.2]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        {/* Right wall */}
        <mesh position={[size/2, 2, 0]} rotation={[0, Math.PI/2, 0]}>
          <boxGeometry args={[size, 4, 0.2]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      </group>
      
      {/* Pillars */}
      {[-6, 0, 6].map((x) => 
        [-6, 6].map((z) => (
          <mesh key={`pillar-${x}-${z}`} position={[x, 2, z]}>
            <cylinderGeometry args={[0.3, 0.3, 4, 16]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        ))
      )}
      
      {/* Conveyor belts (decorative) */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[12, 0.3, 1]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 0.5, 4]}>
        <boxGeometry args={[12, 0.3, 1]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
}

// Custom GLTF model loader
function CustomModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  
  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
}

// Scene component
function Scene({
  modelUrl,
  devices,
  onDeviceClick,
  gridEnabled = true,
  gridSize = 20,
  cameraPosition = { x: 10, y: 10, z: 10 },
  cameraTarget = { x: 0, y: 0, z: 0 },
  selectedDeviceId,
  showLabels = true,
  showMetrics = false,
}: FloorPlan3DProps) {
  const controlsRef = useRef<any>(null);
  
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
        fov={60}
      />
      <OrbitControls
        ref={controlsRef}
        target={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      
      {/* Environment */}
      <Environment preset="warehouse" />
      
      {/* Grid */}
      {gridEnabled && (
        <Grid
          args={[gridSize, gridSize]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#4b5563"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6b7280"
          fadeDistance={50}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
      
      {/* Floor/Model */}
      <Suspense fallback={null}>
        {modelUrl ? (
          <CustomModel url={modelUrl} />
        ) : (
          <FactoryFloor size={gridSize} />
        )}
      </Suspense>
      
      {/* Devices */}
      {devices.map((device) => (
        <AnimatedDevice
          key={device.id}
          device={device}
          onClick={() => onDeviceClick?.(device)}
          isSelected={selectedDeviceId === device.deviceId}
          showLabel={showLabels}
          showMetrics={showMetrics}
        />
      ))}
    </>
  );
}

// Main component
export function FloorPlan3D(props: FloorPlan3DProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas shadows>
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

// Controls overlay component
export function FloorPlan3DControls({
  onResetCamera,
  onToggleLabels,
  onToggleMetrics,
  onToggleGrid,
  showLabels,
  showMetrics,
  gridEnabled,
}: {
  onResetCamera?: () => void;
  onToggleLabels?: () => void;
  onToggleMetrics?: () => void;
  onToggleGrid?: () => void;
  showLabels?: boolean;
  showMetrics?: boolean;
  gridEnabled?: boolean;
}) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <button
        onClick={onResetCamera}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
        title="Reset Camera"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={onToggleLabels}
        className={`p-2 ${showLabels ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors`}
        title="Toggle Labels"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={onToggleMetrics}
        className={`p-2 ${showMetrics ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors`}
        title="Toggle Metrics"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      </button>
      
      <button
        onClick={onToggleGrid}
        className={`p-2 ${gridEnabled ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors`}
        title="Toggle Grid"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" />
          <path d="M8 5v10M12 5v10M5 8h10M5 12h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}

// Legend component
export function FloorPlan3DLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 z-10">
      <h4 className="text-white text-sm font-semibold mb-2">Trạng thái thiết bị</h4>
      <div className="flex flex-col gap-1.5">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <span className="text-white text-xs capitalize">
              {status === 'online' ? 'Hoạt động' : 
               status === 'offline' ? 'Ngắt kết nối' :
               status === 'warning' ? 'Cảnh báo' : 'Lỗi'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FloorPlan3D;
