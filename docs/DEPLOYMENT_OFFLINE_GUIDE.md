# Hướng dẫn Triển khai Hệ thống SPC/CPK Calculator trên Máy chủ Local Offline

**Tác giả:** Manus AI  
**Phiên bản:** 2.0  
**Ngày cập nhật:** 16/12/2025

---

## Mục lục

1. [Tổng quan Hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu Hệ thống](#2-yêu-cầu-hệ-thống)
3. [Chuẩn bị Môi trường](#3-chuẩn-bị-môi-trường)
4. [Cài đặt Database](#4-cài-đặt-database)
5. [Triển khai Ứng dụng Web](#5-triển-khai-ứng-dụng-web)
6. [Cấu hình Chế độ Offline](#6-cấu-hình-chế-độ-offline)
7. [Khởi tạo Dữ liệu Ban đầu](#7-khởi-tạo-dữ-liệu-ban-đầu)
8. [Cấu hình Chạy như Service](#8-cấu-hình-chạy-như-service)
9. [Cấu hình Reverse Proxy](#9-cấu-hình-reverse-proxy)
10. [Triển khai với Docker](#10-triển-khai-với-docker)
11. [Bảo mật và Backup](#11-bảo-mật-và-backup)
12. [Khắc phục Sự cố](#12-khắc-phục-sự-cố)
13. [Phụ lục](#13-phụ-lục)

---

## 1. Tổng quan Hệ thống

### 1.1 Giới thiệu

Hệ thống SPC/CPK Calculator là ứng dụng web quản lý chất lượng sản xuất, cung cấp các tính năng:

- **Tính toán SPC/CPK**: Phân tích năng lực quy trình với các chỉ số Cp, Cpk, Pp, Ppk, Ca
- **Biểu đồ Control Chart**: X-bar Chart, R Chart với 8 SPC Rules
- **Quản lý Sản xuất**: Dây chuyền, Công trạm, Máy móc, Fixture
- **Quản lý Bảo trì (MMS)**: OEE, Work Orders, Spare Parts
- **Báo cáo và Xuất dữ liệu**: PDF, Excel, CSV
- **Đa ngôn ngữ**: Tiếng Việt và Tiếng Anh

### 1.2 Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│                   React + TypeScript + Vite                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/HTTPS (Port 3000)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Server                        │
│              Express + tRPC + Node.js 22.x                  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Auth      │  │   API       │  │   Background Jobs   │  │
│  │  (Local)    │  │  (tRPC)     │  │   (node-cron)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ MySQL Protocol (Port 3306)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Server                           │
│                MySQL 8.0+ / MariaDB 10.5+                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Các thành phần chính

| Thành phần | Công nghệ | Mô tả |
|------------|-----------|-------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 | Giao diện người dùng |
| **Backend** | Express 4, tRPC 11, Node.js 22 | API Server |
| **Database** | MySQL 8.0+ / MariaDB 10.5+ | Lưu trữ dữ liệu |
| **ORM** | Drizzle ORM | Tương tác database |
| **Authentication** | JWT + bcrypt | Xác thực người dùng local |
| **Scheduler** | node-cron | Tác vụ định kỳ |

---

## 2. Yêu cầu Hệ thống

### 2.1 Yêu cầu Phần cứng

| Thành phần | Tối thiểu | Khuyến nghị | Ghi chú |
|------------|-----------|-------------|---------|
| **CPU** | 2 cores | 4+ cores | Intel/AMD x64 |
| **RAM** | 4 GB | 8+ GB | Cho cả Web + DB |
| **Ổ cứng** | 20 GB | 50+ GB SSD | SSD cho hiệu suất tốt |
| **Mạng** | LAN 100Mbps | LAN 1Gbps | Không cần Internet |

### 2.2 Yêu cầu Phần mềm

| Phần mềm | Phiên bản | Bắt buộc | Ghi chú |
|----------|-----------|----------|---------|
| **Hệ điều hành** | Windows Server 2019/2022 hoặc Ubuntu 20.04+ | ✅ | |
| **Node.js** | 18.x - 22.x LTS | ✅ | Khuyến nghị 22.x |
| **MySQL** | 8.0+ | ✅ | Hoặc MariaDB 10.5+ |
| **pnpm** | 8.x+ | ✅ | Package manager |
| **Git** | 2.x+ | ❌ | Tùy chọn |

### 2.3 Yêu cầu Mạng

Hệ thống hoạt động hoàn toàn **offline** mà không cần kết nối Internet. Tuy nhiên, cần đảm bảo:

- Cổng **3000** (hoặc cổng tùy chỉnh) mở cho truy cập nội bộ
- Cổng **3306** mở nếu Database server riêng biệt
- Firewall cho phép kết nối từ các máy client trong mạng LAN

---

## 3. Chuẩn bị Môi trường

### 3.1 Cài đặt trên Windows Server

#### Bước 3.1.1: Cài đặt Node.js

1. Tải Node.js LTS từ [https://nodejs.org](https://nodejs.org) (phiên bản 22.x)
2. Chạy file `.msi` và làm theo hướng dẫn
3. Đảm bảo chọn **"Add to PATH"** trong quá trình cài đặt

Xác minh cài đặt:

```powershell
node --version
# Kết quả: v22.x.x

npm --version
# Kết quả: 10.x.x
```

#### Bước 3.1.2: Cài đặt pnpm

```powershell
npm install -g pnpm
pnpm --version
# Kết quả: 8.x.x hoặc 9.x.x
```

### 3.2 Cài đặt trên Ubuntu/Debian

#### Bước 3.2.1: Cài đặt Node.js

```bash
# Cài đặt NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Cài đặt Node.js
sudo apt-get install -y nodejs

# Xác minh
node --version
npm --version
```

#### Bước 3.2.2: Cài đặt pnpm

```bash
npm install -g pnpm
pnpm --version
```

---

## 4. Cài đặt Database

### 4.1 Cài đặt MySQL trên Windows

1. Tải MySQL Community Server từ [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)
2. Chạy MySQL Installer và chọn **"Server only"** hoặc **"Full"**
3. Trong quá trình cấu hình:
   - Chọn **"Standalone MySQL Server"**
   - Port: **3306** (mặc định)
   - Đặt mật khẩu root mạnh
   - Chọn **"Start MySQL Server at System Startup"**

### 4.2 Cài đặt MySQL trên Ubuntu

```bash
# Cài đặt MySQL Server
sudo apt update
sudo apt install mysql-server -y

# Bảo mật MySQL
sudo mysql_secure_installation

# Khởi động MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Kiểm tra trạng thái
sudo systemctl status mysql
```

### 4.3 Tạo Database và User

Đăng nhập vào MySQL:

```bash
# Windows (MySQL Command Line Client)
mysql -u root -p

# Ubuntu
sudo mysql -u root -p
```

Chạy các lệnh SQL sau:

```sql
-- Tạo database với UTF-8 support
CREATE DATABASE spc_calculator 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Tạo user cho ứng dụng
CREATE USER 'spc_app'@'localhost' 
  IDENTIFIED BY 'YourStrongPassword@2024';

-- Cấp quyền đầy đủ cho user
GRANT ALL PRIVILEGES ON spc_calculator.* 
  TO 'spc_app'@'localhost';

-- Nếu cần truy cập từ máy khác trong mạng
CREATE USER 'spc_app'@'%' 
  IDENTIFIED BY 'YourStrongPassword@2024';
GRANT ALL PRIVILEGES ON spc_calculator.* 
  TO 'spc_app'@'%';

-- Áp dụng thay đổi
FLUSH PRIVILEGES;

-- Kiểm tra
SHOW DATABASES;
SELECT User, Host FROM mysql.user;
```

> **Lưu ý bảo mật**: Thay `YourStrongPassword@2024` bằng mật khẩu mạnh, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (ít nhất 12 ký tự).

### 4.4 Cấu hình MySQL cho Hiệu suất

Chỉnh sửa file cấu hình MySQL:

**Windows**: `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`  
**Ubuntu**: `/etc/mysql/mysql.conf.d/mysqld.cnf`

```ini
[mysqld]
# Tăng buffer pool cho hiệu suất
innodb_buffer_pool_size = 1G

# Tăng kích thước log
innodb_log_file_size = 256M

# Cho phép kết nối từ mạng LAN (nếu cần)
bind-address = 0.0.0.0

# Tăng số kết nối đồng thời
max_connections = 200

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

Khởi động lại MySQL sau khi thay đổi:

```bash
# Windows
net stop mysql
net start mysql

# Ubuntu
sudo systemctl restart mysql
```

---

## 5. Triển khai Ứng dụng Web

### 5.1 Tải Mã nguồn

#### Cách 1: Từ Manus Platform (Khuyến nghị)

1. Đăng nhập vào Manus Platform
2. Mở project **SPC/CPK Calculator**
3. Click **"Download All Files"** để tải toàn bộ mã nguồn
4. Giải nén vào thư mục triển khai

#### Cách 2: Copy trực tiếp

Sao chép toàn bộ thư mục dự án vào máy chủ:

**Windows:**
```powershell
# Tạo thư mục
mkdir C:\Apps\spc-calculator

# Copy files vào thư mục
# (Sử dụng File Explorer hoặc robocopy)
```

**Ubuntu:**
```bash
# Tạo thư mục
sudo mkdir -p /opt/spc-calculator
sudo chown $USER:$USER /opt/spc-calculator

# Copy files
cp -r /path/to/source/* /opt/spc-calculator/
```

### 5.2 Cài đặt Dependencies

```bash
cd /path/to/spc-calculator

# Cài đặt tất cả dependencies
pnpm install
```

Quá trình này có thể mất 2-5 phút tùy thuộc vào tốc độ ổ cứng.

### 5.3 Cấu hình Biến Môi trường

Tạo file `.env` trong thư mục gốc của dự án:

```bash
# Windows
copy .env.example .env
notepad .env

# Ubuntu
cp .env.example .env
nano .env
```

Nội dung file `.env` cho chế độ **Offline**:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=mysql://spc_app:YourStrongPassword@2024@localhost:3306/spc_calculator

# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# OFFLINE MODE CONFIGURATION
# ============================================
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local
LLM_MODE=disabled
LOCAL_STORAGE_PATH=./uploads

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-for-security

# ============================================
# OPTIONAL: SSE & WEBSOCKET
# ============================================
SSE_ENABLED=false
WEBSOCKET_ENABLED=false

# ============================================
# OPTIONAL: SMTP EMAIL (nếu cần gửi email)
# ============================================
# SMTP_HOST=smtp.company.local
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=spc@company.local
# SMTP_PASS=email_password
# SMTP_FROM_EMAIL=spc@company.local
# SMTP_FROM_NAME=SPC Calculator

# ============================================
# OPTIONAL: RATE LIMITING
# ============================================
RATE_LIMIT_ENABLED=false

# ============================================
# APP BRANDING
# ============================================
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
```

### 5.4 Tạo JWT Secret

Để tạo JWT Secret an toàn:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**Ubuntu/Linux:**
```bash
openssl rand -base64 48
```

Sao chép kết quả vào biến `JWT_SECRET` trong file `.env`.

### 5.5 Khởi tạo Database Schema

```bash
cd /path/to/spc-calculator

# Tạo các bảng trong database
pnpm db:push
```

Lệnh này sẽ:
- Đọc schema từ `drizzle/schema.ts`
- Tạo tất cả các bảng cần thiết trong database
- Tạo các indexes cho hiệu suất

### 5.6 Build Ứng dụng

```bash
# Build cho production
pnpm build
```

Quá trình build sẽ:
- Compile TypeScript
- Bundle React frontend với Vite
- Tạo output trong thư mục `dist/`

### 5.7 Khởi động Ứng dụng

```bash
# Chạy ở chế độ production
pnpm start
```

Ứng dụng sẽ khởi động và lắng nghe trên cổng 3000 (hoặc cổng được cấu hình).

### 5.8 Kiểm tra Ứng dụng

Mở trình duyệt và truy cập:

```
http://localhost:3000
```

hoặc từ máy khác trong mạng:

```
http://<server-ip>:3000
```

---

## 6. Cấu hình Chế độ Offline

### 6.1 Các Biến Môi trường Offline

| Biến | Giá trị | Mô tả |
|------|---------|-------|
| `OFFLINE_MODE` | `true` | Bật chế độ offline |
| `AUTH_MODE` | `local` | Sử dụng xác thực local thay vì Manus OAuth |
| `STORAGE_MODE` | `local` | Lưu file vào ổ cứng thay vì S3 |
| `LLM_MODE` | `disabled` | Tắt tính năng AI (cần Internet) |
| `SSE_ENABLED` | `false` | Tắt Server-Sent Events |
| `WEBSOCKET_ENABLED` | `false` | Tắt WebSocket |

### 6.2 So sánh Tính năng Online vs Offline

| Tính năng | Online | Offline | Ghi chú |
|-----------|:------:|:-------:|---------|
| Đăng nhập Manus OAuth | ✅ | ❌ | Cần Internet |
| Đăng nhập Local | ✅ | ✅ | Username/Password |
| Phân tích SPC/CPK | ✅ | ✅ | Đầy đủ tính năng |
| Biểu đồ Control Chart | ✅ | ✅ | X-bar, R Chart |
| Xuất PDF/Excel | ✅ | ✅ | Đầy đủ tính năng |
| Lưu trữ S3 | ✅ | ❌ | Dùng local storage |
| Phân tích AI (LLM) | ✅ | ❌ | Cần Internet |
| Gửi Email | ✅ | ✅ | Cần SMTP server nội bộ |
| Webhooks | ✅ | ✅ | Đầy đủ tính năng |
| Quản lý MMS | ✅ | ✅ | OEE, Maintenance |

### 6.3 Cấu hình SMTP cho Email Nội bộ

Nếu công ty có mail server nội bộ, thêm vào `.env`:

```env
SMTP_HOST=mail.company.local
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=spc-system@company.local
SMTP_PASS=your_email_password
SMTP_FROM_EMAIL=spc-system@company.local
SMTP_FROM_NAME=SPC Calculator System
```

---

## 7. Khởi tạo Dữ liệu Ban đầu

### 7.1 Tài khoản Admin Mặc định

Khi khởi động lần đầu, hệ thống tự động tạo tài khoản admin:

| Thông tin | Giá trị |
|-----------|---------|
| **Username** | `admin` |
| **Password** | `Admin@123` |
| **Role** | `admin` |

> **Quan trọng**: Đổi mật khẩu ngay sau khi đăng nhập lần đầu!

### 7.2 Khởi tạo Dữ liệu Mẫu

Sau khi đăng nhập với tài khoản admin:

1. Vào menu **Hệ thống** → **Khởi tạo Dữ liệu**
2. Click **"Khởi tạo Dữ liệu Mẫu"** để tạo:
   - Sản phẩm mẫu
   - Dây chuyền sản xuất mẫu
   - Công trạm mẫu
   - Máy móc mẫu
   - Phương pháp lấy mẫu
   - SPC/CA/CPK Rules

### 7.3 Cấu hình Kết nối Database Bên ngoài

Nếu cần kết nối với database máy đo (MES, SCADA):

1. Vào menu **Cài đặt** → **Kết nối & Dữ liệu**
2. Click **"Thêm Kết nối"**
3. Điền thông tin:
   - **Tên kết nối**: VD: "Database Máy Đo SMT"
   - **Loại Database**: MySQL, SQL Server, Oracle, PostgreSQL
   - **Host**: IP của database server
   - **Port**: Cổng database
   - **Database**: Tên database
   - **Username/Password**: Thông tin đăng nhập

4. Click **"Test Kết nối"** để kiểm tra
5. Click **"Lưu"** nếu kết nối thành công

---

## 8. Cấu hình Chạy như Service

### 8.1 Windows Service với PM2

#### Bước 8.1.1: Cài đặt PM2

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

#### Bước 8.1.2: Khởi động ứng dụng với PM2

```powershell
cd C:\Apps\spc-calculator

# Khởi động ứng dụng
pm2 start npm --name "spc-calculator" -- start

# Lưu cấu hình
pm2 save

# Cấu hình tự khởi động với Windows
pm2-startup install
```

#### Bước 8.1.3: Các lệnh quản lý PM2

```powershell
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs spc-calculator

# Restart
pm2 restart spc-calculator

# Stop
pm2 stop spc-calculator

# Delete
pm2 delete spc-calculator
```

### 8.2 Windows Service với NSSM

#### Bước 8.2.1: Tải NSSM

Tải NSSM từ [https://nssm.cc/download](https://nssm.cc/download) và giải nén vào `C:\Tools\nssm\`.

#### Bước 8.2.2: Tạo Service

```powershell
# Mở PowerShell với quyền Administrator
C:\Tools\nssm\win64\nssm.exe install SPC-Calculator

# Trong GUI hiện ra, cấu hình:
# - Path: C:\Program Files\nodejs\node.exe
# - Startup directory: C:\Apps\spc-calculator
# - Arguments: dist/index.js

# Hoặc dùng command line
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator Application "C:\Program Files\nodejs\node.exe"
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator AppDirectory "C:\Apps\spc-calculator"
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator AppParameters "dist/index.js"
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator DisplayName "SPC Calculator Service"
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator Description "SPC/CPK Calculator Web Application"
C:\Tools\nssm\win64\nssm.exe set SPC-Calculator Start SERVICE_AUTO_START

# Khởi động service
C:\Tools\nssm\win64\nssm.exe start SPC-Calculator
```

### 8.3 Linux Service với systemd

#### Bước 8.3.1: Tạo Service File

```bash
sudo nano /etc/systemd/system/spc-calculator.service
```

Nội dung:

```ini
[Unit]
Description=SPC/CPK Calculator Web Application
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/spc-calculator
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=spc-calculator
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

#### Bước 8.3.2: Kích hoạt Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Kích hoạt tự khởi động
sudo systemctl enable spc-calculator

# Khởi động service
sudo systemctl start spc-calculator

# Kiểm tra trạng thái
sudo systemctl status spc-calculator

# Xem logs
sudo journalctl -u spc-calculator -f
```

---

## 9. Cấu hình Reverse Proxy

### 9.1 Nginx (Ubuntu/Linux)

#### Bước 9.1.1: Cài đặt Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

#### Bước 9.1.2: Cấu hình Virtual Host

```bash
sudo nano /etc/nginx/sites-available/spc-calculator
```

Nội dung:

```nginx
server {
    listen 80;
    server_name spc.company.local;  # Thay bằng domain nội bộ

    # Logging
    access_log /var/log/nginx/spc-calculator.access.log;
    error_log /var/log/nginx/spc-calculator.error.log;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Bước 9.1.3: Kích hoạt và Khởi động

```bash
# Tạo symlink
sudo ln -s /etc/nginx/sites-available/spc-calculator /etc/nginx/sites-enabled/

# Kiểm tra cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 9.2 IIS (Windows Server)

Xem chi tiết tại [Mục 7 trong DEPLOYMENT_WINDOWS_SERVER_2019.md](./DEPLOYMENT_WINDOWS_SERVER_2019.md#7-cấu-hình-iis-reverse-proxy-optional).

---

## 10. Triển khai với Docker

### 10.1 Yêu cầu

- Docker Engine 20.x+
- Docker Compose 2.x+

### 10.2 File docker-compose.yml

Tạo file `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # MySQL Database
  db:
    image: mysql:8.0
    container_name: spc-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: spc_calculator
      MYSQL_USER: spc_app
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-YourStrongPassword@2024}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"
    networks:
      - spc-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  # SPC Calculator Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: spc-app
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: mysql://spc_app:${MYSQL_PASSWORD:-YourStrongPassword@2024}@db:3306/spc_calculator
      NODE_ENV: production
      PORT: 3000
      OFFLINE_MODE: "true"
      AUTH_MODE: local
      STORAGE_MODE: local
      LLM_MODE: disabled
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      VITE_APP_TITLE: SPC/CPK Calculator
    volumes:
      - app_uploads:/app/uploads
      - app_logs:/app/logs
    ports:
      - "3000:3000"
    networks:
      - spc-network

volumes:
  mysql_data:
  app_uploads:
  app_logs:

networks:
  spc-network:
    driver: bridge
```

### 10.3 Dockerfile

Tạo file `Dockerfile`:

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Create uploads directory
RUN mkdir -p uploads logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### 10.4 Triển khai với Docker Compose

```bash
# Tạo file .env cho Docker
cat > .env << EOF
MYSQL_ROOT_PASSWORD=RootPassword@2024
MYSQL_PASSWORD=YourStrongPassword@2024
JWT_SECRET=$(openssl rand -base64 48)
EOF

# Build và khởi động
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down

# Dừng và xóa volumes (cẩn thận - mất dữ liệu!)
docker-compose down -v
```

---

## 11. Bảo mật và Backup

### 11.1 Các Biện pháp Bảo mật

#### 11.1.1 Bảo mật Database

```sql
-- Chỉ cho phép kết nối từ localhost
UPDATE mysql.user SET Host='localhost' WHERE User='spc_app';
FLUSH PRIVILEGES;

-- Hoặc chỉ từ subnet cụ thể
CREATE USER 'spc_app'@'192.168.1.%' IDENTIFIED BY 'password';
```

#### 11.1.2 Bảo mật Ứng dụng

- Đổi mật khẩu admin mặc định ngay sau khi cài đặt
- Sử dụng HTTPS nếu có thể (với self-signed certificate)
- Cấu hình firewall chỉ cho phép các IP cần thiết

#### 11.1.3 Cấu hình Firewall (Windows)

```powershell
# Chỉ cho phép subnet 192.168.1.0/24 truy cập port 3000
New-NetFirewallRule -DisplayName "SPC Calculator" `
  -Direction Inbound -Protocol TCP -LocalPort 3000 `
  -RemoteAddress 192.168.1.0/24 -Action Allow
```

#### 11.1.4 Cấu hình Firewall (Ubuntu)

```bash
# Cài đặt ufw
sudo apt install ufw

# Cho phép SSH
sudo ufw allow ssh

# Cho phép port 3000 từ subnet
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Bật firewall
sudo ufw enable
```

### 11.2 Backup Database

#### 11.2.1 Script Backup (Windows)

Tạo file `backup.ps1`:

```powershell
# Cấu hình
$MySQLPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$BackupDir = "C:\Backups\SPC"
$DBName = "spc_calculator"
$DBUser = "spc_app"
$DBPass = "YourStrongPassword@2024"
$RetentionDays = 30

# Tạo thư mục backup nếu chưa có
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir
}

# Tên file backup với timestamp
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\spc_backup_$Date.sql"

# Thực hiện backup
& "$MySQLPath\mysqldump.exe" -u $DBUser -p"$DBPass" $DBName > $BackupFile

# Nén file backup
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
Remove-Item $BackupFile

# Xóa backup cũ hơn RetentionDays ngày
Get-ChildItem $BackupDir -Filter "*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | 
    Remove-Item

Write-Host "Backup completed: $BackupFile.zip"
```

Lập lịch với Task Scheduler để chạy hàng ngày.

#### 11.2.2 Script Backup (Linux)

Tạo file `/opt/scripts/backup-spc.sh`:

```bash
#!/bin/bash

# Cấu hình
BACKUP_DIR="/var/backups/spc"
DB_NAME="spc_calculator"
DB_USER="spc_app"
DB_PASS="YourStrongPassword@2024"
RETENTION_DAYS=30

# Tạo thư mục backup
mkdir -p $BACKUP_DIR

# Tên file với timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/spc_backup_$DATE.sql"

# Thực hiện backup
mysqldump -u $DB_USER -p"$DB_PASS" $DB_NAME > $BACKUP_FILE

# Nén file
gzip $BACKUP_FILE

# Xóa backup cũ
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Lập lịch với cron:

```bash
# Chỉnh sửa crontab
crontab -e

# Thêm dòng sau để backup lúc 2:00 AM hàng ngày
0 2 * * * /opt/scripts/backup-spc.sh >> /var/log/spc-backup.log 2>&1
```

### 11.3 Restore Database

```bash
# Giải nén (nếu cần)
gunzip spc_backup_20241216_020000.sql.gz

# Restore
mysql -u spc_app -p spc_calculator < spc_backup_20241216_020000.sql
```

---

## 12. Khắc phục Sự cố

### 12.1 Các Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL không chạy | Khởi động MySQL service |
| `ER_ACCESS_DENIED_ERROR` | Sai username/password | Kiểm tra DATABASE_URL trong .env |
| `EADDRINUSE :::3000` | Port 3000 đã được sử dụng | Đổi PORT trong .env hoặc dừng process khác |
| `MODULE_NOT_FOUND` | Dependencies chưa cài | Chạy `pnpm install` |
| `Invalid JWT` | JWT_SECRET không khớp | Đảm bảo JWT_SECRET giống nhau |
| Trang trắng | Build lỗi | Chạy lại `pnpm build` |

### 12.2 Kiểm tra Logs

**PM2:**
```bash
pm2 logs spc-calculator --lines 100
```

**systemd:**
```bash
sudo journalctl -u spc-calculator -n 100 --no-pager
```

**Docker:**
```bash
docker-compose logs -f app
```

### 12.3 Kiểm tra Kết nối Database

```bash
# Từ command line
mysql -u spc_app -p -h localhost spc_calculator -e "SELECT 1;"

# Hoặc trong ứng dụng
curl http://localhost:3000/api/health
```

### 12.4 Reset Mật khẩu Admin

Nếu quên mật khẩu admin, chạy SQL sau:

```sql
-- Mật khẩu mới: Admin@123
UPDATE local_users 
SET passwordHash = '$2a$10$rQnM1.vH8xLqVqJqK8zQAeYJvZxYzQxYzQxYzQxYzQxYzQxYzQxYz',
    mustChangePassword = 1
WHERE username = 'admin';
```

> **Lưu ý**: Hash trên là ví dụ. Cần tạo hash mới bằng bcrypt với cost factor 10.

---

## 13. Phụ lục

### 13.1 Danh sách Ports

| Port | Service | Mô tả |
|------|---------|-------|
| 3000 | SPC Calculator | Web Application |
| 3306 | MySQL | Database Server |
| 80 | Nginx/IIS | Reverse Proxy (HTTP) |
| 443 | Nginx/IIS | Reverse Proxy (HTTPS) |

### 13.2 Cấu trúc Thư mục

```
/opt/spc-calculator/          # Ubuntu
C:\Apps\spc-calculator\       # Windows
│
├── client/                   # Frontend source
├── server/                   # Backend source
├── drizzle/                  # Database schema
├── dist/                     # Built files (production)
├── uploads/                  # Local file storage
├── logs/                     # Application logs
├── .env                      # Environment variables
├── package.json              # Dependencies
└── pnpm-lock.yaml           # Lock file
```

### 13.3 Biến Môi trường Đầy đủ

```env
# Database
DATABASE_URL=mysql://user:pass@host:3306/dbname

# Application
NODE_ENV=production
PORT=3000

# Offline Mode
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local
LLM_MODE=disabled
LOCAL_STORAGE_PATH=./uploads

# Authentication
JWT_SECRET=your-secret-key

# Optional Features
SSE_ENABLED=false
WEBSOCKET_ENABLED=false
RATE_LIMIT_ENABLED=false

# SMTP (Optional)
SMTP_HOST=smtp.company.local
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@company.local
SMTP_PASS=password
SMTP_FROM_EMAIL=spc@company.local
SMTP_FROM_NAME=SPC Calculator

# Branding
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
```

### 13.4 Liên hệ Hỗ trợ

Nếu gặp vấn đề trong quá trình triển khai:

- **Email**: support@manus.im
- **Documentation**: https://help.manus.im

---

*Tài liệu này được tạo bởi Manus AI. Phiên bản 2.0 - Tháng 12/2025*
