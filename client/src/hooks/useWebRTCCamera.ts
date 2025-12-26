/**
 * WebRTC Camera Hook
 * Hook để truy cập camera thiết bị qua WebRTC API
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraSettings {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
}

export interface UseWebRTCCameraReturn {
  // State
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  devices: CameraDevice[];
  selectedDevice: string | null;
  
  // Refs
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  
  // Actions
  startCamera: (deviceId?: string, settings?: CameraSettings) => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
  captureBlob: () => Promise<Blob | null>;
  switchCamera: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
}

const DEFAULT_SETTINGS: CameraSettings = {
  width: 1280,
  height: 720,
  facingMode: 'environment',
  frameRate: 30,
};

export function useWebRTCCamera(): UseWebRTCCameraReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Get list of available camera devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        }));
      
      setDevices(videoDevices);
      
      // Select first device if none selected
      if (!selectedDevice && videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      setError('Không thể lấy danh sách camera. Vui lòng cấp quyền truy cập camera.');
    }
  }, [selectedDevice]);
  
  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string, settings?: CameraSettings) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
      const targetDeviceId = deviceId || selectedDevice;
      
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
          width: { ideal: mergedSettings.width },
          height: { ideal: mergedSettings.height },
          facingMode: mergedSettings.facingMode,
          frameRate: { ideal: mergedSettings.frameRate },
        },
        audio: false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsStreaming(true);
      setSelectedDevice(targetDeviceId || null);
      
      // Refresh device list to get labels
      await refreshDevices();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
        setError('Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('Không tìm thấy camera. Vui lòng kết nối camera và thử lại.');
      } else if (errorMessage.includes('NotReadableError')) {
        setError('Camera đang được sử dụng bởi ứng dụng khác.');
      } else {
        setError(`Lỗi khởi động camera: ${errorMessage}`);
      }
      
      console.error('Camera start error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice, refreshDevices]);
  
  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setError(null);
  }, []);
  
  // Capture current frame as base64 data URL
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      return null;
    }
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Return as base64 data URL
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isStreaming]);
  
  // Capture current frame as Blob
  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      return null;
    }
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Return as Blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  }, [isStreaming]);
  
  // Switch to different camera
  const switchCamera = useCallback(async (deviceId: string) => {
    await startCamera(deviceId);
  }, [startCamera]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Initial device enumeration
  useEffect(() => {
    refreshDevices();
  }, []);
  
  return {
    isStreaming,
    isLoading,
    error,
    devices,
    selectedDevice,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureFrame,
    captureBlob,
    switchCamera,
    refreshDevices,
  };
}

export default useWebRTCCamera;
