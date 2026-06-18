import { container } from '../core/container.js';
import {
  InsufficientFundsError,
  InvalidTransactionError,
  ValidationError,
} from '../core/errors.js';

export class UserService {
  constructor() {
    this.userRepository = null;
    this.inventoryRepository = null;
    this.cache = null;
    this.logger = null;
    this.sessionManager = null;
    this.eventBus = null;
  }

  async initialize() {
    this.userRepository = container.resolve('userRepository');
    this.inventoryRepository = container.resolve('inventoryRepository');
    this.cache = container.resolve('cache');
    this.logger = container.resolve('logger');
    this.sessionManager = container.resolve('sessionManager');
    this.eventBus = container.resolve('eventBus');
  }

  async getUserProfile(userId, includeInventory = false) {
    const cacheKey = `user:profile:${userId}`;

    let profile = await this.cache.get(cacheKey);

    if (!profile) {
      profile = await this.userRepository.getOrCreate(userId);

      if (includeInventory) {
        profile.inventory = await this.inventoryRepository.getUserInventory(userId);
      }

      await this.cache.set(cacheKey, profile, 300000);
    }

    return profile;
  }

  async updateUserProfile(userId, updates) {
    const { balance, bank, ...otherUpdates } = updates;

    if (balance !== undefined && balance < 0) {
      throw new ValidationError('balance', balance, 'cannot be negative');
    }

    if (bank !== undefined && bank < 0) {
      throw new ValidationError('bank', bank, 'cannot be negative');
    }

    let updated = false;

    if (balance !== undefined) {
      await this.userRepository.setBalance(userId, balance);
      updated = true;
    }

    if (bank !== undefined) {
      const current = await this.userRepository.getOrCreate(userId);
      const diff = bank - current.bank;

      if (diff > 0) {
        await this.userRepository.deposit(userId, diff);
      } else {
        await this.userRepository.withdraw(userId, Math.abs(diff));
      }
      updated = true;
    }

    if (updated) {
      await this.cache.delete(`user:profile:${userId}`);

      await this.eventBus.emitEvent('user:profile:updated', {
        userId,
        updates,
        timestamp: Date.now(),
      });
    }

    return await this.getUserProfile(userId);
  }

  async transferCoins(fromId, toId, amount, options = {}) {
    if (!fromId || !toId) {
      throw new ValidationError('transfer', null, 'fromId and toId are required');
    }

    if (amount <= 0) {
      throw new ValidationError('amount', amount, 'must be positive');
    }

    if (fromId === toId) {
      throw new ValidationError('transfer', null, 'cannot transfer to self');
    }

    const rateLimitKey = `transfer:${fromId}`;
    const recentTransfers = (await this.cache.get(rateLimitKey)) || 0;

    if (recentTransfers >= 10) {
      throw new ValidationError('transfer', null, 'rate limit exceeded');
    }

    const [fromUser, toUser] = await Promise.all([
      this.getUserProfile(fromId),
      this.getUserProfile(toId),
    ]);

    if (fromUser.balance < amount) {
      throw new InsufficientFundsError(fromId, amount, fromUser.balance);
    }

    const result = await this.userRepository.transferCoins(fromId, toId, amount);

    if (result.success) {
      await this.cache.set(rateLimitKey, recentTransfers + 1, 3600000);

      await this.cache.delete(`user:profile:${fromId}`);
      await this.cache.delete(`user:profile:${toId}`);

      await this.eventBus.emitEvent('user:coins:transferred', {
        fromId,
        toId,
        amount,
        timestamp: Date.now(),
      });

      this.logger.info('Coins transferred successfully', {
        fromId,
        toId,
        amount,
        correlationId: options.correlationId,
      });
    }

    return result;
  }

  async addCoins(userId, amount, source = 'manual', options = {}) {
    if (amount <= 0) {
      throw new ValidationError('amount', amount, 'must be positive');
    }

    const newBalance = await this.userRepository.addCoins(userId, amount);

    await this.cache.delete(`user:profile:${userId}`);

    await this.eventBus.emitEvent('user:coins:added', {
      userId,
      amount,
      source,
      newBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Coins added to user', {
      userId,
      amount,
      source,
      newBalance,
      correlationId: options.correlationId,
    });

    return newBalance;
  }

  async removeCoins(userId, amount, reason = 'spend', options = {}) {
    if (amount <= 0) {
      throw new ValidationError('amount', amount, 'must be positive');
    }

    const newBalance = await this.userRepository.removeCoins(userId, amount);

    await this.cache.delete(`user:profile:${userId}`);

    await this.eventBus.emitEvent('user:coins:removed', {
      userId,
      amount,
      reason,
      newBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Coins removed from user', {
      userId,
      amount,
      reason,
      newBalance,
      correlationId: options.correlationId,
    });

    return newBalance;
  }

  async depositToBank(userId, amount, options = {}) {
    if (amount <= 0) {
      throw new ValidationError('amount', amount, 'must be positive');
    }

    const result = await this.userRepository.deposit(userId, amount);

    if (result.success) {
      await this.cache.delete(`user:profile:${userId}`);

      await this.eventBus.emitEvent('user:bank:deposit', {
        userId,
        amount,
        newBalance: result.balance,
        newBank: result.bank,
        timestamp: Date.now(),
      });

      this.logger.info('Bank deposit successful', {
        userId,
        amount,
        newBalance: result.balance,
        newBank: result.bank,
        correlationId: options.correlationId,
      });
    }

    return result;
  }

  async withdrawFromBank(userId, amount, options = {}) {
    if (amount <= 0) {
      throw new ValidationError('amount', amount, 'must be positive');
    }

    const result = await this.userRepository.withdraw(userId, amount);

    if (result.success) {
      await this.cache.delete(`user:profile:${userId}`);

      await this.eventBus.emitEvent('user:bank:withdraw', {
        userId,
        amount,
        newBalance: result.balance,
        newBank: result.bank,
        timestamp: Date.now(),
      });

      this.logger.info('Bank withdrawal successful', {
        userId,
        amount,
        newBalance: result.balance,
        newBank: result.bank,
        correlationId: options.correlationId,
      });
    }

    return result;
  }

  async getUserStats(userId, options = {}) {
    const cacheKey = `user:stats:${userId}`;
    const { includeTransactions = false, transactionLimit = 10 } = options;

    let stats = await this.cache.get(cacheKey);

    if (!stats) {
      const [profile, transactions] = await Promise.all([
        this.getUserProfile(userId),
        includeTransactions
          ? this.userRepository.getTransactions(userId, transactionLimit)
          : Promise.resolve([]),
      ]);

      stats = {
        ...profile,
        transactions: includeTransactions ? transactions : undefined,
        totalWealth: profile.balance + profile.bank,
        rank: await this.getUserRank(userId),
        lastActive: await this.getUserLastActive(userId),
      };

      await this.cache.set(cacheKey, stats, 600000);
    }

    return stats;
  }

  async getUserRank(userId) {
    const cacheKey = `user:rank:${userId}`;

    let rank = await this.cache.get(cacheKey);

    if (!rank) {
      const leaderboard = await this.userRepository.getLeaderboard(100);
      const userIndex = leaderboard.findIndex((user) => user.id === userId);

      rank = userIndex >= 0 ? userIndex + 1 : null;

      await this.cache.set(cacheKey, rank, 300000);
    }

    return rank;
  }

  async getUserLastActive(userId) {
    const session = await this.sessionManager.getSession(userId, false);
    return session ? session.lastAccessed : null;
  }

  async searchUsers(query, options = {}) {
    const { limit = 20, offset = 0, includeInactive = false } = options;

    if (!query || query.length < 2) {
      throw new ValidationError('query', query, 'must be at least 2 characters');
    }

    const users = await this.userRepository.searchUsers(query, limit);

    let filteredUsers = users;
    if (!includeInactive) {
      const maxInactiveTime = 7 * 24 * 60 * 60 * 1000;
      const userActivity = await Promise.all(
        users.map(async (user) => {
          const lastActive = await this.getUserLastActive(user.id);
          return {
            user,
            isActive: !lastActive || Date.now() - lastActive < maxInactiveTime,
          };
        }),
      );

      filteredUsers = userActivity.filter(({ isActive }) => isActive).map(({ user }) => user);
    }

    return {
      users: filteredUsers,
      total: filteredUsers.length,
      limit,
      offset,
    };
  }

  async getEconomyOverview(options = {}) {
    const cacheKey = 'economy:overview';
    const { includeDetails = false } = options;

    let overview = await this.cache.get(cacheKey);

    if (!overview) {
      const [stats, leaderboard] = await Promise.all([
        this.userRepository.getEconomyStats(),
        this.userRepository.getLeaderboard(10),
      ]);

      overview = {
        ...stats,
        topUsers: leaderboard,
        averageWealth:
          stats.total_users > 0 ? Math.floor(stats.total_wealth / stats.total_users) : 0,
        totalTransactions: await this.getTotalTransactionCount(),
        activeUsers: await this.getActiveUserCount(),
        lastUpdated: Date.now(),
      };

      await this.cache.set(cacheKey, overview, 300000);
    }

    return overview;
  }

  async getTotalTransactionCount() {
    /*
     * This would ideally come from a dedicated transaction service
     * For now, we'll estimate based on user count
     */
    const stats = await this.userRepository.getEconomyStats();
    return stats.total_users * 10;
  }

  async getActiveUserCount() {
    const activeUsers = this.sessionManager.getActiveUsers(24 * 60 * 60 * 1000); // 24 hours
    return activeUsers.length;
  }

  async batchUpdateUsers(updates, options = {}) {
    const { validateAll = true, stopOnError = false } = options;

    if (validateAll) {
      for (const update of updates) {
        if (update.balance !== undefined && update.balance < 0) {
          if (stopOnError) {
            throw new ValidationError('balance', update.balance, 'cannot be negative');
          }
          update.error = 'Invalid balance';
        }

        if (update.bank !== undefined && update.bank < 0) {
          if (stopOnError) {
            throw new ValidationError('bank', update.bank, 'cannot be negative');
          }
          update.error = 'Invalid bank';
        }
      }
    }

    const results = await this.userRepository.batchUpdateUsers(updates);

    for (const update of updates) {
      if (!update.error) {
        await this.cache.delete(`user:profile:${update.userId}`);
      }
    }

    await this.eventBus.emitEvent('user:batch:updated', {
      updates: results,
      timestamp: Date.now(),
    });

    this.logger.info('Batch user update completed', {
      total: updates.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      correlationId: options.correlationId,
    });

    return results;
  }

  async getUserActivityReport(userId, days = 7) {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    const [profile, transactions] = await Promise.all([
      this.getUserProfile(userId),
      this.userRepository.getTransactions(userId, 50),
    ]);

    const recentTransactions = transactions.filter(
      (t) => t.timestamp >= startTime && t.timestamp <= endTime,
    );

    const session = await this.sessionManager.getSession(userId, false);
    const lastActive = session ? session.lastAccessed : null;

    return {
      userId,
      period: { days, startTime, endTime },
      profile,
      transactions: {
        total: recentTransactions.length,
        sent: recentTransactions.filter((t) => t.fromId === userId).length,
        received: recentTransactions.filter((t) => t.toId === userId).length,
        list: recentTransactions.slice(0, 10),
      },
      activity: {
        lastActive,
        sessionAge: lastActive ? Date.now() - lastActive : null,
        accessCount: session ? session.accessCount : 0,
      },
    };
  }
}

container.singleton('userService', () => new UserService());
