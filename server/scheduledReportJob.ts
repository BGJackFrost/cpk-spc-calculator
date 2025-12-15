import { getDb } from "./db";
import { scheduledReports, scheduledReportLogs } from "../drizzle/schema";
import { eq, lte, and } from "drizzle-orm";
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
  
  // Get all active reports that are due
  const dueReports = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.isActive, 1),
        lte(scheduledReports.nextScheduledAt, now)
      )
    );

  console.log(`[ScheduledReport] Found ${dueReports.length} reports due for processing`);

  let succeeded = 0;
  let failed = 0;

  for (const report of dueReports) {
    try {
      console.log(`[ScheduledReport] Processing report: ${report.name} (ID: ${report.id})`);
      
      // Calculate date range based on report type
      const { startDate, endDate } = getReportDateRange(report.reportType);
      
      // Generate report data
      let reportData: any;
      let reportType: string;
      
      if (report.reportType.startsWith('oee_')) {
        reportData = await generateOEEReportData(
          startDate,
          endDate,
          report.machineIds as number[] | undefined,
          report.productionLineIds as number[] | undefined
        );
        reportType = 'OEE';
      } else if (report.reportType.startsWith('maintenance_')) {
        reportData = await generateMaintenanceReportData(
          startDate,
          endDate,
          report.machineIds as number[] | undefined,
          report.productionLineIds as number[] | undefined
        );
        reportType = 'Maintenance';
      } else {
        reportData = await generateCombinedReportData(
          startDate,
          endDate,
          report.machineIds as number[] | undefined,
          report.productionLineIds as number[] | undefined
        );
        reportType = 'Combined';
      }
      
      // Generate HTML report
      const htmlContent = generateHTMLReport(reportData, reportType);
      
      // Send email to recipients
      const recipients = report.recipients.split(',').map(e => e.trim());
      const subject = `[Báo cáo ${reportType}] ${report.name} - ${formatDateRange(startDate, endDate)}`;
      
      for (const recipient of recipients) {
        try {
          await sendEmail(recipient, subject, htmlContent);
          console.log(`[ScheduledReport] Email sent to ${recipient}`);
        } catch (emailError) {
          console.error(`[ScheduledReport] Failed to send email to ${recipient}:`, emailError);
        }
      }
      
      // Log success
      await db.insert(scheduledReportLogs).values({
        reportId: report.id,
        status: 'success',
        recipientCount: recipients.length,
        successCount: recipients.length,
        failedCount: 0,
      });
      
      // Update next scheduled time
      const nextScheduledAt = calculateNextScheduledTime(
        report.schedule,
        report.dayOfWeek,
        report.dayOfMonth,
        report.hour
      );
      
      await db.update(scheduledReports)
        .set({ 
          nextScheduledAt,
          lastSentAt: now,
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
      
      failed++;
    }
  }

  return { processed: dueReports.length, succeeded, failed };
}

// Get date range based on report type
function getReportDateRange(reportType: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  
  let startDate: Date;
  
  if (reportType.includes('daily')) {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (reportType.includes('weekly')) {
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

// Calculate next scheduled time
function calculateNextScheduledTime(
  schedule: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hour: number
): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  
  switch (schedule) {
    case "daily":
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case "weekly":
      const targetDay = dayOfWeek ?? 1;
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case "monthly":
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }
  
  return next;
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
  
  // Also run once on startup
  setTimeout(async () => {
    console.log("[ScheduledReport] Initial check for due reports...");
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("[ScheduledReport] Error in initial check:", error);
    }
  }, 5000); // 5 seconds after startup
  
  console.log("[ScheduledReport] Scheduled report job initialized");
}
