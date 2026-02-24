# Hướng dẫn Triển khai Production - SPC/CPK Calculator

> **Phiên bản:** 2.0 | **Cập nhật:** 09/02/2026
> **Tác giả:** MSoftware AI Team

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Triển khai trên Linux (Ubuntu/CentOS)](#2-triển-khai-trên-linux)
3. [Triển khai trên Windows Server](#3-triển-khai-trên-windows-server)
4. [Triển khai bằng Docker](#4-triển-khai-bằng-docker)
5. [Cấu hình Database](#5-cấu-hình-database)
6. [Cấu hình Biến môi trường](#6-cấu-hình-biến-môi-trường)
7. [Cấu hình Nginx Reverse Proxy](#7-cấu-hình-nginx-reverse-proxy)
8. [Bảo mật và SSL](#8-bảo-mật-và-ssl)
9. [Backup và Restore](#9-backup-và-restore)
10. [Monitoring và Logs](#10-monitoring-và-logs)
11. [Troubleshooting](#11-troubleshooting)
12. [Cập nhật phiên bản](#12-cập-nhật-phiên-bản)

---

## 1. Yêu cầu hệ thống

### Phần cứng tối thiểu

| Thành phần | Tối thiểu | Khuyến nghị |
|-----------|-----------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Ổ cứng | 20 GB SSD | 50+ GB SSD |
| Mạng | 100 Mbps | 1 Gbps |

### Phần mềm yêu cầu

| Phần mềm | Phiên bản | Ghi chú |
|----------|-----------|---------|
| Node.js | 18.x hoặc 22.x | Khuyến nghị 22.x LTS |
| pnpm | 8.x+ | Package manager |
| MySQL | 8.0+ | Hoặc MariaDB 10.5+ |
| Git | 2.x+ | Quản lý source code |
| PM2 | 5.x+ | Process manager (Linux) |
| NSSM | 2.24+ | Service manager (Windows) |

### Hệ điều hành hỗ trợ

- **Linux:** Ubuntu 20.04+, CentOS 7+, Debian 11+, RHEL 8+
- **Windows:** Windows Server 2019+, Windows 10/11 Pro

---

## 2. Triển khai trên Linux

### 2.1. Cài đặt Node.js và pnpm

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Cài đặt pnpm
npm install -g pnpm

# Kiểm tra phiên bản
node -v    # v22.x.x
pnpm -v    # 8.x.x hoặc 9.x.x
```

### 2.2. Cài đặt MySQL

```bash
# Ubuntu/Debian
sudo apt-get install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Bảo mật MySQL
sudo mysql_secure_installation

# Tạo database và user
sudo mysql -u root -p <<EOF
CREATE DATABASE spc_calculator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spc_app'@'localhost' IDENTIFIED BY 'YourStrongPassword@2024';
GRANT ALL PRIVILEGES ON spc_calculator.* TO 'spc_app'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 2.3. Clone và Build ứng dụng

```bash
# Clone source code
cd /opt
sudo git clone <your-repo-url> spc-calculator
sudo chown -R $USER:$USER spc-calculator
cd spc-calculator

# Cài đặt dependencies
pnpm install --frozen-lockfile

# Tạo file .env
cat > .env << 'EOF'
# === DATABASE ===
DATABASE_URL=mysql://spc_app:YourStrongPassword@2024@localhost:3306/spc_calculator

# === APPLICATION ===
NODE_ENV=production
PORT=3000

# === OFFLINE MODE ===
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local
LLM_MODE=disabled
LOCAL_STORAGE_PATH=./uploads

# === SECURITY ===
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-here

# === BRANDING ===
VITE_APP_TITLE=SPC/CPK Calculator
VITE_APP_LOGO=/logo.svg
EOF

# Build production
pnpm build

# Hoặc nếu máy có ít RAM (< 4GB):
pnpm build:lowmem

# Hoặc nếu máy có nhiều RAM (> 8GB):
pnpm build:full

# Chạy database migrations
pnpm db:push

# Tạo thư mục cần thiết
mkdir -p uploads logs
```

### 2.4. Khởi động với PM2

```bash
# Cài đặt PM2
sudo npm install -g pm2

# Khởi động ứng dụng
pm2 start ecosystem.config.cjs

# Kiểm tra trạng thái
pm2 status
pm2 logs spc-calculator

# Cấu hình tự khởi động khi reboot
pm2 startup
pm2 save

# Các lệnh quản lý
pm2 restart spc-calculator    # Restart
pm2 stop spc-calculator       # Dừng
pm2 reload spc-calculator     # Zero-downtime reload
pm2 delete spc-calculator     # Xóa process
```

### 2.5. Tạo Systemd Service (thay thế PM2)

```bash
# Tạo service file
sudo cat > /etc/systemd/system/spc-calculator.service << 'EOF'
[Unit]
Description=SPC/CPK Calculator
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/spc-calculator
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=spc-calculator

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=OFFLINE_MODE=true
Environment=AUTH_MODE=local
EnvironmentFile=/opt/spc-calculator/.env

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/spc-calculator/uploads /opt/spc-calculator/logs

[Install]
WantedBy=multi-user.target
EOF

# Kích hoạt và khởi động
sudo systemctl daemon-reload
sudo systemctl enable spc-calculator
sudo systemctl start spc-calculator

# Kiểm tra trạng thái
sudo systemctl status spc-calculator
sudo journalctl -u spc-calculator -f
```

---

## 3. Triển khai trên Windows Server

### 3.1. Cài đặt phần mềm

**Node.js:**
1. Tải Node.js 22 LTS từ [nodejs.org](https://nodejs.org/)
2. Chạy installer, chọn "Add to PATH"
3. Mở Command Prompt (Admin), kiểm tra: `node -v`

**pnpm:**
```cmd
npm install -g pnpm
```

**MySQL:**
1. Tải MySQL 8.0 Community từ [dev.mysql.com](https://dev.mysql.com/downloads/mysql/)
2. Chạy installer, chọn "Server only"
3. Cấu hình root password
4. Mở MySQL Workbench hoặc Command Line Client:

```sql
CREATE DATABASE spc_calculator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spc_app'@'localhost' IDENTIFIED BY 'YourStrongPassword@2024';
GRANT ALL PRIVILEGES ON spc_calculator.* TO 'spc_app'@'localhost';
FLUSH PRIVILEGES;
```

### 3.2. Clone và Build

```cmd
:: Mở Command Prompt (Admin)
cd C:\
git clone <your-repo-url> spc-calculator
cd spc-calculator

:: Cài đặt dependencies
pnpm install --frozen-lockfile

:: Tạo file .env (dùng Notepad hoặc PowerShell)
:: Nội dung giống phần Linux ở trên, thay đổi DATABASE_URL cho phù hợp

:: Build production
set NODE_OPTIONS=--max-old-space-size=4096
pnpm build

:: Chạy database migrations
pnpm db:push

:: Tạo thư mục
mkdir uploads logs

:: Test chạy thử
set NODE_ENV=production
node dist/index.js
:: Truy cập http://localhost:3000 để kiểm tra
:: Ctrl+C để dừng
```

### 3.3. Cài đặt Windows Service với NSSM

```cmd
:: Tải NSSM từ https://nssm.cc/download
:: Giải nén vào C:\nssm

:: Cài đặt service
C:\nssm\nssm.exe install SPCCalculator

:: Trong GUI NSSM:
:: - Path: C:\Program Files\nodejs\node.exe
:: - Startup directory: C:\spc-calculator
:: - Arguments: dist\index.js
:: - Tab "Details": Display name = "SPC/CPK Calculator"
:: - Tab "Environment": Thêm các biến môi trường

:: Hoặc dùng command line:
C:\nssm\nssm.exe install SPCCalculator "C:\Program Files\nodejs\node.exe" "dist\index.js"
C:\nssm\nssm.exe set SPCCalculator AppDirectory "C:\spc-calculator"
C:\nssm\nssm.exe set SPCCalculator DisplayName "SPC/CPK Calculator"
C:\nssm\nssm.exe set SPCCalculator Description "SPC/CPK Calculator Production Server"
C:\nssm\nssm.exe set SPCCalculator Start SERVICE_AUTO_START
C:\nssm\nssm.exe set SPCCalculator AppStdout "C:\spc-calculator\logs\output.log"
C:\nssm\nssm.exe set SPCCalculator AppStderr "C:\spc-calculator\logs\error.log"
C:\nssm\nssm.exe set SPCCalculator AppEnvironmentExtra NODE_ENV=production PORT=3000 OFFLINE_MODE=true AUTH_MODE=local

:: Khởi động service
net start SPCCalculator

:: Quản lý service
net stop SPCCalculator
net start SPCCalculator
C:\nssm\nssm.exe restart SPCCalculator
C:\nssm\nssm.exe remove SPCCalculator confirm
```

### 3.4. Cài đặt Windows Service với PM2 (thay thế NSSM)

```cmd
:: Cài đặt PM2 và pm2-windows-startup
npm install -g pm2
npm install -g pm2-windows-startup

:: Khởi động ứng dụng
cd C:\spc-calculator
pm2 start ecosystem.config.cjs

:: Cấu hình tự khởi động
pm2-startup install
pm2 save

:: Quản lý
pm2 status
pm2 logs spc-calculator
pm2 restart spc-calculator
```

### 3.5. Cấu hình Windows Firewall

```powershell
# Mở PowerShell (Admin)
New-NetFirewallRule -DisplayName "SPC Calculator" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
# Nếu dùng Nginx:
New-NetFirewallRule -DisplayName "SPC Calculator HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "SPC Calculator HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

---

## 4. Triển khai bằng Docker

### 4.1. Docker Compose (Khuyến nghị)

```bash
# Clone source code
git clone <your-repo-url> spc-calculator
cd spc-calculator

# Tạo file .env cho Docker
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=RootPassword@2024
MYSQL_DATABASE=spc_calculator
MYSQL_USER=spc_app
MYSQL_PASSWORD=YourStrongPassword@2024
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-here
VITE_APP_TITLE=SPC/CPK Calculator
APP_PORT=3000
EOF

# Khởi động toàn bộ stack
docker-compose up -d

# Kiểm tra trạng thái
docker-compose ps
docker-compose logs -f app

# Chạy database migrations
docker-compose exec app pnpm db:push
```

### 4.2. Docker đơn lẻ (khi đã có MySQL sẵn)

```bash
# Build image
docker build -t spc-calculator:latest .

# Chạy container
docker run -d \
  --name spc-calculator \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://spc_app:password@host.docker.internal:3306/spc_calculator" \
  -e NODE_ENV=production \
  -e OFFLINE_MODE=true \
  -e AUTH_MODE=local \
  -e JWT_SECRET="your-secret-key" \
  -v spc-uploads:/app/uploads \
  -v spc-logs:/app/logs \
  spc-calculator:latest
```

### 4.3. Docker trên Windows

```powershell
# Cài đặt Docker Desktop for Windows
# Đảm bảo WSL2 backend đã được bật

# Clone và chạy
cd C:\spc-calculator
docker-compose up -d

# Kiểm tra
docker-compose ps
docker-compose logs -f
```

---

## 5. Cấu hình Database

### 5.1. Tối ưu MySQL cho Production

```sql
-- File: /etc/mysql/mysql.conf.d/spc-optimize.cnf (Linux)
-- Hoặc: C:\ProgramData\MySQL\MySQL Server 8.0\my.ini (Windows)

[mysqld]
# InnoDB Buffer Pool - đặt 70% RAM
innodb_buffer_pool_size = 2G

# Log file size
innodb_log_file_size = 256M

# Connection limits
max_connections = 200

# Query cache (MySQL 8.0 đã loại bỏ, dùng ProxySQL nếu cần)
# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

### 5.2. Chạy Migrations

```bash
# Từ thư mục project
pnpm db:push

# Nếu gặp lỗi, chạy từng bước:
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5.3. Tạo tài khoản Admin đầu tiên

Sau khi triển khai, truy cập ứng dụng tại `http://localhost:3000/local-login`:

- **Tài khoản mặc định:** admin / admin123
- **Quan trọng:** Đổi mật khẩu ngay sau khi đăng nhập lần đầu

Hoặc tạo admin qua SQL:

```sql
-- Tạo admin user (password: admin123, đã hash bcrypt)
INSERT INTO user (open_id, name, email, role, password_hash, created_at, updated_at)
VALUES (
  'local-admin-001',
  'Administrator',
  'admin@company.com',
  'admin',
  '$2b$10$LQv3c1yqBo9SkvXS7QTJPe4Rq.Hj.yQKIBFbGGJEP3Q0QbVqxVLu',
  NOW(),
  NOW()
);
```

---

## 6. Cấu hình Biến môi trường

### 6.1. Biến bắt buộc

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `DATABASE_URL` | Connection string MySQL | `mysql://user:pass@localhost:3306/spc_calculator` |
| `JWT_SECRET` | Secret key cho JWT (≥32 ký tự) | `a1b2c3d4e5f6...` |
| `NODE_ENV` | Môi trường | `production` |
| `PORT` | Port server | `3000` |
| `OFFLINE_MODE` | Chế độ offline | `true` |
| `AUTH_MODE` | Phương thức xác thực | `local` |

### 6.2. Biến tùy chọn

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `STORAGE_MODE` | Lưu trữ file | `local` |
| `LOCAL_STORAGE_PATH` | Thư mục uploads | `./uploads` |
| `LLM_MODE` | Tính năng AI | `disabled` |
| `SSE_ENABLED` | Server-Sent Events | `true` |
| `WEBHOOKS_ENABLED` | Webhooks | `true` |
| `VITE_APP_TITLE` | Tên ứng dụng | `SPC/CPK Calculator` |
| `VITE_APP_LOGO` | Logo URL | `/logo.svg` |

### 6.3. Cấu hình Email (SMTP)

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Dùng TLS | `false` |
| `SMTP_USER` | SMTP username | `user@company.com` |
| `SMTP_PASS` | SMTP password | `app-password` |
| `SMTP_FROM_EMAIL` | Email gửi | `spc@company.com` |
| `SMTP_FROM_NAME` | Tên hiển thị | `SPC Calculator` |

### 6.4. Cấu hình PostgreSQL (tùy chọn, dual-database)

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `PG_LOCAL_ENABLED` | Bật PostgreSQL | `true` |
| `PG_HOST` | PostgreSQL host | `localhost` |
| `PG_PORT` | PostgreSQL port | `5432` |
| `PG_USER` | PostgreSQL user | `spc_user` |
| `PG_PASSWORD` | PostgreSQL password | `spc_password` |
| `PG_DATABASE` | PostgreSQL database | `spc_calculator` |

---

## 7. Cấu hình Nginx Reverse Proxy

### 7.1. Linux

```bash
# Cài đặt Nginx
sudo apt-get install -y nginx

# Tạo config
sudo cat > /etc/nginx/sites-available/spc-calculator << 'EOF'
upstream spc_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen 443 ssl http2;  # HTTP/2 với SSL
    server_name spc.company.com;  # Thay bằng domain của bạn

    # SSL certificates (bỏ comment khi có SSL)
    # ssl_certificate /etc/ssl/certs/spc.crt;
    # ssl_certificate_key /etc/ssl/private/spc.key;
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers HIGH:!aNULL:!MD5;

    # Redirect HTTP to HTTPS (bỏ comment khi có SSL)
    # if ($scheme != "https") { return 301 https://$server_name$request_uri; }

    # Client max body size (cho file uploads)
    client_max_body_size 50M;

    # Gzip compression (giảm 60-80% kích thước truyền tải)
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_static on;  # Serve pre-built .gz files (từ vite-plugin-compression)
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon;

    # Static files caching with HTTP/2 Server Push hints
    location /assets/ {
        proxy_pass http://spc_backend;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Other static files (images, fonts, icons)
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|avif|woff|woff2|ttf|eot)$ {
        proxy_pass http://spc_backend;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # HTTP/2 Server Push for critical assets
    # Nginx reads Link headers from Express and pushes assets to client
    location = / {
        proxy_pass http://spc_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        http2_push_preload on;  # Enable HTTP/2 push from Link headers
    }

    # API and SSE
    location /api/ {
        proxy_pass http://spc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Uploads directory (local storage mode)
    location /uploads/ {
        proxy_pass http://spc_backend;
        proxy_set_header Host $host;
    }

    # All other requests
    location / {
        proxy_pass http://spc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/spc-calculator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7.2. Windows (IIS Reverse Proxy)

1. Cài đặt **URL Rewrite Module** và **Application Request Routing** cho IIS
2. Tạo website mới trong IIS Manager
3. Thêm Reverse Proxy rule trỏ đến `http://localhost:3000`

Hoặc dùng Nginx for Windows:
1. Tải Nginx từ [nginx.org/en/download.html](https://nginx.org/en/download.html)
2. Giải nén vào `C:\nginx`
3. Tạo config tương tự phần Linux
4. Chạy: `C:\nginx\nginx.exe`

---

## 8. Bảo mật và SSL

### 8.1. Let's Encrypt SSL (Linux)

```bash
# Cài đặt Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Tạo SSL certificate
sudo certbot --nginx -d spc.company.com

# Tự động gia hạn
sudo crontab -e
# Thêm dòng:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8.2. Self-signed SSL (Internal/Windows)

```bash
# Tạo self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/spc.key \
  -out /etc/ssl/certs/spc.crt \
  -subj "/C=VN/ST=HCM/L=HCM/O=Company/CN=spc.company.com"
```

### 8.3. Checklist bảo mật

- [ ] Đổi mật khẩu admin mặc định
- [ ] Đặt JWT_SECRET mạnh (≥32 ký tự ngẫu nhiên)
- [ ] Đổi mật khẩu MySQL root và user
- [ ] Bật SSL/HTTPS
- [ ] Cấu hình firewall (chỉ mở port 80, 443)
- [ ] Tắt truy cập MySQL từ bên ngoài
- [ ] Cấu hình rate limiting trong Nginx
- [ ] Backup database định kỳ

---

## 9. Backup và Restore

### 9.1. Backup Database

```bash
# Backup thủ công
mysqldump -u spc_app -p spc_calculator > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup tự động (crontab)
# Chạy hàng ngày lúc 2:00 AM
0 2 * * * mysqldump -u spc_app -pYourPassword spc_calculator | gzip > /opt/backups/spc_$(date +\%Y\%m\%d).sql.gz

# Windows Task Scheduler:
# Action: "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
# Arguments: -u spc_app -pYourPassword spc_calculator > C:\backups\spc_%date:~0,4%%date:~5,2%%date:~8,2%.sql
```

### 9.2. Backup Uploads

```bash
# Linux
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Windows
powershell Compress-Archive -Path C:\spc-calculator\uploads -DestinationPath C:\backups\uploads_%date:~0,4%%date:~5,2%%date:~8,2%.zip
```

### 9.3. Restore

```bash
# Restore database
mysql -u spc_app -p spc_calculator < backup_20260209.sql

# Restore uploads
tar -xzf uploads_backup_20260209.tar.gz -C /opt/spc-calculator/
```

---

## 10. Monitoring và Logs

### 10.1. PM2 Monitoring

```bash
# Dashboard realtime
pm2 monit

# Xem logs
pm2 logs spc-calculator
pm2 logs spc-calculator --lines 100

# Metrics
pm2 show spc-calculator
```

### 10.2. Log Files

| File | Vị trí | Nội dung |
|------|--------|----------|
| Application log | `./logs/output.log` | Server output |
| Error log | `./logs/error.log` | Errors và exceptions |
| MySQL slow log | `/var/log/mysql/slow.log` | Slow queries |
| Nginx access | `/var/log/nginx/access.log` | HTTP requests |
| Nginx error | `/var/log/nginx/error.log` | Nginx errors |

### 10.3. Health Check Endpoints

Hệ thống cung cấp 5 health check endpoints không yêu cầu xác thực, phù hợp cho monitoring và load balancer:

| Endpoint | Mô tả | Sử dụng |
|----------|---------|--------|
| `GET /api/health` | Kiểm tra cơ bản (status, uptime, version) | Load balancer probe |
| `GET /api/health/detailed` | Chi tiết (DB, memory, CPU, services) | Admin monitoring |
| `GET /api/health/live` | Liveness probe (process running) | Kubernetes liveness |
| `GET /api/health/ready` | Readiness probe (DB + memory) | Kubernetes readiness |
| `GET /api/metrics` | Prometheus text exposition format | Prometheus scraping |

```bash
# Kiểm tra cơ bản
curl http://localhost:3000/api/health
# {"status":"healthy","uptime":12345,"uptimeFormatted":"3h 25m 45s",...}

# Kiểm tra chi tiết (DB latency, memory, CPU, services)
curl http://localhost:3000/api/health/detailed

# Liveness probe (cho Kubernetes)
curl http://localhost:3000/api/health/live
# {"status":"ok","timestamp":"2026-02-09T07:00:00.000Z"}

# Readiness probe (cho Kubernetes)
curl http://localhost:3000/api/health/ready
# {"ready":true,"checks":{"database":true,"memory":true}}

# Prometheus metrics
curl http://localhost:3000/api/metrics
# app_uptime_seconds 12345
# db_connected 1
# db_latency_ms 15
# process_memory_heap_used_bytes 279313664
# ...
```

### 10.4. Prometheus + Grafana Integration

#### Quick Start với Docker Compose

Hệ thống cung cấp sẵn monitoring stack trong thư mục `monitoring/`:

```bash
# Khởi động toàn bộ monitoring stack
cd monitoring/
docker compose -f docker-compose.monitoring.yml up -d

# Truy cập:
# - Grafana:      http://localhost:3001 (admin/admin)
# - Prometheus:   http://localhost:9090
# - Alertmanager: http://localhost:9093
```

#### Cấu hình Prometheus

Sửa file `monitoring/prometheus.yml`, thay `YOUR_APP_HOST` bằng hostname thực tế:

```yaml
scrape_configs:
  - job_name: 'cpk-spc-calculator'
    scrape_interval: 15s
    metrics_path: '/api/metrics'
    scheme: 'https'
    static_configs:
      - targets: ['YOUR_APP_HOST:443']
        labels:
          environment: 'production'
          service: 'cpk-spc-calculator'
```

#### Import Grafana Dashboard

1. Mở Grafana tại `http://localhost:3001`
2. Vào **Dashboards** → **Import**
3. Upload file `monitoring/grafana-dashboard.json`
4. Chọn datasource **Prometheus**
5. Click **Import**

Dashboard bao gồm các panels:

| Panel | Mô tả |
|-------|--------|
| Application Health Overview | Status, uptime, version, DB connection, latency, table count |
| Database Latency Gauge | Gauge hiển thị DB latency với ngưỡng xanh/vàng/đỏ |
| Database Latency Over Time | Biểu đồ latency theo thời gian với threshold 500ms |
| Memory Usage Gauges | System memory và heap memory (%) |
| Process Memory Over Time | RSS, heap used, heap total, external theo thời gian |
| System Memory | Total, free, used memory theo thời gian |
| CPU Load | Load average 1m, 5m, 15m |
| Services Status | WebSocket, SSE, Rate Limiter, Redis - màu sắc theo trạng thái |

#### Cấu hình Alertmanager

Sửa file `monitoring/alertmanager.yml` với thông tin thực tế:

```yaml
# Email SMTP
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'your-email@gmail.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

# Slack Webhook
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
```

#### Alert Rules (15 rules, 5 groups)

| Alert | Severity | Điều kiện | Thời gian |
|-------|----------|-----------|----------|
| DatabaseConnectionLost | critical | db_connected == 0 | 30s |
| DatabaseLatencyHigh | warning | db_latency_ms > 500 | 2m |
| DatabaseLatencyCritical | critical | db_latency_ms > 2000 | 1m |
| DatabaseLatencySpike | warning | > 3x trung bình 1h | 5m |
| SystemMemoryHigh | critical | > 90% | 5m |
| SystemMemoryWarning | warning | > 80% | 10m |
| HeapMemoryHigh | warning | > 85% | 5m |
| PossibleMemoryLeak | warning | RSS > 1.5x min 6h | 30m |
| CPULoadHigh | warning | > 80% per core | 5m |
| CPULoadCritical | critical | > 95% per core | 3m |
| ApplicationUnhealthy | critical | health_status < 1 | 1m |
| ApplicationDown | critical | absent(metrics) | 1m |
| ApplicationRestarted | info | uptime reset | instant |
| WebSocketUnavailable | warning | ws_available == 0 | 2m |
| RedisDisconnected | warning | redis == 0 | 2m |

#### Slack Channels

| Channel | Nhận alerts |
|---------|-------------|
| #spc-alerts-critical | Critical alerts + Email |
| #spc-alerts-warning | Warning alerts |
| #spc-alerts-info | Info alerts |
| #spc-database-alerts | Database-specific alerts |

#### Các metrics có sẵn (20+)

| Metric | Type | Mô tả |
|--------|------|--------|
| `app_health_status` | gauge | 1=healthy, 0.5=degraded, 0=unhealthy |
| `app_uptime_seconds` | gauge | Thời gian server chạy (giây) |
| `app_version` | info | Phiên bản ứng dụng |
| `db_connected` | gauge | Kết nối database (0/1) |
| `db_latency_ms` | gauge | Độ trễ query database (ms) |
| `db_table_count` | gauge | Số lượng bảng trong database |
| `process_memory_rss_bytes` | gauge | RSS memory của process |
| `process_memory_heap_used_bytes` | gauge | Heap memory đang dùng |
| `process_memory_heap_total_bytes` | gauge | Heap memory tổng |
| `process_memory_external_bytes` | gauge | External memory (C++ objects) |
| `system_memory_total_bytes` | gauge | Tổng memory hệ thống |
| `system_memory_free_bytes` | gauge | Memory trống |
| `system_memory_used_bytes` | gauge | Memory đang dùng |
| `system_memory_usage_percent` | gauge | % memory hệ thống đang dùng |
| `system_cpu_load_1m` | gauge | CPU load trung bình 1 phút |
| `system_cpu_load_5m` | gauge | CPU load trung bình 5 phút |
| `system_cpu_load_15m` | gauge | CPU load trung bình 15 phút |
| `system_cpu_count` | gauge | Số lượng CPU cores |
| `service_websocket_available` | gauge | WebSocket khả dụng (0/1) |
| `service_sse_available` | gauge | SSE khả dụng (0/1) |
| `service_rate_limiter_enabled` | gauge | Rate limiter đang bật (0/1) |
| `service_redis_connected` | gauge | Redis kết nối (0/1) |

### 10.5. Rate Limiting

Hệ thống hỗ trợ rate limiting với các tier:

| Tier | Giới hạn | Áp dụng cho |
|------|-----------|------------|
| General API | 5000 req/15min | Tất cả API endpoints |
| Auth | 200 req/15min | Đăng nhập, OAuth |
| Export | 100 req/15min | PDF/Excel export, upload |
| Per-user | 3000 req/15min | Mỗi user |

```bash
# Bật rate limiting qua biến môi trường
RATE_LIMIT_ENABLED=true

# Tùy chỉnh giới hạn (optional)
RATE_LIMIT_EXPORT_PER_MIN=10
RATE_LIMIT_UPLOAD_PER_MIN=20
RATE_LIMIT_COMPUTE_PER_MIN=30
RATE_LIMIT_GENERAL_PER_MIN=100

# Sử dụng Redis cho rate limiting (multi-instance)
REDIS_URL=redis://localhost:6379
```

Tính năng:
- IP whitelist tự động cho mạng nội bộ (10.x, 192.168.x, 172.16-31.x)
- Thống kê chi tiết: top blocked IPs, endpoints, users
- Cảnh báo tự động khi tỷ lệ block > 5%
- Hỗ trợ Redis store cho môi trường multi-instance
- Bật/tắt qua admin UI hoặc API

### 10.6. API Documentation (Swagger/OpenAPI)

Hệ thống cung cấp tài liệu API tương tác qua Swagger UI:

| Endpoint | Mô tả |
|----------|--------|
| `GET /api/docs` | Swagger UI - Giao diện khám phá API tương tác |
| `GET /api/openapi.json` | OpenAPI 3.0 spec (JSON) |
| `GET /api/docs/stats` | Thống kê API (số modules, groups) |

Thống kê API:
- **172 router modules** được phân loại thành **15 nhóm chức năng**
- **177 paths** trong OpenAPI spec (172 tRPC + 5 health check)
- Hỗ trợ **Try It Out** trực tiếp từ Swagger UI
- Tìm kiếm và lọc endpoints theo tag/module

Các nhóm module chính:

| Nhóm | Số modules | Ví dụ |
|------|------------|--------|
| Core | 5 | auth, user, permission, system |
| SPC/CPK | 7 | spc, cpkHistory, cpkAlert, spcPlan |
| Production | 13 | product, machine, workstation, defect |
| OEE & Maintenance | 12 | oee, maintenance, mttrMtbf, spareParts |
| IoT | 14 | iotDashboard, mqtt, edgeGateway, timeseries |
| AI & Vision | 14 | ai, aiAdvanced, vision, anomalyDetectionAI |
| Quality | 7 | qualityStatistics, paretoChart, heatMapYield |
| Alerts & Notifications | 22 | alert, notification, telegram, sms |
| Reports & Export | 9 | export, report, scheduledReport, shiftReport |
| System & Admin | 40+ | security, audit, cache, rateLimit, backup |

---

### 10.7. Performance Benchmark Suite

Bộ benchmark tích hợp sẵn giúp đo hiệu suất API endpoints trước và sau khi tối ưu.

```bash
# Chạy benchmark đầy đủ (24 endpoints, 10s/endpoint)
node benchmark/run-benchmark.mjs

# Chạy chỉ SPC endpoints với 20 concurrent requests
node benchmark/run-benchmark.mjs --endpoints spc --concurrency 20

# Chạy với URL production
node benchmark/run-benchmark.mjs --url https://your-app.manus.space --duration 15
```

**Endpoint Groups:**

| Group | Endpoints | Mô tả |
|-------|-----------|--------|
| `health` | 5 | Health check, liveness, readiness, metrics |
| `spc` | 8 | SPC analysis, CPK trend, products, specs |
| `oee` | 6 | OEE records, dashboard, MTTR/MTBF |
| `audit` | 5 | Audit logs, stats, users, modules |

**Đánh giá tự động:**

| P95 Latency | Đánh giá | Hành động |
|-------------|----------|----------|
| < 200ms | Xuất sắc | Không cần tối ưu |
| 200-500ms | Tốt | Chấp nhận được |
| 500-2000ms | Trung bình | Xem xét thêm index/cache |
| > 2000ms | Chậm | Cần tối ưu ngay |

Kết quả được lưu tại `benchmark/results.md` dưới dạng Markdown.

### 10.8. Audit Log Dashboard

Trang quản trị Nhật ký Hoạt động (`/audit-logs`) cho phép giám sát mọi thao tác trong hệ thống:

- **Bộ lọc nâng cao:** Theo người dùng, hành động (15 loại), module, loại xác thực (Local/OAuth), khoảng thời gian
- **Thống kê trực quan:** 4 stat cards, phân bổ hành động, top modules, top users, timeline 24h
- **Export CSV:** Xuất dữ liệu với BOM UTF-8 cho Excel
- **Chi tiết sự kiện:** Xem diff giá trị cũ/mới với highlight màu

**API Endpoints mới:**

| Endpoint | Mô tả |
|----------|--------|
| `audit.advancedSearch` | Tìm kiếm nâng cao với tất cả filters |
| `audit.stats` | Thống kê tổng quan (by action, module, user, timeline) |
| `audit.users` | Danh sách users cho dropdown filter |
| `audit.modules` | Danh sách modules cho dropdown filter |
| `audit.export` | Xuất dữ liệu (max 50,000 records) |

### 10.9. Playwright E2E Testing

Bộ test E2E sử dụng Playwright để kiểm tra tự động các luồng chính của ứng dụng.

**Cài đặt:**
```bash
cd e2e
npm install
npx playwright install chromium
```

**Chạy tests:**
```bash
# Tất cả tests
npm test

# Chỉ API tests
npm run test:api

# Chỉ UI tests
npm run test:ui

# Với URL khác
BASE_URL=https://your-app.manus.space npm test
```

| Test File | Mô tả | Tests |
|-----------|--------|-------|
| `auth.spec.ts` | Authentication & Login | 5 |
| `navigation.spec.ts` | Navigation & Routing | 7 |
| `api-health.spec.ts` | API Health Endpoints | 10 |
| `audit-logs.spec.ts` | Audit Logs Page | 6 |
| `performance.spec.ts` | Performance & A11y | 9 |
| **Tổng** | | **37** |

### 10.10. k6 Load Testing

Sử dụng [k6](https://k6.io/) để stress test hệ thống dưới tải cao.

**Cài đặt k6:**
```bash
# Ubuntu
sudo apt-get install k6
# macOS
brew install k6
```

**Chạy tests:**
```bash
# Smoke test (1 VU, 30s)
k6 run k6/load-test.js --env SCENARIO=smoke

# Load test (100 VUs, 5m)
k6 run k6/load-test.js

# Stress test (50→1000 VUs, 13m)
k6 run k6/stress-test.js

# Spike test (đầu ca sản xuất)
k6 run k6/spike-test.js
```

| Script | Kịch bản | VUs | Thời gian |
|--------|-----------|-----|----------|
| `load-test.js` | 5 scenarios (smoke/load/stress/spike/soak) | 1-1000 | 30s-30m |
| `stress-test.js` | Tìm breaking point | 50-1000 | ~13m |
| `spike-test.js` | Đột ngột tăng tải | 10-1000 | ~6m |

**Thresholds:**
- HTTP p(95) < 2000ms, Error rate < 5%
- Health p(95) < 500ms, SPC/OEE p(95) < 3000ms

### 10.11. Real-time Audit Stream

Hệ thống sử dụng **SSE (Server-Sent Events)** để stream audit logs real-time.

**Cách hoạt động:**
1. Khi có audit log mới, server tự động broadcast event `audit_log_new` qua SSE
2. Frontend lắng nghe và hiển thị real-time trên tab "Real-time" của Audit Logs
3. Toast notification xuất hiện cho mỗi sự kiện mới

**Sử dụng:**
- Truy cập trang Audit Logs
- Bấm nút "Real-time" hoặc chuyển sang tab "Real-time"
- Sự kiện mới sẽ tự động xuất hiện không cần refresh

### 10.12. WebSocket Migration

Hệ thống đã được nâng cấp từ SSE sang **WebSocket** cho real-time communication hai chiều, với SSE làm fallback.

**Kiến trúc:**
- WebSocket server tích hợp vào Express HTTP server (cùng port)
- SSE Bridge: mọi SSE event tự động được bridge sang WebSocket
- Room/Channel system: global room, user-specific rooms
- Client-side `useUnifiedRealtime` hook hỗ trợ cả WS và SSE fallback

**Client-side usage:**
```tsx
import { useUnifiedRealtime } from "@/hooks/useUnifiedRealtime";

const { isConnected, transport, latency, send, joinRoom, leaveRoom } = useUnifiedRealtime({
  events: ["audit_log_new", "spc_update"],
  onEvent: (event) => console.log(event),
  rooms: ["spc-dashboard"],
});
```

### 10.13. Automated Database Backup

Hệ thống tự động backup database hàng ngày lúc 2:00 AM (Asia/Ho_Chi_Minh) và upload lên S3.

**Cấu hình:**
- Retention policy: 30 ngày, tối đa 30 backups
- Hỗ trợ full backup và schema-only backup
- Tự động generate restore script

**API Endpoints:**
| Endpoint | Mô tả |
|---|---|
| `backup.createS3Backup` | Tạo backup thủ công và upload S3 |
| `backup.s3History` | Xem lịch sử backup |
| `backup.s3Stats` | Thống kê backup |
| `backup.generateRestoreScript` | Tạo script khôi phục |

**Khôi phục từ backup:**
```bash
# Download và restore
curl -o backup.sql "<S3_URL>"
mysql -h <host> -u <user> -p <database> < backup.sql
```

### 10.14. User Activity Heatmap

Biểu đồ heatmap trên Audit Dashboard hiển thị mật độ hoạt động theo giờ và ngày trong tuần.

**Tính năng:**
- Grid 7 ngày x 24 giờ với 5 mức màu (green scale)
- Filter theo tuần (1-12), user, action, module
- Phân bổ theo giờ (bar chart)
- Hiển thị giờ/ngày cao điểm
- Tooltip chi tiết khi hover

**API Endpoint:**
```
audit.activityHeatmap({ weeks: 4, userId?: number, action?: string, module?: string })
```

---

## 11. Troubleshooting

### 11.1. Lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `ECONNREFUSED 3306` | MySQL chưa chạy | `sudo systemctl start mysql` |
| `ER_ACCESS_DENIED` | Sai username/password MySQL | Kiểm tra DATABASE_URL trong .env |
| `ENOMEM` khi build | Thiếu RAM | Dùng `pnpm build:lowmem` |
| `EADDRINUSE 3000` | Port đã bị chiếm | Đổi PORT hoặc kill process cũ |
| `MODULE_NOT_FOUND` | Thiếu dependencies | Chạy `pnpm install` |
| Trang trắng | Build lỗi | Kiểm tra `dist/` có files không, rebuild |
| Login không được | JWT_SECRET sai | Kiểm tra JWT_SECRET trong .env |

### 11.2. Kiểm tra nhanh

```bash
# Kiểm tra process
pm2 status                    # Linux PM2
sc query SPCCalculator        # Windows Service
docker-compose ps             # Docker

# Kiểm tra port
netstat -tlnp | grep 3000     # Linux
netstat -an | findstr 3000    # Windows

# Kiểm tra MySQL
mysql -u spc_app -p -e "SELECT 1"

# Kiểm tra disk space
df -h                         # Linux
wmic logicaldisk get size,freespace,caption  # Windows

# Kiểm tra RAM
free -h                       # Linux
systeminfo | findstr Memory   # Windows
```

### 11.3. Reset ứng dụng

```bash
# Xóa cache và rebuild
rm -rf dist/ node_modules/.cache
pnpm install
pnpm build
pm2 restart spc-calculator
```

---

## 12. Cập nhật phiên bản

### 12.1. Quy trình cập nhật

```bash
# 1. Backup trước khi cập nhật
mysqldump -u spc_app -p spc_calculator > backup_before_update.sql
cp -r uploads/ uploads_backup/

# 2. Pull code mới
cd /opt/spc-calculator
git pull origin main

# 3. Cài đặt dependencies mới
pnpm install --frozen-lockfile

# 4. Build
pnpm build

# 5. Chạy migrations
pnpm db:push

# 6. Restart
pm2 restart spc-calculator

# 7. Kiểm tra
curl http://localhost:3000/
pm2 logs spc-calculator --lines 20
```

### 12.2. Rollback nếu lỗi

```bash
# Restore database
mysql -u spc_app -p spc_calculator < backup_before_update.sql

# Restore code
git checkout <previous-commit-hash>
pnpm install
pnpm build
pm2 restart spc-calculator
```

---

## Tóm tắt các lệnh quan trọng

### Linux

```bash
# Khởi động
pm2 start ecosystem.config.cjs

# Dừng
pm2 stop spc-calculator

# Restart
pm2 restart spc-calculator

# Logs
pm2 logs spc-calculator

# Build
pnpm build

# Migrations
pnpm db:push
```

### Windows

```cmd
:: Khởi động service
net start SPCCalculator

:: Dừng service
net stop SPCCalculator

:: Build
set NODE_OPTIONS=--max-old-space-size=4096
pnpm build

:: Migrations
pnpm db:push
```

### Docker

```bash
# Khởi động
docker-compose up -d

# Dừng
docker-compose down

# Logs
docker-compose logs -f app

# Rebuild
docker-compose up -d --build
```

---

## 13. CDN Deployment

Triển khai static assets lên CDN giúp giảm latency cho user ở xa server, giảm tải cho origin server, và tăng khả năng chịu tải. Dưới đây là hướng dẫn cho cả AWS CloudFront và Cloudflare.

### 13.1. AWS CloudFront

#### Bước 1: Tạo S3 Bucket cho static assets

```bash
# Tạo S3 bucket
aws s3 mb s3://spc-calculator-assets --region ap-southeast-1

# Sync build assets lên S3
aws s3 sync dist/public/assets/ s3://spc-calculator-assets/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.map"

# Sync pre-built gzip files
aws s3 sync dist/public/assets/ s3://spc-calculator-assets/assets/ \
  --include "*.gz" \
  --content-encoding gzip \
  --cache-control "public, max-age=31536000, immutable"
```

#### Bước 2: Tạo CloudFront Distribution

```bash
# Tạo CloudFront distribution với S3 origin
aws cloudfront create-distribution \
  --origin-domain-name spc-calculator-assets.s3.ap-southeast-1.amazonaws.com \
  --default-root-object index.html \
  --query 'Distribution.DomainName'
```

Cấu hình CloudFront quan trọng:

| Thiết lập | Giá trị | Mô tả |
|-----------|---------|--------|
| Price Class | PriceClass_200 | Asia + US + Europe |
| Compress Objects | Yes | Tự động gzip/brotli |
| Default TTL | 86400 (1 ngày) | Cache mặc định |
| Max TTL | 31536000 (1 năm) | Cho hashed assets |
| Viewer Protocol | Redirect HTTP to HTTPS | Bắt buộc HTTPS |
| HTTP/2 | Enabled | Tăng tốc độ |
| HTTP/3 | Enabled | QUIC protocol |

#### Bước 3: Cấu hình Cache Behaviors

Tạo 2 cache behaviors:

**Behavior 1: Hashed Assets** (`/assets/*`)
- TTL: 31536000 (1 năm, immutable)
- Compress: Yes
- Query String: None
- Cookies: None

**Behavior 2: API Requests** (`/api/*`)
- TTL: 0 (no cache)
- Forward All Headers
- Forward All Query Strings
- Forward Cookies

#### Bước 4: Cập nhật Nginx để dùng CDN

```nginx
# Thay thế static file serving bằng CDN redirect
location /assets/ {
    # Redirect tới CloudFront
    return 301 https://d1234567890.cloudfront.net$request_uri;
}
```

Hoặc cấu hình trong app bằng biến môi trường:

```bash
# .env
CDN_URL=https://d1234567890.cloudfront.net
```

#### Bước 5: Script tự động deploy lên CloudFront

```bash
#!/bin/bash
# scripts/deploy-cdn.sh
set -e

CDN_BUCKET="spc-calculator-assets"
DIST_ID="E1234567890"  # CloudFront Distribution ID

echo "=== Building production ==="
pnpm build

echo "=== Syncing assets to S3 ==="
# JS/CSS with immutable cache
aws s3 sync dist/public/assets/ s3://$CDN_BUCKET/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.map" \
  --delete

echo "=== Invalidating CloudFront cache ==="
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/assets/*" "/index.html"

echo "=== CDN deployment complete ==="
```

---

### 13.2. Cloudflare CDN

Cloudflare cung cấp CDN miễn phí với cấu hình đơn giản hơn CloudFront.

#### Bước 1: Thêm domain vào Cloudflare

1. Đăng ký tài khoản tại [dash.cloudflare.com](https://dash.cloudflare.com)
2. Thêm domain `spc.company.com`
3. Cập nhật nameservers tại nhà đăng ký domain
4. Chờ DNS propagation (tối đa 24h)

#### Bước 2: Cấu hình DNS

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | spc | IP server của bạn | Proxied (đám mây cam) |
| CNAME | www | spc.company.com | Proxied |

#### Bước 3: Cấu hình Caching Rules

Trong Cloudflare Dashboard, vào **Caching > Cache Rules**:

**Rule 1: Immutable Assets**
- Match: URI Path starts with `/assets/`
- Cache TTL: 1 year
- Browser TTL: 1 year
- Cache Level: Cache Everything

**Rule 2: No Cache API**
- Match: URI Path starts with `/api/`
- Cache Level: Bypass

#### Bước 4: Cấu hình Performance

Trong Cloudflare Dashboard:

| Thiết lập | Vị trí | Giá trị |
|-----------|--------|--------|
| Auto Minify | Speed > Optimization | JS, CSS, HTML |
| Brotli | Speed > Optimization | On |
| HTTP/2 | Network | On (mặc định) |
| HTTP/3 (QUIC) | Network | On |
| Early Hints | Speed > Optimization | On |
| Rocket Loader | Speed > Optimization | Off (xài React) |
| Polish | Speed > Optimization | Lossy (Pro plan) |
| WebP | Speed > Optimization | On (Pro plan) |

#### Bước 5: Page Rules (Optional)

```
URL: spc.company.com/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year

URL: spc.company.com/api/*
Settings:
  - Cache Level: Bypass
  - Disable Performance
```

#### Bước 6: Cloudflare Workers (Optional - Advanced)

Tạo Worker để tự động serve WebP/AVIF dựa trên Accept header:

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Only process image requests
  if (!/\.(jpg|jpeg|png|gif)$/i.test(url.pathname)) {
    return fetch(request);
  }

  const accept = request.headers.get('Accept') || '';
  let format = 'original';
  
  if (accept.includes('image/avif')) {
    format = 'avif';
  } else if (accept.includes('image/webp')) {
    format = 'webp';
  }

  if (format !== 'original') {
    const newPath = url.pathname.replace(/\.(jpg|jpeg|png|gif)$/i, `.${format}`);
    url.pathname = newPath;
    
    const response = await fetch(url.toString(), request);
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          ...Object.fromEntries(response.headers),
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=2592000',
          'Vary': 'Accept',
        }
      });
    }
  }

  return fetch(request);
}
```

---

### 13.3. So sánh CloudFront vs Cloudflare

| Tiêu chí | AWS CloudFront | Cloudflare |
|---------|---------------|------------|
| Chi phí | Trả theo lưu lượng ($0.085/GB) | Free plan khá đủ |
| SSL | ACM (miễn phí) | Universal SSL (miễn phí) |
| HTTP/2 | Có | Có |
| HTTP/3 | Có | Có |
| Brotli | Có | Có |
| Image Optimization | CloudFront Functions | Polish (Pro $20/tháng) |
| DDoS Protection | AWS Shield (Basic free) | Tích hợp sẵn |
| Độ phức tạp | Trung bình-Cao | Thấp |
| Tích hợp AWS | Xuất sắc | Không |
| Edge Locations VN | Singapore (gần) | Hà Nội, HCM |

**Khuyến nghị:**
- **Cloudflare** nếu muốn đơn giản, miễn phí, và có edge location tại Việt Nam
- **CloudFront** nếu đã dùng hệ sinh thái AWS (S3, EC2, RDS)

---

### 13.4. Image Optimization tích hợp

Hệ thống đã tích hợp sẵn image optimization:

**Server-side (Sharp):**
- Endpoint: `GET /api/image-optimize/{path}?w=800&q=80&f=webp`
- Tự động phát hiện Accept header để trả về WebP/AVIF
- Cache in-memory (100 images, TTL 1h)
- Responsive variants: thumbnail (150px), small (400px), medium (800px), large (1200px)

**Client-side (LazyImage component):**
```tsx
import { LazyImage } from '@/components/LazyImage';

// Basic lazy loading
<LazyImage src="/uploads/photo.jpg" alt="Photo" />

// With optimization
<LazyImage
  src="/uploads/photo.jpg"
  optimized
  optimizedWidth={800}
  alt="Optimized photo"
/>

// With placeholder blur-up
<LazyImage
  src="/uploads/photo.jpg"
  placeholder="data:image/jpeg;base64,..."
  alt="Photo with blur-up"
/>
```

**Build script:**
```bash
# Convert tất cả images sang WebP/AVIF
node scripts/optimize-images.mjs
```

---

> **Lưu ý:** Tài liệu này được tạo cho phiên bản hiện tại của SPC/CPK Calculator. Vui lòng kiểm tra repository để cập nhật mới nhất.
