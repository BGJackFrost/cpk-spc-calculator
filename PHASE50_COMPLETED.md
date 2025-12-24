# Phase 50: CPK Alert, Alert History, WebSocket Integration

## Completed Features

### 1. Form cấu hình CPK Alert trong SPC Plan Detail
- Đã thêm section "Cấu hình CPK Alert" vào form Edit SPC Plan
- Các trường bao gồm:
  - Toggle bật/tắt CPK Alert
  - Ngưỡng CPK thấp (mặc định 1.33)
  - Ngưỡng CPK cao (không giới hạn)
- Form hoạt động trong cả Create và Edit dialog

### 2. Trang Alert History
- Đường dẫn: /alert-history
- Hiển thị lịch sử tất cả alerts KPI/SPC
- Filters:
  - Tìm kiếm theo nội dung
  - Lọc theo loại alert
  - Lọc theo mức độ (warning/critical)
  - Lọc theo trạng thái (pending/acknowledged/resolved)
  - Lọc theo dây chuyền
  - Lọc theo khoảng thời gian
- Thống kê tổng quan: Tổng cảnh báo, Chờ xử lý, Đã xác nhận, Đã giải quyết

### 3. WebSocket/SSE Integration cho Alerts Realtime
- Thêm event type `kpi_alert` vào useSSE hook
- Thêm handler `onKpiAlert` trong SseNotificationProvider
- Hiển thị toast notification realtime khi có alert mới
- Phát âm thanh cảnh báo theo mức độ (warning/critical)

### 4. Sửa lỗi AI Dashboard
- Xóa route trùng lặp trong App.tsx
- Sửa cú pháp route sai (element → component)
- Trang AI/ML Dashboard hoạt động bình thường

## Files Modified
- client/src/pages/SpcPlanManagement.tsx - Thêm form CPK Alert
- client/src/pages/AlertHistory.tsx - Trang mới
- client/src/App.tsx - Thêm route Alert History, sửa route AI Dashboard
- client/src/hooks/useSSE.ts - Thêm kpi_alert event
- client/src/components/SseNotificationProvider.tsx - Thêm handler onKpiAlert
- server/routers.ts - Cập nhật create/update SPC Plan với CPK alert fields
