/**
 * Computer Vision Defect Detection Service
 * Phát hiện lỗi sản phẩm bằng AI/Computer Vision
 */

// Types
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedDefect {
  id: string;
  type: string;
  confidence: number;
  boundingBox: BoundingBox;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction?: string;
}

export interface DetectionResult {
  imageId: string;
  originalImageUrl: string;
  annotatedImageUrl?: string;
  defects: DetectedDefect[];
  totalDefects: number;
  overallQuality: 'pass' | 'fail' | 'warning';
  qualityScore: number;
  processingTime: number;
  timestamp: Date;
  metadata: {
    imageWidth: number;
    imageHeight: number;
    modelVersion: string;
    confidenceThreshold: number;
  };
}

export interface VisionConfig {
  confidenceThreshold: number;
  enableAutoAnnotation: boolean;
  defectCategories: string[];
  qualityPassThreshold: number;
}

export interface DefectCategory {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DetectionOptions {
  useSimulation?: boolean;
  config?: Partial<VisionConfig>;
}

// Default configuration
export function getDefaultVisionConfig(): VisionConfig {
  return {
    confidenceThreshold: 0.7,
    enableAutoAnnotation: true,
    defectCategories: ['scratch', 'dent', 'crack', 'discoloration', 'contamination', 'deformation'],
    qualityPassThreshold: 85,
  };
}

// Defect categories
const DEFECT_CATEGORIES: DefectCategory[] = [
  { id: 'scratch', name: 'Trầy xước', description: 'Vết trầy xước trên bề mặt sản phẩm', severity: 'medium' },
  { id: 'dent', name: 'Lõm/Móp', description: 'Vết lõm hoặc móp trên bề mặt', severity: 'high' },
  { id: 'crack', name: 'Nứt', description: 'Vết nứt trên sản phẩm', severity: 'critical' },
  { id: 'discoloration', name: 'Đổi màu', description: 'Vùng bị đổi màu bất thường', severity: 'medium' },
  { id: 'contamination', name: 'Tạp chất', description: 'Tạp chất hoặc bụi bẩn trên sản phẩm', severity: 'low' },
  { id: 'deformation', name: 'Biến dạng', description: 'Sản phẩm bị biến dạng hình dạng', severity: 'high' },
  { id: 'bubble', name: 'Bọt khí', description: 'Bọt khí trong vật liệu', severity: 'medium' },
  { id: 'missing_part', name: 'Thiếu chi tiết', description: 'Thiếu một phần của sản phẩm', severity: 'critical' },
];

// Get defect categories
export function getDefectCategories(): DefectCategory[] {
  return DEFECT_CATEGORIES;
}

// Generate random defect for simulation
function generateRandomDefect(imageWidth: number, imageHeight: number): DetectedDefect {
  const category = DEFECT_CATEGORIES[Math.floor(Math.random() * DEFECT_CATEGORIES.length)];
  const boxWidth = 50 + Math.random() * 100;
  const boxHeight = 50 + Math.random() * 100;
  
  return {
    id: `defect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: category.name,
    confidence: 0.7 + Math.random() * 0.25,
    boundingBox: {
      x: Math.random() * (imageWidth - boxWidth),
      y: Math.random() * (imageHeight - boxHeight),
      width: boxWidth,
      height: boxHeight,
    },
    severity: category.severity,
    description: category.description,
    suggestedAction: getSuggestedAction(category.severity),
  };
}

// Get suggested action based on severity
function getSuggestedAction(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'Loại bỏ sản phẩm ngay lập tức. Kiểm tra quy trình sản xuất.';
    case 'high':
      return 'Đánh dấu để kiểm tra thủ công. Có thể cần sửa chữa.';
    case 'medium':
      return 'Ghi nhận và theo dõi. Xem xét sửa chữa nếu cần.';
    case 'low':
      return 'Ghi nhận. Có thể chấp nhận được tùy tiêu chuẩn.';
    default:
      return 'Kiểm tra thêm.';
  }
}

// Calculate quality score
function calculateQualityScore(defects: DetectedDefect[]): number {
  if (defects.length === 0) return 100;
  
  let deduction = 0;
  for (const defect of defects) {
    switch (defect.severity) {
      case 'critical':
        deduction += 30 * defect.confidence;
        break;
      case 'high':
        deduction += 20 * defect.confidence;
        break;
      case 'medium':
        deduction += 10 * defect.confidence;
        break;
      case 'low':
        deduction += 5 * defect.confidence;
        break;
    }
  }
  
  return Math.max(0, Math.round(100 - deduction));
}

// Determine overall quality
function determineOverallQuality(qualityScore: number, threshold: number): 'pass' | 'fail' | 'warning' {
  if (qualityScore >= threshold) return 'pass';
  if (qualityScore >= threshold - 15) return 'warning';
  return 'fail';
}

// Main detection function
export async function detectDefects(
  imageUrl: string,
  options: DetectionOptions = {}
): Promise<DetectionResult> {
  const startTime = Date.now();
  const config = { ...getDefaultVisionConfig(), ...options.config };
  
  // Simulate image dimensions
  const imageWidth = 1920;
  const imageHeight = 1080;
  
  let defects: DetectedDefect[] = [];
  
  if (options.useSimulation !== false) {
    // Simulation mode - generate random defects
    const numDefects = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 4);
    for (let i = 0; i < numDefects; i++) {
      const defect = generateRandomDefect(imageWidth, imageHeight);
      if (defect.confidence >= config.confidenceThreshold) {
        defects.push(defect);
      }
    }
  } else {
    // Real detection would call external AI service
    // For now, return empty defects for non-simulation mode
    defects = [];
  }
  
  const qualityScore = calculateQualityScore(defects);
  const overallQuality = determineOverallQuality(qualityScore, config.qualityPassThreshold);
  
  const processingTime = Date.now() - startTime + Math.floor(Math.random() * 200);
  
  return {
    imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalImageUrl: imageUrl,
    annotatedImageUrl: config.enableAutoAnnotation ? `${imageUrl}?annotated=true` : undefined,
    defects,
    totalDefects: defects.length,
    overallQuality,
    qualityScore,
    processingTime,
    timestamp: new Date(),
    metadata: {
      imageWidth,
      imageHeight,
      modelVersion: '1.0.0',
      confidenceThreshold: config.confidenceThreshold,
    },
  };
}

// Batch detection
export async function detectDefectsBatch(
  imageUrls: string[],
  options: DetectionOptions = {}
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  
  for (const url of imageUrls) {
    const result = await detectDefects(url, options);
    results.push(result);
  }
  
  return results;
}

// Get statistics from detection results
export function getDefectStatistics(results: DetectionResult[]): {
  totalImages: number;
  totalDefects: number;
  passRate: number;
  averageQualityScore: number;
  defectsByType: Record<string, number>;
  defectsBySeverity: Record<string, number>;
} {
  if (results.length === 0) {
    return {
      totalImages: 0,
      totalDefects: 0,
      passRate: 0,
      averageQualityScore: 0,
      defectsByType: {},
      defectsBySeverity: {},
    };
  }
  
  const totalImages = results.length;
  const totalDefects = results.reduce((sum, r) => sum + r.totalDefects, 0);
  const passCount = results.filter(r => r.overallQuality === 'pass').length;
  const passRate = (passCount / totalImages) * 100;
  const averageQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / totalImages;
  
  const defectsByType: Record<string, number> = {};
  const defectsBySeverity: Record<string, number> = {};
  
  for (const result of results) {
    for (const defect of result.defects) {
      defectsByType[defect.type] = (defectsByType[defect.type] || 0) + 1;
      defectsBySeverity[defect.severity] = (defectsBySeverity[defect.severity] || 0) + 1;
    }
  }
  
  return {
    totalImages,
    totalDefects,
    passRate,
    averageQualityScore,
    defectsByType,
    defectsBySeverity,
  };
}
