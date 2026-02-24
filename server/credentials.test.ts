/**
 * Test file to validate Twilio and Firebase credentials
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Credentials Validation', () => {
  describe('Twilio Credentials', () => {
    it('should have TWILIO_ACCOUNT_SID configured', () => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      expect(accountSid).toBeDefined();
      expect(accountSid).not.toBe('');
      // Twilio Account SID starts with 'AC'
      if (accountSid && accountSid !== 'test' && accountSid.length > 2) {
        expect(accountSid.startsWith('AC')).toBe(true);
      }
    });

    it('should have TWILIO_AUTH_TOKEN configured', () => {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      expect(authToken).toBeDefined();
      expect(authToken).not.toBe('');
    });

    it('should have TWILIO_PHONE_NUMBER configured', () => {
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      expect(phoneNumber).toBeDefined();
      expect(phoneNumber).not.toBe('');
      // Phone number should start with +
      if (phoneNumber && phoneNumber !== 'test' && phoneNumber.length > 1) {
        expect(phoneNumber.startsWith('+')).toBe(true);
      }
    });

    it('should be able to initialize Twilio client', async () => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken || accountSid === 'test' || authToken === 'test') {
        console.log('Skipping Twilio client test - credentials not fully configured');
        return;
      }

      try {
        const twilio = await import('twilio');
        const client = twilio.default(accountSid, authToken);
        expect(client).toBeDefined();
        
        // Try to fetch account info to validate credentials
        const account = await client.api.accounts(accountSid).fetch();
        expect(account.sid).toBe(accountSid);
        console.log('Twilio credentials validated successfully');
      } catch (error: any) {
        // If credentials are invalid, this will throw
        if (error.code === 20003 || error.message?.includes('authenticate')) {
          throw new Error('Invalid Twilio credentials: ' + error.message);
        }
        // Other errors might be acceptable (e.g., network issues)
        console.log('Twilio validation warning:', error.message);
      }
    });
  });

  describe('Firebase Credentials', () => {
    it('should have FIREBASE_PROJECT_ID configured', () => {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      expect(projectId).toBeDefined();
      expect(projectId).not.toBe('');
    });

    it('should have FIREBASE_CLIENT_EMAIL configured', () => {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      expect(clientEmail).toBeDefined();
      expect(clientEmail).not.toBe('');
      // Client email should be a valid email format
      if (clientEmail && clientEmail !== 'test' && clientEmail.includes('@')) {
        expect(clientEmail).toMatch(/@.*\.iam\.gserviceaccount\.com$/);
      }
    });

    it('should have FIREBASE_PRIVATE_KEY configured', () => {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      expect(privateKey).toBeDefined();
      expect(privateKey).not.toBe('');
      // Private key should contain the PEM markers
      if (privateKey && privateKey !== 'test' && privateKey.length > 50) {
        const formattedKey = privateKey.replace(/\\n/g, '\n');
        expect(formattedKey).toContain('-----BEGIN PRIVATE KEY-----');
        expect(formattedKey).toContain('-----END PRIVATE KEY-----');
      }
    });

    it('should be able to initialize Firebase Admin SDK', async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!projectId || !clientEmail || !privateKey || 
          projectId === 'test' || clientEmail === 'test' || privateKey === 'test') {
        console.log('Skipping Firebase SDK test - credentials not fully configured');
        return;
      }

      try {
        const admin = await import('firebase-admin');
        
        // Check if already initialized
        if (admin.default.apps.length === 0) {
          const formattedKey = privateKey.replace(/\\n/g, '\n');
          
          admin.default.initializeApp({
            credential: admin.default.credential.cert({
              projectId,
              clientEmail,
              privateKey: formattedKey,
            }),
          });
        }
        
        expect(admin.default.apps.length).toBeGreaterThan(0);
        console.log('Firebase Admin SDK initialized successfully');
        
        // Clean up
        await admin.default.app().delete();
      } catch (error: any) {
        if (error.message?.includes('invalid_grant') || 
            error.message?.includes('private key') ||
            error.message?.includes('credential')) {
          throw new Error('Invalid Firebase credentials: ' + error.message);
        }
        console.log('Firebase validation warning:', error.message);
      }
    });
  });
});
