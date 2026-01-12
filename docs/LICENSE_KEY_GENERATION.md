# License Key Generation - Nguyên tắc và Công thức

## Tổng quan

Tài liệu này mô tả nguyên tắc và công thức tạo License Key cho hệ thống CPK/SPC Calculator. Thông tin này được lưu lại để xây dựng ứng dụng quản lý License riêng biệt.

## Cấu trúc License Key

### Format

```
{PREFIX}-{TIMESTAMP}-{RANDOM_PART1}-{RANDOM_PART2}-{RANDOM_PART3}
```

### Ví dụ

- Trial: `TRI-LK5M2X-A1B2-C3D4-E5F6`
- Standard: `STA-LK5M2X-A1B2-C3D4-E5F6`
- Professional: `PRO-LK5M2X-A1B2-C3D4-E5F6`
- Enterprise: `ENT-LK5M2X-A1B2-C3D4-E5F6`

## Thuật toán tạo License Key

```typescript
import crypto from 'crypto';

export type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';

export function generateLicenseKey(type: LicenseType): string {
  // Lấy 3 ký tự đầu của loại license và chuyển thành chữ hoa
  const prefix = type.substring(0, 3).toUpperCase();
  
  // Tạo timestamp dạng base36 và chuyển thành chữ hoa
  const timestamp = Date.now().toString(36).toUpperCase();
  
  // Tạo 8 bytes ngẫu nhiên và chuyển thành hex
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  
  // Chia random thành các phần 4 ký tự và nối bằng dấu gạch ngang
  return `${prefix}-${timestamp}-${random.match(/.{1,4}/g)?.join('-')}`;
}
```

## Loại License và Giới hạn

### Trial (Dùng thử)

```typescript
{
  maxUsers: 5,
  maxLines: 2,
  maxPlans: 10,
  features: ['basic_analysis', 'basic_reports']
}
```

### Standard

```typescript
{
  maxUsers: 20,
  maxLines: 10,
  maxPlans: 50,
  features: ['basic_analysis', 'basic_reports', 'export_pdf', 'export_excel']
}
```

### Professional

```typescript
{
  maxUsers: 50,
  maxLines: 30,
  maxPlans: 200,
  features: [
    'basic_analysis', 'basic_reports', 'export_pdf', 'export_excel',
    'advanced_analytics', 'webhooks', 'api_access'
  ]
}
```

### Enterprise

```typescript
{
  maxUsers: -1, // Không giới hạn
  maxLines: -1,
  maxPlans: -1,
  features: [
    'basic_analysis', 'basic_reports', 'export_pdf', 'export_excel',
    'advanced_analytics', 'webhooks', 'api_access', 'multi_site',
    'custom_branding', 'priority_support'
  ]
}
```

## Hardware Fingerprint

### Thuật toán tạo Hardware Fingerprint

```typescript
export function generateHardwareFingerprint(data: {
  machineId?: string;
  hostname?: string;
  platform?: string;
  cpuCores?: number;
}): string {
  const combined = `${data.machineId || ''}-${data.hostname || ''}-${data.platform || ''}-${data.cpuCores || ''}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
}
```

### Browser Fingerprint (Client-side)

```typescript
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
}
```

## Offline License File

### Cấu trúc

```typescript
interface OfflineLicensePayload {
  licenseKey: string;
  type: LicenseType;
  companyName: string;
  maxUsers: number;
  maxLines: number;
  maxPlans: number;
  features: string[];
  issuedAt: string; // ISO 8601
  expiresAt: string | null; // ISO 8601 hoặc null nếu không giới hạn
  hardwareFingerprint: string;
  generatedAt: string; // ISO 8601
}
```

### Thuật toán tạo Offline License File

```typescript
export function generateOfflineLicenseFile(
  license: LicenseData,
  hardwareFingerprint: string
): string {
  const licensePayload = {
    licenseKey: license.licenseKey,
    type: license.type,
    companyName: license.companyName,
    maxUsers: license.maxUsers,
    maxLines: license.maxLines,
    maxPlans: license.maxPlans,
    features: license.features,
    issuedAt: license.issuedAt.toISOString(),
    expiresAt: license.expiresAt?.toISOString() || null,
    hardwareFingerprint,
    generatedAt: new Date().toISOString()
  };
  
  const payload = JSON.stringify(licensePayload);
  
  // Tạo chữ ký HMAC-SHA256
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'license-secret')
    .update(payload)
    .digest('hex');
  
  // Encode base64
  return Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
}
```

### Thuật toán xác thực Offline License File

```typescript
export function verifyOfflineLicenseFile(
  licenseFileContent: string,
  hardwareFingerprint: string
): { valid: boolean; license?: LicenseData; error?: string } {
  try {
    // Decode base64
    const decoded = JSON.parse(
      Buffer.from(licenseFileContent, 'base64').toString('utf-8')
    );
    const { payload, signature } = decoded;
    
    // Xác thực chữ ký
    const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'license-secret')
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid license signature' };
    }
    
    const licenseData = JSON.parse(payload);
    
    // Xác thực hardware fingerprint
    if (licenseData.hardwareFingerprint !== hardwareFingerprint) {
      return { valid: false, error: 'Hardware fingerprint mismatch' };
    }
    
    // Kiểm tra hết hạn
    if (licenseData.expiresAt && new Date(licenseData.expiresAt) < new Date()) {
      return { valid: false, error: 'License has expired' };
    }
    
    return { valid: true, license: licenseData };
  } catch (error) {
    return { valid: false, error: 'Invalid license file format' };
  }
}
```

## Hybrid Activation Flow

### Online Activation

1. Client gửi `licenseKey` và `hardwareFingerprint` đến server
2. Server xác thực license key trong database
3. Kiểm tra license chưa bị revoke và chưa hết hạn
4. Kiểm tra hardware fingerprint (nếu đã kích hoạt trên máy khác thì từ chối)
5. Cập nhật trạng thái license thành `active` và lưu hardware fingerprint
6. Trả về thông tin license

### Offline Activation

1. Client tạo hardware fingerprint
2. Admin tạo offline license file từ License Server với hardware fingerprint
3. Client upload offline license file
4. Hệ thống xác thực chữ ký và hardware fingerprint
5. Nếu hợp lệ, kích hoạt license

## Database Schema

```sql
CREATE TABLE licenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  license_key VARCHAR(64) UNIQUE NOT NULL,
  license_type ENUM('trial', 'standard', 'professional', 'enterprise') NOT NULL,
  license_status ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending',
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  max_users INT DEFAULT 5,
  max_production_lines INT DEFAULT 2,
  max_spc_plans INT DEFAULT 10,
  features JSON,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  activated_at TIMESTAMP NULL,
  hardware_fingerprint VARCHAR(64) NULL,
  offline_license_file TEXT NULL,
  is_active TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Bảo mật

1. **JWT_SECRET**: Sử dụng cho HMAC signature, phải được bảo mật
2. **Hardware Fingerprint**: Ràng buộc license với máy cụ thể
3. **Offline License**: Chứa signature để ngăn chặn giả mạo
4. **Heartbeat**: Kiểm tra định kỳ với license server (cho online mode)

## Lưu ý khi xây dựng ứng dụng License Server riêng

1. Tách biệt database license khỏi database ứng dụng chính
2. Sử dụng HTTPS cho tất cả API calls
3. Implement rate limiting để ngăn brute force
4. Log tất cả các hoạt động kích hoạt/xác thực
5. Hỗ trợ cả online và offline activation
6. Implement grace period khi license hết hạn
7. Gửi email thông báo trước khi license hết hạn
