import { describe, it, expect } from 'vitest';
import {
  getChannels,
  getChannelById,
  createChannel,
  updateChannel,
  toggleChannel,
  getChannelStats,
} from './notificationChannelService';

describe('notificationChannelService', () => {
  describe('getChannels', () => {
    it('should return array of channels', () => {
      const channels = getChannels();
      
      expect(Array.isArray(channels)).toBe(true);
      expect(channels.length).toBeGreaterThanOrEqual(1);
    });

    it('should have default owner channel', () => {
      const channels = getChannels();
      const ownerChannel = channels.find(c => c.type === 'owner');
      
      expect(ownerChannel).toBeDefined();
      expect(ownerChannel?.name).toBe('System Owner');
    });
  });

  describe('getChannelById', () => {
    it('should return channel by id', () => {
      const channels = getChannels();
      const firstChannel = channels[0];
      const found = getChannelById(firstChannel.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(firstChannel.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = getChannelById(99999);
      
      expect(found).toBeUndefined();
    });
  });

  describe('createChannel', () => {
    it('should create email channel', () => {
      const channel = createChannel({
        name: 'Test Email Channel',
        type: 'email',
        config: {
          recipients: ['test@example.com'],
          subjectPrefix: '[Test]',
        },
        enabled: true,
      });
      
      expect(channel).toBeDefined();
      expect(channel.name).toBe('Test Email Channel');
      expect(channel.type).toBe('email');
      expect(channel.enabled).toBe(true);
      expect(channel.id).toBeGreaterThan(0);
    });

    it('should create webhook channel', () => {
      const channel = createChannel({
        name: 'Test Webhook',
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
        },
      });
      
      expect(channel).toBeDefined();
      expect(channel.type).toBe('webhook');
    });
  });

  describe('updateChannel', () => {
    it('should update channel name', () => {
      const channels = getChannels();
      const emailChannel = channels.find(c => c.type === 'email');
      
      if (emailChannel) {
        const updated = updateChannel(emailChannel.id, { name: 'Updated Name' });
        
        expect(updated).toBeDefined();
        expect(updated?.name).toBe('Updated Name');
      }
    });

    it('should return null for non-existent channel', () => {
      const updated = updateChannel(99999, { name: 'Test' });
      
      expect(updated).toBeNull();
    });
  });

  describe('toggleChannel', () => {
    it('should toggle channel enabled status', () => {
      const channels = getChannels();
      const channel = channels[0];
      const originalEnabled = channel.enabled;
      
      const success = toggleChannel(channel.id, !originalEnabled);
      
      expect(success).toBe(true);
      
      const updated = getChannelById(channel.id);
      expect(updated?.enabled).toBe(!originalEnabled);
    });

    it('should return false for non-existent channel', () => {
      const success = toggleChannel(99999, true);
      
      expect(success).toBe(false);
    });
  });

  describe('getChannelStats', () => {
    it('should return stats object', () => {
      const stats = getChannelStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.enabled).toBe('number');
      expect(typeof stats.totalSuccess).toBe('number');
      expect(typeof stats.totalFailure).toBe('number');
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should have correct byType counts', () => {
      const stats = getChannelStats();
      
      expect(typeof stats.byType.email).toBe('number');
      expect(typeof stats.byType.webhook).toBe('number');
      expect(typeof stats.byType.owner).toBe('number');
    });
  });
});
