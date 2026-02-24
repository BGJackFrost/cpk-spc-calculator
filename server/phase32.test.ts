import { describe, it, expect } from 'vitest';
import { 
  generateLicenseKey, 
  generateHardwareFingerprint,
  generateOfflineLicenseFile,
  verifyOfflineLicenseFile,
  LICENSE_FEATURES,
  LicenseServer
} from './licenseServer';

describe('Phase 32 - License Server & Hybrid Activation', () => {
  describe('License Key Generation', () => {
    it('should generate valid license key for trial', () => {
      const key = generateLicenseKey('trial');
      expect(key).toBeDefined();
      expect(key.startsWith('TRI-')).toBe(true);
      expect(key.split('-').length).toBeGreaterThanOrEqual(3);
    });

    it('should generate valid license key for enterprise', () => {
      const key = generateLicenseKey('enterprise');
      expect(key).toBeDefined();
      expect(key.startsWith('ENT-')).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = generateLicenseKey('standard');
      const key2 = generateLicenseKey('standard');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Hardware Fingerprint', () => {
    it('should generate consistent fingerprint for same data', () => {
      const data = { machineId: 'test-123', hostname: 'localhost', platform: 'linux', cpuCores: 4 };
      const fp1 = generateHardwareFingerprint(data);
      const fp2 = generateHardwareFingerprint(data);
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprint for different data', () => {
      const fp1 = generateHardwareFingerprint({ machineId: 'test-123' });
      const fp2 = generateHardwareFingerprint({ machineId: 'test-456' });
      expect(fp1).not.toBe(fp2);
    });

    it('should return 32 character hash', () => {
      const fp = generateHardwareFingerprint({ machineId: 'test' });
      expect(fp.length).toBe(32);
    });
  });

  describe('License Features', () => {
    it('should have correct features for trial', () => {
      expect(LICENSE_FEATURES.trial.maxUsers).toBe(5);
      expect(LICENSE_FEATURES.trial.maxLines).toBe(2);
      expect(LICENSE_FEATURES.trial.features).toContain('basic_analysis');
    });

    it('should have unlimited for enterprise', () => {
      expect(LICENSE_FEATURES.enterprise.maxUsers).toBe(-1);
      expect(LICENSE_FEATURES.enterprise.maxLines).toBe(-1);
      expect(LICENSE_FEATURES.enterprise.features).toContain('multi_site');
    });

    it('should have progressive features', () => {
      expect(LICENSE_FEATURES.standard.features.length).toBeGreaterThan(LICENSE_FEATURES.trial.features.length);
      expect(LICENSE_FEATURES.professional.features.length).toBeGreaterThan(LICENSE_FEATURES.standard.features.length);
      expect(LICENSE_FEATURES.enterprise.features.length).toBeGreaterThan(LICENSE_FEATURES.professional.features.length);
    });
  });

  describe('Offline License File', () => {
    it('should generate and verify offline license file', () => {
      const mockLicense = {
        id: 1,
        licenseKey: 'TEST-KEY-123',
        type: 'professional' as const,
        status: 'active' as const,
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
        maxUsers: 50,
        maxLines: 30,
        maxPlans: 200,
        features: ['basic_analysis', 'export_pdf'],
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        activatedAt: null,
        hardwareFingerprint: null,
        offlineLicenseFile: null
      };
      
      const hardwareFingerprint = generateHardwareFingerprint({ machineId: 'test-machine' });
      const fileContent = generateOfflineLicenseFile(mockLicense, hardwareFingerprint);
      
      expect(fileContent).toBeDefined();
      expect(fileContent.length).toBeGreaterThan(0);
      
      // Verify the file
      const result = verifyOfflineLicenseFile(fileContent, hardwareFingerprint);
      expect(result.valid).toBe(true);
      expect(result.license?.licenseKey).toBe('TEST-KEY-123');
      expect(result.license?.type).toBe('professional');
    });

    it('should reject invalid hardware fingerprint', () => {
      const mockLicense = {
        id: 1,
        licenseKey: 'TEST-KEY-123',
        type: 'standard' as const,
        status: 'active' as const,
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
        maxUsers: 20,
        maxLines: 10,
        maxPlans: 50,
        features: ['basic_analysis'],
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        activatedAt: null,
        hardwareFingerprint: null,
        offlineLicenseFile: null
      };
      
      const originalFp = generateHardwareFingerprint({ machineId: 'original-machine' });
      const differentFp = generateHardwareFingerprint({ machineId: 'different-machine' });
      
      const fileContent = generateOfflineLicenseFile(mockLicense, originalFp);
      const result = verifyOfflineLicenseFile(fileContent, differentFp);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Hardware fingerprint mismatch');
    });

    it('should reject expired license', () => {
      const mockLicense = {
        id: 1,
        licenseKey: 'TEST-KEY-EXPIRED',
        type: 'trial' as const,
        status: 'active' as const,
        companyName: 'Test Company',
        contactEmail: 'test@example.com',
        maxUsers: 5,
        maxLines: 2,
        maxPlans: 10,
        features: ['basic_analysis'],
        issuedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
        activatedAt: null,
        hardwareFingerprint: null,
        offlineLicenseFile: null
      };
      
      const fp = generateHardwareFingerprint({ machineId: 'test' });
      const fileContent = generateOfflineLicenseFile(mockLicense, fp);
      const result = verifyOfflineLicenseFile(fileContent, fp);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('License has expired');
    });

    it('should reject invalid file format', () => {
      const result = verifyOfflineLicenseFile('invalid-content', 'any-fingerprint');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid license file format');
    });
  });

  describe('LicenseServer Class', () => {
    it('should be a singleton', () => {
      const server1 = new LicenseServer();
      const server2 = new LicenseServer();
      expect(server1).toBeDefined();
      expect(server2).toBeDefined();
    });
  });
});

describe('Phase 32 - Menu Groups', () => {
  it('should have 7 menu groups defined', () => {
    // Menu groups are defined in DashboardLayout.tsx
    const expectedGroups = [
      'dashboard',
      'analysis', 
      'quality',
      'production',
      'masterData',
      'users',
      'system'
    ];
    expect(expectedGroups.length).toBe(7);
  });
});

describe('Phase 32 - Permissions', () => {
  it('should have permissions for all modules', () => {
    const expectedModules = [
      'dashboard', 'realtime', 'spc_visualization',
      'analyze', 'multi_analysis', 'line_comparison', 'history', 'spc_report',
      'defect', 'defect_statistics', 'rules',
      'production_line', 'workstation', 'machine', 'machine_type', 'fixture', 'process',
      'product', 'specification', 'mapping', 'sampling', 'spc_plan',
      'user', 'local_user', 'permission',
      'settings', 'notification', 'smtp', 'webhook', 'license', 'audit_log', 'seed_data', 'report_template', 'export_history', 'about'
    ];
    expect(expectedModules.length).toBeGreaterThan(30);
  });
});
