import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GĐ2 - Schema Splitting', () => {
  const schemaDir = path.join(__dirname, '../drizzle/schema');

  it('should have schema directory with domain modules', () => {
    expect(fs.existsSync(schemaDir)).toBe(true);
    const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(5); // At least 5 domain modules
  });

  it('should have barrel re-export in schema.ts', () => {
    const schemaFile = path.join(__dirname, '../drizzle/schema.ts');
    const content = fs.readFileSync(schemaFile, 'utf-8');
    expect(content).toContain('export *');
    expect(content).toContain('./schema/');
  });

  it('each domain module should export at least one table', () => {
    const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    for (const file of files) {
      const content = fs.readFileSync(path.join(schemaDir, file), 'utf-8');
      expect(content).toContain('export const');
    }
  });

  it('index.ts should re-export all domain modules', () => {
    const indexFile = path.join(schemaDir, 'index.ts');
    const content = fs.readFileSync(indexFile, 'utf-8');
    const domainFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    for (const file of domainFiles) {
      const moduleName = file.replace('.ts', '');
      expect(content).toContain(`"./${moduleName}"`);
    }
  });

  it('drizzle.config.ts should point to schema directory', () => {
    const configFile = path.join(__dirname, '../drizzle.config.ts');
    const content = fs.readFileSync(configFile, 'utf-8');
    expect(content).toContain('schema');
  });
});

describe('GĐ2 - Bundle Optimization', () => {
  it('vite.config.ts should disable modulePreload polyfill', () => {
    const configFile = path.join(__dirname, '../vite.config.ts');
    const content = fs.readFileSync(configFile, 'utf-8');
    expect(content).toContain('modulePreload');
    expect(content).toContain('polyfill: false');
  });

  it('index.html should have preconnect hints', () => {
    const indexFile = path.join(__dirname, '../client/index.html');
    const content = fs.readFileSync(indexFile, 'utf-8');
    expect(content).toContain('rel="preconnect"');
    expect(content).toContain('fonts.googleapis.com');
  });

  it('index.html should have dns-prefetch hints', () => {
    const indexFile = path.join(__dirname, '../client/index.html');
    const content = fs.readFileSync(indexFile, 'utf-8');
    expect(content).toContain('rel="dns-prefetch"');
  });
});

describe('GĐ2 - Security Hardening', () => {
  it('CSP nonce middleware should exist', () => {
    const cspFile = path.join(__dirname, '_core/cspNonce.ts');
    expect(fs.existsSync(cspFile)).toBe(true);
    const content = fs.readFileSync(cspFile, 'utf-8');
    expect(content).toContain('crypto');
    expect(content).toContain('nonce');
  });

  it('DOMPurify sanitize utility should exist', () => {
    const sanitizeFile = path.join(__dirname, '../client/src/lib/sanitize.ts');
    expect(fs.existsSync(sanitizeFile)).toBe(true);
    const content = fs.readFileSync(sanitizeFile, 'utf-8');
    expect(content).toContain('DOMPurify');
    expect(content).toContain('sanitizeHtml');
    expect(content).toContain('createSafeHtml');
    expect(content).toContain('FORBID_TAGS');
  });

  it('ShiftReportHistory should use sanitized HTML rendering', () => {
    const reportFile = path.join(__dirname, '../client/src/pages/ShiftReportHistory.tsx');
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('createSafeHtml');
    expect(content).not.toContain("__html: report.reportContent || ''");
  });

  it('cpkWebhookNotificationService should use parameterized JSON_CONTAINS', () => {
    const webhookFile = path.join(__dirname, 'cpkWebhookNotificationService.ts');
    const content = fs.readFileSync(webhookFile, 'utf-8');
    expect(content).toContain('JSON.stringify(eventType)');
    expect(content).not.toContain('"${eventType}"');
  });
});

describe('GĐ2 - Database Query Safety', () => {
  it('db.ts should have safety limits on unbounded queries', () => {
    const dbFile = path.join(__dirname, 'db.ts');
    const content = fs.readFileSync(dbFile, 'utf-8');
    
    // getSpcAnalysisReport should have limit
    const reportFn = content.substring(
      content.indexOf('export async function getSpcAnalysisReport'),
      content.indexOf('export async function getCpkTrendByDay')
    );
    expect(reportFn).toContain('.limit(10000)');
    
    // getCpkTrendByDay should have limit
    const trendFn = content.substring(
      content.indexOf('export async function getCpkTrendByDay'),
      content.indexOf('export async function getRecentAnalysisForPlan')
    );
    expect(trendFn).toContain('.limit(10000)');
  });

  it('db.ts should have connection pool with retry logic', () => {
    const dbFile = path.join(__dirname, 'db.ts');
    const content = fs.readFileSync(dbFile, 'utf-8');
    expect(content).toContain('executeWithRetry');
    expect(content).toContain('ECONNRESET');
    expect(content).toContain('connectionLimit');
    expect(content).toContain('enableKeepAlive');
  });
});

describe('GĐ2 - Migration Fixes', () => {
  it('add-advanced-indexes migration should have correct structure', () => {
    const migrationFile = path.join(__dirname, 'migrations/add-advanced-indexes.ts');
    const content = fs.readFileSync(migrationFile, 'utf-8');
    
    // Should have proper CREATE INDEX statements
    expect(content).toContain('CREATE INDEX');
    // Should have error handling for duplicate indexes
    expect(content).toContain('Duplicate key name');
    // Should have phase 2 logging
    expect(content).toContain('Phase 2 completed');
    // Should export default function
    expect(content).toContain('export default');
  });
});
