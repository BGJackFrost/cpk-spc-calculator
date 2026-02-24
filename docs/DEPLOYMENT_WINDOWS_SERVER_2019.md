# Hướng dẫn Triển khai Hệ thống SPC/CPK Calculator trên Windows Server 2019

**Tác giả:** Manus AI  
**Phiên bản:** 1.0  
**Ngày cập nhật:** 13/12/2025

---

## Mục lục

1. [Yêu cầu Hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt Node.js](#2-cài-đặt-nodejs)
3. [Cài đặt MySQL/MariaDB](#3-cài-đặt-mysqlmariadb)
4. [Chuẩn bị Mã nguồn](#4-chuẩn-bị-mã-nguồn)
5. [Cấu hình Biến môi trường](#5-cấu-hình-biến-môi-trường)
6. [Build và Chạy Ứng dụng](#6-build-và-chạy-ứng-dụng)
7. [Cấu hình IIS Reverse Proxy](#7-cấu-hình-iis-reverse-proxy-optional)
8. [Cấu hình Windows Service](#8-cấu-hình-windows-service)
9. [Bảo trì và Khắc phục sự cố](#9-bảo-trì-và-khắc-phục-sự-cố)

---

## 1. Yêu cầu Hệ thống

Trước khi bắt đầu triển khai, hãy đảm bảo máy chủ của bạn đáp ứng các yêu cầu sau:

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị |
|------------|-------------------|-------------|
| **Hệ điều hành** | Windows Server 2019 | Windows Server 2019/2022 |
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Ổ cứng** | 20 GB trống | 50+ GB SSD |
| **Node.js** | v18.x | v22.x LTS |
| **MySQL/MariaDB** | 8.0+ | 8.0+ hoặc TiDB |
| **Kết nối mạng** | Cổng 3000 (hoặc 80/443) | Firewall đã cấu hình |

---

## 2. Cài đặt Node.js

### Bước 2.1: Tải Node.js

Truy cập trang chính thức của Node.js tại [https://nodejs.org](https://nodejs.org) và tải phiên bản LTS (Long Term Support) mới nhất. Tại thời điểm viết tài liệu này, phiên bản khuyến nghị là **Node.js 22.x LTS**.

### Bước 2.2: Cài đặt Node.js

Chạy file cài đặt `.msi` đã tải về và làm theo các bước hướng dẫn. Đảm bảo chọn các tùy chọn sau trong quá trình cài đặt:

- **Add to PATH**: Đánh dấu để thêm Node.js vào biến môi trường PATH
- **npm package manager**: Đánh dấu để cài đặt npm cùng Node.js

### Bước 2.3: Xác minh cài đặt

Mở **Command Prompt** hoặc **PowerShell** với quyền Administrator và chạy các lệnh sau:

```powershell
node --version
npm --version
```

Kết quả mong đợi sẽ hiển thị phiên bản Node.js và npm đã cài đặt.

### Bước 2.4: Cài đặt pnpm

Hệ thống SPC/CPK Calculator sử dụng **pnpm** làm trình quản lý gói. Cài đặt pnpm bằng lệnh:

```powershell
npm install -g pnpm
pnpm --version
```

---

## 3. Cài đặt MySQL/MariaDB

Hệ thống yêu cầu MySQL 8.0+ hoặc MariaDB 10.5+ làm cơ sở dữ liệu. Bạn có thể chọn một trong các phương án sau:

### Phương án A: Cài đặt MySQL Community Server

Tải MySQL Community Server từ [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/) và cài đặt theo hướng dẫn. Trong quá trình cài đặt, hãy ghi nhớ mật khẩu root mà bạn đã thiết lập.

### Phương án B: Cài đặt MariaDB

Tải MariaDB từ [https://mariadb.org/download/](https://mariadb.org/download/) và cài đặt. MariaDB tương thích hoàn toàn với MySQL và có hiệu suất tốt hơn trong một số trường hợp.

### Bước 3.1: Tạo Database

Sau khi cài đặt, mở **MySQL Workbench** hoặc **HeidiSQL** và chạy các lệnh SQL sau:

```sql
-- Tạo database
CREATE DATABASE spc_cpk_calculator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user cho ứng dụng
CREATE USER 'spc_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Cấp quyền cho user
GRANT ALL PRIVILEGES ON spc_cpk_calculator.* TO 'spc_user'@'localhost';
FLUSH PRIVILEGES;
```

> **Lưu ý bảo mật:** Thay `your_secure_password` bằng mật khẩu mạnh, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.

---

## 4. Chuẩn bị Mã nguồn

### Bước 4.1: Tải mã nguồn

Có hai cách để lấy mã nguồn:

**Cách 1: Từ Manus Platform**
- Đăng nhập vào Manus Platform
- Vào project SPC/CPK Calculator
- Click nút "Download" để tải toàn bộ mã nguồn

**Cách 2: Từ Git Repository (nếu có)**
```powershell
git clone <repository-url> C:\Apps\spc-cpk-calculator
cd C:\Apps\spc-cpk-calculator
```

### Bước 4.2: Cài đặt Dependencies

Mở PowerShell với quyền Administrator, điều hướng đến thư mục dự án và chạy:

```powershell
cd C:\Apps\spc-cpk-calculator
pnpm install
```

Quá trình này sẽ tải và cài đặt tất cả các thư viện cần thiết cho ứng dụng.

---

## 5. Cấu hình Biến môi trường

### Bước 5.1: Tạo file .env

Tạo file `.env` trong thư mục gốc của dự án với nội dung sau:

```env
# Database Configuration
DATABASE_URL=mysql://spc_user:your_secure_password@localhost:3306/spc_cpk_calculator

# JWT Secret (tạo chuỗi ngẫu nhiên 32+ ký tự)
JWT_SECRET=your_random_jwt_secret_key_here_at_least_32_chars

# Application Settings
NODE_ENV=production
PORT=3000

# Manus OAuth (nếu sử dụng Manus Authentication)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# Owner Information
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=Admin

# Built-in Forge API (để trống nếu không sử dụng)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# App Branding
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
```

### Bước 5.2: Tạo JWT Secret

Để tạo JWT Secret an toàn, bạn có thể sử dụng PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Sao chép kết quả và dán vào biến `JWT_SECRET` trong file `.env`.

---

## 6. Build và Chạy Ứng dụng

### Bước 6.1: Khởi tạo Database Schema

Chạy lệnh sau để tạo các bảng trong database:

```powershell
cd C:\Apps\spc-cpk-calculator
pnpm db:push
```

Lệnh này sẽ đọc schema từ `drizzle/schema.ts` và tạo các bảng tương ứng trong database.

### Bước 6.2: Build Ứng dụng

Để build ứng dụng cho môi trường production:

```powershell
pnpm build
```

Quá trình build sẽ tạo ra các file tối ưu trong thư mục `dist/`.

### Bước 6.3: Chạy Ứng dụng

Chạy ứng dụng ở chế độ production:

```powershell
pnpm start
```

Ứng dụng sẽ khởi động và lắng nghe trên cổng 3000 (hoặc cổng được cấu hình trong `.env`).

### Bước 6.4: Kiểm tra Ứng dụng

Mở trình duyệt và truy cập:

```
http://localhost:3000
```

Nếu thấy giao diện đăng nhập của SPC/CPK Calculator, ứng dụng đã được triển khai thành công.

---

## 7. Cấu hình IIS Reverse Proxy (Optional)

Nếu bạn muốn sử dụng IIS làm reverse proxy để phục vụ ứng dụng trên cổng 80/443, hãy làm theo các bước sau:

### Bước 7.1: Cài đặt IIS và URL Rewrite Module

Mở **Server Manager** và cài đặt:
- **Web Server (IIS)** role
- Tải và cài đặt **URL Rewrite Module** từ [https://www.iis.net/downloads/microsoft/url-rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
- Tải và cài đặt **Application Request Routing (ARR)** từ [https://www.iis.net/downloads/microsoft/application-request-routing](https://www.iis.net/downloads/microsoft/application-request-routing)

### Bước 7.2: Bật Proxy trong ARR

Mở **IIS Manager**, chọn server node, double-click **Application Request Routing Cache**, click **Server Proxy Settings** và đánh dấu **Enable proxy**.

### Bước 7.3: Tạo Website trong IIS

Tạo một website mới trong IIS với các cấu hình:
- **Site name**: SPC-CPK-Calculator
- **Physical path**: C:\inetpub\wwwroot\spc-cpk (tạo thư mục trống)
- **Binding**: HTTP port 80 (hoặc HTTPS port 443 với SSL certificate)

### Bước 7.4: Cấu hình URL Rewrite

Tạo file `web.config` trong thư mục physical path với nội dung:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyInboundRule" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:3000/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

## 8. Cấu hình Windows Service

Để ứng dụng tự động khởi động khi server boot, bạn có thể sử dụng **NSSM (Non-Sucking Service Manager)** hoặc **PM2**.

### Phương án A: Sử dụng PM2

PM2 là process manager phổ biến cho Node.js applications.

```powershell
# Cài đặt PM2 global
npm install -g pm2
npm install -g pm2-windows-startup

# Khởi động ứng dụng với PM2
cd C:\Apps\spc-cpk-calculator
pm2 start npm --name "spc-cpk" -- start

# Lưu cấu hình PM2
pm2 save

# Cấu hình PM2 tự khởi động với Windows
pm2-startup install
```

### Phương án B: Sử dụng NSSM

Tải NSSM từ [https://nssm.cc/download](https://nssm.cc/download) và giải nén.

```powershell
# Cài đặt service
nssm install SPC-CPK-Calculator

# Trong GUI hiện ra, cấu hình:
# Path: C:\Program Files\nodejs\node.exe
# Startup directory: C:\Apps\spc-cpk-calculator
# Arguments: node_modules\.bin\pnpm start

# Hoặc dùng command line
nssm set SPC-CPK-Calculator Application "C:\Program Files\nodejs\node.exe"
nssm set SPC-CPK-Calculator AppDirectory "C:\Apps\spc-cpk-calculator"
nssm set SPC-CPK-Calculator AppParameters "node_modules\.bin\pnpm start"

# Khởi động service
nssm start SPC-CPK-Calculator
```

---

## 9. Bảo trì và Khắc phục sự cố

### 9.1 Kiểm tra Logs

Logs của ứng dụng được ghi ra console. Nếu sử dụng PM2:

```powershell
pm2 logs spc-cpk
```

### 9.2 Restart Ứng dụng

```powershell
# Với PM2
pm2 restart spc-cpk

# Với NSSM
nssm restart SPC-CPK-Calculator
```

### 9.3 Cập nhật Ứng dụng

Khi có phiên bản mới:

```powershell
cd C:\Apps\spc-cpk-calculator

# Dừng ứng dụng
pm2 stop spc-cpk

# Cập nhật mã nguồn (từ git hoặc copy file mới)
git pull  # hoặc copy file mới

# Cài đặt dependencies mới
pnpm install

# Cập nhật database schema (nếu có thay đổi)
pnpm db:push

# Build lại
pnpm build

# Khởi động lại
pm2 start spc-cpk
```

### 9.4 Các lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `ECONNREFUSED` | Database không chạy | Kiểm tra MySQL service đang chạy |
| `EADDRINUSE` | Cổng 3000 đã được sử dụng | Đổi PORT trong .env hoặc dừng process khác |
| `MODULE_NOT_FOUND` | Dependencies chưa cài | Chạy `pnpm install` |
| `ER_ACCESS_DENIED_ERROR` | Sai thông tin database | Kiểm tra DATABASE_URL trong .env |

### 9.5 Backup Database

Tạo script backup định kỳ:

```powershell
# backup.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\spc_cpk_$date.sql"

& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
    -u spc_user -p"your_password" `
    spc_cpk_calculator > $backupPath

Write-Host "Backup completed: $backupPath"
```

Sử dụng **Task Scheduler** để chạy script này hàng ngày.

---

## Liên hệ Hỗ trợ

Nếu gặp vấn đề trong quá trình triển khai, vui lòng liên hệ:
- **Email**: support@manus.im
- **Documentation**: https://help.manus.im

---

*Tài liệu này được tạo bởi Manus AI. Phiên bản 1.0 - Tháng 12/2025*
