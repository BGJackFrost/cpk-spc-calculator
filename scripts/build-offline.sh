#!/bin/bash

# ============================================
# SPC/CPK Calculator - Offline Package Builder
# ============================================
# Script này đóng gói toàn bộ ứng dụng thành file zip
# để triển khai offline tại khách hàng
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SPC/CPK Calculator Offline Builder    ${NC}"
echo -e "${GREEN}========================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/offline-build"
PACKAGE_NAME="spc-cpk-calculator-offline"
VERSION=$(date +%Y%m%d-%H%M%S)

echo -e "\n${YELLOW}[1/7] Cleaning previous builds...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/$PACKAGE_NAME"

echo -e "${YELLOW}[2/7] Building frontend...${NC}"
cd "$PROJECT_DIR"
pnpm build

echo -e "${YELLOW}[3/7] Copying source files...${NC}"
# Copy essential directories
cp -r "$PROJECT_DIR/server" "$BUILD_DIR/$PACKAGE_NAME/"
cp -r "$PROJECT_DIR/drizzle" "$BUILD_DIR/$PACKAGE_NAME/"
cp -r "$PROJECT_DIR/shared" "$BUILD_DIR/$PACKAGE_NAME/"
cp -r "$PROJECT_DIR/storage" "$BUILD_DIR/$PACKAGE_NAME/"
cp -r "$PROJECT_DIR/dist" "$BUILD_DIR/$PACKAGE_NAME/"

# Copy config files
cp "$PROJECT_DIR/package.json" "$BUILD_DIR/$PACKAGE_NAME/"
cp "$PROJECT_DIR/pnpm-lock.yaml" "$BUILD_DIR/$PACKAGE_NAME/" 2>/dev/null || true
cp "$PROJECT_DIR/tsconfig.json" "$BUILD_DIR/$PACKAGE_NAME/"
cp "$PROJECT_DIR/drizzle.config.ts" "$BUILD_DIR/$PACKAGE_NAME/"

echo -e "${YELLOW}[4/7] Creating environment template...${NC}"
cat > "$BUILD_DIR/$PACKAGE_NAME/.env.example" << 'EOF'
# ============================================
# SPC/CPK Calculator - Environment Variables
# ============================================
# Copy this file to .env and configure values

# Database Configuration (Required)
DATABASE_URL=mysql://user:password@localhost:3306/spc_cpk_db

# Server Configuration
PORT=3000
NODE_ENV=production

# Offline Mode Settings
OFFLINE_MODE=true
AUTH_MODE=local
STORAGE_MODE=local

# JWT Secret for Local Auth (Required - generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# SMTP Configuration (Optional - for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com

# Local Storage Path (for offline file storage)
LOCAL_STORAGE_PATH=./uploads
EOF

echo -e "${YELLOW}[5/7] Creating Docker configuration...${NC}"
cat > "$BUILD_DIR/$PACKAGE_NAME/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OFFLINE_MODE=true
      - AUTH_MODE=local
      - STORAGE_MODE=local
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - ./local-storage:/app/local-storage
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: spc_cpk_db
      MYSQL_USER: ${DB_USER:-spcuser}
      MYSQL_PASSWORD: ${DB_PASSWORD:-spcpassword}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

volumes:
  mysql_data:
EOF

cat > "$BUILD_DIR/$PACKAGE_NAME/Dockerfile" << 'EOF'
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source files
COPY . .

# Create uploads directory
RUN mkdir -p uploads local-storage

# Expose port
EXPOSE 3000

# Start command
CMD ["pnpm", "start"]
EOF

echo -e "${YELLOW}[6/7] Creating README...${NC}"
cat > "$BUILD_DIR/$PACKAGE_NAME/README-OFFLINE.md" << 'EOF'
# SPC/CPK Calculator - Hướng dẫn Triển khai Offline

## Yêu cầu hệ thống

- Node.js 18+ hoặc Docker
- MySQL 8.0+
- 2GB RAM tối thiểu
- 10GB dung lượng ổ cứng

## Cách 1: Triển khai với Docker (Khuyến nghị)

### Bước 1: Cấu hình môi trường
```bash
cp .env.example .env
# Chỉnh sửa file .env với thông tin phù hợp
```

### Bước 2: Khởi động ứng dụng
```bash
docker-compose up -d
```

### Bước 3: Truy cập ứng dụng
Mở trình duyệt và truy cập: http://localhost:3000

### Tài khoản mặc định
- Username: admin
- Password: admin123
- **Lưu ý**: Đổi mật khẩu ngay sau khi đăng nhập lần đầu!

## Cách 2: Triển khai thủ công

### Bước 1: Cài đặt dependencies
```bash
npm install -g pnpm
pnpm install
```

### Bước 2: Cấu hình database
```bash
# Tạo database MySQL
mysql -u root -p -e "CREATE DATABASE spc_cpk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Cấu hình .env
cp .env.example .env
# Chỉnh sửa DATABASE_URL trong .env
```

### Bước 3: Chạy migrations
```bash
pnpm db:push
```

### Bước 4: Khởi động ứng dụng
```bash
pnpm start
```

## Cấu hình SMTP (Tùy chọn)

Để gửi email thông báo, cấu hình các biến sau trong .env:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com
```

## Backup dữ liệu

### Backup database
```bash
docker exec spc-cpk-db mysqldump -u root -p spc_cpk_db > backup.sql
```

### Restore database
```bash
docker exec -i spc-cpk-db mysql -u root -p spc_cpk_db < backup.sql
```

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra DATABASE_URL trong .env
- Đảm bảo MySQL đang chạy
- Kiểm tra firewall

### Lỗi đăng nhập
- Sử dụng tài khoản admin/admin123
- Nhấn "Khởi tạo Admin" trong trang Quản lý Người dùng Local

### Liên hệ hỗ trợ
Email: support@yourcompany.com
EOF

echo -e "${YELLOW}[7/7] Creating zip package...${NC}"
cd "$BUILD_DIR"
zip -r "${PACKAGE_NAME}-${VERSION}.zip" "$PACKAGE_NAME"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Build completed successfully!         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nPackage location: ${BUILD_DIR}/${PACKAGE_NAME}-${VERSION}.zip"
echo -e "Package size: $(du -h "${PACKAGE_NAME}-${VERSION}.zip" | cut -f1)"
