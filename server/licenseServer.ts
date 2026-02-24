/**
 * License Server Module
 * 
 * Hệ thống quản lý License độc lập, có thể triển khai riêng hoặc tích hợp
 * Hỗ trợ cả Online và Offline activation
 */

import crypto from 'crypto';
import { getDb } from './db';
import { licenses } from '../drizzle/schema';
import { eq, and, gte, lte, isNull, or } from 'drizzle-orm';

// License types
export type LicenseType = 'trial' | 'standard' | 'professional' | 'enterprise';
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'pending';

// License features by type
export const LICENSE_FEATURES: Record<LicenseType, {
  maxUsers: number;
  maxLines: number;
  maxPlans: number;
  features: string[];
}> = {
  trial: {
    maxUsers: 5,
    maxLines: 2,
    maxPlans: 10,
    features: ['basic_analysis', 'basic_reports']
  },
  standard: {
    maxUsers: 20,
    maxLines: 10,
    maxPlans: 50,
    features: ['basic_analysis', 'basic_reports', 'export_pdf', 'export_excel']
  },
  professional: {
    maxUsers: 50,
    maxLines: 30,
    maxPlans: 200,
    features: ['basic_analysis', 'basic_reports', 'export_pdf', 'export_excel', 'advanced_analytics', 'webhooks', 'api_access']
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxLines: -1,
    maxPlans: -1,
    features: ['basic_analysis', 'basic_reports', 'export_pdf', 'export_excel', 'advanced_analytics', 'webhooks', 'api_access', 'multi_site', 'custom_branding', 'priority_support']
  }
};

// Hardware fingerprint interface
interface HardwareFingerprint {
  machineId?: string;
  hostname?: string;
  platform?: string;
  cpuCores?: number;
}

// License data interface
export interface LicenseData {
  id: number;
  licenseKey: string;
  type: LicenseType;
  status: LicenseStatus;
  companyName: string;
  contactEmail: string;
  maxUsers: number;
  maxLines: number;
  maxPlans: number;
  features: string[];
  issuedAt: Date;
  expiresAt: Date | null;
  activatedAt: Date | null;
  hardwareFingerprint: string | null;
  offlineLicenseFile: string | null;
}

// Generate a unique license key
export function generateLicenseKey(type: LicenseType): string {
  const prefix = type.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random.match(/.{1,4}/g)?.join('-')}`;
}

// Generate hardware fingerprint
export function generateHardwareFingerprint(data: HardwareFingerprint): string {
  const combined = `${data.machineId || ''}-${data.hostname || ''}-${data.platform || ''}-${data.cpuCores || ''}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
}

// Generate offline license file content
export function generateOfflineLicenseFile(license: LicenseData, hardwareFingerprint: string): string {
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
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'license-secret')
    .update(payload)
    .digest('hex');
  
  return Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
}

// Verify offline license file
export function verifyOfflineLicenseFile(licenseFileContent: string, hardwareFingerprint: string): {
  valid: boolean;
  license?: LicenseData;
  error?: string;
} {
  try {
    const decoded = JSON.parse(Buffer.from(licenseFileContent, 'base64').toString('utf-8'));
    const { payload, signature } = decoded;
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'license-secret')
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid license signature' };
    }
    
    const licenseData = JSON.parse(payload);
    
    // Verify hardware fingerprint
    if (licenseData.hardwareFingerprint !== hardwareFingerprint) {
      return { valid: false, error: 'Hardware fingerprint mismatch' };
    }
    
    // Check expiration
    if (licenseData.expiresAt && new Date(licenseData.expiresAt) < new Date()) {
      return { valid: false, error: 'License has expired' };
    }
    
    return {
      valid: true,
      license: {
        id: 0,
        licenseKey: licenseData.licenseKey,
        type: licenseData.type,
        status: 'active',
        companyName: licenseData.companyName,
        contactEmail: '',
        maxUsers: licenseData.maxUsers,
        maxLines: licenseData.maxLines,
        maxPlans: licenseData.maxPlans,
        features: licenseData.features,
        issuedAt: new Date(licenseData.issuedAt),
        expiresAt: licenseData.expiresAt ? new Date(licenseData.expiresAt) : null,
        activatedAt: new Date(),
        hardwareFingerprint: licenseData.hardwareFingerprint,
        offlineLicenseFile: null
      }
    };
  } catch (error) {
    return { valid: false, error: 'Invalid license file format' };
  }
}

// License Server class
export class LicenseServer {
  // Create a new license
  async createLicense(params: {
    type: LicenseType;
    companyName: string;
    contactEmail: string;
    durationDays?: number;
  }): Promise<LicenseData> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const licenseKey = generateLicenseKey(params.type);
    const features = LICENSE_FEATURES[params.type];
    const expiresAt = params.durationDays 
      ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000)
      : null;
    
    const [result] = await db.insert(licenses).values({
      licenseKey,
      licenseType: params.type,
      licenseStatus: 'pending',
      companyName: params.companyName,
      contactEmail: params.contactEmail,
      maxUsers: features.maxUsers,
      maxProductionLines: features.maxLines,
      maxSpcPlans: features.maxPlans,
      features: JSON.stringify(features.features),
      issuedAt: new Date(),
      expiresAt,
      activatedAt: null,
      hardwareFingerprint: null,
      offlineLicenseFile: null
    });
    
    return this.getLicenseById(result.insertId);
  }
  
  // Get license by ID
  async getLicenseById(id: number): Promise<LicenseData> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) throw new Error('License not found');
    
    return this.formatLicense(license);
  }
  
  // Get license by key
  async getLicenseByKey(licenseKey: string): Promise<LicenseData | null> {
    const db = await getDb();
    if (!db) return null;
    
    const [license] = await db.select().from(licenses).where(eq(licenses.licenseKey, licenseKey));
    if (!license) return null;
    
    return this.formatLicense(license);
  }
  
  // Online activation
  async activateOnline(licenseKey: string, hardwareFingerprint: string): Promise<{
    success: boolean;
    license?: LicenseData;
    error?: string;
  }> {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };
    
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { success: false, error: 'License not found' };
    }
    
    if (license.status === 'revoked') {
      return { success: false, error: 'License has been revoked' };
    }
    
    if (license.status === 'expired' || (license.expiresAt && license.expiresAt < new Date())) {
      return { success: false, error: 'License has expired' };
    }
    
    // Check if already activated on different hardware
    if (license.hardwareFingerprint && license.hardwareFingerprint !== hardwareFingerprint) {
      return { success: false, error: 'License is already activated on another machine' };
    }
    
    // Activate
    await db.update(licenses)
      .set({
        licenseStatus: 'active',
        activatedAt: new Date(),
        hardwareFingerprint
      })
      .where(eq(licenses.licenseKey, licenseKey));
    
    const updatedLicense = await this.getLicenseByKey(licenseKey);
    return { success: true, license: updatedLicense! };
  }
  
  // Generate offline license file
  async generateOfflineFile(licenseKey: string, hardwareFingerprint: string): Promise<{
    success: boolean;
    fileContent?: string;
    error?: string;
  }> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { success: false, error: 'License not found' };
    }
    
    if (license.status === 'revoked') {
      return { success: false, error: 'License has been revoked' };
    }
    
    const fileContent = generateOfflineLicenseFile(license, hardwareFingerprint);
    
    // Save offline file to database
    const db = await getDb();
    if (db) {
      await db.update(licenses)
        .set({
          offlineLicenseFile: fileContent,
          hardwareFingerprint
        })
        .where(eq(licenses.licenseKey, licenseKey));
    }
    
    return { success: true, fileContent };
  }
  
  // Offline activation
  async activateOffline(licenseFileContent: string, hardwareFingerprint: string): Promise<{
    success: boolean;
    license?: LicenseData;
    error?: string;
  }> {
    const result = verifyOfflineLicenseFile(licenseFileContent, hardwareFingerprint);
    
    if (!result.valid) {
      return { success: false, error: result.error };
    }
    
    // Try to sync with database if available
    const db = await getDb();
    if (db && result.license) {
      const existingLicense = await this.getLicenseByKey(result.license.licenseKey);
      if (existingLicense) {
          await db.update(licenses)
          .set({
            licenseStatus: 'active',
            activatedAt: new Date(),
            hardwareFingerprint
          })
          .where(eq(licenses.licenseKey, result.license.licenseKey));
      }
    }
    
    return { success: true, license: result.license };
  }
  
  // Validate license
  async validateLicense(licenseKey: string, hardwareFingerprint?: string): Promise<{
    valid: boolean;
    license?: LicenseData;
    error?: string;
  }> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { valid: false, error: 'License not found' };
    }
    
    if (license.status === 'revoked') {
      return { valid: false, error: 'License has been revoked' };
    }
    
    if (license.status === 'expired' || (license.expiresAt && license.expiresAt < new Date())) {
      return { valid: false, error: 'License has expired' };
    }
    
    if (hardwareFingerprint && license.hardwareFingerprint && license.hardwareFingerprint !== hardwareFingerprint) {
      return { valid: false, error: 'Hardware fingerprint mismatch' };
    }
    
    return { valid: true, license };
  }
  
  // Revoke license
  async revokeLicense(licenseKey: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    
    await db.update(licenses)
      .set({ licenseStatus: 'revoked' })
      .where(eq(licenses.licenseKey, licenseKey));
    
    return true;
  }
  
  // List all licenses
  async listLicenses(filters?: {
    type?: LicenseType;
    status?: LicenseStatus;
    companyName?: string;
  }): Promise<LicenseData[]> {
    const db = await getDb();
    if (!db) return [];
    
    let query = db.select().from(licenses);
    
    const conditions = [];
    if (filters?.type) {
      conditions.push(eq(licenses.licenseType, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(licenses.licenseStatus, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    const results = await query;
    return results.map(l => this.formatLicense(l));
  }
  
  // Get license statistics
  async getStatistics(): Promise<{
    total: number;
    byType: Record<LicenseType, number>;
    byStatus: Record<LicenseStatus, number>;
    expiringIn30Days: number;
  }> {
    const allLicenses = await this.listLicenses();
    
    const byType: Record<LicenseType, number> = {
      trial: 0,
      standard: 0,
      professional: 0,
      enterprise: 0
    };
    
    const byStatus: Record<LicenseStatus, number> = {
      active: 0,
      expired: 0,
      revoked: 0,
      pending: 0
    };
    
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let expiringIn30Days = 0;
    
    for (const license of allLicenses) {
      byType[license.type]++;
      byStatus[license.status]++;
      
      if (license.expiresAt && license.expiresAt <= thirtyDaysFromNow && license.expiresAt > new Date()) {
        expiringIn30Days++;
      }
    }
    
    return {
      total: allLicenses.length,
      byType,
      byStatus,
      expiringIn30Days
    };
  }
  
  // Format license from database
  private formatLicense(license: any): LicenseData {
    return {
      id: license.id,
      licenseKey: license.licenseKey,
      type: license.licenseType as LicenseType,
      status: license.licenseStatus as LicenseStatus,
      companyName: license.companyName || '',
      contactEmail: license.contactEmail || '',
      maxUsers: license.maxUsers,
      maxLines: license.maxProductionLines,
      maxPlans: license.maxSpcPlans,
      features: typeof license.features === 'string' ? JSON.parse(license.features || '[]') : (license.features || []),
      issuedAt: new Date(license.issuedAt),
      expiresAt: license.expiresAt ? new Date(license.expiresAt) : null,
      activatedAt: license.activatedAt ? new Date(license.activatedAt) : null,
      hardwareFingerprint: license.hardwareFingerprint,
      offlineLicenseFile: license.offlineLicenseFile
    };
  }
}

// Export singleton instance
export const licenseServer = new LicenseServer();
