/**
 * CPK Alert Service - Xử lý cảnh báo CPK với ngưỡng tùy chỉnh theo sản phẩm
 */

export interface CpkThreshold {
  id: number;
  productId: number | null;
  productCode: string | null;
  stationName: string | null;
  warningThreshold: number;
  criticalThreshold: number;
  excellentThreshold: number;
  enableTelegram: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
  webhookUrl: string | null;
  emailRecipients: string | null;
  telegramChatId: string | null;
  isActive: boolean;
}

/**
 * Lấy ngưỡng CPK cho sản phẩm cụ thể
 */
export async function getCpkThresholdForProduct(
  productCode: string,
  stationName?: string
): Promise<CpkThreshold | null> {
  // Return default threshold
  return {
    id: 0,
    productId: null,
    productCode,
    stationName: stationName || null,
    warningThreshold: 1.33,
    criticalThreshold: 1.0,
    excellentThreshold: 1.67,
    enableTelegram: false,
    enableEmail: false,
    enableWebhook: false,
    webhookUrl: null,
    emailRecipients: null,
    telegramChatId: null,
    isActive: true,
  };
}

/**
 * Lưu lịch sử cảnh báo CPK
 */
export async function saveCpkAlertHistory(data: {
  productCode: string;
  stationName: string;
  cpkValue: number;
  alertType: 'warning' | 'critical' | 'excellent';
  thresholdUsed: number;
  notificationSent: boolean;
  notificationChannel?: string;
  message?: string;
}): Promise<number> {
  console.log('[CpkAlertService] Saving alert history:', data);
  return 1;
}

/**
 * Kiểm tra và gửi cảnh báo CPK
 */
export async function checkAndSendCpkAlert(params: {
  productCode: string;
  stationName: string;
  cpkValue: number;
  sampleCount: number;
  mean: number;
  stdDev: number;
}): Promise<{
  alertTriggered: boolean;
  alertType: 'warning' | 'critical' | 'excellent' | null;
  notificationsSent: string[];
}> {
  const { cpkValue } = params;
  
  const warningThreshold = 1.33;
  const criticalThreshold = 1.0;
  const excellentThreshold = 1.67;
  
  let alertType: 'warning' | 'critical' | 'excellent' | null = null;
  
  if (cpkValue < criticalThreshold) {
    alertType = 'critical';
  } else if (cpkValue < warningThreshold) {
    alertType = 'warning';
  } else if (cpkValue >= excellentThreshold) {
    alertType = 'excellent';
  }
  
  if (!alertType) {
    return {
      alertTriggered: false,
      alertType: null,
      notificationsSent: [],
    };
  }
  
  return {
    alertTriggered: true,
    alertType,
    notificationsSent: [],
  };
}

export default {
  getCpkThresholdForProduct,
  saveCpkAlertHistory,
  checkAndSendCpkAlert,
};
