# Hướng dẫn Build APK/IPA cho CPK-SPC Mobile App

## Yêu cầu

### Cài đặt EAS CLI
```bash
npm install -g eas-cli
```

### Đăng nhập Expo
```bash
eas login
```

## Build Android APK

### 1. Build Development APK (để test)
```bash
cd cpk-spc-mobile
eas build --platform android --profile development
```

### 2. Build Preview APK (internal testing)
```bash
eas build --platform android --profile preview
```

### 3. Build Production AAB (Google Play)
```bash
eas build --platform android --profile production
```

### Cài đặt APK trực tiếp
Sau khi build xong, EAS sẽ cung cấp link download APK. Tải về và cài đặt trên thiết bị Android.

## Build iOS IPA

### Yêu cầu
- Apple Developer Account ($99/năm)
- Xcode trên macOS (để build local)

### 1. Build Development (Simulator)
```bash
eas build --platform ios --profile development
```

### 2. Build Preview (TestFlight internal)
```bash
eas build --platform ios --profile preview
```

### 3. Build Production (App Store)
```bash
eas build --platform ios --profile production
```

### Cài đặt trên thiết bị iOS
1. Đăng ký thiết bị trong Apple Developer Portal
2. Hoặc sử dụng TestFlight để phân phối internal

## Cấu hình Signing

### Android
1. EAS tự động tạo keystore cho development/preview
2. Cho production, tạo keystore riêng:
```bash
eas credentials
```

### iOS
1. Cần Apple Developer Account
2. EAS hỗ trợ tự động quản lý certificates:
```bash
eas credentials
```

## Deep Linking

App hỗ trợ các deep link sau:
- `cpkspc://dashboard` - Mở Dashboard
- `cpkspc://alerts` - Mở Alerts
- `cpkspc://alert/{id}` - Mở Alert chi tiết
- `cpkspc://chart/{lineId}/{productId}` - Mở Chart chi tiết

### Test Deep Link
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "cpkspc://alerts"

# iOS Simulator
xcrun simctl openurl booted "cpkspc://alerts"
```

## Widget (iOS/Android)

### Cấu hình Widget
1. Mở Settings trong app
2. Chọn "Widget Settings"
3. Chọn Production Line và Product để hiển thị
4. Widget sẽ tự động cập nhật theo interval đã cấu hình

### Android Widget
- Widget hiển thị CPK và OEE realtime
- Hỗ trợ multiple widget sizes
- Auto-refresh mỗi 15 phút (có thể cấu hình)

### iOS Widget
- Sử dụng WidgetKit
- Hỗ trợ Small, Medium, Large sizes
- Timeline-based updates

## Troubleshooting

### Lỗi build Android
```bash
# Clear cache
eas build --clear-cache --platform android
```

### Lỗi build iOS
```bash
# Reset credentials
eas credentials --platform ios
```

### Kiểm tra build status
```bash
eas build:list
```

## Environment Variables

Tạo file `.env` với các biến sau:
```
API_BASE_URL=https://your-api-url.com
EXPO_PUBLIC_API_URL=https://your-api-url.com
```

## Submit to Stores

### Google Play
```bash
eas submit --platform android
```

### App Store
```bash
eas submit --platform ios
```
