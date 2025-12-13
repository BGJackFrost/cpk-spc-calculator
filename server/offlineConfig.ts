/**
 * Offline Mode Configuration
 * 
 * This file manages the offline mode settings for the SPC/CPK Calculator.
 * When deployed at customer sites without internet access, these settings
 * control which features are available and how they behave.
 */

import { ENV } from "./_core/env";
import * as fs from "fs";
import * as path from "path";

export interface OfflineConfig {
  // Authentication mode: "manus" for Manus OAuth, "local" for local authentication
  authMode: "manus" | "local";
  
  // Storage mode: "s3" for cloud storage, "local" for local file storage
  storageMode: "s3" | "local";
  
  // LLM mode: "cloud" for cloud LLM, "disabled" for no LLM, "local" for local model (future)
  llmMode: "cloud" | "disabled" | "local";
  
  // Local storage path (when storageMode is "local")
  localStoragePath: string;
  
  // Whether to enable webhook functionality
  webhooksEnabled: boolean;
  
  // Whether to enable real-time SSE notifications
  sseEnabled: boolean;
  
  // Whether to enable license checking
  licenseCheckEnabled: boolean;
}

// Default offline configuration
const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  authMode: "local",
  storageMode: "local",
  llmMode: "disabled",
  localStoragePath: "./uploads",
  webhooksEnabled: true,
  sseEnabled: true,
  licenseCheckEnabled: false,
};

// Default online configuration
const DEFAULT_ONLINE_CONFIG: OfflineConfig = {
  authMode: "manus",
  storageMode: "s3",
  llmMode: "cloud",
  localStoragePath: "./uploads",
  webhooksEnabled: true,
  sseEnabled: true,
  licenseCheckEnabled: true,
};

let cachedConfig: OfflineConfig | null = null;

/**
 * Get the current offline configuration
 */
export function getOfflineConfig(): OfflineConfig {
  if (cachedConfig) return cachedConfig;
  
  // Check environment variable first
  const isOfflineMode = process.env.OFFLINE_MODE === "true";
  
  if (isOfflineMode) {
    cachedConfig = {
      ...DEFAULT_OFFLINE_CONFIG,
      authMode: (process.env.AUTH_MODE as "manus" | "local") || "local",
      storageMode: (process.env.STORAGE_MODE as "s3" | "local") || "local",
      llmMode: (process.env.LLM_MODE as "cloud" | "disabled" | "local") || "disabled",
      localStoragePath: process.env.LOCAL_STORAGE_PATH || "./uploads",
      webhooksEnabled: process.env.WEBHOOKS_ENABLED !== "false",
      sseEnabled: process.env.SSE_ENABLED !== "false",
      licenseCheckEnabled: process.env.LICENSE_CHECK_ENABLED === "true",
    };
  } else {
    cachedConfig = {
      ...DEFAULT_ONLINE_CONFIG,
      authMode: (ENV.authMode as "manus" | "local") || "manus",
    };
  }
  
  return cachedConfig;
}

/**
 * Check if the system is in offline mode
 */
export function isOfflineMode(): boolean {
  return process.env.OFFLINE_MODE === "true";
}

/**
 * Check if LLM features are available
 */
export function isLlmAvailable(): boolean {
  const config = getOfflineConfig();
  return config.llmMode === "cloud" && !!ENV.forgeApiUrl && !!ENV.forgeApiKey;
}

/**
 * Check if S3 storage is available
 */
export function isS3Available(): boolean {
  const config = getOfflineConfig();
  return config.storageMode === "s3" && !!ENV.forgeApiUrl && !!ENV.forgeApiKey;
}

/**
 * Check if Manus OAuth is available
 */
export function isManusAuthAvailable(): boolean {
  const config = getOfflineConfig();
  return config.authMode === "manus" && !!ENV.oAuthServerUrl;
}

/**
 * Get local storage path for file uploads
 */
export function getLocalStoragePath(): string {
  const config = getOfflineConfig();
  const storagePath = config.localStoragePath;
  
  // Ensure directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  
  return storagePath;
}

/**
 * Save file to local storage (when S3 is not available)
 */
export async function saveToLocalStorage(
  filename: string,
  data: Buffer | string,
  subfolder?: string
): Promise<{ path: string; url: string }> {
  const basePath = getLocalStoragePath();
  const targetDir = subfolder ? path.join(basePath, subfolder) : basePath;
  
  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, data);
  
  // Return relative URL for local access
  const relativeUrl = `/uploads/${subfolder ? subfolder + "/" : ""}${filename}`;
  
  return {
    path: filePath,
    url: relativeUrl,
  };
}

/**
 * Read file from local storage
 */
export async function readFromLocalStorage(relativePath: string): Promise<Buffer | null> {
  const basePath = getLocalStoragePath();
  const filePath = path.join(basePath, relativePath);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return fs.readFileSync(filePath);
}

/**
 * Generate offline deployment documentation
 */
export function getOfflineDeploymentGuide(): string {
  return `
# Hướng dẫn Triển khai Offline - SPC/CPK Calculator

## Yêu cầu hệ thống
- Node.js 18+ 
- MySQL 8.0+ hoặc MariaDB 10.5+
- 4GB RAM tối thiểu
- 10GB dung lượng ổ cứng

## Các biến môi trường cần cấu hình

### Bắt buộc
\`\`\`env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/spc_calculator

# Chế độ offline
OFFLINE_MODE=true

# Authentication
AUTH_MODE=local
JWT_SECRET=your-secret-key-at-least-32-characters

# Port
PORT=3000
\`\`\`

### Tùy chọn
\`\`\`env
# Storage (mặc định: local)
STORAGE_MODE=local
LOCAL_STORAGE_PATH=./uploads

# LLM (mặc định: disabled trong offline mode)
LLM_MODE=disabled

# Webhooks (mặc định: enabled)
WEBHOOKS_ENABLED=true

# SSE Notifications (mặc định: enabled)
SSE_ENABLED=true

# License check (mặc định: disabled trong offline mode)
LICENSE_CHECK_ENABLED=false
\`\`\`

## Các bước triển khai

1. **Cài đặt dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Cấu hình database**
   - Tạo database MySQL
   - Cập nhật DATABASE_URL trong .env

3. **Chạy migrations**
   \`\`\`bash
   pnpm db:push
   \`\`\`

4. **Khởi tạo admin mặc định**
   - Truy cập /local-login
   - Tài khoản mặc định: admin / admin123
   - Đổi mật khẩu ngay sau khi đăng nhập

5. **Khởi động server**
   \`\`\`bash
   pnpm start
   \`\`\`

## Các tính năng bị giới hạn trong Offline Mode

| Tính năng | Online | Offline |
|-----------|--------|---------|
| Đăng nhập Manus OAuth | ✅ | ❌ |
| Đăng nhập Local | ✅ | ✅ |
| Phân tích SPC/CPK | ✅ | ✅ |
| Xuất PDF/Excel | ✅ | ✅ |
| Lưu trữ S3 | ✅ | ❌ (local) |
| Phân tích AI (LLM) | ✅ | ❌ |
| Webhooks | ✅ | ✅ |
| Email notifications | ✅ | ✅ (cần SMTP) |

## Cấu hình SMTP cho Email

\`\`\`env
# Thêm vào .env nếu cần gửi email
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@company.com
SMTP_PASS=password
SMTP_FROM_EMAIL=spc@company.com
SMTP_FROM_NAME=SPC Calculator
\`\`\`

## Hỗ trợ

Liên hệ đội ngũ kỹ thuật để được hỗ trợ triển khai.
`;
}
