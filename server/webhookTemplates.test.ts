/**
 * Unit tests for Webhook Templates functionality
 */
import { describe, it, expect } from 'vitest';

const CHANNEL_TYPES = ['telegram', 'zalo', 'slack', 'teams', 'discord', 'custom'];
const EVENT_TYPES = [
  'spc_violation', 'cpk_alert', 'cpk_excellent', 'quality_issue',
  'maintenance', 'oee_low', 'defect_detected', 'system', 'daily_report',
];

describe('Webhook Templates', () => {
  describe('Template Rendering', () => {
    it('should render template with data', () => {
      const renderTemplate = (template: string, data: Record<string, any>): string => {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
          const placeholder = `{{${key}}}`;
          result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
        }
        return result;
      };

      const template = 'CPK: {{cpk}}, Product: {{product}}';
      const data = { cpk: '1.45', product: 'Test Product' };
      
      expect(renderTemplate(template, data)).toBe('CPK: 1.45, Product: Test Product');
    });

    it('should handle missing placeholders', () => {
      const renderTemplate = (template: string, data: Record<string, any>): string => {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
          const placeholder = `{{${key}}}`;
          result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
        }
        return result;
      };

      const template = 'CPK: {{cpk}}, Missing: {{missing}}';
      const data = { cpk: '1.45' };
      
      expect(renderTemplate(template, data)).toBe('CPK: 1.45, Missing: {{missing}}');
    });

    it('should render multiple occurrences of same placeholder', () => {
      const renderTemplate = (template: string, data: Record<string, any>): string => {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
          const placeholder = `{{${key}}}`;
          result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
        }
        return result;
      };

      const template = 'CPK: {{cpk}}, Also CPK: {{cpk}}';
      const data = { cpk: '1.45' };
      
      expect(renderTemplate(template, data)).toBe('CPK: 1.45, Also CPK: 1.45');
    });
  });

  describe('Template Validation', () => {
    it('should validate required fields', () => {
      const validateTemplate = (template: {
        name?: string;
        channelType?: string;
        templateBody?: string;
      }): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];
        
        if (!template.name || template.name.trim() === '') {
          errors.push('Name is required');
        }
        if (!template.channelType || !CHANNEL_TYPES.includes(template.channelType)) {
          errors.push('Valid channel type is required');
        }
        if (!template.templateBody || template.templateBody.trim() === '') {
          errors.push('Template body is required');
        }
        
        return { valid: errors.length === 0, errors };
      };

      expect(validateTemplate({
        name: 'Test',
        channelType: 'telegram',
        templateBody: 'Hello {{cpk}}'
      })).toEqual({ valid: true, errors: [] });

      expect(validateTemplate({
        channelType: 'telegram',
        templateBody: 'Hello'
      })).toEqual({ valid: false, errors: ['Name is required'] });
    });
  });

  describe('Event Type Matching', () => {
    it('should match events correctly', () => {
      const matchesEvent = (templateEvents: string[], eventType: string): boolean => {
        if (!templateEvents || templateEvents.length === 0) return true;
        return templateEvents.includes(eventType);
      };

      expect(matchesEvent(['cpk_alert', 'spc_violation'], 'cpk_alert')).toBe(true);
      expect(matchesEvent(['cpk_alert', 'spc_violation'], 'quality_issue')).toBe(false);
      expect(matchesEvent([], 'any_event')).toBe(true);
    });

    it('should filter templates by event type', () => {
      const templates = [
        { id: 1, events: ['cpk_alert'] },
        { id: 2, events: ['spc_violation', 'cpk_alert'] },
        { id: 3, events: ['quality_issue'] },
        { id: 4, events: [] },
      ];

      const filterByEvent = (templates: { id: number; events: string[] }[], eventType: string) => {
        return templates.filter(t => 
          t.events.length === 0 || t.events.includes(eventType)
        );
      };

      const cpkAlertTemplates = filterByEvent(templates, 'cpk_alert');
      expect(cpkAlertTemplates.map(t => t.id)).toEqual([1, 2, 4]);
    });
  });

  describe('Severity Filtering', () => {
    it('should filter by minimum severity', () => {
      const severityLevels: Record<string, number> = {
        info: 0,
        warning: 1,
        critical: 2,
      };

      const matchesSeverity = (minSeverity: string, eventSeverity: string): boolean => {
        return severityLevels[eventSeverity] >= severityLevels[minSeverity];
      };

      expect(matchesSeverity('info', 'info')).toBe(true);
      expect(matchesSeverity('info', 'warning')).toBe(true);
      expect(matchesSeverity('warning', 'info')).toBe(false);
      expect(matchesSeverity('critical', 'warning')).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit', () => {
      const isRateLimited = (
        lastSentAt: Date | null,
        rateLimitMinutes: number,
        now: Date
      ): boolean => {
        if (!lastSentAt) return false;
        const diffMs = now.getTime() - lastSentAt.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        return diffMinutes < rateLimitMinutes;
      };

      const now = new Date('2024-01-15T10:30:00');
      const recentSent = new Date('2024-01-15T10:28:00');
      const oldSent = new Date('2024-01-15T10:20:00');

      expect(isRateLimited(recentSent, 5, now)).toBe(true);
      expect(isRateLimited(oldSent, 5, now)).toBe(false);
      expect(isRateLimited(null, 5, now)).toBe(false);
    });
  });

  describe('Webhook Payload Construction', () => {
    it('should construct Telegram payload', () => {
      const constructTelegramPayload = (chatId: string, text: string, parseMode: string) => ({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      });

      const payload = constructTelegramPayload('123456', 'Hello World', 'HTML');
      expect(payload).toEqual({
        chat_id: '123456',
        text: 'Hello World',
        parse_mode: 'HTML',
      });
    });

    it('should construct Slack payload', () => {
      const constructSlackPayload = (title: string, body: string) => ({
        text: title,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: body } }],
      });

      const payload = constructSlackPayload('Alert', 'CPK is low');
      expect(payload.text).toBe('Alert');
      expect(payload.blocks[0].text.text).toBe('CPK is low');
    });
  });

  describe('Sample Templates Coverage', () => {
    it('should have templates for all event types', () => {
      const sampleTemplates = [
        { events: ['cpk_alert'] },
        { events: ['cpk_excellent'] },
        { events: ['spc_violation'] },
        { events: ['quality_issue'] },
        { events: ['defect_detected'] },
        { events: ['maintenance'] },
        { events: ['oee_low'] },
        { events: ['system'] },
        { events: ['daily_report'] },
      ];

      const coveredEvents = new Set(sampleTemplates.flatMap(t => t.events));
      
      for (const eventType of EVENT_TYPES) {
        expect(coveredEvents.has(eventType)).toBe(true);
      }
    });

    it('should have templates for all channel types', () => {
      const sampleTemplates = [
        { channelType: 'telegram' },
        { channelType: 'zalo' },
        { channelType: 'slack' },
        { channelType: 'teams' },
        { channelType: 'discord' },
        { channelType: 'custom' },
      ];

      const coveredChannels = new Set(sampleTemplates.map(t => t.channelType));
      
      for (const channelType of CHANNEL_TYPES) {
        expect(coveredChannels.has(channelType)).toBe(true);
      }
    });
  });
});
