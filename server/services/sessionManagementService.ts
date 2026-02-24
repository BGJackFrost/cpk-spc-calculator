/**
 * Session Management Service
 * 
 * Provides session rotation, concurrent session limits, and device management.
 */

// Session interface
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform?: string;
    browser?: string;
  };
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isRememberMe: boolean;
  isActive: boolean;
}

// Session activity log
export interface SessionActivity {
  id: string;
  sessionId: string;
  userId: string;
  action: 'login' | 'logout' | 'refresh' | 'activity' | 'expired' | 'revoked';
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

// Session configuration
interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number; // minutes
  rememberMeTimeout: number; // days
  activityTimeout: number; // minutes of inactivity
  rotateOnActivity: boolean;
  rotationInterval: number; // minutes
}

class SessionManagementService {
  private sessions: Map<string, Session> = new Map();
  private activities: SessionActivity[] = [];
  private maxActivities: number = 5000;
  
  private config: SessionConfig = {
    maxConcurrentSessions: 5,
    sessionTimeout: 30, // 30 minutes
    rememberMeTimeout: 30, // 30 days
    activityTimeout: 15, // 15 minutes
    rotateOnActivity: true,
    rotationInterval: 60, // 60 minutes
  };

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SessionConfig>): SessionConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /**
   * Get configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Create a new session
   */
  createSession(options: {
    userId: string;
    deviceInfo: Session['deviceInfo'];
    isRememberMe?: boolean;
  }): Session {
    // Check concurrent session limit
    const userSessions = this.getUserSessions(options.userId);
    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Revoke oldest session
      const oldest = userSessions.sort((a, b) => 
        a.lastActivityAt.getTime() - b.lastActivityAt.getTime()
      )[0];
      this.revokeSession(oldest.id, 'concurrent_limit');
    }

    const now = new Date();
    const timeout = options.isRememberMe 
      ? this.config.rememberMeTimeout * 24 * 60 
      : this.config.sessionTimeout;

    const session: Session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: options.userId,
      deviceId: this.generateDeviceId(options.deviceInfo),
      deviceInfo: options.deviceInfo,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + timeout * 60 * 1000),
      isRememberMe: options.isRememberMe || false,
      isActive: true,
    };

    this.sessions.set(session.id, session);
    this.logActivity(session.id, options.userId, 'login', options.deviceInfo);

    return session;
  }

  /**
   * Generate device ID from device info
   */
  private generateDeviceId(deviceInfo: Session['deviceInfo']): string {
    const data = `${deviceInfo.userAgent}_${deviceInfo.platform || ''}_${deviceInfo.browser || ''}`;
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `dev_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.revokeSession(sessionId, 'expired');
      return null;
    }

    return session;
  }

  /**
   * Validate and refresh session
   */
  validateSession(sessionId: string): { valid: boolean; session?: Session; reason?: string } {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, reason: 'Session revoked' };
    }

    const now = new Date();

    // Check expiration
    if (now > session.expiresAt) {
      this.revokeSession(sessionId, 'expired');
      return { valid: false, reason: 'Session expired' };
    }

    // Check activity timeout
    const inactiveTime = (now.getTime() - session.lastActivityAt.getTime()) / 60000;
    if (inactiveTime > this.config.activityTimeout && !session.isRememberMe) {
      this.revokeSession(sessionId, 'inactive');
      return { valid: false, reason: 'Session inactive' };
    }

    // Update last activity
    session.lastActivityAt = now;

    // Check if rotation needed
    if (this.config.rotateOnActivity) {
      const timeSinceCreation = (now.getTime() - session.createdAt.getTime()) / 60000;
      if (timeSinceCreation > this.config.rotationInterval) {
        return this.rotateSession(sessionId);
      }
    }

    this.logActivity(sessionId, session.userId, 'activity');
    return { valid: true, session };
  }

  /**
   * Rotate session (create new ID)
   */
  rotateSession(sessionId: string): { valid: boolean; session?: Session; reason?: string } {
    const oldSession = this.sessions.get(sessionId);
    if (!oldSession) {
      return { valid: false, reason: 'Session not found' };
    }

    // Create new session with same data
    const now = new Date();
    const newSession: Session = {
      ...oldSession,
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      lastActivityAt: now,
    };

    // Remove old session
    this.sessions.delete(sessionId);
    
    // Add new session
    this.sessions.set(newSession.id, newSession);
    
    this.logActivity(newSession.id, newSession.userId, 'refresh');
    
    return { valid: true, session: newSession };
  }

  /**
   * Revoke session
   */
  revokeSession(sessionId: string, reason?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    this.logActivity(sessionId, session.userId, reason === 'expired' ? 'expired' : 'revoked');
    this.sessions.delete(sessionId);
    
    return true;
  }

  /**
   * Revoke all sessions for user
   */
  revokeAllUserSessions(userId: string, exceptSessionId?: string): number {
    let count = 0;
    
    this.sessions.forEach((session, id) => {
      if (session.userId === userId && id !== exceptSessionId) {
        this.revokeSession(id, 'force_logout');
        count++;
      }
    });

    return count;
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId: string): Session[] {
    const sessions: Session[] = [];
    
    this.sessions.forEach((session) => {
      if (session.userId === userId && session.isActive) {
        sessions.push(session);
      }
    });

    return sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /**
   * Get user devices
   */
  getUserDevices(userId: string): {
    deviceId: string;
    deviceInfo: Session['deviceInfo'];
    sessions: number;
    lastActivity: Date;
  }[] {
    const devices: Map<string, {
      deviceId: string;
      deviceInfo: Session['deviceInfo'];
      sessions: number;
      lastActivity: Date;
    }> = new Map();

    this.sessions.forEach((session) => {
      if (session.userId === userId && session.isActive) {
        const existing = devices.get(session.deviceId);
        if (existing) {
          existing.sessions++;
          if (session.lastActivityAt > existing.lastActivity) {
            existing.lastActivity = session.lastActivityAt;
          }
        } else {
          devices.set(session.deviceId, {
            deviceId: session.deviceId,
            deviceInfo: session.deviceInfo,
            sessions: 1,
            lastActivity: session.lastActivityAt,
          });
        }
      }
    });

    return Array.from(devices.values()).sort((a, b) => 
      b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }

  /**
   * Revoke sessions by device
   */
  revokeDeviceSessions(userId: string, deviceId: string): number {
    let count = 0;
    
    this.sessions.forEach((session, id) => {
      if (session.userId === userId && session.deviceId === deviceId) {
        this.revokeSession(id, 'device_revoked');
        count++;
      }
    });

    return count;
  }

  /**
   * Log session activity
   */
  private logActivity(
    sessionId: string,
    userId: string,
    action: SessionActivity['action'],
    deviceInfo?: Session['deviceInfo']
  ): void {
    this.activities.push({
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      userId,
      action,
      timestamp: new Date(),
      ip: deviceInfo?.ip,
      userAgent: deviceInfo?.userAgent,
    });

    if (this.activities.length > this.maxActivities) {
      this.activities.shift();
    }
  }

  /**
   * Get session activities
   */
  getActivities(options?: {
    userId?: string;
    sessionId?: string;
    action?: SessionActivity['action'];
    limit?: number;
  }): SessionActivity[] {
    let activities = [...this.activities];

    if (options?.userId) {
      activities = activities.filter(a => a.userId === options.userId);
    }

    if (options?.sessionId) {
      activities = activities.filter(a => a.sessionId === options.sessionId);
    }

    if (options?.action) {
      activities = activities.filter(a => a.action === options.action);
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      activities = activities.slice(0, options.limit);
    }

    return activities;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
    avgSessionsPerUser: number;
    recentLogins: number;
    recentLogouts: number;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      uniqueUsers: new Set<string>(),
      avgSessionsPerUser: 0,
      recentLogins: 0,
      recentLogouts: 0,
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.sessions.forEach((session) => {
      if (session.isActive) {
        stats.activeSessions++;
        stats.uniqueUsers.add(session.userId);
      }
    });

    this.activities.forEach((activity) => {
      if (activity.timestamp >= oneHourAgo) {
        if (activity.action === 'login') stats.recentLogins++;
        if (activity.action === 'logout' || activity.action === 'revoked') stats.recentLogouts++;
      }
    });

    const uniqueUserCount = stats.uniqueUsers.size;

    return {
      totalSessions: stats.totalSessions,
      activeSessions: stats.activeSessions,
      uniqueUsers: uniqueUserCount,
      avgSessionsPerUser: uniqueUserCount > 0 
        ? Math.round((stats.activeSessions / uniqueUserCount) * 100) / 100 
        : 0,
      recentLogins: stats.recentLogins,
      recentLogouts: stats.recentLogouts,
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    this.sessions.forEach((session, id) => {
      if (now > session.expiresAt || !session.isActive) {
        this.sessions.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }
}

// Singleton instance
export const sessionManagementService = new SessionManagementService();

// Export functions
export const createSession = sessionManagementService.createSession.bind(sessionManagementService);
export const getSession = sessionManagementService.getSession.bind(sessionManagementService);
export const validateSession = sessionManagementService.validateSession.bind(sessionManagementService);
export const rotateSession = sessionManagementService.rotateSession.bind(sessionManagementService);
export const revokeSession = sessionManagementService.revokeSession.bind(sessionManagementService);
export const revokeAllUserSessions = sessionManagementService.revokeAllUserSessions.bind(sessionManagementService);
export const getUserSessions = sessionManagementService.getUserSessions.bind(sessionManagementService);
export const getUserDevices = sessionManagementService.getUserDevices.bind(sessionManagementService);
export const revokeDeviceSessions = sessionManagementService.revokeDeviceSessions.bind(sessionManagementService);
export const getSessionActivities = sessionManagementService.getActivities.bind(sessionManagementService);
export const getSessionStats = sessionManagementService.getStats.bind(sessionManagementService);
export const cleanupSessions = sessionManagementService.cleanup.bind(sessionManagementService);
export const updateSessionConfig = sessionManagementService.updateConfig.bind(sessionManagementService);
export const getSessionConfig = sessionManagementService.getConfig.bind(sessionManagementService);
