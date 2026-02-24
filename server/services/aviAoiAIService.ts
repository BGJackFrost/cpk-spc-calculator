import { invokeLLM } from "../_core/llm";

export interface DefectAnalysisResult {
  isDefect: boolean;
  confidence: number;
  defectType?: string;
  defectSeverity?: 'minor' | 'major' | 'critical';
  description: string;
  recommendations: string[];
}

export interface ImageComparisonResult {
  similarity: number;
  differences: Array<{ area: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  isAcceptable: boolean;
  recommendation: string;
}

export interface NtfAnalysisResult {
  ntfLikelihood: number;
  recommendation: 'TRUE_NG' | 'NTF' | 'UNCERTAIN';
  reasons: string[];
  suggestedAction: string;
}

export interface QualityTrendResult {
  trend: 'improving' | 'stable' | 'declining';
  prediction: { nextDayYield: number; confidence: number };
  insights: string[];
  recommendations: string[];
}

export async function analyzeInspectionImage(imageUrl: string): Promise<DefectAnalysisResult> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert visual inspection AI. Analyze images for defects. Return JSON: {isDefect, confidence, defectType, defectSeverity, description, recommendations}" },
        { role: "user", content: [{ type: "text", text: "Analyze this inspection image:" }, { type: "image_url", image_url: { url: imageUrl } }] }
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    try { return JSON.parse(content); } catch { return { isDefect: false, confidence: 0, description: content, recommendations: [] }; }
  } catch (error) {
    console.error("AI image analysis error:", error);
    return { isDefect: false, confidence: 0, description: "Unable to analyze", recommendations: ["Manual inspection required"] };
  }
}

export async function compareWithReference(inspectionImageUrl: string, referenceImageUrl: string): Promise<ImageComparisonResult> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Compare inspection image with reference. Return JSON: {similarity, differences, isAcceptable, recommendation}" },
        { role: "user", content: [{ type: "text", text: "Compare images:" }, { type: "image_url", image_url: { url: inspectionImageUrl } }, { type: "image_url", image_url: { url: referenceImageUrl } }] }
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    try { return JSON.parse(content); } catch { return { similarity: 0, differences: [], isAcceptable: false, recommendation: content }; }
  } catch (error) {
    console.error("AI comparison error:", error);
    return { similarity: 0, differences: [], isAcceptable: false, recommendation: "Unable to compare" };
  }
}

export async function analyzeNtfProbability(imageUrl: string, ngReason: string, historicalData?: { totalNg: number; totalNtf: number; commonNtfReasons: string[] }): Promise<NtfAnalysisResult> {
  try {
    const context = historicalData ? `Historical: ${historicalData.totalNtf}/${historicalData.totalNg} NTF rate` : '';
    const response = await invokeLLM({
      messages: [
        { role: "system", content: `Analyze if NG might be NTF. ${context} Return JSON: {ntfLikelihood, recommendation, reasons, suggestedAction}` },
        { role: "user", content: [{ type: "text", text: `NG reason: "${ngReason}". Is this NTF?` }, { type: "image_url", image_url: { url: imageUrl } }] }
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    try { return JSON.parse(content); } catch { return { ntfLikelihood: 50, recommendation: 'UNCERTAIN', reasons: [content], suggestedAction: "Manual check" }; }
  } catch (error) {
    console.error("AI NTF analysis error:", error);
    return { ntfLikelihood: 50, recommendation: 'UNCERTAIN', reasons: ["Unable to analyze"], suggestedAction: "Manual inspection required" };
  }
}

export async function classifyDefect(imageUrl: string): Promise<{ defectType: string; confidence: number; possibleCauses: string[]; suggestedActions: string[] }> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Classify defect type. Return JSON: {defectType, confidence, possibleCauses, suggestedActions}" },
        { role: "user", content: [{ type: "text", text: "Classify defect:" }, { type: "image_url", image_url: { url: imageUrl } }] }
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    try { return JSON.parse(content); } catch { return { defectType: "unknown", confidence: 0, possibleCauses: [content], suggestedActions: ["Manual check"] }; }
  } catch (error) {
    console.error("AI classification error:", error);
    return { defectType: "unknown", confidence: 0, possibleCauses: ["Unable to determine"], suggestedActions: ["Manual inspection"] };
  }
}

export async function analyzeQualityTrends(historicalData: Array<{ date: string; yieldRate: number; okCount: number; ngCount: number; ntfCount: number }>): Promise<QualityTrendResult> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Analyze quality trends. Return JSON: {trend, prediction, insights, recommendations}" },
        { role: "user", content: `Analyze quality data:\n${JSON.stringify(historicalData, null, 2)}` }
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    try { return JSON.parse(content); } catch { return { trend: 'stable', prediction: { nextDayYield: 0, confidence: 0 }, insights: [content], recommendations: [] }; }
  } catch (error) {
    console.error("AI trend analysis error:", error);
    return { trend: 'stable', prediction: { nextDayYield: 0, confidence: 0 }, insights: ["Unable to analyze"], recommendations: ["Collect more data"] };
  }
}
