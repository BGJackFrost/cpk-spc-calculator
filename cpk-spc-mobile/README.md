# CPK SPC Mobile App

Ứng dụng di động React Native/Expo cho hệ thống CPK/SPC Calculator.

## Tính năng

### 1. Biểu đồ Realtime với API
- **CPK Chart**: Hiển thị xu hướng CPK theo thời gian với auto-refresh
- **OEE Chart**: Biểu đồ OEE với breakdown A/P/Q
- **SPC Control Chart**: Biểu đồ kiểm soát với UCL/LCL
- **Histogram**: Phân bố tần suất dữ liệu đo lường

### 2. Export/Share biểu đồ
- Capture biểu đồ dưới dạng ảnh PNG
- Share trực tiếp qua các ứng dụng khác
- Lưu vào thư viện ảnh
- Tạo báo cáo PDF

### 3. Push Notification (Firebase Cloud Messaging)
- Đăng ký/hủy đăng ký thiết bị
- Cài đặt loại thông báo:
  - Cảnh báo CPK
  - Vi phạm SPC Rules
  - Cảnh báo OEE
  - Báo cáo hàng ngày
- Bật/tắt âm thanh và rung

## Cài đặt

### Yêu cầu
- Node.js 18+
- Expo CLI
- iOS Simulator hoặc Android Emulator (hoặc thiết bị thực)

### Bước cài đặt

```bash
# Di chuyển vào thư mục mobile
cd cpk-spc-mobile

# Cài đặt dependencies
npm install

# Chạy trên iOS
npx expo run:ios

# Chạy trên Android
npx expo run:android

# Hoặc chạy với Expo Go
npx expo start
```

### Cấu hình Firebase

1. Tạo project trên Firebase Console
2. Thêm app iOS và Android
3. Tải file cấu hình:
   - iOS: `GoogleService-Info.plist`
   - Android: `google-services.json`
4. Đặt file vào thư mục gốc của project

### Cấu hình API

Cập nhật `src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-server-url.com/api';
```

## Cấu trúc thư mục

```
cpk-spc-mobile/
├── App.tsx                 # Entry point
├── app.json               # Expo config
├── package.json           # Dependencies
├── src/
│   ├── components/
│   │   ├── charts/        # Chart components
│   │   │   ├── CpkChart.tsx
│   │   │   ├── OeeChart.tsx
│   │   │   ├── SpcControlChart.tsx
│   │   │   └── HistogramChart.tsx
│   │   ├── ChartCard.tsx  # Chart wrapper với export
│   │   └── ChartExport.tsx # Export utilities
│   ├── contexts/
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   └── useChartData.ts
│   ├── screens/
│   │   ├── Dashboard.tsx
│   │   ├── Charts.tsx
│   │   ├── Alerts.tsx
│   │   ├── Settings.tsx
│   │   ├── ChartDetail.tsx
│   │   └── NotificationSettings.tsx
│   └── services/
│       ├── api.ts         # API client
│       └── pushNotification.ts
```

## API Endpoints

Mobile app sử dụng các API endpoints sau:

### Chart Data
- `GET /api/trpc/charts.cpkTrend` - Dữ liệu CPK trend
- `GET /api/trpc/charts.oeeTrend` - Dữ liệu OEE trend
- `GET /api/trpc/charts.spcControlData` - Dữ liệu SPC control
- `GET /api/trpc/charts.histogramData` - Dữ liệu histogram

### Mobile Device
- `POST /api/trpc/mobile.registerDevice` - Đăng ký thiết bị
- `POST /api/trpc/mobile.unregisterDevice` - Hủy đăng ký
- `GET /api/trpc/mobile.getDevices` - Danh sách thiết bị
- `GET /api/trpc/mobile.getNotificationSettings` - Cài đặt thông báo
- `POST /api/trpc/mobile.updateNotificationSettings` - Cập nhật cài đặt

## Test Push Notification

### Sử dụng Expo Push Notification Tool
1. Truy cập https://expo.dev/notifications
2. Nhập Expo Push Token từ app
3. Gửi test notification

### Sử dụng Firebase Console
1. Vào Firebase Console > Cloud Messaging
2. Tạo campaign mới
3. Chọn target device hoặc topic
4. Gửi notification

## Troubleshooting

### Push notification không hoạt động
1. Kiểm tra quyền notification trong Settings
2. Đảm bảo thiết bị đã đăng ký token
3. Kiểm tra Firebase config

### Biểu đồ không hiển thị
1. Kiểm tra kết nối mạng
2. Xác nhận API server đang chạy
3. Kiểm tra API_BASE_URL

### App crash khi mở
1. Clear cache: `npx expo start -c`
2. Xóa node_modules và cài lại
3. Kiểm tra phiên bản Expo SDK

## License

MIT License
