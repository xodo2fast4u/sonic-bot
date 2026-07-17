import {
  InsufficientFundsError,
  InvalidTransactionError,
  ValidationError,
} from '../core/errors.js';
import { container } from '../core/container.js';

export class EconomyService {
  constructor() {
    this.userService = null;
    this.inventoryService = null;
    this.cache = null;
    this.logger = null;
    this.eventBus = null;
    this.configManager = null;
  }

  async initialize() {
    this.userService = container.resolve('userService');
    this.inventoryService = container.resolve('inventoryService');
    this.cache = container.resolve('cache');
    this.logger = container.resolve('logger');
    this.eventBus = container.resolve('eventBus');
    this.configManager = container.resolve('configManager');
  }

  /** @param {any} userId @param {any} [options] @returns {Promise<any>} */
  async processDailyReward(userId, options = {}) {
    const { amount = 100, bonusMultiplier = 1 } = options;

    const cooldownKey = `daily:${userId}`;
    const lastDaily = await this.cache.get(cooldownKey);

    if (lastDaily) {
      const timeUntilReset = this.getTimeUntilNextDaily();
      throw new ValidationError('daily', lastDaily, `Daily reward available in ${timeUntilReset}`);
    }

    const user = await this.userService.getUserProfile(userId);

    if (user.balance < 0) {
      throw new InvalidTransactionError('negative balance', userId, { balance: user.balance });
    }

    const streak = await this.calculateDailyStreak(userId);
    const wealthBonus = user.totalEarned > 0 ? Math.min(user.totalEarned / 100000, 0.5) : 0;
    const finalAmount = Math.floor(amount * bonusMultiplier * (1 + streak * 0.1 + wealthBonus));

    const newBalance = await this.userService.addCoins(userId, finalAmount, 'daily');

    await this.cache.set(cooldownKey, Date.now(), 86400000); // 24 hours

    await this.eventBus.emitEvent('economy:daily:claimed', {
      userId,
      amount: finalAmount,
      streak,
      newBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Daily reward claimed', {
      userId,
      amount: finalAmount,
      streak,
      newBalance,
      previousBalance: user.balance,
      correlationId: options.correlationId,
    });

    return {
      amount: finalAmount,
      streak,
      newBalance,
      nextAvailable: this.getNextDailyTime(),
    };
  }

  /** @param {any} userId @param {any} [options] @returns {Promise<any>} */
  async processWork(userId, options = {}) {
    const { jobId = null } = options;

    const cooldownKey = `work:${userId}`;
    const lastWork = await this.cache.get(cooldownKey);
    const workCooldown = this.configManager.constant('WORK_COOLDOWN');

    if (lastWork && Date.now() - lastWork < workCooldown) {
      const timeUntilReset = this.formatTimeRemaining(workCooldown - (Date.now() - lastWork));
      throw new ValidationError('work', lastWork, `Work available in ${timeUntilReset}`);
    }

    const job = jobId ? this.getJobById(jobId) : this.getRandomJob();

    if (!job) {
      throw new ValidationError('work', jobId, 'Invalid job ID');
    }

    const earnings = Math.floor(Math.random() * (job.max - job.min + 1) + job.min);

    const newBalance = await this.userService.addCoins(userId, earnings, 'work');

    await this.cache.set(cooldownKey, Date.now(), workCooldown);

    await this.eventBus.emitEvent('economy:work:completed', {
      userId,
      job: job.name,
      earnings,
      newBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Work completed', {
      userId,
      job: job.name,
      earnings,
      newBalance,
      correlationId: options.correlationId,
    });

    return {
      job: job.name,
      earnings,
      message: job.messages[Math.floor(Math.random() * job.messages.length)],
      newBalance,
      nextAvailable: new Date(Date.now() + workCooldown),
    };
  }

  /** @param {any} userId @param {number} betAmount @param {any} [options] @returns {Promise<any>} */
  async processSlots(userId, betAmount, options = {}) {
    const { minBet = 10, maxBet = 1000, houseEdge = 0.05 } = options;

    if (betAmount < minBet || betAmount > maxBet) {
      throw new ValidationError('slots', betAmount, `Bet must be between ${minBet} and ${maxBet}`);
    }

    const user = await this.userService.getUserProfile(userId);

    if (user.balance < betAmount) {
      throw new InsufficientFundsError(userId, betAmount, user.balance);
    }

    await this.userService.removeCoins(userId, betAmount, 'slots_bet');

    const result = this.generateSlotsResult();
    const winAmount = this.calculateSlotsWin(betAmount, result, houseEdge);

    let finalBalance;
    if (winAmount > 0) {
      finalBalance = await this.userService.addCoins(userId, winAmount, 'slots_win');
    } else {
      const updatedUser = await this.userService.getUserProfile(userId);
      finalBalance = updatedUser.balance;
    }

    await this.eventBus.emitEvent('economy:slots:played', {
      userId,
      betAmount,
      result,
      winAmount,
      finalBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Slots played', {
      userId,
      betAmount,
      result,
      winAmount,
      finalBalance,
      correlationId: options.correlationId,
    });

    return {
      betAmount,
      result,
      winAmount,
      finalBalance,
      profit: winAmount - betAmount,
    };
  }

  /** @param {any} userId @param {string} itemName @param {number} [quantity] @param {any} [options] @returns {Promise<any>} */
  async processPurchase(userId, itemName, quantity = 1, options = {}) {
    const { shop = {} } = options;

    const item = shop[itemName];
    if (!item) {
      throw new ValidationError('purchase', itemName, 'Item not available in shop');
    }

    const totalCost = item.price * quantity;

    const user = await this.userService.getUserProfile(userId);

    if (user.balance < totalCost) {
      throw new InsufficientFundsError(userId, totalCost, user.balance);
    }

    await this.userService.removeCoins(userId, totalCost, 'purchase');

    await this.inventoryService.addItem(userId, itemName, quantity);

    const updatedUser = await this.userService.getUserProfile(userId);

    await this.eventBus.emitEvent('economy:item:purchased', {
      userId,
      itemName,
      quantity,
      totalCost,
      newBalance: updatedUser.balance,
      timestamp: Date.now(),
    });

    this.logger.info('Item purchased', {
      userId,
      itemName,
      quantity,
      totalCost,
      newBalance: updatedUser.balance,
      correlationId: options.correlationId,
    });

    return {
      itemName,
      quantity,
      totalCost,
      newBalance: updatedUser.balance,
    };
  }

  /** @param {any} userId @param {string} itemName @param {number} [quantity] @param {any} [options] @returns {Promise<any>} */
  async processSale(userId, itemName, quantity = 1, options = {}) {
    const { marketRate = 0.5 } = options; // 50% of shop value

    const hasItem = await this.inventoryService.hasItem(userId, itemName, quantity);
    if (!hasItem) {
      throw new ValidationError('sale', itemName, 'You do not have enough of this item');
    }

    const shopItem = this.getShopItem(itemName);
    if (!shopItem) {
      throw new ValidationError('sale', itemName, 'Item cannot be sold');
    }

    const saleValue = Math.floor(shopItem.price * quantity * marketRate);

    await this.inventoryService.removeItem(userId, itemName, quantity);

    const newBalance = await this.userService.addCoins(userId, saleValue, 'sale');

    await this.eventBus.emitEvent('economy:item:sold', {
      userId,
      itemName,
      quantity,
      saleValue,
      newBalance,
      timestamp: Date.now(),
    });

    this.logger.info('Item sold', {
      userId,
      itemName,
      quantity,
      saleValue,
      newBalance,
      correlationId: options.correlationId,
    });

    return {
      itemName,
      quantity,
      saleValue,
      newBalance,
    };
  }

  /** @param {any} [options] @returns {Promise<any>} */
  async getEconomyStats(options = {}) {
    const { includeDetails = false, timeRange = null } = options;
    const cacheKey = 'economy:stats';

    let stats = await this.cache.get(cacheKey);

    if (!stats) {
      const userStats = await this.userService.userRepository.getEconomyStats();
      const inventoryStats = await this.inventoryService.getInventoryStats();

      stats = {
        ...userStats,
        inventory: inventoryStats,
        marketData: await this.getMarketData(),
        lastUpdated: Date.now(),
      };

      await this.cache.set(cacheKey, stats, 300000);
    }

    if (timeRange) {
      stats = this.filterStatsByTimeRange(stats, timeRange);
    }

    return includeDetails ? stats : this.summarizeStats(stats);
  }

  /** @param {any} userId @param {any} [options] @returns {Promise<any>} */
  async getUserEconomySummary(userId, options = {}) {
    const { includeTransactions = false, transactionLimit = 10 } = options;

    const [profile, inventory] = await Promise.all([
      this.userService.getUserProfile(userId),
      this.inventoryService.getUserInventory(userId),
    ]);

    let transactions = null;
    if (includeTransactions) {
      transactions = await this.userService.userRepository.getTransactions(
        userId,
        transactionLimit,
      );
    }

    return {
      user: profile,
      inventory,
      transactions,
      totalWealth: profile.balance + profile.bank,
      rank: await this.userService.getUserRank(userId),
      lastActivity: await this.userService.getUserLastActive(userId),
    };
  }

  /** @param {any} userId @returns {Promise<number>} */
  async calculateDailyStreak(userId) {
    const streakKey = `daily:streak:${userId}`;
    const lastDaily = await this.cache.get(`daily:${userId}`);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let streak = (await this.cache.get(streakKey)) || 0;

    if (lastDaily && lastDaily < yesterday.getTime()) {
      streak = 0;
    }

    streak += 1;
    await this.cache.set(streakKey, streak, 86400000);

    return streak;
  }

  /** @param {any} jobId @returns {any} */
  getJobById(jobId) {
    const jobs = this.configManager.constant('JOBS') || [];
    return jobs.find((/** @type {{ id: string }} */ job) => job.id === jobId);
  }

  getRandomJob() {
    const jobs = this.configManager.constant('JOBS') || [];
    return jobs[Math.floor(Math.random() * jobs.length)];
  }

  generateSlotsResult() {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
    const reels = [
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ],
    ];

    return reels;
  }

  /** @param {number} betAmount @param {any[][]} result @param {number} houseEdge @returns {number} */
  calculateSlotsWin(betAmount, result, houseEdge) {
    /** @type {Record<string, number>} */
    const counts = {};
    for (const reel of result) {
      for (const symbol of reel) {
        counts[symbol] = (counts[symbol] || 0) + 1;
      }
    }

    let winAmount = 0;

    if (counts['💎'] === 3) {
      winAmount = Math.floor(betAmount * 10);
    } else if (counts['💎'] === 2) {
      winAmount = Math.floor(betAmount * 5);
    } else if ((counts['🍒'] ?? 0) >= 2 || (counts['🍋'] ?? 0) >= 2 || (counts['🍊'] ?? 0) >= 2) {
      winAmount = Math.floor(betAmount * 2);
    }

    return Math.floor(winAmount * (1 - houseEdge));
  }

  /** @param {string} itemName @returns {any} */
  getShopItem(itemName) {
    const shop = this.configManager.constant('SHOP_ITEMS') || {};
    return shop[itemName];
  }

  async getMarketData() {
    const cacheKey = 'economy:market';

    let marketData = await this.cache.get(cacheKey);

    if (!marketData) {
      marketData = {
        topItems: await this.inventoryService.getTopItems(10),
        rareItems: await this.inventoryService.getRareItems(10),
        averagePrices: {},
        totalVolume: 0,
        lastUpdated: Date.now(),
      };

      await this.cache.set(cacheKey, marketData, 600000); // 10 minutes
    }

    return marketData;
  }

  /** @param {any} stats @param {{ start?: number; end?: number }} timeRange @returns {any} */
  filterStatsByTimeRange(stats, timeRange) {
    if (!timeRange.start && !timeRange.end) {
      return stats;
    }

    return {
      ...stats,
      filteredBy: {
        start: timeRange.start ?? null,
        end: timeRange.end ?? null,
      },
    };
  }

  /** @param {any} stats @returns {any} */
  summarizeStats(stats) {
    return {
      totalUsers: stats.total_users,
      totalWealth: stats.total_wealth,
      averageWealth: stats.total_users > 0 ? Math.floor(stats.total_wealth / stats.total_users) : 0,
    };
  }

  getTimeUntilNextDaily() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    return this.formatTimeRemaining(diff);
  }

  getNextDailyTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /** @param {number} milliseconds @returns {string} */
  formatTimeRemaining(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

container.singleton('economyService', () => new EconomyService());
