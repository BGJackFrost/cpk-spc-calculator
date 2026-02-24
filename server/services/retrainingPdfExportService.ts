/**
 * Retraining PDF Export Service
 * Tạo báo cáo PDF cho Model Retraining history
 */

import { getDb } from '../db';

export interface RetrainingPdfData {
  title: string;
  generatedAt: string;
  stats: {
    totalRetrainings: number;
    successfulRetrainings: number;
    failedRetrainings: number;
    avgAccuracyImprovement: number;
    avgTrainingDuration: number;
    successRate: number;
  };
  history: Array<{
    id: number;
    configName: string;
    modelId: number;
    triggerReason: string;
    previousAccuracy: number;
    newAccuracy: number | null;
    accuracyImprovement: number | null;
    status: string;
    trainingSamples: number;
    trainingDurationSec: number | null;
    startedAt: number | null;
    completedAt: number | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
  configs: Array<{
    id: number;
    name: string;
    modelId: number;
    accuracyThreshold: number;
    f1ScoreThreshold: number;
    checkIntervalHours: number;
    isEnabled: boolean;
  }>;
}

export async function generateRetrainingPdfData(options: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<RetrainingPdfData> {
  const db = await getDb();
  const { status, startDate, endDate, limit = 100 } = options;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (status && status !== 'all') {
    conditions.push('h.status = ?');
    params.push(status);
  }
  if (startDate) {
    conditions.push('h.created_at >= ?');
    params.push(startDate.toISOString());
  }
  if (endDate) {
    conditions.push('h.created_at <= ?');
    params.push(endDate.toISOString());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get history with config names
  let history: any[] = [];
  try {
    const historyResults = await db.execute(
      `SELECT h.*, c.name as config_name 
       FROM model_retraining_history h 
       LEFT JOIN model_retraining_configs c ON h.config_id = c.id 
       ${whereClause}
       ORDER BY h.created_at DESC 
       LIMIT ?`,
      [...params, limit]
    );
    history = (historyResults as any[]) || [];
  } catch (error) {
    console.error('[RetrainingPdf] Error fetching history:', error);
  }

  // Get configs
  let configs: any[] = [];
  try {
    const configResults = await db.execute(
      `SELECT id, name, model_id, accuracy_threshold, f1_score_threshold, check_interval_hours, is_enabled 
       FROM model_retraining_configs 
       ORDER BY created_at DESC`
    );
    configs = (configResults as any[]) || [];
  } catch (error) {
    console.error('[RetrainingPdf] Error fetching configs:', error);
  }

  const totalRetrainings = history.length;
  const successfulRetrainings = history.filter(h => h.status === 'completed').length;
  const failedRetrainings = history.filter(h => h.status === 'failed').length;
  
  const completedWithImprovement = history.filter(h => h.status === 'completed' && h.accuracyImprovement !== null);
  const avgAccuracyImprovement = completedWithImprovement.length > 0
    ? completedWithImprovement.reduce((sum, h) => sum + (h.accuracyImprovement || 0), 0) / completedWithImprovement.length
    : 0;

  const completedWithDuration = history.filter(h => h.status === 'completed' && h.trainingDurationSec !== null);
  const avgTrainingDuration = completedWithDuration.length > 0
    ? completedWithDuration.reduce((sum, h) => sum + (h.trainingDurationSec || 0), 0) / completedWithDuration.length
    : 0;

  const successRate = totalRetrainings > 0 ? (successfulRetrainings / totalRetrainings) * 100 : 0;

  return {
    title: 'Báo cáo Model Retraining History',
    generatedAt: new Date().toLocaleString('vi-VN'),
    stats: {
      totalRetrainings,
      successfulRetrainings,
      failedRetrainings,
      avgAccuracyImprovement,
      avgTrainingDuration,
      successRate,
    },
    history: history.map(h => ({
      id: h.id,
      configName: h.config_name || `Config #${h.config_id}`,
      modelId: h.model_id,
      triggerReason: h.trigger_reason,
      previousAccuracy: h.previous_accuracy || 0,
      newAccuracy: h.new_accuracy,
      accuracyImprovement: h.accuracy_improvement,
      status: h.status,
      trainingSamples: h.training_samples || 0,
      trainingDurationSec: h.training_duration_sec,
      startedAt: h.started_at,
      completedAt: h.completed_at,
      errorMessage: h.error_message,
      createdAt: h.created_at,
    })),
    configs: configs.map(c => ({
      id: c.id,
      name: c.name,
      modelId: c.model_id,
      accuracyThreshold: c.accuracy_threshold || 0.9,
      f1ScoreThreshold: c.f1_score_threshold || 0.85,
      checkIntervalHours: c.check_interval_hours || 24,
      isEnabled: c.is_enabled === 1,
    })),
  };
}

export function generateRetrainingPdfHtml(data: RetrainingPdfData): string {
  const triggerLabels: Record<string, string> = {
    accuracy_drop: 'Accuracy giảm',
    f1_drop: 'F1 Score giảm',
    drift_detected: 'Data drift',
    scheduled: 'Theo lịch',
    manual: 'Thủ công',
  };

  const statusLabels: Record<string, string> = {
    queued: 'Đang chờ',
    running: 'Đang chạy',
    completed: 'Hoàn thành',
    failed: 'Thất bại',
    cancelled: 'Đã hủy',
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '-';
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
  };

  const formatDate = (timestamp: number | string | null): string => {
    if (timestamp === null) return '-';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
  };

  const historyRows = data.history.map(h => {
    const improvementClass = h.accuracyImprovement !== null && h.accuracyImprovement > 0 ? 'improvement-positive' : 'improvement-negative';
    const improvementValue = h.accuracyImprovement !== null 
      ? (h.accuracyImprovement > 0 ? '+' : '') + (h.accuracyImprovement * 100).toFixed(2) + '%' 
      : '-';
    return `<tr>
      <td>${formatDate(h.createdAt)}</td>
      <td>${h.configName}</td>
      <td>#${h.modelId}</td>
      <td>${triggerLabels[h.triggerReason] || h.triggerReason}</td>
      <td>${(h.previousAccuracy * 100).toFixed(1)}%</td>
      <td>${h.newAccuracy !== null ? (h.newAccuracy * 100).toFixed(1) + '%' : '-'}</td>
      <td class="${improvementClass}">${improvementValue}</td>
      <td>${formatDuration(h.trainingDurationSec)}</td>
      <td class="status-${h.status}">${statusLabels[h.status] || h.status}</td>
    </tr>`;
  }).join('');

  const configRows = data.configs.map(c => {
    return `<tr>
      <td>${c.name}</td>
      <td>#${c.modelId}</td>
      <td>${(c.accuracyThreshold * 100).toFixed(0)}%</td>
      <td>${(c.f1ScoreThreshold * 100).toFixed(0)}%</td>
      <td>${c.checkIntervalHours}h</td>
      <td class="${c.isEnabled ? 'status-completed' : 'status-failed'}">${c.isEnabled ? 'Bật' : 'Tắt'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 24px; margin-bottom: 10px; }
    .header p { color: #666; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-card .value { font-size: 28px; font-weight: bold; color: #1e40af; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .stat-card.success .value { color: #16a34a; }
    .stat-card.error .value { color: #dc2626; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #1e40af; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:nth-child(even) { background: #f8fafc; }
    .status-completed { color: #16a34a; font-weight: 500; }
    .status-failed { color: #dc2626; font-weight: 500; }
    .status-running { color: #ca8a04; font-weight: 500; }
    .status-queued { color: #3b82f6; font-weight: 500; }
    .improvement-positive { color: #16a34a; }
    .improvement-negative { color: #dc2626; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
    @media print { body { padding: 10px; } table { font-size: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <p>Tạo lúc: ${data.generatedAt}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="value">${data.stats.totalRetrainings}</div>
      <div class="label">Tổng số Retraining</div>
    </div>
    <div class="stat-card success">
      <div class="value">${data.stats.successfulRetrainings}</div>
      <div class="label">Thành công</div>
    </div>
    <div class="stat-card error">
      <div class="value">${data.stats.failedRetrainings}</div>
      <div class="label">Thất bại</div>
    </div>
    <div class="stat-card">
      <div class="value">${data.stats.successRate.toFixed(1)}%</div>
      <div class="label">Tỷ lệ thành công</div>
    </div>
    <div class="stat-card success">
      <div class="value">+${(data.stats.avgAccuracyImprovement * 100).toFixed(2)}%</div>
      <div class="label">Cải thiện Accuracy TB</div>
    </div>
    <div class="stat-card">
      <div class="value">${formatDuration(Math.round(data.stats.avgTrainingDuration))}</div>
      <div class="label">Thời gian train TB</div>
    </div>
  </div>

  <div class="section">
    <h2>Lịch sử Retraining</h2>
    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Cấu hình</th>
          <th>Model</th>
          <th>Nguyên nhân</th>
          <th>Accuracy trước</th>
          <th>Accuracy sau</th>
          <th>Cải thiện</th>
          <th>Thời gian train</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>${historyRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Cấu hình Retraining</h2>
    <table>
      <thead>
        <tr>
          <th>Tên</th>
          <th>Model ID</th>
          <th>Accuracy Threshold</th>
          <th>F1 Score Threshold</th>
          <th>Check Interval</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>${configRows}</tbody>
    </table>
  </div>

  <div class="footer">
    <p>Hệ thống Tính toán CPK/SPC - Model Auto-Retraining Report</p>
    <p>© ${new Date().getFullYear()} - Tạo tự động bởi hệ thống</p>
  </div>
</body>
</html>`;
}
