# Hướng dẫn Test Mobile App trên Thiết bị Thực

## Mục lục
1. [Cài đặt Expo Go](#1-cài-đặt-expo-go)
2. [Kết nối với Server](#2-kết-nối-với-server)
3. [Test Push Notification](#3-test-push-notification)
4. [Xử lý lỗi thường gặp](#4-xử-lý-lỗi-thường-gặp)

---

## 1. Cài đặt Expo Go

### iOS (iPhone/iPad)
1. Mở **App Store** trên thiết bị iOS
2. Tìm kiếm "**Expo Go**"
3. Nhấn **Tải về** để cài đặt
4. Mở app sau khi cài đặt xong

### Android
1. Mở **Google Play Store** trên thiết bị Android
2. Tìm kiếm "**Expo Go**"
3. Nhấn **Cài đặt**
4. Mở app sau khi cài đặt xong

### Yêu cầu hệ thống
- **iOS**: iOS 13.0 trở lên
- **Android**: Android 6.0 (API level 23) trở lên

---

## 2. Kết nối với Server

### Bước 1: Khởi động Development Server

```bash
# Di chuyển vào thư mục mobile app
cd cpk-spc-mobile

# Cài đặt dependencies (nếu chưa)
npm install

# Khởi động Expo development server
npx expo start
```

### Bước 2: Kết nối từ thiết bị

#### Cách 1: Quét QR Code (Khuyến nghị)
1. Sau khi chạy `npx expo start`, terminal sẽ hiển thị QR code
2. **iOS**: Mở app Camera, quét QR code, nhấn vào link hiện ra
3. **Android**: Mở Expo Go, nhấn "Scan QR code", quét QR code

#### Cách 2: Nhập URL thủ công
1. Trong Expo Go, chọn "Enter URL manually"
2. Nhập URL hiển thị trong terminal (ví dụ: `exp://192.168.1.100:8081`)

### Bước 3: Cấu hình API Server

Để mobile app kết nối với backend server:

1. Mở file `src/services/api.ts`
2. Cập nhật `API_BASE_URL` với IP của máy chạy server:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:3000/api/trpc'  // Thay YOUR_LOCAL_IP
  : 'https://your-production-url.com/api/trpc';
```

#### Tìm IP của máy tính:
- **macOS**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig` (tìm IPv4 Address)
- **Linux**: `ip addr show | grep "inet " | grep -v 127.0.0.1`

### Lưu ý quan trọng
- Thiết bị mobile và máy tính phải cùng mạng WiFi
- Firewall phải cho phép kết nối đến port 3000 và 8081
- Nếu dùng VPN, hãy tắt VPN trên cả hai thiết bị

---

## 3. Test Push Notification

### Bước 1: Cấu hình Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Tạo project mới hoặc chọn project có sẵn
3. Thêm app iOS/Android vào project

#### Cho iOS:
1. Vào Project Settings > General
2. Thêm iOS app với Bundle ID: `com.cpkspc.mobile`
3. Tải file `GoogleService-Info.plist`
4. Đặt file vào thư mục `ios/` của project

#### Cho Android:
1. Vào Project Settings > General
2. Thêm Android app với Package name: `com.cpkspc.mobile`
3. Tải file `google-services.json`
4. Đặt file vào thư mục `android/app/` của project

### Bước 2: Cấu hình Server

1. Vào Firebase Console > Project Settings > Service accounts
2. Nhấn "Generate new private key"
3. Tải file JSON và lưu nội dung vào biến môi trường `FIREBASE_SERVICE_ACCOUNT`

### Bước 3: Test Push Notification

#### Test từ Mobile App:
1. Mở app trên thiết bị thực
2. Vào **Cài đặt** > **Cài đặt thông báo**
3. Bật "Nhận thông báo"
4. App sẽ đăng ký FCM token và gửi lên server

#### Test gửi notification từ Server:
1. Truy cập web app: `https://your-server.com`
2. Vào **Cài đặt** > **Firebase Push Settings**
3. Chọn thiết bị đã đăng ký
4. Nhấn "Gửi test notification"

#### Test bằng Firebase Console:
1. Vào Firebase Console > Cloud Messaging
2. Nhấn "Send your first message"
3. Nhập tiêu đề và nội dung
4. Chọn target: Single device
5. Nhập FCM token của thiết bị
6. Nhấn "Send"

### Bước 4: Kiểm tra kết quả

- **Foreground**: Notification hiển thị dạng in-app toast
- **Background**: Notification hiển thị trong notification center
- **App đóng**: Notification hiển thị trong notification center, nhấn vào sẽ mở app

---

## 4. Xử lý lỗi thường gặp

### Lỗi: "Network request failed"
**Nguyên nhân**: Không kết nối được với server

**Giải pháp**:
1. Kiểm tra thiết bị và máy tính cùng mạng WiFi
2. Kiểm tra IP address trong `api.ts` đúng chưa
3. Kiểm tra server đang chạy: `curl http://YOUR_IP:3000/api/trpc`
4. Tắt firewall tạm thời để test

### Lỗi: "Unable to resolve host"
**Nguyên nhân**: DNS hoặc network issue

**Giải pháp**:
1. Sử dụng IP address thay vì hostname
2. Restart WiFi trên thiết bị
3. Thử kết nối bằng mobile data để kiểm tra

### Lỗi: "Expo Go crashed"
**Nguyên nhân**: Có thể do code lỗi hoặc memory issue

**Giải pháp**:
1. Kiểm tra terminal xem có error log không
2. Clear cache: `npx expo start -c`
3. Xóa và cài lại Expo Go

### Lỗi: "Push notification not received"
**Nguyên nhân**: Cấu hình Firebase chưa đúng

**Giải pháp**:
1. Kiểm tra FCM token đã gửi lên server chưa
2. Kiểm tra Firebase credentials trên server
3. Kiểm tra quyền notification đã được cấp chưa
4. iOS: Kiểm tra APNs certificate đã cấu hình chưa

### Lỗi: "Metro bundler stuck"
**Nguyên nhân**: Cache hoặc process bị treo

**Giải pháp**:
```bash
# Kill all node processes
killall node

# Clear cache và restart
npx expo start -c
```

### Lỗi: "Module not found"
**Nguyên nhân**: Dependencies chưa cài đủ

**Giải pháp**:
```bash
# Xóa node_modules và cài lại
rm -rf node_modules
npm install

# Nếu vẫn lỗi, clear cache
npx expo start -c
```

---

## Tips & Best Practices

### Development
- Sử dụng **Expo Go** cho development nhanh
- Sử dụng **Development Build** khi cần native modules
- Bật **Fast Refresh** để thấy thay đổi ngay lập tức

### Testing
- Test trên cả iOS và Android
- Test với các kích thước màn hình khác nhau
- Test với network chậm (sử dụng Network Link Conditioner)

### Performance
- Sử dụng React DevTools để debug
- Kiểm tra memory usage với Expo DevTools
- Profile app với Flipper (cho development build)

### Push Notification
- Test notification khi app ở foreground, background, và closed
- Test với nhiều loại notification (CPK alert, SPC alert, etc.)
- Kiểm tra notification grouping và channels (Android)

---

## Tài liệu tham khảo

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra phần "Xử lý lỗi thường gặp" ở trên
2. Xem logs trong terminal và Expo DevTools
3. Liên hệ team hỗ trợ qua email: support@cpkspc.com
