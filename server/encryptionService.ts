import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment or generate a default one
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) {
    console.warn("Warning: No ENCRYPTION_KEY set, using fallback key. Set ENCRYPTION_KEY in production!");
    return "default-encryption-key-change-in-production";
  }
  return key;
}

// Derive a key from password using PBKDF2
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns a base64 encoded string containing: salt + iv + authTag + encryptedData
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(getEncryptionKey(), salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt + iv + authTag + encrypted data
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";
  
  try {
    const combined = Buffer.from(encryptedData, "base64");
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = deriveKey(getEncryptionKey(), salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Check if a string is encrypted (base64 encoded with correct length)
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  
  try {
    const decoded = Buffer.from(data, "base64");
    // Minimum length: salt(32) + iv(16) + authTag(16) + at least 1 byte of data
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Hash sensitive data (one-way, for comparison)
 */
export function hashData(data: string): string {
  if (!data) return "";
  
  const salt = getEncryptionKey();
  return crypto.createHmac("sha256", salt).update(data).digest("hex");
}

/**
 * Mask sensitive data for display (e.g., API keys)
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data) return "";
  if (data.length <= visibleChars * 2) return "****";
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const masked = "*".repeat(Math.min(data.length - visibleChars * 2, 8));
  
  return `${start}${masked}${end}`;
}

/**
 * Encrypt object fields that contain sensitive data
 */
export function encryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === "string" && value && !isEncrypted(value)) {
      result[field] = encrypt(value) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Decrypt object fields that contain encrypted data
 */
export function decryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    const value = result[field];
    if (typeof value === "string" && value && isEncrypted(value)) {
      try {
        result[field] = decrypt(value) as T[keyof T];
      } catch {
        // Keep original value if decryption fails
        console.warn(`Failed to decrypt field: ${String(field)}`);
      }
    }
  }
  
  return result;
}

// List of fields that should be encrypted in various tables
export const SENSITIVE_FIELDS = {
  databaseConnections: ["connectionString", "password", "apiKey"],
  systemConfig: ["smtpPassword", "apiSecret", "webhookSecret"],
  webhooks: ["secretKey"],
  apiKeys: ["key", "secret"],
} as const;
