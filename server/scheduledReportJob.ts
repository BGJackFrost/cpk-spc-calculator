import { getDb } from "./db";
import { scheduledReports, scheduledReportLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateOEEReportData, generateMaintenanceReportData, generateCombinedReportData, generateHTMLReport } from "./pdfReportService";
import { sendEmail } from "./emailService";

// Process scheduled reports that are due
export async function processScheduledReports(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.log("[ScheduledReport] Database not available");
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentTimeOfDay = `${String(currentHour).padStart(2, '0')}:00`;
  const currentDayOfWeek = now.getDay();
  const currentDayOfMonth = now.getDate();
  
  // Get all active reports
  const activeReports = await db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.isActive, 1));

  // Filter reports that should run now
  const dueReports = activeReports.filter(report => {
    // Check if it's the right time
    if (report.timeOfDay !== currentTimeOfDay) return false;
    
    // Check frequency
    if (report.frequency === 'daily') return true;
    if (report.frequency === 'weekly' && report.dayOfWeek === currentDayOfWeek) return true;
    if (report.frequency === 'monthly' && report.dayOfMonth === currentDayOfMonth) return true;
    
    return false;
  });

  console.log(`[ScheduledReport] Found ${dueReports.length} reports due for processing`);

  let succeeded = 0;
  let failed = 0;

  for (const report of dueReports) {
    try {
      console.log(`[ScheduledReport] Processing report: ${report.name} (ID: ${report.id})`);
      
      // Calculate date range based on frequency
      const { startDate, endDate } = getReportDateRange(report.frequency);
      
      // Parse machine and production line IDs
      let machineIds: number[] | undefined;
      let productionLineIds: number[] | undefined;
      
      try {
        if (report.machineIds) {
          machineIds = JSON.parse(report.machineIds);
        }
        if (report.productionLineIds) {
          productionLineIds = JSON.parse(report.productionLineIds);
        }
      } catch {}
      
      // Generate report data
      let reportData: any;
      let reportType: string;
      
      if (report.reportType === 'oee') {
        reportData = await generateOEEReportData(startDate, endDate, machineIds, productionLineIds);
        reportType = 'OEE';
      } else if (report.reportType === 'cpk') {
        reportData = await generateMaintenanceReportData(startDate, endDate, machineIds, productionLineIds);
        reportType = 'CPK';
      } else if (report.reportType === 'oee_cpk_combined') {
        reportData = await generateCombinedReportData(startDate, endDate, machineIds, productionLineIds);
        reportType = 'OEE + CPK';
      } else {
        reportData = await generateCombinedReportData(startDate, endDate, machineIds, productionLineIds);
        reportType = 'Production Summary';
      }
      
      // Generate HTML report
      const htmlContent = generateHTMLReport(reportData, reportType);
      
      // Parse recipients
      let recipients: string[] = [];
      try {
        recipients = JSON.parse(report.recipients);
      } catch {
        recipients = report.recipients.split(',').map(e => e.trim());
      }
      
      const subject = `[Báo cáo ${reportType}] ${report.name} - ${formatDateRange(startDate, endDate)}`;
      
      let successCount = 0;
      let failedCount = 0;
      
      for (const recipient of recipients) {
        try {
          await sendEmail(recipient, subject, htmlContent);
          successCount++;
          console.log(`[ScheduledReport] Email sent to ${recipient}`);
        } catch (emailError) {
          failedCount++;
          console.error(`[ScheduledReport] Failed to send email to ${recipient}:`, emailError);
        }
      }
      
      // Log result
      await db.insert(scheduledReportLogs).values({
        reportId: report.id,
        status: failedCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed'),
        recipientCount: recipients.length,
        successCount,
        failedCount,
      });
      
      // Update last sent info
      await db.update(scheduledReports)
        .set({ 
          lastSentAt: now,
          lastSentStatus: failedCount === 0 ? 'success' : 'failed',
          lastSentError: failedCount > 0 ? `${failedCount} emails failed` : null,
        })
        .where(eq(scheduledReports.id, report.id));
      
      succeeded++;
      console.log(`[ScheduledReport] Report ${report.name} processed successfully`);
      
    } catch (error) {
      console.error(`[ScheduledReport] Error processing report ${report.id}:`, error);
      
      // Log failure
      await db.insert(scheduledReportLogs).values({
        reportId: report.id,
        status: 'failed',
        recipientCount: 0,
        successCount: 0,
        failedCount: 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Update last sent error
      await db.update(scheduledReports)
        .set({ 
          lastSentStatus: 'failed',
          lastSentError: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(scheduledReports.id, report.id));
      
      failed++;
    }
  }

  return { processed: dueReports.length, succeeded, failed };
}

// Get date range based on frequency
function getReportDateRange(frequency: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  
  let startDate: Date;
  
  if (frequency === 'daily') {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (frequency === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else { // monthly
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
  }
  
  return { startDate, endDate };
}

// Format date range for email subject
function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${startDate.toLocaleDateString('vi-VN', options)} - ${endDate.toLocaleDateString('vi-VN', options)}`;
}

// Initialize scheduled report job (call this from server startup)
export function initScheduledReportJob() {
  // Run every hour to check for due reports
  setInterval(async () => {
    console.log("[ScheduledReport] Checking for due reports...");
    try {
      const result = await processScheduledReports();
      if (result.processed > 0) {
        console.log(`[ScheduledReport] Processed ${result.processed} reports: ${result.succeeded} succeeded, ${result.failed} failed`);
      }
    } catch (error) {
      console.error("[ScheduledReport] Error in scheduled job:", error);
    }
  }, 60 * 60 * 1000); // Every hour
  
  // Also run once on startup (delayed)
  setTimeout(async () => {
    console.log("[ScheduledReport] Initial check for due reports...");
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("[ScheduledReport] Error in initial check:", error);
    }
  }, 30000); // 30 seconds after startup
  
  console.log("[ScheduledReport] Scheduled report job initialized");
}
