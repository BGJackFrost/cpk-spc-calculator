import ExcelJS from "exceljs";

type HistoryRecord = {
  id: number;
  productCode?: string | null;
  stationName?: string | null;
  sampleCount?: number | null;
  mean?: number | null;
  stdDev?: number | null;
  cp?: number | null;
  cpk?: number | null;
  cpu?: number | null;
  cpl?: number | null;
  pp?: number | null;
  ppk?: number | null;
  ca?: number | null;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  ucl?: number | null;
  lcl?: number | null;
  alertTriggered?: number | null;
  createdAt?: Date | null;
  factoryName?: string | null;
  workshopName?: string | null;
};

type ExportFilters = {
  productCode?: string;
  stationName?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function generateHistoryExcelBuffer(data: HistoryRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CPK/SPC Calculator";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Lich su SPC-CPK", {
    properties: { tabColor: { argb: "FF4472C4" } },
  });

  worksheet.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Ngày giờ", key: "createdAt", width: 18 },
    { header: "Sản phẩm", key: "productCode", width: 15 },
    { header: "Công trạm", key: "stationName", width: 20 },
    { header: "Số mẫu", key: "sampleCount", width: 10 },
    { header: "Mean", key: "mean", width: 12 },
    { header: "StdDev", key: "stdDev", width: 12 },
    { header: "CP", key: "cp", width: 10 },
    { header: "CPK", key: "cpk", width: 10 },
    { header: "CPU", key: "cpu", width: 10 },
    { header: "CPL", key: "cpl", width: 10 },
    { header: "PP", key: "pp", width: 10 },
    { header: "PPK", key: "ppk", width: 10 },
    { header: "CA", key: "ca", width: 10 },
    { header: "USL", key: "usl", width: 12 },
    { header: "LSL", key: "lsl", width: 12 },
    { header: "Target", key: "target", width: 12 },
    { header: "Cảnh báo", key: "alertTriggered", width: 10 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;

  data.forEach((record, index) => {
    const row = worksheet.addRow({
      stt: index + 1,
      createdAt: record.createdAt ? new Date(record.createdAt).toLocaleString("vi-VN") : "-",
      productCode: record.productCode || "-",
      stationName: record.stationName || "-",
      sampleCount: record.sampleCount ?? "-",
      mean: record.mean?.toFixed(4) ?? "-",
      stdDev: record.stdDev?.toFixed(4) ?? "-",
      cp: record.cp?.toFixed(3) ?? "-",
      cpk: record.cpk?.toFixed(3) ?? "-",
      cpu: record.cpu?.toFixed(3) ?? "-",
      cpl: record.cpl?.toFixed(3) ?? "-",
      pp: record.pp?.toFixed(3) ?? "-",
      ppk: record.ppk?.toFixed(3) ?? "-",
      ca: record.ca?.toFixed(3) ?? "-",
      usl: record.usl?.toFixed(4) ?? "-",
      lsl: record.lsl?.toFixed(4) ?? "-",
      target: record.target?.toFixed(4) ?? "-",
      alertTriggered: record.alertTriggered ? "Có" : "Không",
    });

    const cpkCell = row.getCell("cpk");
    const cpkValue = record.cpk;
    if (cpkValue !== null && cpkValue !== undefined) {
      if (cpkValue >= 1.33) {
        cpkCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF90EE90" } };
      } else if (cpkValue >= 1.0) {
        cpkCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD700" } };
      } else {
        cpkCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } };
      }
    }

    if (record.alertTriggered) {
      row.getCell("alertTriggered").font = { color: { argb: "FFFF0000" }, bold: true };
    }
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.length + 1, column: 18 } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateHistoryPdfHtml(data: HistoryRecord[], filters: ExportFilters): string {
  const now = new Date().toLocaleString("vi-VN");
  const totalRecords = data.length;
  const validCpk = data.filter(d => d.cpk != null);
  const avgCpk = validCpk.length > 0 ? validCpk.reduce((sum, d) => sum + (d.cpk || 0), 0) / validCpk.length : 0;
  const alertCount = data.filter(d => d.alertTriggered).length;
  
  const getCpkStatus = (cpk: number | null | undefined) => {
    if (cpk === null || cpk === undefined) return { text: "-", bg: "#f3f4f6", color: "#6b7280" };
    if (cpk >= 1.33) return { text: cpk.toFixed(3), bg: "#dbeafe", color: "#1e40af" };
    if (cpk >= 1.0) return { text: cpk.toFixed(3), bg: "#fef3c7", color: "#92400e" };
    return { text: cpk.toFixed(3), bg: "#fee2e2", color: "#991b1b" };
  };

  const filterInfo = [];
  if (filters.productCode) filterInfo.push(`Sản phẩm: ${filters.productCode}`);
  if (filters.stationName) filterInfo.push(`Công trạm: ${filters.stationName}`);
  if (filters.dateFrom) filterInfo.push(`Từ: ${filters.dateFrom}`);
  if (filters.dateTo) filterInfo.push(`Đến: ${filters.dateTo}`);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Lịch sử Phân tích SPC/CPK</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1f2937; }
    .container { max-width: 100%; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; }
    .header h1 { font-size: 20px; color: #1e40af; margin-bottom: 5px; }
    .header .subtitle { color: #6b7280; font-size: 12px; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #1e40af; }
    .summary-card .label { font-size: 11px; color: #64748b; }
    .filters { background: #f1f5f9; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
    .filters span { margin-right: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1e40af; color: white; padding: 8px 4px; text-align: left; font-weight: 600; }
    td { padding: 6px 4px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .cpk-badge { padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block; }
    .alert-yes { color: #dc2626; font-weight: bold; }
    .alert-no { color: #16a34a; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lịch sử Phân tích SPC/CPK</h1>
      <div class="subtitle">Xuất ngày: ${now}</div>
    </div>
    <div class="summary">
      <div class="summary-card"><div class="value">${totalRecords}</div><div class="label">Tổng bản ghi</div></div>
      <div class="summary-card"><div class="value">${avgCpk.toFixed(3)}</div><div class="label">CPK trung bình</div></div>
      <div class="summary-card"><div class="value">${alertCount}</div><div class="label">Cảnh báo</div></div>
    </div>
    ${filterInfo.length > 0 ? `<div class="filters"><strong>Bộ lọc:</strong> ${filterInfo.map(f => `<span>${f}</span>`).join("")}</div>` : ""}
    <table>
      <thead>
        <tr><th>STT</th><th>Ngày giờ</th><th>Sản phẩm</th><th>Công trạm</th><th>Số mẫu</th><th>Mean</th><th>StdDev</th><th>CPK</th><th>CP</th><th>PPK</th><th>CA</th><th>Cảnh báo</th></tr>
      </thead>
      <tbody>
        ${data.map((record, index) => {
          const cpkStatus = getCpkStatus(record.cpk);
          return `<tr>
            <td>${index + 1}</td>
            <td>${record.createdAt ? new Date(record.createdAt).toLocaleString("vi-VN") : "-"}</td>
            <td>${record.productCode || "-"}</td>
            <td>${record.stationName || "-"}</td>
            <td>${record.sampleCount ?? "-"}</td>
            <td>${record.mean?.toFixed(4) ?? "-"}</td>
            <td>${record.stdDev?.toFixed(4) ?? "-"}</td>
            <td><span class="cpk-badge" style="background:${cpkStatus.bg};color:${cpkStatus.color}">${cpkStatus.text}</span></td>
            <td>${record.cp?.toFixed(3) ?? "-"}</td>
            <td>${record.ppk?.toFixed(3) ?? "-"}</td>
            <td>${record.ca?.toFixed(3) ?? "-"}</td>
            <td class="${record.alertTriggered ? "alert-yes" : "alert-no"}">${record.alertTriggered ? "Có" : "Không"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <div class="footer"><p>CPK/SPC Calculator - Hệ thống Tính toán Năng lực Quy trình</p></div>
  </div>
</body>
</html>`;
}
