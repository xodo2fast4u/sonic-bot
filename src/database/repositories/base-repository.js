import { container } from '../../core/container.js';
import { DatabaseError, QueryError } from '../../core/errors.js';

export class BaseRepository {
  /** @param {string} tableName */
  constructor(tableName) {
    /** @type {string} */
    this.tableName = tableName;
    /** @type {any|null} */
    this.connectionPool = null;
    /** @type {any|null} */
    this.logger = null;
    /** @type {any|null} */
    this.cache = null;
  }

  async initialize() {
    this.connectionPool = container.resolve('connectionPool');
    this.logger = container.resolve('logger');
    this.cache = container.resolve('cache');
  }

  /** @param {string} query @param {any[]} [params] @param {string} [operation] @returns {Promise<any>} */
  async execute(query, params = [], operation = 'execute') {
    const timer = this.logger.timer(`db:${operation}`);

    try {
      const result = await this.connectionPool.execute(query, params);
      timer.end(true, { table: this.tableName, query: query.substring(0, 100) });
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      timer.end(false, { table: this.tableName, error: err?.message });
      throw new QueryError(err?.message || String(err), query, params);
    }
  }

  /** @param {string} query @param {any[]} [params] @param {string} [operation] @returns {Promise<any>} */
  async get(query, params = [], operation = 'get') {
    const timer = this.logger.timer(`db:${operation}`);

    try {
      const result = await this.connectionPool.get(query, params);
      timer.end(true, { table: this.tableName, query: query.substring(0, 100) });
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      timer.end(false, { table: this.tableName, error: err?.message });
      throw new QueryError(err?.message || String(err), query, params);
    }
  }

  /** @param {string} query @param {any[]} [params] @param {string} [operation] @returns {Promise<any>} */
  async all(query, params = [], operation = 'all') {
    const timer = this.logger.timer(`db:${operation}`);

    try {
      const result = await this.connectionPool.all(query, params);
      timer.end(true, { table: this.tableName, query: query.substring(0, 100) });
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      timer.end(false, { table: this.tableName, error: err?.message });
      throw new QueryError(err?.message || String(err), query, params);
    }
  }

  /** @param {any} callback @returns {Promise<any>} */
  async transaction(callback) {
    const timer = this.logger.timer('db:transaction');

    try {
      const result = await this.connectionPool.transaction(callback);
      timer.end(true, { table: this.tableName });
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      timer.end(false, { table: this.tableName, error: err?.message });
      throw new DatabaseError(`Transaction failed: ${err?.message || String(err)}`);
    }
  }

  /** @param {string|number} id @param {boolean} [useCache] @returns {Promise<any>} */
  async findById(id, useCache = true) {
    const cacheKey = `${this.tableName}:${id}`;

    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.get(query, [id], 'findById');

    if (useCache && result) {
      await this.cache.set(cacheKey, result, 300);
    }

    return result;
  }

  /** @param {any} [conditions] @param {boolean} [useCache] @returns {Promise<any>} */
  async findOne(conditions = {}, useCache = true) {
    const { where, params } = this.buildWhereClause(conditions);
    const query = `SELECT * FROM ${this.tableName} ${where} LIMIT 1`;

    const cacheKey = useCache ? `${this.tableName}:one:${JSON.stringify(conditions)}` : null;

    if (useCache && cacheKey) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    const result = await this.get(query, params, 'findOne');

    if (useCache && cacheKey && result) {
      await this.cache.set(cacheKey, result, 300);
    }

    return result;
  }

  /** @param {any} [conditions] @param {any} [options] @returns {Promise<any>} */
  async findMany(conditions = {}, options = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    const { orderBy, limit, offset } = /** @type {any} */ (options);

    let query = `SELECT * FROM ${this.tableName} ${where}`;

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    return await this.all(query, params, 'findMany');
  }

  /** @param {Record<string, any>} data @returns {Promise<any>} */
  async create(data) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(query, values, 'create');

    await this.clearCache();

    return result;
  }

  /** @param {string|number} id @param {Record<string, any>} data @returns {Promise<any>} */
  async update(id, data) {
    const fields = Object.keys(data);
    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.execute(query, values, 'update');

    await this.cache.delete(`${this.tableName}:${id}`);
    await this.clearCache();

    return result;
  }

  /** @param {string|number} id @returns {Promise<any>} */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.execute(query, [id], 'delete');

    await this.cache.delete(`${this.tableName}:${id}`);
    await this.clearCache();

    return result;
  }

  /** @param {any} conditions @param {any} data @returns {Promise<any>} */
  async updateMany(conditions, data) {
    const { where, params: whereParams } = this.buildWhereClause(conditions);
    const fields = Object.keys(data);
    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];

    const query = `UPDATE ${this.tableName} SET ${setClause} ${where}`;
    const result = await this.execute(query, values, 'updateMany');

    await this.clearCache();

    return result;
  }

  /** @param {any} conditions @returns {Promise<any>} */
  async deleteMany(conditions) {
    const { where, params } = this.buildWhereClause(conditions);
    const query = `DELETE FROM ${this.tableName} ${where}`;
    const result = await this.execute(query, params, 'deleteMany');

    await this.clearCache();

    return result;
  }

  /** @param {any} [conditions] @returns {Promise<number>} */
  async count(conditions = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${where}`;

    const result = await this.get(query, params, 'count');
    return result ? result.count : 0;
  }

  /** @param {any} conditions @returns {Promise<boolean>} */
  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /** @param {any} [conditions] @returns {{where:string,params:any[]}} */
  buildWhereClause(conditions = {}) {
    const keys = Object.keys(/** @type {any} */ (conditions));

    if (keys.length === 0) {
      return { where: '', params: [] };
    }

    const whereClause = keys
      .map((key) => {
        const value = conditions[key];

        if (Array.isArray(value)) {
          return `${key} IN (${value.map(() => '?').join(', ')})`;
        } else if (value !== null && typeof value === 'object') {
          // Handle operators like { '>=': 100, '<': 200 }
          return Object.entries(value)
            .map(([operator]) => {
              switch (operator) {
                case '>':
                  return `${key} > ?`;
                case '>=':
                  return `${key} >= ?`;
                case '<':
                  return `${key} < ?`;
                case '<=':
                  return `${key} <= ?`;
                case '!=':
                  return `${key} != ?`;
                case 'LIKE':
                  return `${key} LIKE ?`;
                default:
                  return `${key} = ?`;
              }
            })
            .join(' AND ');
        } else {
          return `${key} = ?`;
        }
      })
      .join(' AND ');

    /** @type {any[]} */
    const params = [];
    keys.forEach((key) => {
      const value = conditions[key];
      if (Array.isArray(value)) {
        params.push(...value);
      } else if (value !== null && typeof value === 'object') {
        params.push(...Object.values(value));
      } else {
        params.push(value);
      }
    });

    return {
      where: whereClause ? `WHERE ${whereClause}` : '',
      params,
    };
  }

  /** @returns {Promise<void>} */
  async clearCache() {
    if (!this.cache) return;

    try {
      const cacheKeys = await this.cache.keys(`${this.tableName}:*`);

      if (cacheKeys.length === 0) {
        this.logger.debug(`No cache entries found for table: ${this.tableName}`);
        return;
      }

      for (const key of cacheKeys) {
        await this.cache.delete(key);
      }

      this.logger.info(`Cleared ${cacheKeys.length} cache entries for table: ${this.tableName}`, {
        clearedKeys: cacheKeys.length,
        tableName: this.tableName,
      });
    } catch (error) {
      const err = /** @type {any} */ (error);
      this.logger.warn('Failed to clear cache', {
        table: this.tableName,
        error: err?.message || String(err),
      });
      throw err;
    }
  }

  async getStats() {
    const query = `SELECT 
      COUNT(*) as total_records,
      MAX(CASE WHEN created_at IS NOT NULL THEN created_at ELSE 0 END) as latest_record
      FROM ${this.tableName}`;

    return await this.get(query, [], 'getStats');
  }
}
