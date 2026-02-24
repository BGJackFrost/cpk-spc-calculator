import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

// User Guide content for PDF export
const userGuideContent = `
# Hướng Dẫn Sử Dụng Hệ Thống IoT

## 1. Tổng Quan Hệ Thống IoT

Hệ thống IoT (Internet of Things) trong CPK-SPC Calculator là một nền tảng toàn diện cho phép thu thập, giám sát và phân tích dữ liệu từ các thiết bị công nghiệp trong thời gian thực.

### 1.1 Các Chức Năng Chính

| Nhóm Chức Năng | Mô Tả | Đường Dẫn |
|----------------|-------|-----------|
| Tổng Quan IoT | Dashboard tổng hợp trạng thái thiết bị | /iot-dashboard |
| Quản Lý Thiết Bị | CRUD thiết bị, nhóm, template | /iot-device-crud |
| Giám Sát Realtime | Theo dõi dữ liệu thời gian thực | /iot-realtime-dashboard |
| Cảnh Báo | Quản lý alarm và threshold | /iot-alarm-crud |
| Bảo Trì | Work orders và lịch bảo trì | /iot-work-orders |
| Phân Tích | MTTR/MTBF và dự đoán AI | /mttr-mtbf-report |
| Floor Plan | Sơ đồ mặt bằng 2D/3D | /iot-floor-plan |
| Firmware OTA | Cập nhật firmware từ xa | /iot-scheduled-ota |

## 2. Kiến Trúc Hệ Thống

### 2.1 Các Lớp Trong Hệ Thống

**Lớp 1 - Nguồn Dữ Liệu Gốc (Data Sources)**
Bao gồm các thiết bị vật lý như PLC, Sensors, Gateway, HMI/SCADA và các API bên ngoài.

**Lớp 2 - Giao Thức Kết Nối (Protocols)**
Hỗ trợ nhiều giao thức công nghiệp: MQTT, OPC-UA, Modbus TCP/RTU và REST API.

**Lớp 3 - Thu Thập Dữ Liệu (Data Collection)**
Realtime Buffer nhận dữ liệu từ các giao thức, sau đó phân phối đến Data Points và Device Data.

## 3. Giao Thức Kết Nối

### 3.1 MQTT (Message Queuing Telemetry Transport)

MQTT là giao thức nhắn tin nhẹ, phù hợp cho các thiết bị IoT với băng thông hạn chế.

**Cấu hình kết nối MQTT:**

| Tham Số | Mô Tả | Giá Trị Mặc Định |
|---------|-------|------------------|
| host | Địa chỉ MQTT Broker | - |
| port | Cổng kết nối | 1883 |
| clientId | ID client | Auto-generated |
| username | Tên đăng nhập | Optional |
| password | Mật khẩu | Optional |
| useTls | Sử dụng TLS/SSL | false |
| qos | Quality of Service (0, 1, 2) | 1 |

### 3.2 OPC-UA (Open Platform Communications Unified Architecture)

OPC-UA là tiêu chuẩn công nghiệp cho trao đổi dữ liệu an toàn và đáng tin cậy.

### 3.3 Modbus TCP/RTU

Modbus là giao thức truyền thông công nghiệp phổ biến cho PLC và các thiết bị tự động hóa.

## 4. Quản Lý Thiết Bị

### 4.1 Quản Lý Thiết Bị (Device CRUD)

**Đường dẫn:** /iot-device-crud

**Các thao tác chính:**

| Thao Tác | Mô Tả | Quyền |
|----------|-------|-------|
| Thêm thiết bị | Đăng ký thiết bị mới vào hệ thống | Admin |
| Sửa thiết bị | Cập nhật thông tin thiết bị | Admin |
| Xóa thiết bị | Xóa thiết bị khỏi hệ thống | Admin |
| Xem danh sách | Xem và tìm kiếm thiết bị | User/Admin |

## 5. Giám Sát Realtime

### 5.1 Dashboard Tổng Quan IoT

**Đường dẫn:** /iot-dashboard

Dashboard hiển thị tổng quan trạng thái toàn bộ hệ thống IoT.

### 5.2 Dashboard Realtime

**Đường dẫn:** /iot-realtime-dashboard

Hiển thị dữ liệu realtime từ các thiết bị.

## 6. Hệ Thống Cảnh Báo

### 6.1 Quản Lý Alarm

**Đường dẫn:** /iot-alarm-crud

**Loại Alarm:**
- Warning - Thấp
- Error - Trung bình
- Critical - Cao

### 6.2 Cấu Hình Threshold (Ngưỡng Cảnh Báo)

**Đường dẫn:** /alarm-threshold-config

## 7. Quản Lý Bảo Trì

### 7.1 Work Orders (Lệnh Công Việc)

**Đường dẫn:** /iot-work-orders

**Loại Work Order:**
- predictive
- preventive
- corrective
- emergency
- inspection

## 8. Phân Tích và Báo Cáo

### 8.1 MTTR/MTBF Analysis

**Đường dẫn:** /mttr-mtbf-report

**MTTR (Mean Time To Repair):** Thời gian trung bình để sửa chữa một sự cố

**MTBF (Mean Time Between Failures):** Thời gian trung bình giữa các lần hỏng hóc

---

*Tài liệu được tạo tự động bởi Hệ thống CPK-SPC Calculator*
`;

function generateHtmlContent(): string {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hướng Dẫn Sử Dụng Hệ Thống IoT</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { color: #1a56db; border-bottom: 3px solid #1a56db; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    h3 { color: #3b82f6; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background-color: #f9fafb; }
    code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', monospace; }
    ul, ol { margin: 10px 0; padding-left: 25px; }
    li { margin: 5px 0; }
    .header { text-align: center; margin-bottom: 40px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Hướng Dẫn Sử Dụng Hệ Thống IoT</h1>
    <p>CPK-SPC Calculator - Tài liệu hướng dẫn đầy đủ</p>
    <p><em>Ngày xuất: ${dateStr}</em></p>
  </div>
  <div class="content">
    ${userGuideContent
      .replace(/^# /gm, '<h1>')
      .replace(/^## /gm, '</p><h2>')
      .replace(/^### /gm, '</p><h3>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    }
  </div>
  <div class="footer">
    <p>Tài liệu được tạo tự động bởi Hệ thống CPK-SPC Calculator</p>
  </div>
</body>
</html>`;
}

export const userGuideRouter = router({
  // Export user guide to PDF
  exportPdf: protectedProcedure.mutation(async () => {
    try {
      const htmlContent = generateHtmlContent();

      // Save HTML file
      const timestamp = Date.now();
      const fileName = `iot-user-guide-${timestamp}.html`;
      const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
      
      const { url } = await storagePut(
        `exports/user-guide/${fileName}`,
        htmlBuffer,
        'text/html'
      );

      return { 
        success: true, 
        url,
        fileName,
        message: 'Tài liệu đã được xuất thành công. Bạn có thể in trang HTML này thành PDF từ trình duyệt (Ctrl+P).'
      };
    } catch (error) {
      console.error('Error exporting user guide:', error);
      throw new Error('Không thể xuất tài liệu. Vui lòng thử lại.');
    }
  }),

  // Get user guide content as markdown
  getContent: publicProcedure.query(() => {
    return {
      content: userGuideContent,
      lastUpdated: new Date().toISOString(),
    };
  }),
});
