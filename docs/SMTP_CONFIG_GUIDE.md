# Hướng dẫn Cấu hình SMTP cho Email Cảnh báo Tự động

Hệ thống SPC/CPK Calculator hỗ trợ gửi email cảnh báo tự động khi phát hiện vi phạm SPC Rules, CPK thấp, hoặc các sự kiện quan trọng khác. Để kích hoạt tính năng này, bạn cần cấu hình SMTP server.

## Truy cập Trang Cấu hình SMTP

1. Đăng nhập vào hệ thống với tài khoản Admin
2. Vào menu **System** → **Notifications** → **SMTP Config**
3. Hoặc truy cập trực tiếp: `/smtp-settings`

## Thông tin Cần Cấu hình

### Thông tin Server

| Trường | Mô tả |
|--------|-------|
| **SMTP Host** | Địa chỉ server SMTP (ví dụ: smtp.gmail.com) |
| **Port** | Cổng kết nối (thường là 587 cho TLS hoặc 465 cho SSL) |
| **Sử dụng TLS/SSL** | Bật nếu server yêu cầu kết nối bảo mật |
| **Username** | Tên đăng nhập (thường là email) |
| **Password / App Password** | Mật khẩu hoặc App Password |

### Thông tin Người gửi

| Trường | Mô tả |
|--------|-------|
| **Email người gửi** | Địa chỉ email hiển thị khi gửi (ví dụ: noreply@company.com) |
| **Tên hiển thị** | Tên hiển thị trong email (ví dụ: SPC/CPK Calculator) |

---

## Hướng dẫn Cấu hình theo Nhà cung cấp

### Gmail

Gmail yêu cầu sử dụng **App Password** thay vì mật khẩu thường để đảm bảo bảo mật.

**Bước 1: Bật xác thực 2 bước (2FA)**
1. Truy cập [Google Account Security](https://myaccount.google.com/security)
2. Bật "2-Step Verification" (Xác minh 2 bước)

**Bước 2: Tạo App Password**
1. Truy cập [App Passwords](https://myaccount.google.com/apppasswords)
2. Chọn "Select app" → "Other (Custom name)" → Nhập "SPC Calculator"
3. Click "Generate"
4. Sao chép mật khẩu 16 ký tự được tạo

**Cấu hình SMTP:**
| Trường | Giá trị |
|--------|---------|
| SMTP Host | `smtp.gmail.com` |
| Port | `587` (TLS) hoặc `465` (SSL) |
| TLS/SSL | Bật |
| Username | `your-email@gmail.com` |
| Password | App Password 16 ký tự (không có khoảng trắng) |

---

### Microsoft Outlook / Office 365

**Cấu hình SMTP:**
| Trường | Giá trị |
|--------|---------|
| SMTP Host | `smtp.office365.com` |
| Port | `587` |
| TLS/SSL | Bật |
| Username | `your-email@outlook.com` hoặc `your-email@company.com` |
| Password | Mật khẩu tài khoản Microsoft |

**Lưu ý cho Office 365 doanh nghiệp:**
- Admin có thể cần bật "SMTP AUTH" cho tài khoản
- Truy cập Microsoft 365 Admin Center → Users → Active Users → Chọn user → Mail → Manage email apps → Bật "Authenticated SMTP"

---

### Amazon SES (Simple Email Service)

**Bước 1: Tạo SMTP Credentials**
1. Truy cập AWS Console → SES → SMTP Settings
2. Click "Create SMTP credentials"
3. Lưu lại SMTP username và password

**Cấu hình SMTP:**
| Trường | Giá trị |
|--------|---------|
| SMTP Host | `email-smtp.[region].amazonaws.com` (ví dụ: `email-smtp.us-east-1.amazonaws.com`) |
| Port | `587` |
| TLS/SSL | Bật |
| Username | SMTP username từ AWS |
| Password | SMTP password từ AWS |

**Lưu ý:**
- Cần verify email/domain trước khi gửi
- Sandbox mode chỉ cho phép gửi đến email đã verify

---

### SendGrid

**Cấu hình SMTP:**
| Trường | Giá trị |
|--------|---------|
| SMTP Host | `smtp.sendgrid.net` |
| Port | `587` |
| TLS/SSL | Bật |
| Username | `apikey` (cố định) |
| Password | API Key của SendGrid |

---

### Mailgun

**Cấu hình SMTP:**
| Trường | Giá trị |
|--------|---------|
| SMTP Host | `smtp.mailgun.org` |
| Port | `587` |
| TLS/SSL | Bật |
| Username | `postmaster@your-domain.mailgun.org` |
| Password | SMTP password từ Mailgun |

---

## Kiểm tra Cấu hình

Sau khi nhập thông tin, sử dụng tính năng **Gửi Email Test**:

1. Nhập email nhận test vào ô "test@example.com"
2. Click nút "Gửi test"
3. Kiểm tra hộp thư đến (và thư rác) của email test
4. Nếu nhận được email, cấu hình đã thành công

## Xử lý Lỗi Thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Connection refused | Port sai hoặc firewall chặn | Kiểm tra port và firewall |
| Authentication failed | Username/password sai | Kiểm tra lại thông tin đăng nhập |
| Invalid credentials (Gmail) | Chưa dùng App Password | Tạo và sử dụng App Password |
| Certificate error | TLS/SSL không đúng | Thử đổi giữa TLS và SSL |
| Sender not verified (SES) | Email chưa verify | Verify email trong AWS SES |

## Các Loại Email Cảnh báo

Sau khi cấu hình SMTP thành công, hệ thống sẽ tự động gửi email khi:

1. **CPK Alert**: CPK < ngưỡng cấu hình (mặc định 1.33)
2. **SPC Rule Violation**: Vi phạm 8 SPC Rules (Western Electric Rules)
3. **CA Rule Violation**: Vi phạm CA Rules
4. **OEE Alert**: OEE thấp hơn ngưỡng
5. **Maintenance Alert**: Cảnh báo bảo trì định kỳ
6. **License Expiry**: Thông báo license sắp hết hạn

## Cấu hình Người nhận Email

Để cấu hình ai nhận email cảnh báo:
1. Vào **System** → **Notifications** → **Email Notification**
2. Thêm email người nhận cho từng loại cảnh báo
3. Có thể cấu hình theo dây chuyền sản xuất cụ thể

---

*Cập nhật: 23/12/2024*
