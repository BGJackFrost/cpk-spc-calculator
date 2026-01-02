import ExcelJS from "exceljs";
import { getDb } from "../db";
import { iotDevices, iotDeviceData, iotAlarms } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

// Types
interface IoTDashboardData {
  title: string;
  generatedAt: Date;
  dateRange: { start?: string; end?: string };
  stats: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    errorDevices: number;
    maintenanceDevices: number;
  };
  devices: Array<{
    id: number;
    deviceId: string;
    name: string;
    type: string;
    status: string;
    location?: string;
    lastSeen?: Date;
  }>;
  alarms: Array<{
    id: number;
    deviceId: number;
    deviceName?: string;
    severity: string;
    message: string;
    acknowledged: boolean;
    createdAt: Date;
  }>;
}

interface DeviceReportData {
  device: {
    id: number;
    deviceId: string;
    name: string;
    type: string;
    status: string;
    location?: string;
    lastSeen?: Date;
  };
  data: Array<{
    timestamp: Date;
    dataType: string;
    value: number;
    unit?: string;
  }>;
  alarms: Array<{
    severity: string;
    message: string;
    createdAt: Date;
    acknowledged: boolean;
  }>;
  dateRange: { start?: string; end?: string };
  generatedAt: Date;
}

// Get IoT dashboard data
async function getIotDashboardData(startDate?: string, endDate?: string): Promise<IoTDashboardData> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all devices
  const devices = await db.select().from(iotDevices).orderBy(desc(iotDevices.lastSeen));

  // Get recent alarms
  let alarmConditions: any[] = [];
  if (startDate) {
    alarmConditions.push(gte(iotAlarms.createdAt, new Date(startDate)));
  }
  if (endDate) {
    alarmConditions.push(lte(iotAlarms.createdAt, new Date(endDate)));
  }

  const alarms = await db.select()
    .from(iotAlarms)
    .where(alarmConditions.length > 0 ? and(...alarmConditions) : undefined)
    .orderBy(desc(iotAlarms.createdAt))
    .limit(100);

  // Calculate stats
  const stats = {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.status === "online").length,
    offlineDevices: devices.filter(d => d.status === "offline").length,
    errorDevices: devices.filter(d => d.status === "error").length,
    maintenanceDevices: devices.filter(d => d.status === "maintenance").length,
  };

  // Map device names to alarms
  const deviceMap = new Map(devices.map(d => [d.id, d.name]));

  return {
    title: "Báo cáo IoT Dashboard",
    generatedAt: new Date(),
    dateRange: { start: startDate, end: endDate },
    stats,
    devices: devices.map(d => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      type: d.type || "unknown",
      status: d.status || "unknown",
      location: d.location || undefined,
      lastSeen: d.lastSeen || undefined,
    })),
    alarms: alarms.map(a => ({
      id: a.id,
      deviceId: a.deviceId,
      deviceName: deviceMap.get(a.deviceId) || "Unknown",
      severity: a.severity || "info",
      message: a.message || "",
      acknowledged: a.acknowledged || false,
      createdAt: a.createdAt || new Date(),
    })),
  };
}

// Generate HTML report for IoT Dashboard
export async function generateIotDashboardHtml(startDate?: string, endDate?: string): Promise<string> {
  const data = await getIotDashboardData(startDate, endDate);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
    .stat-card .value { font-size: 32px; font-weight: bold; }
    .stat-card .label { color: #666; margin-top: 5px; }
    .stat-online { color: #10b981; }
    .stat-offline { color: #6b7280; }
    .stat-error { color: #ef4444; }
    .stat-maintenance { color: #f59e0b; }
    .section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .section h2 { color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #10b981; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #333; }
    tr:hover { background: #f8f9fa; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-online { background: #d1fae5; color: #065f46; }
    .status-offline { background: #f3f4f6; color: #374151; }
    .status-error { background: #fee2e2; color: #991b1b; }
    .status-maintenance { background: #fef3c7; color: #92400e; }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-warning { background: #fef3c7; color: #92400e; }
    .severity-info { background: #dbeafe; color: #1e40af; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    @media print {
      body { background: white; }
      .container { max-width: 100%; }
      .section { box-shadow: none; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌐 ${data.title}</h1>
      <p>Ngày tạo: ${formatDate(data.generatedAt)}</p>
      ${data.dateRange.start || data.dateRange.end ? `<p>Khoảng thời gian: ${data.dateRange.start || 'N/A'} - ${data.dateRange.end || 'N/A'}</p>` : ''}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="value">${data.stats.totalDevices}</div>
        <div class="label">Tổng thiết bị</div>
      </div>
      <div class="stat-card">
        <div class="value stat-online">${data.stats.onlineDevices}</div>
        <div class="label">Đang hoạt động</div>
      </div>
      <div class="stat-card">
        <div class="value stat-offline">${data.stats.offlineDevices}</div>
        <div class="label">Offline</div>
      </div>
      <div class="stat-card">
        <div class="value stat-error">${data.stats.errorDevices}</div>
        <div class="label">Lỗi</div>
      </div>
      <div class="stat-card">
        <div class="value stat-maintenance">${data.stats.maintenanceDevices}</div>
        <div class="label">Bảo trì</div>
      </div>
    </div>

    <div class="section">
      <h2>📡 Danh sách thiết bị</h2>
      <table>
        <thead>
          <tr>
            <th>Device ID</th>
            <th>Tên thiết bị</th>
            <th>Loại</th>
            <th>Vị trí</th>
            <th>Trạng thái</th>
            <th>Lần cuối online</th>
          </tr>
        </thead>
        <tbody>
          ${data.devices.map(d => `
            <tr>
              <td>${d.deviceId}</td>
              <td>${d.name}</td>
              <td>${d.type}</td>
              <td>${d.location || '-'}</td>
              <td><span class="status-badge status-${d.status}">${d.status}</span></td>
              <td>${d.lastSeen ? formatDate(d.lastSeen) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🔔 Cảnh báo gần đây</h2>
      <table>
        <thead>
          <tr>
            <th>Thiết bị</th>
            <th>Mức độ</th>
            <th>Nội dung</th>
            <th>Thời gian</th>
            <th>Đã xác nhận</th>
          </tr>
        </thead>
        <tbody>
          ${data.alarms.map(a => `
            <tr>
              <td>${a.deviceName}</td>
              <td><span class="status-badge severity-${a.severity}">${a.severity}</span></td>
              <td>${a.message}</td>
              <td>${formatDate(a.createdAt)}</td>
              <td>${a.acknowledged ? '✓ Đã xác nhận' : '⏳ Chưa'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
      <p>© 2024 Foutec Digital - All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

// Generate Excel report for IoT Dashboard
export async function generateIotDashboardExcel(startDate?: string, endDate?: string): Promise<Buffer> {
  const data = await getIotDashboardData(startDate, endDate);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPC/CPK Calculator";
  workbook.created = new Date();

  // Summary sheet
  const summarySheet = workbook.addWorksheet("Tổng quan");
  summarySheet.columns = [
    { header: "Chỉ số", key: "metric", width: 25 },
    { header: "Giá trị", key: "value", width: 15 },
  ];
  summarySheet.addRows([
    { metric: "Tổng số thiết bị", value: data.stats.totalDevices },
    { metric: "Thiết bị online", value: data.stats.onlineDevices },
    { metric: "Thiết bị offline", value: data.stats.offlineDevices },
    { metric: "Thiết bị lỗi", value: data.stats.errorDevices },
    { metric: "Thiết bị bảo trì", value: data.stats.maintenanceDevices },
    { metric: "Ngày tạo báo cáo", value: data.generatedAt.toLocaleString("vi-VN") },
  ]);
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Devices sheet
  const devicesSheet = workbook.addWorksheet("Thiết bị");
  devicesSheet.columns = [
    { header: "Device ID", key: "deviceId", width: 15 },
    { header: "Tên thiết bị", key: "name", width: 25 },
    { header: "Loại", key: "type", width: 15 },
    { header: "Vị trí", key: "location", width: 20 },
    { header: "Trạng thái", key: "status", width: 15 },
    { header: "Lần cuối online", key: "lastSeen", width: 20 },
  ];
  data.devices.forEach(d => {
    devicesSheet.addRow({
      deviceId: d.deviceId,
      name: d.name,
      type: d.type,
      location: d.location || "-",
      status: d.status,
      lastSeen: d.lastSeen ? new Date(d.lastSeen).toLocaleString("vi-VN") : "-",
    });
  });
  devicesSheet.getRow(1).font = { bold: true };
  devicesSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  devicesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Alarms sheet
  const alarmsSheet = workbook.addWorksheet("Cảnh báo");
  alarmsSheet.columns = [
    { header: "Thiết bị", key: "deviceName", width: 25 },
    { header: "Mức độ", key: "severity", width: 15 },
    { header: "Nội dung", key: "message", width: 40 },
    { header: "Thời gian", key: "createdAt", width: 20 },
    { header: "Đã xác nhận", key: "acknowledged", width: 15 },
  ];
  data.alarms.forEach(a => {
    alarmsSheet.addRow({
      deviceName: a.deviceName,
      severity: a.severity,
      message: a.message,
      createdAt: new Date(a.createdAt).toLocaleString("vi-VN"),
      acknowledged: a.acknowledged ? "Đã xác nhận" : "Chưa",
    });
  });
  alarmsSheet.getRow(1).font = { bold: true };
  alarmsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  alarmsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Generate HTML report for specific device
export async function generateDeviceReportHtml(deviceId: number, startDate?: string, endDate?: string): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get device info
  const [device] = await db.select().from(iotDevices).where(eq(iotDevices.id, deviceId));
  if (!device) {
    throw new Error("Device not found");
  }

  // Get device data
  let dataConditions = [eq(iotDeviceData.deviceId, deviceId)];
  if (startDate) {
    dataConditions.push(gte(iotDeviceData.timestamp, new Date(startDate)));
  }
  if (endDate) {
    dataConditions.push(lte(iotDeviceData.timestamp, new Date(endDate)));
  }

  const deviceData = await db.select()
    .from(iotDeviceData)
    .where(and(...dataConditions))
    .orderBy(desc(iotDeviceData.timestamp))
    .limit(500);

  // Get device alarms
  let alarmConditions = [eq(iotAlarms.deviceId, deviceId)];
  if (startDate) {
    alarmConditions.push(gte(iotAlarms.createdAt, new Date(startDate)));
  }
  if (endDate) {
    alarmConditions.push(lte(iotAlarms.createdAt, new Date(endDate)));
  }

  const alarms = await db.select()
    .from(iotAlarms)
    .where(and(...alarmConditions))
    .orderBy(desc(iotAlarms.createdAt))
    .limit(100);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo thiết bị: ${device.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .info-card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .info-card .label { color: #666; font-size: 14px; }
    .info-card .value { font-size: 18px; font-weight: 600; color: #333; }
    .section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .section h2 { color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-online { background: #d1fae5; color: #065f46; }
    .status-offline { background: #f3f4f6; color: #374151; }
    .status-error { background: #fee2e2; color: #991b1b; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Báo cáo thiết bị: ${device.name}</h1>
      <p>Ngày tạo: ${formatDate(new Date())}</p>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="label">Device ID</div>
        <div class="value">${device.deviceId}</div>
      </div>
      <div class="info-card">
        <div class="label">Loại thiết bị</div>
        <div class="value">${device.type || "N/A"}</div>
      </div>
      <div class="info-card">
        <div class="label">Vị trí</div>
        <div class="value">${device.location || "N/A"}</div>
      </div>
      <div class="info-card">
        <div class="label">Trạng thái</div>
        <div class="value"><span class="status-badge status-${device.status}">${device.status}</span></div>
      </div>
      <div class="info-card">
        <div class="label">Lần cuối online</div>
        <div class="value">${device.lastSeen ? formatDate(device.lastSeen) : "N/A"}</div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Dữ liệu thiết bị (${deviceData.length} bản ghi)</h2>
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Loại dữ liệu</th>
            <th>Giá trị</th>
            <th>Đơn vị</th>
          </tr>
        </thead>
        <tbody>
          ${deviceData.slice(0, 100).map(d => `
            <tr>
              <td>${formatDate(d.timestamp)}</td>
              <td>${d.dataType || "N/A"}</td>
              <td>${d.value}</td>
              <td>${d.unit || "-"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${deviceData.length > 100 ? `<p style="margin-top: 10px; color: #666;">Hiển thị 100/${deviceData.length} bản ghi</p>` : ''}
    </div>

    <div class="section">
      <h2>🔔 Cảnh báo (${alarms.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Mức độ</th>
            <th>Nội dung</th>
            <th>Đã xác nhận</th>
          </tr>
        </thead>
        <tbody>
          ${alarms.map(a => `
            <tr>
              <td>${formatDate(a.createdAt)}</td>
              <td><span class="status-badge severity-${a.severity}">${a.severity}</span></td>
              <td>${a.message}</td>
              <td>${a.acknowledged ? '✓' : '⏳'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}
