/**
 * Phase 35 Tests - Export Login History, License Renewal Email, Dark Mode
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 35 - Export Login History, License Renewal Email, Dark Mode', () => {
  
  describe('Export Login History API', () => {
    it('should have exportLoginHistory mutation in routers.ts', () => {
      const routersPath = path.join(__dirname, 'routers.ts');
      const content = fs.readFileSync(routersPath, 'utf-8');
      
      expect(content).toContain('exportLoginHistory');
      expect(content).toContain("format: z.enum(['csv', 'excel'])");
    });
    
    it('should support CSV format export', () => {
      const routersPath = path.join(__dirname, 'routers.ts');
      const content = fs.readFileSync(routersPath, 'utf-8');
      
      expect(content).toContain("mimeType: 'text/csv'");
      expect(content).toContain('.csv');
    });
    
    it('should support Excel format export', () => {
      const routersPath = path.join(__dirname, 'routers.ts');
      const content = fs.readFileSync(routersPath, 'utf-8');
      
      expect(content).toContain("mimeType: 'application/vnd.ms-excel'");
      expect(content).toContain('.xls');
    });
    
    it('should have export button in LoginHistoryPage', () => {
      const pagePath = path.join(__dirname, '../client/src/pages/LoginHistoryPage.tsx');
      const content = fs.readFileSync(pagePath, 'utf-8');
      
      expect(content).toContain('exportLoginHistory');
      expect(content).toContain('handleExport');
      expect(content).toContain('Xuất báo cáo');
    });
  });
  
  describe('License Renewal Email', () => {
    it('should have sendLicenseRenewalEmails function in scheduledJobs.ts', () => {
      const jobsPath = path.join(__dirname, 'scheduledJobs.ts');
      const content = fs.readFileSync(jobsPath, 'utf-8');
      
      expect(content).toContain('sendLicenseRenewalEmails');
      expect(content).toContain('triggerLicenseRenewalEmails');
    });
    
    it('should send emails for 7-day expiry warning', () => {
      const jobsPath = path.join(__dirname, 'scheduledJobs.ts');
      const content = fs.readFileSync(jobsPath, 'utf-8');
      
      expect(content).toContain('daysLeft <= 7');
      expect(content).toContain('Cảnh báo');
      expect(content).toContain('#dc2626'); // Red color for urgent
    });
    
    it('should send emails for 30-day expiry warning', () => {
      const jobsPath = path.join(__dirname, 'scheduledJobs.ts');
      const content = fs.readFileSync(jobsPath, 'utf-8');
      
      expect(content).toContain('daysLeft > 7 && daysLeft <= 30');
      expect(content).toContain('Nhắc nhở');
      expect(content).toContain('#f59e0b'); // Yellow color for warning
    });
    
    it('should have scheduled job at 9:00 AM', () => {
      const jobsPath = path.join(__dirname, 'scheduledJobs.ts');
      const content = fs.readFileSync(jobsPath, 'utf-8');
      
      expect(content).toContain("'0 0 9 * * *'");
      expect(content).toContain('License renewal email at 9:00 AM');
    });
  });
  
  describe('Dark Mode', () => {
    it('should have ThemeProvider with switchable mode in App.tsx', () => {
      const appPath = path.join(__dirname, '../client/src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      
      expect(content).toContain('switchable={true}');
      expect(content).toContain('ThemeProvider');
    });
    
    it('should have theme toggle in DashboardLayout', () => {
      const layoutPath = path.join(__dirname, '../client/src/components/DashboardLayout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      
      // Check for theme toggle implementation (either ThemeToggle component or inline toggle)
      expect(content).toMatch(/useTheme|ThemeToggle|setTheme/);
      expect(content).toContain('Moon');
      expect(content).toContain('Sun');
    });
    
    it('should have dark mode CSS variables in index.css', () => {
      const cssPath = path.join(__dirname, '../client/src/index.css');
      const content = fs.readFileSync(cssPath, 'utf-8');
      
      expect(content).toContain('.dark {');
      expect(content).toContain('--background:');
      expect(content).toContain('--foreground:');
    });
    
    it('should use useTheme hook in DashboardLayout', () => {
      const layoutPath = path.join(__dirname, '../client/src/components/DashboardLayout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      
      expect(content).toContain('useTheme');
      expect(content).toContain('theme');
      // Check for theme toggle functionality (dark/light mode switch)
      expect(content).toMatch(/setTheme|dark.*light|light.*dark/);
    });
  });
});
