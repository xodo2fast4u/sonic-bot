import { container } from '../core/container.js';
import { CooldownError } from '../core/errors.js';

class CooldownEntry {
  constructor(userId, command, duration) {
    this.userId = userId;
    this.command = command;
    this.duration = duration;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.usageCount = 1;
    this.lastUsed = this.startTime;
  }

  isExpired() {
    return Date.now() > this.endTime;
  }

  getRemaining() {
    return Math.max(0, this.endTime - Date.now());
  }

  update(duration) {
    this.lastUsed = Date.now();
    this.usageCount++;
    this.endTime = this.lastUsed + duration;
  }

  getStats() {
    return {
      userId: this.userId,
      command: this.command,
      duration: this.duration,
      remaining: this.getRemaining(),
      usageCount: this.usageCount,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}

export class EnhancedCooldownManager {
  constructor() {
    this.cooldowns = new Map();
    this.globalCooldowns = new Map();
    this.logger = null;
    this.cache = null;
    this.configManager = null;
    this.initialized = false;
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.cache = container.resolve('cache');
    this.configManager = container.resolve('configManager');

    await this.loadFromCache();

    this.initialized = true;
    this.logger.info('Enhanced cooldown manager initialized');
  }

  checkCommandCooldown(userId, command, duration) {
    if (!this.initialized) {
      throw new Error('Cooldown manager not initialized');
    }

    const userCooldowns = this.getUserCooldowns(userId);
    const existing = userCooldowns.get(command);

    if (!existing) {
      const entry = new CooldownEntry(userId, command, duration);
      userCooldowns.set(command, entry);
      this.saveToCache(userId);

      return {
        allowed: true,
        remaining: 0,
        action: 'none',
      };
    }

    if (existing.isExpired()) {
      existing.update(duration);
      this.saveToCache(userId);

      return {
        allowed: true,
        remaining: 0,
        action: 'none',
      };
    }

    return {
      allowed: false,
      remaining: existing.getRemaining(),
      action: this.getCooldownAction(userId, existing),
    };
  }

  checkGlobalCooldown(userId) {
    const existing = this.globalCooldowns.get(userId);

    if (!existing) {
      const globalDuration = this.configManager.constant('COOLDOWN_GLOBAL_DURATION');
      const entry = new CooldownEntry(userId, 'global', globalDuration);
      this.globalCooldowns.set(userId, entry);
      this.saveGlobalToCache(userId);

      return {
        allowed: true,
        remaining: 0,
        action: 'none',
      };
    }

    if (existing.isExpired()) {
      const globalDuration = this.configManager.constant('COOLDOWN_GLOBAL_DURATION');
      existing.update(globalDuration);
      this.saveGlobalToCache(userId);

      return {
        allowed: true,
        remaining: 0,
        action: 'none',
      };
    }

    return {
      allowed: false,
      remaining: existing.getRemaining(),
      action: this.getCooldownAction(userId, existing),
    };
  }

  getCooldownAction(userId, entry) {
    const warnThreshold = this.configManager.constant('COOLDOWN_WARN_THRESHOLD');
    const ignoreThreshold = this.configManager.constant('COOLDOWN_IGNORE_THRESHOLD');

    if (entry.usageCount >= ignoreThreshold) {
      return 'ignore';
    } else if (entry.usageCount >= warnThreshold) {
      return 'react';
    } else {
      return 'warn';
    }
  }

  setCooldown(userId, command, duration) {
    const userCooldowns = this.getUserCooldowns(userId);
    const entry = new CooldownEntry(userId, command, duration);
    userCooldowns.set(command, entry);
    this.saveToCache(userId);
  }

  removeCooldown(userId, command) {
    const userCooldowns = this.cooldowns.get(userId);
    if (userCooldowns) {
      userCooldowns.delete(command);
      this.saveToCache(userId);
    }
  }

  clearUserCooldowns(userId) {
    this.cooldowns.delete(userId);
    this.globalCooldowns.delete(userId);
    this.cache.delete(`cooldowns:${userId}`);
    this.cache.delete(`global_cooldowns:${userId}`);
  }

  getUserCooldowns(userId) {
    if (!this.cooldowns.has(userId)) {
      this.cooldowns.set(userId, new Map());
    }
    return this.cooldowns.get(userId);
  }

  formatCooldown(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  getUserStats(userId) {
    const userCooldowns = this.cooldowns.get(userId);
    const globalCooldown = this.globalCooldowns.get(userId);

    const commandStats = [];

    if (userCooldowns) {
      for (const [command, entry] of userCooldowns) {
        commandStats.push(entry.getStats());
      }
    }

    return {
      userId,
      commandCooldowns: commandStats,
      globalCooldown: globalCooldown ? globalCooldown.getStats() : null,
    };
  }

  getAllStats() {
    const stats = {
      totalUsers: this.cooldowns.size,
      totalCommandCooldowns: 0,
      totalGlobalCooldowns: this.globalCooldowns.size,
      activeCooldowns: 0,
      expiredCooldowns: 0,
    };

    for (const [userId, userCooldowns] of this.cooldowns) {
      stats.totalCommandCooldowns += userCooldowns.size;

      for (const entry of userCooldowns.values()) {
        if (entry.isExpired()) {
          stats.expiredCooldowns++;
        } else {
          stats.activeCooldowns++;
        }
      }
    }

    return stats;
  }

  async cleanup() {
    let cleaned = 0;

    for (const [userId, userCooldowns] of this.cooldowns) {
      const expiredCommands = [];

      for (const [command, entry] of userCooldowns) {
        if (entry.isExpired()) {
          expiredCommands.push(command);
        }
      }

      for (const command of expiredCommands) {
        userCooldowns.delete(command);
        cleaned++;
      }

      if (userCooldowns.size === 0) {
        this.cooldowns.delete(userId);
      } else {
        this.saveToCache(userId);
      }
    }

    const expiredGlobal = [];
    for (const [userId, entry] of this.globalCooldowns) {
      if (entry.isExpired()) {
        expiredGlobal.push(userId);
      }
    }

    for (const userId of expiredGlobal) {
      this.globalCooldowns.delete(userId);
      this.cache.delete(`global_cooldowns:${userId}`);
      cleaned++;
    }

    if (cleaned > 0) {
      this.logger.debug('Cooldown cleanup', { cleaned });
    }

    return cleaned;
  }

  async saveToCache(userId) {
    const userCooldowns = this.cooldowns.get(userId);
    if (!userCooldowns) return;

    const data = {};
    for (const [command, entry] of userCooldowns) {
      data[command] = {
        userId: entry.userId,
        command: entry.command,
        duration: entry.duration,
        startTime: entry.startTime,
        endTime: entry.endTime,
        usageCount: entry.usageCount,
        lastUsed: entry.lastUsed,
      };
    }

    await this.cache.set(`cooldowns:${userId}`, data, 3600000); // 1 hour
  }

  async saveGlobalToCache(userId) {
    const entry = this.globalCooldowns.get(userId);
    if (!entry) return;

    const data = {
      userId: entry.userId,
      command: entry.command,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.endTime,
      usageCount: entry.usageCount,
      lastUsed: entry.lastUsed,
    };

    await this.cache.set(`global_cooldowns:${userId}`, data, 3600000); // 1 hour
  }

  async loadFromCache() {
    this.logger.debug('Cooldown cache loading implemented (lazy loading)');
  }

  async loadUserFromCache(userId) {
    try {
      const data = await this.cache.get(`cooldowns:${userId}`);
      if (data) {
        const userCooldowns = this.getUserCooldowns(userId);

        for (const [command, entryData] of Object.entries(data)) {
          const entry = new CooldownEntry(entryData.userId, entryData.command, entryData.duration);
          entry.startTime = entryData.startTime;
          entry.endTime = entryData.endTime;
          entry.usageCount = entryData.usageCount;
          entry.lastUsed = entryData.lastUsed;

          if (!entry.isExpired()) {
            userCooldowns.set(command, entry);
          }
        }
      }

      const globalData = await this.cache.get(`global_cooldowns:${userId}`);
      if (globalData) {
        const entry = new CooldownEntry(globalData.userId, globalData.command, globalData.duration);
        entry.startTime = globalData.startTime;
        entry.endTime = globalData.endTime;
        entry.usageCount = globalData.usageCount;
        entry.lastUsed = globalData.lastUsed;

        if (!entry.isExpired()) {
          this.globalCooldowns.set(userId, entry);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load cooldowns from cache', { userId, error: error.message });
    }
  }

  async reset() {
    this.cooldowns.clear();
    this.globalCooldowns.clear();

    await this.cache.deletePattern('cooldowns:*');
    await this.cache.deletePattern('global_cooldowns:*');

    this.logger.info('All cooldowns reset');
  }

  getUsersWithActiveCooldowns() {
    const users = [];

    for (const [userId, userCooldowns] of this.cooldowns) {
      let hasActive = false;

      for (const entry of userCooldowns.values()) {
        if (!entry.isExpired()) {
          hasActive = true;
          break;
        }
      }

      if (hasActive) {
        users.push(userId);
      }
    }

    return users;
  }

  getTopOffenders(limit = 10) {
    const offenders = [];

    for (const [userId, userCooldowns] of this.cooldowns) {
      let totalUsage = 0;

      for (const entry of userCooldowns.values()) {
        totalUsage += entry.usageCount;
      }

      offenders.push({
        userId,
        totalUsage,
        commandCount: userCooldowns.size,
      });
    }

    return offenders.sort((a, b) => b.totalUsage - a.totalUsage).slice(0, limit);
  }
}

container.singleton('cooldownManager', () => new EnhancedCooldownManager());
