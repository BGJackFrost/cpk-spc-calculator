/**
 * Realtime Data Export Service
 * Task: IOT-02
 * Service export dữ liệu realtime CSV/Excel/JSON
 */

import * as XLSX from "xlsx";

// Types
export interface RealtimeDataPoint {
  timestamp: Date;
  machineId: number;
  machineName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  temperature?: number;
  vibration?: number;
  pressure?: number;
  speed?: number;
  output?: number;
  defects?: number;
}

export interface ExportConfig {
  format: "csv" | "excel" | "json";
  machineIds?: number[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  fields?: string[];
  includeHeaders?: boolean;
}


// Export to CSV
export function exportToCSV(
  data: RealtimeDataPoint[],
  config: ExportConfig
): string {
  const fields = config.fields || [
    "timestamp", "machineId", "machineName", "oee", "availability",
    "performance", "quality", "temperature", "vibration", "pressure",
    "speed", "output", "defects"
  ];

  const headers = config.includeHeaders !== false ? fields.join(",") + "\n" : "";
  
  const rows = data.map(row => {
    return fields.map(field => {
      const value = (row as any)[field];
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "number") {
        return value.toFixed(2);
      }
      return value?.toString() || "";
    }).join(",");
  }).join("\n");

  return headers + rows;
}

// Export to Excel
export function exportToExcel(
  data: RealtimeDataPoint[],
  config: ExportConfig
): Buffer {
  const workbook = XLSX.utils.book_new();

  // Prepare data for Excel
  const excelData = data.map(row => ({
    "Thời gian": row.timestamp.toLocaleString("vi-VN"),
    "Mã máy": row.machineId,
    "Tên máy": row.machineName,
    "OEE (%)": row.oee.toFixed(1),
    "Availability (%)": row.availability.toFixed(1),
    "Performance (%)": row.performance.toFixed(1),
    "Quality (%)": row.quality.toFixed(1),
    "Nhiệt độ (°C)": row.temperature?.toFixed(1) || "-",
    "Rung động (mm/s)": row.vibration?.toFixed(2) || "-",
    "Áp suất (bar)": row.pressure?.toFixed(2) || "-",
    "Tốc độ (rpm)": row.speed?.toFixed(0) || "-",
    "Sản lượng": row.output || 0,
    "Lỗi": row.defects || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Thời gian
    { wch: 10 }, // Mã máy
    { wch: 15 }, // Tên máy
    { wch: 10 }, // OEE
    { wch: 15 }, // Availability
    { wch: 15 }, // Performance
    { wch: 12 }, // Quality
    { wch: 12 }, // Nhiệt độ
    { wch: 15 }, // Rung động
    { wch: 12 }, // Áp suất
    { wch: 12 }, // Tốc độ
    { wch: 10 }, // Sản lượng
    { wch: 8 },  // Lỗi
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Realtime Data");

  // Add summary sheet
  const summaryData = calculateSummary(data);
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

// Export to JSON
export function exportToJSON(
  data: RealtimeDataPoint[],
  config: ExportConfig
): string {
  const fields = config.fields || Object.keys(data[0] || {});
  
  const filteredData = data.map(row => {
    const filtered: any = {};
    for (const field of fields) {
      filtered[field] = (row as any)[field];
    }
    return filtered;
  });

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalRecords: filteredData.length,
    dateRange: config.dateRange ? {
      start: config.dateRange.start.toISOString(),
      end: config.dateRange.end.toISOString(),
    } : null,
    data: filteredData,
  }, null, 2);
}

// Calculate summary statistics
function calculateSummary(data: RealtimeDataPoint[]) {
  if (data.length === 0) return [];

  const machineIds = [...new Set(data.map(d => d.machineId))];
  
  return machineIds.map(machineId => {
    const machineData = data.filter(d => d.machineId === machineId);
    const machineName = machineData[0]?.machineName || `Machine-${machineId}`;
    
    const avgOEE = machineData.reduce((sum, d) => sum + d.oee, 0) / machineData.length;
    const avgAvailability = machineData.reduce((sum, d) => sum + d.availability, 0) / machineData.length;
    const avgPerformance = machineData.reduce((sum, d) => sum + d.performance, 0) / machineData.length;
    const avgQuality = machineData.reduce((sum, d) => sum + d.quality, 0) / machineData.length;
    const totalOutput = machineData.reduce((sum, d) => sum + (d.output || 0), 0);
    const totalDefects = machineData.reduce((sum, d) => sum + (d.defects || 0), 0);

    return {
      "Tên máy": machineName,
      "Số điểm dữ liệu": machineData.length,
      "OEE TB (%)": avgOEE.toFixed(1),
      "Availability TB (%)": avgAvailability.toFixed(1),
      "Performance TB (%)": avgPerformance.toFixed(1),
      "Quality TB (%)": avgQuality.toFixed(1),
      "Tổng sản lượng": totalOutput,
      "Tổng lỗi": totalDefects,
      "Tỷ lệ lỗi (%)": totalOutput > 0 ? ((totalDefects / totalOutput) * 100).toFixed(2) : "0",
    };
  });
}

// Main export function
export async function exportRealtimeData(
  config: ExportConfig,
  data?: RealtimeDataPoint[]
): Promise<{ content: string | Buffer; filename: string; mimeType: string }> {
  // Use provided data or return empty dataset
  const exportData = data || [];
  
  // Filter by date range if specified
  const filteredData = config.dateRange
    ? exportData.filter(d => 
        d.timestamp >= config.dateRange!.start && 
        d.timestamp <= config.dateRange!.end
      )
    : exportData;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  switch (config.format) {
    case "csv":
      return {
        content: exportToCSV(filteredData, config),
        filename: `realtime-data-${timestamp}.csv`,
        mimeType: "text/csv",
      };
    
    case "excel":
      return {
        content: exportToExcel(filteredData, config),
        filename: `realtime-data-${timestamp}.xlsx`,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    
    case "json":
      return {
        content: exportToJSON(filteredData, config),
        filename: `realtime-data-${timestamp}.json`,
        mimeType: "application/json",
      };
    
    default:
      throw new Error(`Unsupported format: ${config.format}`);
  }
}

// WebSocket message types for realtime updates
export interface WebSocketMessage {
  type: "data" | "alert" | "status" | "heartbeat";
  payload: any;
  timestamp: Date;
}

// Generate WebSocket data update message
export function createDataUpdateMessage(data: RealtimeDataPoint): WebSocketMessage {
  return {
    type: "data",
    payload: data,
    timestamp: new Date(),
  };
}

// Generate WebSocket alert message
export function createAlertMessage(
  machineId: number,
  alertType: string,
  message: string,
  severity: "info" | "warning" | "critical"
): WebSocketMessage {
  return {
    type: "alert",
    payload: {
      machineId,
      alertType,
      message,
      severity,
    },
    timestamp: new Date(),
  };
}

// Generate WebSocket status message
export function createStatusMessage(
  machineId: number,
  status: "running" | "idle" | "stopped" | "maintenance"
): WebSocketMessage {
  return {
    type: "status",
    payload: {
      machineId,
      status,
    },
    timestamp: new Date(),
  };
}
