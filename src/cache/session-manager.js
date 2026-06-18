import { container } from '../core/container.js';
import { UnauthorizedError } from '../core/errors.js';

class UserSession {
  constructor(userId) {
    this.userId = userId;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.permissions = new Set();
    this.metadata = new Map();
    this.groupMemberships = new Set();
    this.adminGroups = new Set();
  }

  access() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  addPermission(permission) {
    this.permissions.add(permission);
  }

  hasPermission(permission) {
    return this.permissions.has(permission) || this.permissions.has('*');
  }

  removePermission(permission) {
    this.permissions.delete(permission);
  }

  addGroup(groupId, isAdmin = false) {
    this.groupMemberships.add(groupId);
    if (isAdmin) {
      this.adminGroups.add(groupId);
    }
  }

  removeGroup(groupId) {
    this.groupMemberships.delete(groupId);
    this.adminGroups.delete(groupId);
  }

  isGroupAdmin(groupId) {
    return this.adminGroups.has(groupId);
  }

  isGroupMember(groupId) {
    return this.groupMemberships.has(groupId);
  }

  setMetadata(key, value) {
    this.metadata.set(key, value);
  }

  getMetadata(key) {
    return this.metadata.get(key);
  }

  isExpired(maxAge) {
    return Date.now() - this.lastAccessed > maxAge;
  }

  getStats() {
    return {
      userId: this.userId,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      accessCount: this.accessCount,
      permissions: Array.from(this.permissions),
      groupCount: this.groupMemberships.size,
      adminGroupCount: this.adminGroups.size,
      metadataCount: this.metadata.size,
    };
  }
}

export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.logger = null;
    this.cache = null;
    this.configManager = null;
    this.utils = null;
    this.initialized = false;
    this.cleanupInterval = null;
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.cache = container.resolve('cache');
    this.configManager = container.resolve('configManager');
    this.utils = container.resolve('utils');

    this.startCleanupTimer();

    await this.loadFromCache();

    this.initialized = true;
    this.logger.info('Session manager initialized');
  }

  async getSession(userId, createIfMissing = true) {
    if (!this.initialized) {
      throw new Error('Session manager not initialized');
    }

    const normalizedId = this.utils.jid.fromUser(userId);
    if (!normalizedId) {
      throw new UnauthorizedError(userId, 'session');
    }

    let session = this.sessions.get(normalizedId);

    if (!session && createIfMissing) {
      session = new UserSession(normalizedId);
      this.sessions.set(normalizedId, session);

      await this.loadSessionFromCache(normalizedId);
      session = this.sessions.get(normalizedId);
    }

    if (session) {
      session.access();
    }

    return session;
  }

  async hasPermission(userId, permission, context = {}) {
    const session = await this.getSession(userId);

    if (!session) {
      return false;
    }

    if (session.hasPermission(permission)) {
      return true;
    }

    if (this.utils.isOwner(userId)) {
      session.addPermission('*');
      return true;
    }

    if (context.groupId && session.isGroupAdmin(context.groupId)) {
      return true;
    }

    return false;
  }

  async grantPermission(userId, permission) {
    const session = await this.getSession(userId);
    session.addPermission(permission);
    await this.saveSessionToCache(userId);

    this.logger.debug('Permission granted', { userId, permission });
  }

  async revokePermission(userId, permission) {
    const session = await this.getSession(userId, false);
    if (session) {
      session.removePermission(permission);
      await this.saveSessionToCache(userId);

      this.logger.debug('Permission revoked', { userId, permission });
    }
  }

  async updateGroupMembership(userId, groupId, isAdmin = false) {
    const session = await this.getSession(userId);
    session.addGroup(groupId, isAdmin);
    await this.saveSessionToCache(userId);
  }

  async removeFromGroup(userId, groupId) {
    const session = await this.getSession(userId, false);
    if (session) {
      session.removeGroup(groupId);
      await this.saveSessionToCache(userId);
    }
  }

  async setMetadata(userId, key, value) {
    const session = await this.getSession(userId);
    session.setMetadata(key, value);
    await this.saveSessionToCache(userId);
  }

  async getMetadata(userId, key) {
    const session = await this.getSession(userId, false);
    return session ? session.getMetadata(key) : null;
  }

  async clearSession(userId) {
    const normalizedId = this.utils.jid.fromUser(userId);
    this.sessions.delete(normalizedId);
    await this.cache.delete(`session:${normalizedId}`);

    this.logger.debug('Session cleared', { userId: normalizedId });
  }

  getSessionStats(userId) {
    const session = this.sessions.get(userId);
    return session ? session.getStats() : null;
  }

  getAllStats() {
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      expiredSessions: 0,
      totalAccessCount: 0,
      uniquePermissions: new Set(),
      totalGroupMemberships: 0,
    };

    const maxAge = this.configManager.constant('CACHE_TTL_USER');

    for (const session of this.sessions.values()) {
      if (session.isExpired(maxAge)) {
        stats.expiredSessions++;
      } else {
        stats.activeSessions++;
      }

      stats.totalAccessCount += session.accessCount;
      stats.totalGroupMemberships += session.groupMemberships.size;

      for (const permission of session.permissions) {
        stats.uniquePermissions.add(permission);
      }
    }

    stats.uniquePermissions = Array.from(stats.uniquePermissions);
    return stats;
  }

  getActiveUsers(maxAge = 300000) {
    const activeUsers = [];

    for (const session of this.sessions.values()) {
      if (!session.isExpired(maxAge)) {
        activeUsers.push({
          userId: session.userId,
          lastAccessed: session.lastAccessed,
          accessCount: session.accessCount,
        });
      }
    }

    return activeUsers.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  getUsersWithPermission(permission) {
    const users = [];

    for (const session of this.sessions.values()) {
      if (session.hasPermission(permission)) {
        users.push({
          userId: session.userId,
          permissions: Array.from(session.permissions),
        });
      }
    }

    return users;
  }

  getGroupAdmins(groupId) {
    const admins = [];

    for (const session of this.sessions.values()) {
      if (session.isGroupAdmin(groupId)) {
        admins.push({
          userId: session.userId,
          adminGroups: Array.from(session.adminGroups),
        });
      }
    }

    return admins;
  }

  async saveSessionToCache(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;

    const data = {
      userId: session.userId,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed,
      accessCount: session.accessCount,
      permissions: Array.from(session.permissions),
      metadata: Array.from(session.metadata.entries()),
      groupMemberships: Array.from(session.groupMemberships),
      adminGroups: Array.from(session.adminGroups),
    };

    const ttl = this.configManager.constant('CACHE_TTL_USER');
    await this.cache.set(`session:${userId}`, data, ttl);
  }

  async loadSessionFromCache(userId) {
    try {
      const data = await this.cache.get(`session:${userId}`);
      if (!data) return;

      const session = new UserSession(userId);
      session.createdAt = data.createdAt;
      session.lastAccessed = data.lastAccessed;
      session.accessCount = data.accessCount;

      for (const permission of data.permissions || []) {
        session.addPermission(permission);
      }

      for (const [key, value] of data.metadata || []) {
        session.setMetadata(key, value);
      }

      for (const groupId of data.groupMemberships || []) {
        const isAdmin = data.adminGroups?.includes(groupId) || false;
        session.addGroup(groupId, isAdmin);
      }

      this.sessions.set(userId, session);
    } catch (error) {
      this.logger.warn('Failed to load session from cache', { userId, error: error.message });
    }
  }

  async loadFromCache() {
    try {
      const keys = await this.cache.keys('session:*');
      let loaded = 0;

      for (const key of keys) {
        const userId = key.replace('session:', '');
        await this.loadSessionFromCache(userId);
        loaded++;
      }

      this.logger.debug('Sessions loaded from cache', { loaded });
    } catch (error) {
      this.logger.warn('Failed to load sessions from cache', { error: error.message });
    }
  }

  async cleanup() {
    const maxAge = this.configManager.constant('CACHE_TTL_USER');
    const expired = [];

    for (const [userId, session] of this.sessions) {
      if (session.isExpired(maxAge)) {
        expired.push(userId);
      }
    }

    for (const userId of expired) {
      this.sessions.delete(userId);
      await this.cache.delete(`session:${userId}`);
    }

    if (expired.length > 0) {
      this.logger.debug('Session cleanup', { expired: expired.length });
    }

    return expired.length;
  }

  startCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, 60000);
  }

  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async exportSessions() {
    const sessions = {};

    for (const [userId, session] of this.sessions) {
      sessions[userId] = session.getStats();
    }

    return sessions;
  }

  async clearAllSessions() {
    this.sessions.clear();
    await this.cache.deletePattern('session:*');

    this.logger.info('All sessions cleared');
  }

  async destroy() {
    this.stopCleanupTimer();
    await this.clearAllSessions();
    this.initialized = false;

    this.logger.info('Session manager destroyed');
  }
}

container.singleton('sessionManager', () => new SessionManager());
