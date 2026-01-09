import { getDb } from "../db";
import { scheduledReports, scheduledReportLogs, productionLines, products, spcAnalysisHistory } from "../../drizzle/schema";
import { eq, and, desc, lte, gte, inArray } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { storagePut } from "../storage";

interface ReportResult {
  success: boolean;
  emailsSent?: number;
  error?: string;
  reportUrl?: string;
}

// Generate report content based on type
async function generateReportContent(report: any): Promise<{
  html: string;
  subject: string;
  attachmentBuffer?: Buffer;
  attachmentName?: string;
}> {
  const reportType = report.reportType;
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN');
  
  // Get production lines if specified
  let lineNames: string[] = [];
  if (report.productionLineIds) {
    const lineIds = JSON.parse(report.productionLineIds);
    if (lineIds.length > 0) {
      const lines = await (await getDb())
        .select({ name: productionLines.name })
        .from(productionLines)
        .where(inArray(productionLines.id, lineIds));
      lineNames = lines.map(l => l.name);
    }
  }
  
  // Get products if specified
  let productNames: string[] = [];
  if (report.productIds) {
    const prodIds = JSON.parse(report.productIds);
    if (prodIds.length > 0) {
      const prods = await (await getDb())
        .select({ name: products.name })
        .from(products)
        .where(inArray(products.id, prodIds));
      productNames = prods.map(p => p.name);
    }
  }
  
  // Get recent SPC analysis data
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const dateFrom = report.scheduleType === 'daily' ? yesterday : lastWeek;
  
  const analyses = await (await getDb())
    .select()
    .from(spcAnalysisHistory)
    .where(gte(spcAnalysisHistory.analyzedAt, dateFrom.toISOString().slice(0, 19).replace('T', ' ')))
    .orderBy(desc(spcAnalysisHistory.analyzedAt))
    .limit(100);
  
  // Calculate statistics
  const totalAnalyses = analyses.length;
  const avgCpk = analyses.length > 0 
    ? analyses.reduce((sum, a) => sum + (parseFloat(a.cpk as string) || 0), 0) / analyses.length 
    : 0;
  const violationCount = analyses.filter(a => {
    const violations = a.violations ? JSON.parse(a.violations as string) : [];
    return violations.length > 0;
  }).length;
  const ngRate = totalAnalyses > 0 ? (violationCount / totalAnalyses * 100) : 0;
  
  // Generate HTML based on report type
  let subject = '';
  let html = '';
  
  const headerStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
  `;
  
  const cardStyle = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 20px;
    margin: 15px 0;
  `;
  
  const statStyle = `
    display: inline-block;
    text-align: center;
    padding: 15px 25px;
    margin: 5px;
    background: #f8f9fa;
    border-radius: 8px;
  `;
  
  switch (reportType) {
    case 'spc_summary':
      subject = `[SPC] Báo cáo tổng hợp SPC - ${dateStr}`;
      html = `
        <div style="${headerStyle}">
          <h1 style="margin: 0;">📊 Báo cáo Tổng hợp SPC</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateStr}</p>
        </div>
        <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
          <div style="${cardStyle}">
            <h2 style="color: #333; margin-top: 0;">📈 Thống kê tổng quan</h2>
            <div style="text-align: center;">
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: #667eea;">${totalAnalyses}</div>
                <div style="color: #666; font-size: 14px;">Phân tích</div>
              </div>
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: ${avgCpk >= 1.33 ? '#28a745' : avgCpk >= 1.0 ? '#ffc107' : '#dc3545'};">${avgCpk.toFixed(2)}</div>
                <div style="color: #666; font-size: 14px;">CPK TB</div>
              </div>
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: ${ngRate <= 5 ? '#28a745' : ngRate <= 10 ? '#ffc107' : '#dc3545'};">${ngRate.toFixed(1)}%</div>
                <div style="color: #666; font-size: 14px;">Tỷ lệ NG</div>
              </div>
            </div>
          </div>
          
          ${lineNames.length > 0 ? `
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">🏭 Dây chuyền theo dõi</h3>
            <p style="color: #666;">${lineNames.join(', ')}</p>
          </div>
          ` : ''}
          
          ${productNames.length > 0 ? `
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">📦 Sản phẩm theo dõi</h3>
            <p style="color: #666;">${productNames.join(', ')}</p>
          </div>
          ` : ''}
          
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">📋 Chi tiết phân tích gần đây</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Thời gian</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">CPK</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Mean</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${analyses.slice(0, 10).map(a => {
                  const cpk = parseFloat(a.cpk as string) || 0;
                  const status = cpk >= 1.33 ? '✅ OK' : cpk >= 1.0 ? '⚠️ Cảnh báo' : '❌ NG';
                  const statusColor = cpk >= 1.33 ? '#28a745' : cpk >= 1.0 ? '#ffc107' : '#dc3545';
                  return `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${new Date(a.analyzedAt).toLocaleString('vi-VN')}</td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6; font-weight: bold; color: ${statusColor};">${cpk.toFixed(3)}</td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${parseFloat(a.mean as string || '0').toFixed(3)}</td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            <p>Báo cáo được tạo tự động bởi hệ thống CPK/SPC Calculator</p>
            <p>© ${now.getFullYear()} MSoftware AI</p>
          </div>
        </div>
      `;
      break;
      
    case 'cpk_analysis':
      subject = `[CPK] Báo cáo phân tích CPK - ${dateStr}`;
      html = `
        <div style="${headerStyle}">
          <h1 style="margin: 0;">📉 Báo cáo Phân tích CPK</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateStr}</p>
        </div>
        <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
          <div style="${cardStyle}">
            <h2 style="color: #333; margin-top: 0;">Chỉ số CPK trung bình: <span style="color: ${avgCpk >= 1.33 ? '#28a745' : avgCpk >= 1.0 ? '#ffc107' : '#dc3545'};">${avgCpk.toFixed(3)}</span></h2>
            <p style="color: #666;">Dựa trên ${totalAnalyses} phân tích trong kỳ báo cáo</p>
          </div>
          
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">📊 Phân bổ CPK</h3>
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div>
                <div style="font-size: 24px; color: #28a745; font-weight: bold;">${analyses.filter(a => parseFloat(a.cpk as string) >= 1.33).length}</div>
                <div style="color: #666;">CPK ≥ 1.33</div>
              </div>
              <div>
                <div style="font-size: 24px; color: #ffc107; font-weight: bold;">${analyses.filter(a => parseFloat(a.cpk as string) >= 1.0 && parseFloat(a.cpk as string) < 1.33).length}</div>
                <div style="color: #666;">1.0 ≤ CPK < 1.33</div>
              </div>
              <div>
                <div style="font-size: 24px; color: #dc3545; font-weight: bold;">${analyses.filter(a => parseFloat(a.cpk as string) < 1.0).length}</div>
                <div style="color: #666;">CPK < 1.0</div>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            <p>Báo cáo được tạo tự động bởi hệ thống CPK/SPC Calculator</p>
          </div>
        </div>
      `;
      break;
      
    case 'violation_report':
      subject = `[CẢNH BÁO] Báo cáo vi phạm SPC - ${dateStr}`;
      html = `
        <div style="${headerStyle.replace('#667eea', '#dc3545').replace('#764ba2', '#c82333')}">
          <h1 style="margin: 0;">⚠️ Báo cáo Vi phạm SPC</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateStr}</p>
        </div>
        <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
          <div style="${cardStyle}">
            <h2 style="color: #dc3545; margin-top: 0;">Tổng số vi phạm: ${violationCount}</h2>
            <p style="color: #666;">Tỷ lệ vi phạm: ${ngRate.toFixed(1)}%</p>
          </div>
          
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">📋 Danh sách vi phạm</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #fff5f5;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc3545;">Thời gian</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dc3545;">CPK</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dc3545;">Vi phạm</th>
                </tr>
              </thead>
              <tbody>
                ${analyses.filter(a => {
                  const violations = a.violations ? JSON.parse(a.violations as string) : [];
                  return violations.length > 0;
                }).slice(0, 20).map(a => {
                  const violations = a.violations ? JSON.parse(a.violations as string) : [];
                  return `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${new Date(a.analyzedAt).toLocaleString('vi-VN')}</td>
                      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6; color: #dc3545; font-weight: bold;">${parseFloat(a.cpk as string || '0').toFixed(3)}</td>
                      <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${violations.slice(0, 3).join(', ')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            <p>Báo cáo được tạo tự động bởi hệ thống CPK/SPC Calculator</p>
          </div>
        </div>
      `;
      break;
      
    case 'production_line_status':
    case 'ai_vision_dashboard':
      subject = `[AI Vision] Dashboard tổng hợp - ${dateStr}`;
      html = `
        <div style="${headerStyle}">
          <h1 style="margin: 0;">🤖 AI Vision Dashboard</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateStr}</p>
        </div>
        <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
          <div style="${cardStyle}">
            <h2 style="color: #333; margin-top: 0;">📊 Tổng quan hệ thống</h2>
            <div style="text-align: center;">
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: #667eea;">${totalAnalyses}</div>
                <div style="color: #666; font-size: 14px;">Phân tích</div>
              </div>
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: ${avgCpk >= 1.33 ? '#28a745' : '#ffc107'};">${avgCpk.toFixed(2)}</div>
                <div style="color: #666; font-size: 14px;">CPK TB</div>
              </div>
              <div style="${statStyle}">
                <div style="font-size: 28px; font-weight: bold; color: #17a2b8;">${lineNames.length || 'Tất cả'}</div>
                <div style="color: #666; font-size: 14px;">Dây chuyền</div>
              </div>
            </div>
          </div>
          
          <div style="${cardStyle}">
            <h3 style="color: #333; margin-top: 0;">🎯 Đánh giá AI</h3>
            <p style="color: #666;">
              ${avgCpk >= 1.33 
                ? '✅ Hệ thống đang hoạt động ổn định. Chỉ số CPK đạt mức tốt.' 
                : avgCpk >= 1.0 
                  ? '⚠️ Cần chú ý cải thiện. Một số chỉ số CPK chưa đạt mức tối ưu.' 
                  : '❌ Cần can thiệp ngay. Nhiều chỉ số CPK dưới ngưỡng cho phép.'}
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            <p>Báo cáo được tạo tự động bởi hệ thống CPK/SPC Calculator</p>
          </div>
        </div>
      `;
      break;
      
    default:
      subject = `Báo cáo SPC - ${dateStr}`;
      html = `<p>Báo cáo không xác định</p>`;
  }
  
  return { html, subject };
}

// Generate and send report
export async function generateAndSendReport(report: any): Promise<ReportResult> {
  try {
    const recipients = JSON.parse(report.recipients || '[]');
    const ccRecipients = report.ccRecipients ? JSON.parse(report.ccRecipients) : [];
    
    if (recipients.length === 0) {
      return { success: false, error: 'Không có người nhận' };
    }
    
    // Generate report content
    const { html, subject } = await generateReportContent(report);
    
    // Send emails
    let emailsSent = 0;
    const errors: string[] = [];
    
    for (const recipient of recipients) {
      try {
        await sendEmail({
          to: recipient,
          subject,
          html,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        });
        emailsSent++;
      } catch (err: any) {
        errors.push(`${recipient}: ${err.message}`);
      }
    }
    
    if (emailsSent === 0) {
      return { 
        success: false, 
        error: `Không gửi được email nào. Lỗi: ${errors.join('; ')}`,
        emailsSent: 0 
      };
    }
    
    return { 
      success: true, 
      emailsSent,
      error: errors.length > 0 ? `Một số email lỗi: ${errors.join('; ')}` : undefined
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Process due scheduled reports (called by cron job)
export async function processDueReports(): Promise<void> {
  const now = new Date();
  const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');
  
  // Get reports that are due
  const dueReports = await (await getDb())
    .select()
    .from(scheduledReports)
    .where(and(
      eq(scheduledReports.isActive, 1),
      lte(scheduledReports.nextRunAt, nowStr)
    ));
  
  for (const report of dueReports) {
    // Create log entry
    const [logResult] = await (await getDb()).insert(scheduledReportLogs).values({
      reportId: report.id,
      status: 'running',
      recipientCount: JSON.parse(report.recipients as string || '[]').length,
    });
    const logId = logResult.insertId;
    
    try {
      const result = await generateAndSendReport(report);
      
      // Update log
      await (await getDb()).update(scheduledReportLogs)
        .set({
          status: result.success ? 'success' : 'failed',
          completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          emailsSent: result.emailsSent || 0,
          errorMessage: result.error || null,
        })
        .where(eq(scheduledReportLogs.id, logId));
      
      // Calculate next run time
      const nextRunAt = calculateNextRunAt(
        report.scheduleType as 'daily' | 'weekly' | 'monthly',
        report.scheduleTime,
        report.scheduleDayOfWeek,
        report.scheduleDayOfMonth
      );
      
      // Update report
      await (await getDb()).update(scheduledReports)
        .set({
          lastRunAt: nowStr,
          lastRunStatus: result.success ? 'success' : 'failed',
          lastRunError: result.error || null,
          nextRunAt: nextRunAt.toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(scheduledReports.id, report.id));
        
    } catch (error: any) {
      await (await getDb()).update(scheduledReportLogs)
        .set({
          status: 'failed',
          completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          errorMessage: error.message,
        })
        .where(eq(scheduledReportLogs.id, logId));
      
      await (await getDb()).update(scheduledReports)
        .set({
          lastRunAt: nowStr,
          lastRunStatus: 'failed',
          lastRunError: error.message,
        })
        .where(eq(scheduledReports.id, report.id));
    }
  }
}

// Helper function for calculating next run (duplicated for service use)
function calculateNextRunAt(
  scheduleType: 'daily' | 'weekly' | 'monthly',
  scheduleTime: string,
  scheduleDayOfWeek?: number | null,
  scheduleDayOfMonth?: number | null
): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  
  next.setHours(hours, minutes, 0, 0);
  
  if (scheduleType === 'daily') {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (scheduleType === 'weekly' && scheduleDayOfWeek !== null && scheduleDayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntil = scheduleDayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else if (scheduleType === 'monthly' && scheduleDayOfMonth !== null && scheduleDayOfMonth !== undefined) {
    next.setDate(scheduleDayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next;
}
