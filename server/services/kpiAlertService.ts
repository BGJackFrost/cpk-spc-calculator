/**
 * KPI Alert Service
 * Kiểm tra và gửi cảnh báo khi KPI giảm so với tuần trước
 * Hỗ trợ ngưỡng tùy chỉnh theo từng dây chuyền
 */

import { getDb } from "../db";
import { emailNotificationSettings, users, kpiAlertThresholds, productionLines } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { notifyOwner } from "../_core/notification";
import { compareKPIWithPreviousWeek, getShiftKPIData } from "./shiftManagerService";

export interface KPIAlertConfig {
  cpkThreshold: number; // Ngưỡng giảm CPK (%, mặc định -5%)
  oeeThreshold: number; // Ngưỡng giảm OEE (%, mặc định -5%)
  cpkWarning: number; // Ngưỡng CPK warning (mặc định 1.33)
  cpkCritical: number; // Ngưỡng CPK critical (mặc định 1.00)
  oeeWarning: number; // Ngưỡng OEE warning (mặc định 75%)
  oeeCritical: number; // Ngưỡng OEE critical (mặc định 60%)
  enableEmailAlert: boolean;
  enableOwnerNotification: boolean;
  recipients?: string[];
}

const DEFAULT_CONFIG: KPIAlertConfig = {
  cpkThreshold: -5,
  oeeThreshold: -5,
  cpkWarning: 1.33,
  cpkCritical: 1.00,
  oeeWarning: 75,
  oeeCritical: 60,
  enableEmailAlert: true,
  enableOwnerNotification: true,
};

/**
 * Lấy ngưỡng cảnh báo từ database cho dây chuyền cụ thể
 */
export async function getThresholdForLine(productionLineId: number): Promise<KPIAlertConfig> {
  const db = await getDb();
  if (!db) return DEFAULT_CONFIG;

  try {
    const [threshold] = await db
      .select()
      .from(kpiAlertThresholds)
      .where(eq(kpiAlertThresholds.productionLineId, productionLineId))
      .limit(1);

    if (threshold) {
      return {
        cpkThreshold: parseFloat(String(threshold.weeklyDeclineThreshold)) || -5,
        oeeThreshold: parseFloat(String(threshold.weeklyDeclineThreshold)) || -5,
        cpkWarning: parseFloat(String(threshold.cpkWarning)) || 1.33,
        cpkCritical: parseFloat(String(threshold.cpkCritical)) || 1.00,
        oeeWarning: parseFloat(String(threshold.oeeWarning)) || 75,
        oeeCritical: parseFloat(String(threshold.oeeCritical)) || 60,
        enableEmailAlert: threshold.emailAlertEnabled === 1,
        enableOwnerNotification: true,
        recipients: threshold.alertEmails ? threshold.alertEmails.split(",").map(e => e.trim()) : undefined,
      };
    }

    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error getting threshold for line:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Lấy tất cả ngưỡng cảnh báo đã cấu hình
 */
export async function getAllThresholds(): Promise<Array<{
  productionLineId: number;
  productionLineName: string;
  config: KPIAlertConfig;
}>> {
  const db = await getDb();
  if (!db) return [];

  try {
    const thresholds = await db
      .select({
        threshold: kpiAlertThresholds,
        lineName: productionLines.name,
      })
      .from(kpiAlertThresholds)
      .leftJoin(productionLines, eq(kpiAlertThresholds.productionLineId, productionLines.id));

    return thresholds.map(t => ({
      productionLineId: t.threshold.productionLineId,
      productionLineName: t.lineName || `Line ${t.threshold.productionLineId}`,
      config: {
        cpkThreshold: parseFloat(String(t.threshold.weeklyDeclineThreshold)) || -5,
        oeeThreshold: parseFloat(String(t.threshold.weeklyDeclineThreshold)) || -5,
        cpkWarning: parseFloat(String(t.threshold.cpkWarning)) || 1.33,
        cpkCritical: parseFloat(String(t.threshold.cpkCritical)) || 1.00,
        oeeWarning: parseFloat(String(t.threshold.oeeWarning)) || 75,
        oeeCritical: parseFloat(String(t.threshold.oeeCritical)) || 60,
        enableEmailAlert: t.threshold.emailAlertEnabled === 1,
        enableOwnerNotification: true,
        recipients: t.threshold.alertEmails ? t.threshold.alertEmails.split(",").map(e => e.trim()) : undefined,
      },
    }));
  } catch (error) {
    console.error("Error getting all thresholds:", error);
    return [];
  }
}

/**
 * Kiểm tra KPI và gửi cảnh báo nếu cần
 * Sử dụng ngưỡng tùy chỉnh từ database nếu có
 */
export async function checkAndSendKPIAlerts(
  productionLineId?: number,
  machineId?: number,
  config?: Partial<KPIAlertConfig>
): Promise<{
  checked: boolean;
  cpkAlert: boolean;
  oeeAlert: boolean;
  cpkAbsoluteAlert: boolean;
  oeeAbsoluteAlert: boolean;
  emailSent: boolean;
  ownerNotified: boolean;
  thresholdUsed: KPIAlertConfig;
}> {
  // Lấy ngưỡng từ database nếu có productionLineId
  let finalConfig = { ...DEFAULT_CONFIG };
  if (productionLineId) {
    const dbConfig = await getThresholdForLine(productionLineId);
    finalConfig = { ...finalConfig, ...dbConfig };
  }
  if (config) {
    finalConfig = { ...finalConfig, ...config };
  }
  
  try {
    // Lấy dữ liệu so sánh KPI
    const comparison = await compareKPIWithPreviousWeek({
      date: new Date(),
      productionLineId,
      machineId,
    });

    // Kiểm tra cảnh báo giảm so với tuần trước
    const cpkAlert = comparison.cpkChange !== null && comparison.cpkChange < finalConfig.cpkThreshold;
    const oeeAlert = comparison.oeeChange !== null && comparison.oeeChange < finalConfig.oeeThreshold;

    // Kiểm tra cảnh báo giá trị tuyệt đối (CPK < warning, OEE < warning)
    const currentCpk = comparison.currentWeek.avgCpk;
    const currentOee = comparison.currentWeek.avgOee;
    const cpkAbsoluteAlert = currentCpk !== null && currentCpk < finalConfig.cpkWarning;
    const oeeAbsoluteAlert = currentOee !== null && currentOee < finalConfig.oeeWarning;

    let emailSent = false;
    let ownerNotified = false;

    if (cpkAlert || oeeAlert || cpkAbsoluteAlert || oeeAbsoluteAlert) {
      // Tạo nội dung cảnh báo
      const alertContent = generateAlertContent(
        comparison, 
        productionLineId, 
        machineId,
        finalConfig,
        { cpkAbsoluteAlert, oeeAbsoluteAlert }
      );

      // Gửi email cảnh báo
      if (finalConfig.enableEmailAlert) {
        const recipients = finalConfig.recipients || await getAlertRecipients();
        if (recipients.length > 0) {
          try {
            await sendEmail(
              recipients,
              `⚠️ Cảnh báo KPI - ${new Date().toLocaleDateString("vi-VN")}`,
              alertContent.html
            );
            emailSent = true;
          } catch (error) {
            console.error("Failed to send KPI alert email:", error);
          }
        }
      }

      // Gửi thông báo cho owner
      if (finalConfig.enableOwnerNotification) {
        try {
          await notifyOwner({
            title: "⚠️ Cảnh báo KPI",
            content: alertContent.text,
          });
          ownerNotified = true;
        } catch (error) {
          console.error("Failed to notify owner:", error);
        }
      }
    }

    return {
      checked: true,
      cpkAlert,
      oeeAlert,
      cpkAbsoluteAlert,
      oeeAbsoluteAlert,
      emailSent,
      ownerNotified,
      thresholdUsed: finalConfig,
    };
  } catch (error) {
    console.error("Error checking KPI alerts:", error);
    return {
      checked: false,
      cpkAlert: false,
      oeeAlert: false,
      cpkAbsoluteAlert: false,
      oeeAbsoluteAlert: false,
      emailSent: false,
      ownerNotified: false,
      thresholdUsed: finalConfig,
    };
  }
}

/**
 * Kiểm tra KPI cho tất cả dây chuyền có cấu hình ngưỡng
 */
export async function checkAllLinesKPIAlerts(): Promise<{
  totalLines: number;
  alertsTriggered: number;
  emailsSent: number;
  results: Array<{
    productionLineId: number;
    productionLineName: string;
    cpkAlert: boolean;
    oeeAlert: boolean;
    cpkAbsoluteAlert: boolean;
    oeeAbsoluteAlert: boolean;
  }>;
}> {
  const thresholds = await getAllThresholds();
  const results: Array<{
    productionLineId: number;
    productionLineName: string;
    cpkAlert: boolean;
    oeeAlert: boolean;
    cpkAbsoluteAlert: boolean;
    oeeAbsoluteAlert: boolean;
  }> = [];
  let alertsTriggered = 0;
  let emailsSent = 0;

  for (const threshold of thresholds) {
    const result = await checkAndSendKPIAlerts(threshold.productionLineId, undefined, threshold.config);
    
    results.push({
      productionLineId: threshold.productionLineId,
      productionLineName: threshold.productionLineName,
      cpkAlert: result.cpkAlert,
      oeeAlert: result.oeeAlert,
      cpkAbsoluteAlert: result.cpkAbsoluteAlert,
      oeeAbsoluteAlert: result.oeeAbsoluteAlert,
    });

    if (result.cpkAlert || result.oeeAlert || result.cpkAbsoluteAlert || result.oeeAbsoluteAlert) {
      alertsTriggered++;
    }
    if (result.emailSent) {
      emailsSent++;
    }
  }

  // Nếu không có cấu hình ngưỡng, kiểm tra với ngưỡng mặc định
  if (thresholds.length === 0) {
    const result = await checkAndSendKPIAlerts();
    if (result.cpkAlert || result.oeeAlert || result.cpkAbsoluteAlert || result.oeeAbsoluteAlert) {
      alertsTriggered++;
    }
    if (result.emailSent) {
      emailsSent++;
    }
  }

  return {
    totalLines: thresholds.length || 1,
    alertsTriggered,
    emailsSent,
    results,
  };
}

/**
 * Lấy danh sách email nhận cảnh báo
 */
async function getAlertRecipients(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Lấy email từ cài đặt thông báo
    const settings = await db.select().from(emailNotificationSettings);
    const emails = settings
      .filter((s) => s.email && s.cpkAlertEnabled === 1)
      .map((s) => s.email!);

    // Nếu không có, lấy email của admin
    if (emails.length === 0) {
      const admins = await db.select({ email: users.email })
        .from(users)
        .where(eq(users.role, "admin"));
      return admins.filter((a) => a.email).map((a) => a.email!);
    }

    return emails;
  } catch (error) {
    console.error("Error getting alert recipients:", error);
    return [];
  }
}

/**
 * Tạo nội dung cảnh báo
 */
function generateAlertContent(
  comparison: {
    currentWeek: { avgCpk: number | null; avgOee: number | null };
    previousWeek: { avgCpk: number | null; avgOee: number | null };
    cpkChange: number | null;
    oeeChange: number | null;
    cpkDeclineAlert: boolean;
    oeeDeclineAlert: boolean;
    alertThreshold: number;
  },
  productionLineId?: number,
  machineId?: number,
  config?: KPIAlertConfig,
  absoluteAlerts?: { cpkAbsoluteAlert: boolean; oeeAbsoluteAlert: boolean }
): { html: string; text: string } {
  const dateStr = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let filterInfo = "";
  if (productionLineId) filterInfo += `Dây chuyền ID: ${productionLineId}\n`;
  if (machineId) filterInfo += `Máy ID: ${machineId}\n`;

  const thresholdInfo = config ? `
Ngưỡng cảnh báo đang áp dụng:
- Giảm tuần: ${config.cpkThreshold}%
- CPK Warning: ${config.cpkWarning}
- CPK Critical: ${config.cpkCritical}
- OEE Warning: ${config.oeeWarning}%
- OEE Critical: ${config.oeeCritical}%
` : "";

  const textContent = `
CẢNH BÁO KPI
===================================
Ngày: ${dateStr}
${filterInfo}
${thresholdInfo}

${comparison.cpkDeclineAlert ? `
⚠️ CPK GIẢM ${Math.abs(comparison.cpkChange || 0).toFixed(1)}% SO VỚI TUẦN TRƯỚC
- Tuần trước: ${comparison.previousWeek.avgCpk?.toFixed(3) || "N/A"}
- Tuần này: ${comparison.currentWeek.avgCpk?.toFixed(3) || "N/A"}
` : ""}

${absoluteAlerts?.cpkAbsoluteAlert ? `
🔴 CPK DƯỚI NGƯỠNG WARNING (${config?.cpkWarning || 1.33})
- Giá trị hiện tại: ${comparison.currentWeek.avgCpk?.toFixed(3) || "N/A"}
` : ""}

${comparison.oeeDeclineAlert ? `
⚠️ OEE GIẢM ${Math.abs(comparison.oeeChange || 0).toFixed(1)}% SO VỚI TUẦN TRƯỚC
- Tuần trước: ${comparison.previousWeek.avgOee?.toFixed(1) || "N/A"}%
- Tuần này: ${comparison.currentWeek.avgOee?.toFixed(1) || "N/A"}%
` : ""}

${absoluteAlerts?.oeeAbsoluteAlert ? `
🔴 OEE DƯỚI NGƯỠNG WARNING (${config?.oeeWarning || 75}%)
- Giá trị hiện tại: ${comparison.currentWeek.avgOee?.toFixed(1) || "N/A"}%
` : ""}

Vui lòng kiểm tra và có biện pháp khắc phục kịp thời.

---
Hệ thống SPC/CPK Calculator
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .content { padding: 30px; }
    .alert-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .alert-card.warning { background: #fffbeb; border-color: #fde68a; }
    .alert-card.critical { background: #fef2f2; border-color: #fecaca; }
    .alert-card h3 { margin: 0 0 15px 0; color: #dc2626; font-size: 16px; }
    .alert-card.warning h3 { color: #d97706; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; }
    .metric-value { font-weight: bold; }
    .metric-value.down { color: #dc2626; }
    .threshold-info { background: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .threshold-info h4 { margin: 0 0 10px 0; color: #374151; font-size: 14px; }
    .threshold-info p { margin: 5px 0; font-size: 12px; color: #6b7280; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Cảnh báo KPI</h1>
      <p>${dateStr}</p>
      ${productionLineId ? `<p style="margin-top: 5px; font-size: 14px;">Dây chuyền ID: ${productionLineId}</p>` : ""}
    </div>
    
    <div class="content">
      ${config ? `
      <div class="threshold-info">
        <h4>📊 Ngưỡng cảnh báo đang áp dụng</h4>
        <p>Giảm tuần: ${config.cpkThreshold}% | CPK Warning: ${config.cpkWarning} | CPK Critical: ${config.cpkCritical}</p>
        <p>OEE Warning: ${config.oeeWarning}% | OEE Critical: ${config.oeeCritical}%</p>
      </div>
      ` : ""}

      ${comparison.cpkDeclineAlert ? `
      <div class="alert-card warning">
        <h3>📉 CPK giảm ${Math.abs(comparison.cpkChange || 0).toFixed(1)}% so với tuần trước</h3>
        <div class="metric">
          <span class="metric-label">Tuần trước</span>
          <span class="metric-value">${comparison.previousWeek.avgCpk?.toFixed(3) || "N/A"}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Tuần này</span>
          <span class="metric-value down">${comparison.currentWeek.avgCpk?.toFixed(3) || "N/A"}</span>
        </div>
      </div>
      ` : ""}

      ${absoluteAlerts?.cpkAbsoluteAlert ? `
      <div class="alert-card critical">
        <h3>🔴 CPK dưới ngưỡng Warning (${config?.cpkWarning || 1.33})</h3>
        <div class="metric">
          <span class="metric-label">Giá trị hiện tại</span>
          <span class="metric-value down">${comparison.currentWeek.avgCpk?.toFixed(3) || "N/A"}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Ngưỡng Warning</span>
          <span class="metric-value">${config?.cpkWarning || 1.33}</span>
        </div>
      </div>
      ` : ""}
      
      ${comparison.oeeDeclineAlert ? `
      <div class="alert-card warning">
        <h3>📉 OEE giảm ${Math.abs(comparison.oeeChange || 0).toFixed(1)}% so với tuần trước</h3>
        <div class="metric">
          <span class="metric-label">Tuần trước</span>
          <span class="metric-value">${comparison.previousWeek.avgOee?.toFixed(1) || "N/A"}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Tuần này</span>
          <span class="metric-value down">${comparison.currentWeek.avgOee?.toFixed(1) || "N/A"}%</span>
        </div>
      </div>
      ` : ""}

      ${absoluteAlerts?.oeeAbsoluteAlert ? `
      <div class="alert-card critical">
        <h3>🔴 OEE dưới ngưỡng Warning (${config?.oeeWarning || 75}%)</h3>
        <div class="metric">
          <span class="metric-label">Giá trị hiện tại</span>
          <span class="metric-value down">${comparison.currentWeek.avgOee?.toFixed(1) || "N/A"}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Ngưỡng Warning</span>
          <span class="metric-value">${config?.oeeWarning || 75}%</span>
        </div>
      </div>
      ` : ""}
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Vui lòng kiểm tra và có biện pháp khắc phục kịp thời.
      </p>
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    </div>
  </div>
</body>
</html>
  `;

  return { html: htmlContent, text: textContent };
}

/**
 * Scheduled job để kiểm tra KPI hàng ngày
 * Sử dụng ngưỡng tùy chỉnh cho từng dây chuyền
 */
export async function runDailyKPICheck(): Promise<void> {
  console.log("[KPIAlert] Running daily KPI check with custom thresholds...");
  
  try {
    const result = await checkAllLinesKPIAlerts();
    
    console.log(`[KPIAlert] Checked ${result.totalLines} lines`);
    console.log(`[KPIAlert] Alerts triggered: ${result.alertsTriggered}`);
    console.log(`[KPIAlert] Emails sent: ${result.emailsSent}`);
    
    if (result.alertsTriggered > 0) {
      console.log("[KPIAlert] Lines with alerts:");
      result.results
        .filter(r => r.cpkAlert || r.oeeAlert || r.cpkAbsoluteAlert || r.oeeAbsoluteAlert)
        .forEach(r => {
          console.log(`  - ${r.productionLineName}: CPK=${r.cpkAlert || r.cpkAbsoluteAlert}, OEE=${r.oeeAlert || r.oeeAbsoluteAlert}`);
        });
    } else {
      console.log("[KPIAlert] No alerts triggered - KPIs are stable");
    }
  } catch (error) {
    console.error("[KPIAlert] Error running daily check:", error);
  }
}
