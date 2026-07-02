import { EventEmitter } from 'events';
import { container } from '../core/container.js';
import { CacheError } from '../core/errors.js';
import { getErrorMessage } from '../utils/error-message.js';

/**
 * @typedef {import('../../types/index.js').CacheOptions} CacheOptions
 */

class CacheEntry {
  /** @param {any} key @param {any} value @param {number|null} [ttl] */
  constructor(key, value, ttl = null) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    /** @type {number|null} */
    this.ttl = ttl;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    if (!this.ttl) return false;
    return Date.now() - this.createdAt > this.ttl;
  }

  access() {
    this.accessCount++;
    this.lastAccessed = Date.now();
    return this.value;
  }

  getStats() {
    return {
      key: this.key,
      createdAt: this.createdAt,
      ttl: this.ttl,
      accessCount: this.accessCount,
      lastAccessed: this.lastAccessed,
      age: Date.now() - this.createdAt,
      isExpired: this.isExpired(),
    };
  }
}

export class CacheManager extends EventEmitter {
  /** @param {CacheOptions} [options] */
  constructor(options = {}) {
    super();
    this.options = {
      maxSize: options.maxSize || 1000,
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      ...options,
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0,
    };

    /** @type {any|null} */
    this.logger = null;
    this.initialized = false;
    /** @type {ReturnType<typeof setInterval>|null} */
    this.cleanupTimer = null;
  }

  async initialize() {
    this.logger = container.resolve('logger');

    this.startCleanupTimer();

    this.initialized = true;
    this.logger.info('Cache manager initialized', {
      maxSize: this.options.maxSize,
      defaultTTL: this.options.defaultTTL,
      cleanupInterval: this.options.cleanupInterval,
    });
  }

  /** @param {any} key @param {any} value @param {number|null} [ttl] */
  async set(key, value, ttl = null) {
    if (!this.initialized) {
      throw new CacheError('Cache manager not initialized');
    }

    try {
      if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
        await this.evictLRU();
      }

      const entry = new CacheEntry(key, value, ttl || this.options.defaultTTL);
      this.cache.set(key, entry);

      this.stats.sets++;

      this.emit('set', { key, ttl: entry.ttl });
      this.logger.debug('Cache set', { key, ttl: entry.ttl });

      return true;
    } catch (error) {
      this.logger.error('Cache set failed', { key, error: getErrorMessage(error) });
      throw new CacheError(`Failed to set cache key ${key}: ${getErrorMessage(error)}`, key);
    }
  }

  /** @param {any} key */
  async get(key) {
    if (!this.initialized) {
      throw new CacheError('Cache manager not initialized');
    }

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        this.emit('miss', { key });
        return null;
      }

      if (entry.isExpired()) {
        this.cache.delete(key);
        this.stats.expirations++;
        this.emit('expired', { key });
        return null;
      }

      this.stats.hits++;
      this.emit('hit', { key });

      return entry.access();
    } catch (error) {
      this.logger.error('Cache get failed', { key, error: getErrorMessage(error) });
      throw new CacheError(`Failed to get cache key ${key}: ${getErrorMessage(error)}`, key);
    }
  }

  /** @param {any} key */
  async has(key) {
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (entry.isExpired()) {
      this.cache.delete(key);
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /** @param {any} key */
  async delete(key) {
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.stats.deletes++;
      this.emit('delete', { key });
      this.logger.debug('Cache delete', { key });
    }

    return deleted;
  }

  async clear() {
    const size = this.cache.size;
    this.cache.clear();

    this.logger.info('Cache cleared', { entries: size });
    this.emit('clear', { entries: size });
  }

  /** @param {any[]} keys */
  async mget(keys) {
    const results = new Map();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /** @param {Iterable<[any, any]>} entries @param {number|null} [ttl] */
  async mset(entries, ttl = null) {
    const results = new Map();

    for (const [key, value] of entries) {
      try {
        await this.set(key, value, ttl);
        results.set(key, true);
      } catch (error) {
        results.set(key, false);
        this.logger.debug('Cache mset entry failed', { key, error: getErrorMessage(error) });
      }
    }

    return results;
  }

  /** @param {any} key @param {() => Promise<any>} factory @param {number|null} [ttl] */
  async getOrSet(key, factory, ttl = null) {
    let value = await this.get(key);

    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }

    return value;
  }

  /** @param {any} key @param {number} [amount] */
  async increment(key, amount = 1) {
    const current = (await this.get(key)) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }

  /** @param {any} key @param {number} [amount] */
  async decrement(key, amount = 1) {
    const current = (await this.get(key)) || 0;
    const newValue = current - amount;
    await this.set(key, newValue);
    return newValue;
  }

  /** @param {string} [pattern] */
  async keys(pattern = '*') {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /** @param {string} pattern */
  async deletePattern(pattern) {
    const keysToDelete = await this.keys(pattern);
    let deleted = 0;

    for (const key of keysToDelete) {
      if (await this.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  async evictLRU() {
    if (this.cache.size === 0) return;

    let lruKey = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.emit('evicted', { key: lruKey });
      this.logger.debug('Cache LRU eviction', { key: lruKey });
    }
  }

  async cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.stats.expirations++;
    }

    if (expiredKeys.length > 0) {
      this.logger.debug('Cache cleanup', { expired: expiredKeys.length, now });
      this.emit('cleanup', { expired: expiredKeys.length, now });
    }

    while (this.cache.size > this.options.maxSize) {
      await this.evictLRU();
    }
  }

  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.options.cleanupInterval);
  }

  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      ...this.stats,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  getEntryStats() {
    const entries = [];

    for (const [key, entry] of this.cache) {
      entries.push({ key, ...entry.getStats() });
    }

    return entries.sort((a, b) => b.accessCount - a.accessCount);
  }

  /** @param {number} [limit] */
  getHotKeys(limit = 10) {
    return this.getEntryStats()
      .filter((entry) => entry.accessCount > 1)
      .slice(0, limit);
  }

  /** @param {number} [limit] */
  getColdKeys(limit = 10) {
    return this.getEntryStats()
      .filter((entry) => entry.accessCount <= 1)
      .slice(0, limit);
  }

  getMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64;
    }

    return {
      estimatedBytes: totalSize,
      estimatedMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expirations: 0,
    };

    this.logger.info('Cache statistics reset');
  }

  async export() {
    /** @type {Record<string, any>} */
    const data = {};

    for (const [key, entry] of this.cache) {
      if (!entry.isExpired()) {
        data[key] = {
          value: entry.value,
          ttl: entry.ttl,
          createdAt: entry.createdAt,
        };
      }
    }

    return data;
  }

  /** @param {Record<string, any>} data */
  async import(data) {
    await this.clear();

    for (const [key, entryData] of Object.entries(data)) {
      const entry = new CacheEntry(key, entryData.value, entryData.ttl);
      entry.createdAt = entryData.createdAt;

      if (!entry.isExpired()) {
        this.cache.set(key, entry);
      }
    }

    this.logger.info('Cache imported', { entries: Object.keys(data).length });
  }

  async destroy() {
    this.stopCleanupTimer();
    await this.clear();
    this.removeAllListeners();
    this.initialized = false;

    this.logger.info('Cache manager destroyed');
  }
}

container.singleton('cache', () => new CacheManager());
