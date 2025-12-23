/**
 * KPI Alert Service
 * Kiểm tra và gửi cảnh báo khi KPI giảm so với tuần trước
 */

import { getDb } from "../db";
import { emailNotificationSettings, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { notifyOwner } from "../_core/notification";
import { compareKPIWithPreviousWeek } from "./shiftManagerService";

export interface KPIAlertConfig {
  cpkThreshold: number; // Ngưỡng giảm CPK (%, mặc định -5%)
  oeeThreshold: number; // Ngưỡng giảm OEE (%, mặc định -5%)
  enableEmailAlert: boolean;
  enableOwnerNotification: boolean;
  recipients?: string[];
}

const DEFAULT_CONFIG: KPIAlertConfig = {
  cpkThreshold: -5,
  oeeThreshold: -5,
  enableEmailAlert: true,
  enableOwnerNotification: true,
};

/**
 * Kiểm tra KPI và gửi cảnh báo nếu cần
 */
export async function checkAndSendKPIAlerts(
  productionLineId?: number,
  machineId?: number,
  config: Partial<KPIAlertConfig> = {}
): Promise<{
  checked: boolean;
  cpkAlert: boolean;
  oeeAlert: boolean;
  emailSent: boolean;
  ownerNotified: boolean;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    // Lấy dữ liệu so sánh KPI
    const comparison = await compareKPIWithPreviousWeek({
      date: new Date(),
      productionLineId,
      machineId,
    });

    const cpkAlert = comparison.cpkChange !== null && comparison.cpkChange < finalConfig.cpkThreshold;
    const oeeAlert = comparison.oeeChange !== null && comparison.oeeChange < finalConfig.oeeThreshold;

    let emailSent = false;
    let ownerNotified = false;

    if (cpkAlert || oeeAlert) {
      // Tạo nội dung cảnh báo
      const alertContent = generateAlertContent(comparison, productionLineId, machineId);

      // Gửi email cảnh báo
      if (finalConfig.enableEmailAlert) {
        const recipients = finalConfig.recipients || await getAlertRecipients();
        if (recipients.length > 0) {
          try {
            await sendEmail(
              recipients,
              `⚠️ Cảnh báo KPI giảm - ${new Date().toLocaleDateString("vi-VN")}`,
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
            title: "⚠️ Cảnh báo KPI giảm so với tuần trước",
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
      emailSent,
      ownerNotified,
    };
  } catch (error) {
    console.error("Error checking KPI alerts:", error);
    return {
      checked: false,
      cpkAlert: false,
      oeeAlert: false,
      emailSent: false,
      ownerNotified: false,
    };
  }
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
  machineId?: number
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

  const textContent = `
CẢNH BÁO KPI GIẢM SO VỚI TUẦN TRƯỚC
===================================
Ngày: ${dateStr}
${filterInfo}

${comparison.cpkDeclineAlert ? `
⚠️ CPK GIẢM ${Math.abs(comparison.cpkChange || 0).toFixed(1)}%
- Tuần trước: ${comparison.previousWeek.avgCpk?.toFixed(3) || "N/A"}
- Tuần này: ${comparison.currentWeek.avgCpk?.toFixed(3) || "N/A"}
` : ""}

${comparison.oeeDeclineAlert ? `
⚠️ OEE GIẢM ${Math.abs(comparison.oeeChange || 0).toFixed(1)}%
- Tuần trước: ${comparison.previousWeek.avgOee?.toFixed(1) || "N/A"}%
- Tuần này: ${comparison.currentWeek.avgOee?.toFixed(1) || "N/A"}%
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
    .alert-card h3 { margin: 0 0 15px 0; color: #dc2626; font-size: 16px; }
    .alert-card.warning h3 { color: #d97706; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; }
    .metric-value { font-weight: bold; }
    .metric-value.down { color: #dc2626; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Cảnh báo KPI giảm</h1>
      <p>${dateStr}</p>
    </div>
    
    <div class="content">
      ${comparison.cpkDeclineAlert ? `
      <div class="alert-card">
        <h3>📉 CPK giảm ${Math.abs(comparison.cpkChange || 0).toFixed(1)}%</h3>
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
      
      ${comparison.oeeDeclineAlert ? `
      <div class="alert-card warning">
        <h3>📉 OEE giảm ${Math.abs(comparison.oeeChange || 0).toFixed(1)}%</h3>
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
 */
export async function runDailyKPICheck(): Promise<void> {
  console.log("[KPIAlert] Running daily KPI check...");
  
  try {
    const result = await checkAndSendKPIAlerts();
    
    if (result.cpkAlert || result.oeeAlert) {
      console.log(`[KPIAlert] Alerts triggered - CPK: ${result.cpkAlert}, OEE: ${result.oeeAlert}`);
      console.log(`[KPIAlert] Email sent: ${result.emailSent}, Owner notified: ${result.ownerNotified}`);
    } else {
      console.log("[KPIAlert] No alerts triggered - KPIs are stable");
    }
  } catch (error) {
    console.error("[KPIAlert] Error running daily check:", error);
  }
}
