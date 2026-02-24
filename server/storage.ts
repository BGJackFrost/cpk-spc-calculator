// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)
// With fallback to local file storage for offline mode

import { ENV } from './_core/env';
import * as fs from 'fs';
import * as path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

// Check if S3 storage is available
export function isS3StorageAvailable(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey) && process.env.STORAGE_MODE !== 'local';
}

// Get local storage path
function getLocalStoragePath(): string {
  const storagePath = process.env.LOCAL_STORAGE_PATH || './uploads';
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  return storagePath;
}

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

/**
 * Upload file to storage (S3 or local fallback)
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Check if S3 is available, otherwise use local storage
  if (!isS3StorageAvailable()) {
    return storagePutLocal(relKey, data, contentType);
  }
  
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

/**
 * Get file URL from storage (S3 or local fallback)
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  // Check if S3 is available, otherwise use local storage
  if (!isS3StorageAvailable()) {
    return storageGetLocal(relKey);
  }
  
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

/**
 * Upload file to local storage (offline mode)
 */
export async function storagePutLocal(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const basePath = getLocalStoragePath();
  const key = normalizeKey(relKey);
  const filePath = path.join(basePath, key);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Convert data to Buffer if needed
  let buffer: Buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data, 'utf-8');
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else {
    buffer = data;
  }
  
  fs.writeFileSync(filePath, buffer);
  
  // Return URL for local access
  const url = `/uploads/${key}`;
  console.log(`[LocalStorage] Saved file to: ${filePath}, URL: ${url}`);
  
  return { key, url };
}

/**
 * Get file URL from local storage (offline mode)
 */
export async function storageGetLocal(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  const url = `/uploads/${key}`;
  return { key, url };
}
