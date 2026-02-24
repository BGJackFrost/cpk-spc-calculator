import { getDb } from "./db";
import { 
  cameraCaptureSchedules, 
  cameraCaptureLog, 
  cameraConfigurations,
  snImages 
} from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

interface CaptureResult {
  success: boolean;
  imageUrl?: string;
  imageKey?: string;
  imageId?: number;
  error?: string;
}

interface AnalysisResult {
  result: "ok" | "ng" | "warning" | "pending";
  qualityScore: number;
  defectsFound: number;
  defectLocations?: any[];
}

// Check if current time is within schedule window
function isWithinScheduleWindow(schedule: any): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0-6, 0=Sunday
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check active days
  const activeDays = schedule.activeDays as number[] | null;
  if (activeDays && activeDays.length > 0 && !activeDays.includes(currentDay)) {
    return false;
  }

  // Check time window
  const startTime = schedule.startTime || "00:00";
  const endTime = schedule.endTime || "23:59";

  if (currentTime < startTime || currentTime > endTime) {
    return false;
  }

  return true;
}

// Calculate next capture time based on interval
function getNextCaptureTime(schedule: any): Date {
  let intervalMs: number;
  
  switch (schedule.captureIntervalUnit) {
    case "seconds":
      intervalMs = schedule.captureIntervalSeconds * 1000;
      break;
    case "minutes":
      intervalMs = schedule.captureIntervalSeconds * 60 * 1000;
      break;
    case "hours":
      intervalMs = schedule.captureIntervalSeconds * 60 * 60 * 1000;
      break;
    default:
      intervalMs = schedule.captureIntervalSeconds * 60 * 1000;
  }

  return new Date(Date.now() + intervalMs);
}

// Check if schedule should capture now
function shouldCaptureNow(schedule: any): boolean {
  if (!schedule.isEnabled) return false;
  if (!isWithinScheduleWindow(schedule)) return false;

  // Check last capture time
  if (schedule.lastCaptureAt) {
    const lastCapture = new Date(schedule.lastCaptureAt);
    const nextCapture = getNextCaptureTime({ ...schedule, lastCaptureAt: null });
    const intervalMs = nextCapture.getTime() - Date.now();
    
    if (Date.now() - lastCapture.getTime() < intervalMs) {
      return false;
    }
  }

  return true;
}

// Capture image from camera
async function captureFromCamera(camera: any): Promise<CaptureResult> {
  try {
    // For now, we'll simulate camera capture
    // In production, this would connect to the actual camera stream
    // and capture a frame
    
    const streamUrl = camera.streamUrl;
    const streamType = camera.streamType;

    // Simulate capture delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `camera-${camera.id}-${timestamp}.jpg`;
    const fileKey = `camera-captures/${camera.id}/${filename}`;

    // In production, you would:
    // 1. Connect to camera stream (RTSP, HTTP, etc.)
    // 2. Capture a frame
    // 3. Convert to JPEG
    // 4. Upload to S3

    // For now, return a placeholder result
    // The actual implementation would depend on the camera type
    console.log(`[CameraCapture] Capturing from camera ${camera.id} (${camera.name}) - ${streamType}://${streamUrl}`);

    return {
      success: true,
      imageKey: fileKey,
      imageUrl: `https://placeholder.com/${fileKey}`, // Placeholder
    };
  } catch (error: any) {
    console.error(`[CameraCapture] Error capturing from camera ${camera.id}:`, error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// Analyze captured image
async function analyzeImage(imageUrl: string, analysisType: string): Promise<AnalysisResult> {
  try {
    // In production, this would call the AI analysis service
    // For now, return a placeholder result
    
    console.log(`[CameraCapture] Analyzing image: ${imageUrl} (type: ${analysisType})`);

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Random result for demonstration
    const random = Math.random();
    let result: "ok" | "ng" | "warning";
    let qualityScore: number;
    let defectsFound: number;

    if (random > 0.85) {
      result = "ng";
      qualityScore = 50 + Math.random() * 30;
      defectsFound = Math.floor(Math.random() * 5) + 1;
    } else if (random > 0.7) {
      result = "warning";
      qualityScore = 70 + Math.random() * 15;
      defectsFound = Math.floor(Math.random() * 2);
    } else {
      result = "ok";
      qualityScore = 85 + Math.random() * 15;
      defectsFound = 0;
    }

    return {
      result,
      qualityScore,
      defectsFound,
      defectLocations: defectsFound > 0 ? [{ type: "scratch", x: 100, y: 100 }] : [],
    };
  } catch (error: any) {
    console.error(`[CameraCapture] Error analyzing image:`, error);
    return {
      result: "pending",
      qualityScore: 0,
      defectsFound: 0,
    };
  }
}

// Process a single capture schedule
async function processSchedule(schedule: any, camera: any): Promise<void> {
  const db = await getDb();
  const startTime = new Date();

  try {
    console.log(`[CameraCapture] Processing schedule: ${schedule.name} (ID: ${schedule.id})`);

    // Capture image
    const captureResult = await captureFromCamera(camera);

    if (!captureResult.success) {
      // Log failed capture
      await db.insert(cameraCaptureLog).values({
        scheduleId: schedule.id,
        cameraId: camera.id,
        status: "failed",
        errorMessage: captureResult.error,
        captureStartedAt: startTime.toISOString(),
        captureCompletedAt: new Date().toISOString(),
      });

      // Update schedule stats
      await db.update(cameraCaptureSchedules)
        .set({
          totalCaptures: sql`${cameraCaptureSchedules.totalCaptures} + 1`,
          failedCaptures: sql`${cameraCaptureSchedules.failedCaptures} + 1`,
          lastCaptureAt: new Date().toISOString(),
          lastCaptureStatus: "failed",
          lastCaptureError: captureResult.error,
        })
        .where(eq(cameraCaptureSchedules.id, schedule.id));

      return;
    }

    // Analyze image if enabled
    let analysisResult: AnalysisResult | null = null;
    if (schedule.autoAnalyze) {
      analysisResult = await analyzeImage(captureResult.imageUrl!, schedule.analysisType);
    }

    // Generate serial number for the image
    const serialNumber = `AUTO-${camera.id}-${Date.now()}`;

    // Save to sn_images table
    const [imageInsertResult] = await db.insert(snImages).values({
      serialNumber,
      imageUrl: captureResult.imageUrl!,
      imageKey: captureResult.imageKey!,
      productionLineId: schedule.productionLineId,
      workstationId: schedule.workstationId,
      productId: schedule.productId,
      analysisResult: analysisResult?.result || "pending",
      qualityScore: analysisResult?.qualityScore ? String(analysisResult.qualityScore) : null,
      defectsFound: analysisResult?.defectsFound || 0,
      defectLocations: analysisResult?.defectLocations || null,
      capturedAt: new Date().toISOString(),
      capturedBy: schedule.createdBy,
      source: "auto_capture",
    });

    const completedTime = new Date();
    const analysisDurationMs = completedTime.getTime() - startTime.getTime();

    // Log successful capture
    await db.insert(cameraCaptureLog).values({
      scheduleId: schedule.id,
      cameraId: camera.id,
      status: "success",
      imageId: imageInsertResult.insertId,
      imageUrl: captureResult.imageUrl,
      imageKey: captureResult.imageKey,
      analysisResult: analysisResult?.result || "pending",
      qualityScore: analysisResult?.qualityScore ? String(analysisResult.qualityScore) : null,
      defectsFound: analysisResult?.defectsFound || 0,
      captureStartedAt: startTime.toISOString(),
      captureCompletedAt: completedTime.toISOString(),
      analysisDurationMs,
      serialNumber,
    });

    // Update schedule stats
    await db.update(cameraCaptureSchedules)
      .set({
        totalCaptures: sql`${cameraCaptureSchedules.totalCaptures} + 1`,
        successCaptures: sql`${cameraCaptureSchedules.successCaptures} + 1`,
        lastCaptureAt: completedTime.toISOString(),
        lastCaptureStatus: "success",
        lastCaptureError: null,
      })
      .where(eq(cameraCaptureSchedules.id, schedule.id));

    // Send notification if NG detected
    if (analysisResult && schedule.notifyOnNg && analysisResult.result === "ng") {
      await notifyOwner({
        title: `⚠️ Phát hiện NG - ${camera.name}`,
        content: `Camera "${camera.name}" đã phát hiện sản phẩm NG.\n\n**Chi tiết:**\n- Serial: ${serialNumber}\n- Điểm chất lượng: ${analysisResult.qualityScore.toFixed(1)}%\n- Số lỗi: ${analysisResult.defectsFound}\n- Thời gian: ${completedTime.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
      });
    }

    // Send notification if warning detected
    if (analysisResult && schedule.notifyOnWarning && analysisResult.result === "warning") {
      await notifyOwner({
        title: `⚡ Cảnh báo chất lượng - ${camera.name}`,
        content: `Camera "${camera.name}" đã phát hiện sản phẩm cần kiểm tra.\n\n**Chi tiết:**\n- Serial: ${serialNumber}\n- Điểm chất lượng: ${analysisResult.qualityScore.toFixed(1)}%\n- Thời gian: ${completedTime.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
      });
    }

    console.log(`[CameraCapture] Successfully captured and analyzed: ${serialNumber} (${analysisResult?.result || "pending"})`);

  } catch (error: any) {
    console.error(`[CameraCapture] Error processing schedule ${schedule.id}:`, error);

    // Log error
    await db.insert(cameraCaptureLog).values({
      scheduleId: schedule.id,
      cameraId: camera.id,
      status: "error",
      errorMessage: error.message || "Unknown error",
      captureStartedAt: startTime.toISOString(),
      captureCompletedAt: new Date().toISOString(),
    });

    // Update schedule stats
    await db.update(cameraCaptureSchedules)
      .set({
        totalCaptures: sql`${cameraCaptureSchedules.totalCaptures} + 1`,
        failedCaptures: sql`${cameraCaptureSchedules.failedCaptures} + 1`,
        lastCaptureAt: new Date().toISOString(),
        lastCaptureStatus: "failed",
        lastCaptureError: error.message || "Unknown error",
      })
      .where(eq(cameraCaptureSchedules.id, schedule.id));
  }
}

// Main function to run capture job
export async function runCameraCaptureJob(): Promise<void> {
  try {
    const db = await getDb();

    // Get all enabled schedules
    const schedules = await db.select()
      .from(cameraCaptureSchedules)
      .where(eq(cameraCaptureSchedules.isEnabled, true));

    if (schedules.length === 0) {
      return;
    }

    console.log(`[CameraCapture] Checking ${schedules.length} schedules...`);

    for (const schedule of schedules) {
      // Check if should capture now
      if (!shouldCaptureNow(schedule)) {
        continue;
      }

      // Get camera configuration
      const [camera] = await db.select()
        .from(cameraConfigurations)
        .where(eq(cameraConfigurations.id, schedule.cameraId));

      if (!camera) {
        console.warn(`[CameraCapture] Camera ${schedule.cameraId} not found for schedule ${schedule.id}`);
        continue;
      }

      if (!camera.isActive) {
        console.warn(`[CameraCapture] Camera ${camera.id} is not active`);
        continue;
      }

      // Process the schedule
      await processSchedule(schedule, camera);
    }
  } catch (error) {
    console.error("[CameraCapture] Error running capture job:", error);
  }
}

// Export for scheduled job
export { runCameraCaptureJob as cameraCaptureJob };
