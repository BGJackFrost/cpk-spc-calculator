/**
 * AI Vision Analysis Service
 * Phân tích hình ảnh sản phẩm bằng LLM Vision
 */
import { invokeLLM, type Message } from '../_core/llm';
import { getDb } from '../db';
import { machineInspectionData, spcDefectRecords } from '../../drizzle/schema';

// Types
export interface VisionAnalysisResult {
  id: string;
  imageUrl: string;
  status: 'pass' | 'fail' | 'warning';
  confidence: number;
  defects: DefectInfo[];
  analysis: {
    summary: string;
    recommendations: string[];
    qualityScore: number;
    processingSuggestions?: string[];
  };
  processingTime: number;
  timestamp: Date;
  rawLlmResponse?: string;
}

export interface DefectInfo {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  suggestedAction: string;
}

export interface AnalysisOptions {
  productType?: string;
  inspectionStandard?: string;
  confidenceThreshold?: number;
  language?: 'vi' | 'en';
  saveToDatabase?: boolean;
  machineId?: number;
  productId?: number;
}

// Defect type mapping for Vietnamese
const DEFECT_TYPE_MAP: Record<string, string> = {
  'scratch': 'Trầy xước',
  'dent': 'Lõm/Móp',
  'crack': 'Nứt',
  'discoloration': 'Đổi màu',
  'contamination': 'Tạp chất',
  'deformation': 'Biến dạng',
  'bubble': 'Bọt khí',
  'missing_part': 'Thiếu chi tiết',
  'surface_defect': 'Lỗi bề mặt',
  'dimension_error': 'Sai kích thước',
};

// Severity mapping
const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'critical': 'critical',
  'minor': 'low',
  'moderate': 'medium',
  'major': 'high',
  'severe': 'critical',
};

/**
 * Analyze image using LLM Vision
 */
export async function analyzeImageWithLLM(
  imageUrl: string,
  options: AnalysisOptions = {}
): Promise<VisionAnalysisResult> {
  const startTime = Date.now();
  const {
    productType = 'general',
    inspectionStandard = 'IPC-A-610',
    confidenceThreshold = 0.7,
    language = 'vi',
    saveToDatabase = false,
    machineId,
    productId,
  } = options;

  const systemPrompt = language === 'vi' 
    ? `Bạn là chuyên gia kiểm tra chất lượng sản phẩm công nghiệp với kinh nghiệm phân tích hình ảnh.
Nhiệm vụ: Phân tích hình ảnh sản phẩm để phát hiện các lỗi và đánh giá chất lượng.

Tiêu chuẩn kiểm tra: ${inspectionStandard}
Loại sản phẩm: ${productType}

Hãy phân tích hình ảnh và trả về kết quả theo định dạng JSON sau:
{
  "status": "pass" | "fail" | "warning",
  "confidence": 0.0-1.0,
  "qualityScore": 0-100,
  "summary": "Tóm tắt kết quả kiểm tra",
  "defects": [
    {
      "type": "loại lỗi (scratch, dent, crack, discoloration, contamination, deformation, bubble, missing_part, surface_defect, dimension_error)",
      "severity": "low | medium | high | critical",
      "description": "Mô tả chi tiết lỗi",
      "confidence": 0.0-1.0,
      "suggestedAction": "Hành động khuyến nghị"
    }
  ],
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"],
  "processingSuggestions": ["Đề xuất cải tiến quy trình 1"]
}`
    : `You are an industrial product quality inspection expert with image analysis experience.
Task: Analyze product images to detect defects and assess quality.

Inspection standard: ${inspectionStandard}
Product type: ${productType}

Analyze the image and return results in the following JSON format:
{
  "status": "pass" | "fail" | "warning",
  "confidence": 0.0-1.0,
  "qualityScore": 0-100,
  "summary": "Inspection result summary",
  "defects": [
    {
      "type": "defect type (scratch, dent, crack, discoloration, contamination, deformation, bubble, missing_part, surface_defect, dimension_error)",
      "severity": "low | medium | high | critical",
      "description": "Detailed defect description",
      "confidence": 0.0-1.0,
      "suggestedAction": "Recommended action"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "processingSuggestions": ["Process improvement suggestion 1"]
}`;

  const userPrompt = language === 'vi'
    ? 'Hãy phân tích hình ảnh sản phẩm này và đánh giá chất lượng. Trả về kết quả dưới dạng JSON.'
    : 'Please analyze this product image and assess its quality. Return results in JSON format.';

  try {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
        ],
      },
    ];

    const response = await invokeLLM({
      messages,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : '';
    
    let analysisData: any;
    try {
      analysisData = JSON.parse(content);
    } catch (parseError) {
      console.error('[AI Vision] Failed to parse LLM response:', parseError);
      return createDefaultResult(imageUrl, startTime, 'LLM response parse error');
    }

    const defects: DefectInfo[] = (analysisData.defects || [])
      .filter((d: any) => d.confidence >= confidenceThreshold)
      .map((d: any) => ({
        type: DEFECT_TYPE_MAP[d.type] || d.type,
        severity: SEVERITY_MAP[d.severity] || 'medium',
        description: d.description || '',
        confidence: d.confidence || 0.8,
        suggestedAction: d.suggestedAction || getSuggestedAction(d.severity),
        location: d.location,
      }));

    let status: 'pass' | 'fail' | 'warning' = analysisData.status || 'pass';
    if (defects.some(d => d.severity === 'critical')) {
      status = 'fail';
    } else if (defects.some(d => d.severity === 'high')) {
      status = defects.length > 1 ? 'fail' : 'warning';
    } else if (defects.length > 0) {
      status = 'warning';
    }

    const result: VisionAnalysisResult = {
      id: `VA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl,
      status,
      confidence: analysisData.confidence || 0.85,
      defects,
      analysis: {
        summary: analysisData.summary || 'Phân tích hoàn tất',
        recommendations: analysisData.recommendations || [],
        qualityScore: analysisData.qualityScore || calculateQualityScore(defects),
        processingSuggestions: analysisData.processingSuggestions,
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
      rawLlmResponse: content,
    };

    if (saveToDatabase) {
      await saveAnalysisToDatabase(result, machineId, productId);
    }

    return result;
  } catch (error) {
    console.error('[AI Vision] Analysis error:', error);
    return createDefaultResult(imageUrl, startTime, String(error));
  }
}

/**
 * Batch analyze multiple images
 */
export async function analyzeImagesBatch(
  imageUrls: string[],
  options: AnalysisOptions = {}
): Promise<VisionAnalysisResult[]> {
  const results: VisionAnalysisResult[] = [];
  
  for (const url of imageUrls) {
    try {
      const result = await analyzeImageWithLLM(url, options);
      results.push(result);
    } catch (error) {
      console.error(`[AI Vision] Failed to analyze ${url}:`, error);
      results.push(createDefaultResult(url, Date.now(), String(error)));
    }
  }
  
  return results;
}

/**
 * Compare two images for defect detection
 */
export async function compareImages(
  referenceImageUrl: string,
  inspectionImageUrl: string,
  options: AnalysisOptions = {}
): Promise<VisionAnalysisResult> {
  const startTime = Date.now();
  const { language = 'vi' } = options;

  const systemPrompt = language === 'vi'
    ? `Bạn là chuyên gia kiểm tra chất lượng sản phẩm.
Nhiệm vụ: So sánh hình ảnh sản phẩm kiểm tra với hình ảnh tham chiếu để phát hiện sự khác biệt và lỗi.

Hãy phân tích và trả về kết quả theo định dạng JSON:
{
  "status": "pass" | "fail" | "warning",
  "confidence": 0.0-1.0,
  "qualityScore": 0-100,
  "summary": "Tóm tắt so sánh",
  "defects": [...],
  "differences": ["Sự khác biệt 1", "Sự khác biệt 2"],
  "recommendations": [...]
}`
    : `You are a product quality inspection expert.
Task: Compare inspection image with reference image to detect differences and defects.

Analyze and return results in JSON format:
{
  "status": "pass" | "fail" | "warning",
  "confidence": 0.0-1.0,
  "qualityScore": 0-100,
  "summary": "Comparison summary",
  "defects": [...],
  "differences": ["Difference 1", "Difference 2"],
  "recommendations": [...]
}`;

  try {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: language === 'vi' 
            ? 'Hình ảnh 1 là mẫu tham chiếu, hình ảnh 2 là sản phẩm cần kiểm tra. Hãy so sánh và phát hiện lỗi.'
            : 'Image 1 is the reference, image 2 is the product to inspect. Compare and detect defects.' 
          },
          {
            type: 'image_url',
            image_url: { url: referenceImageUrl, detail: 'high' },
          },
          {
            type: 'image_url',
            image_url: { url: inspectionImageUrl, detail: 'high' },
          },
        ],
      },
    ];

    const response = await invokeLLM({
      messages,
      response_format: { type: 'json_object' },
    });

    const content = typeof response.choices[0]?.message?.content === 'string' 
      ? response.choices[0].message.content 
      : '';
    
    const analysisData = JSON.parse(content);
    
    const defects: DefectInfo[] = (analysisData.defects || []).map((d: any) => ({
      type: DEFECT_TYPE_MAP[d.type] || d.type,
      severity: SEVERITY_MAP[d.severity] || 'medium',
      description: d.description || '',
      confidence: d.confidence || 0.8,
      suggestedAction: d.suggestedAction || '',
    }));

    return {
      id: `VA-CMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl: inspectionImageUrl,
      status: analysisData.status || 'pass',
      confidence: analysisData.confidence || 0.85,
      defects,
      analysis: {
        summary: analysisData.summary || '',
        recommendations: analysisData.recommendations || [],
        qualityScore: analysisData.qualityScore || 100,
        processingSuggestions: analysisData.differences,
      },
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
      rawLlmResponse: content,
    };
  } catch (error) {
    console.error('[AI Vision] Comparison error:', error);
    return createDefaultResult(inspectionImageUrl, startTime, String(error));
  }
}

// Helper functions
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

function calculateQualityScore(defects: DefectInfo[]): number {
  if (defects.length === 0) return 100;
  
  let deduction = 0;
  for (const defect of defects) {
    switch (defect.severity) {
      case 'critical': deduction += 30 * defect.confidence; break;
      case 'high': deduction += 20 * defect.confidence; break;
      case 'medium': deduction += 10 * defect.confidence; break;
      case 'low': deduction += 5 * defect.confidence; break;
    }
  }
  
  return Math.max(0, Math.round(100 - deduction));
}

function createDefaultResult(imageUrl: string, startTime: number, error: string): VisionAnalysisResult {
  return {
    id: `VA-ERR-${Date.now()}`,
    imageUrl,
    status: 'warning',
    confidence: 0,
    defects: [],
    analysis: {
      summary: `Không thể phân tích hình ảnh: ${error}`,
      recommendations: ['Vui lòng thử lại hoặc kiểm tra hình ảnh'],
      qualityScore: 0,
    },
    processingTime: Date.now() - startTime,
    timestamp: new Date(),
  };
}

async function saveAnalysisToDatabase(
  result: VisionAnalysisResult,
  machineId?: number,
  productId?: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Save to machineInspectionData table
    await db.insert(machineInspectionData).values({
      machineId: machineId || null,
      batchId: result.id,
      inspectionType: 'ai_vision',
      result: result.status,
      defectCount: result.defects.length,
      cycleTime: result.processingTime,
      imageUrl: result.imageUrl,
      analysisData: JSON.stringify(result.analysis),
      inspectedAt: result.timestamp.toISOString(),
    });

    console.log(`[AI Vision] Saved analysis ${result.id} to database`);
  } catch (error) {
    console.error('[AI Vision] Failed to save to database:', error);
  }
}

export type { AnalysisOptions };
