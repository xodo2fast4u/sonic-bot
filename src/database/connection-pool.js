import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { container } from '../core/container.js';
import { DatabaseError, ConnectionError } from '../core/errors.js';

/** @param {string} dbPath @param {any} [options] */
class Connection {
  /** @param {string} dbPath @param {any} [options] */
  constructor(dbPath, options = {}) {
    /** @type {any|null} */
    this.db = null;
    /** @type {string} */
    this.dbPath = dbPath;
    /** @type {any} */
    this.options = options;
    this.inUse = false;
    this.createdAt = Date.now();
    this.lastUsed = Date.now();
    this.queryCount = 0;
  }

  /** @returns {Promise<any>} */
  async connect() {
    if (this.db) return this.db;

    try {
      this.db = new Database(this.dbPath, {
        ...this.options,
        verbose: process.env['NODE_ENV'] === 'development' ? console.log : undefined,
      });

      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      this.db.pragma('temp_store = MEMORY');
      this.db.pragma('mmap_size = 268435456');

      return this.db;
    } catch (error) {
      const err = /** @type {any} */ (error);
      throw new ConnectionError(`Failed to connect to database: ${err?.message || String(err)}`, {
        dbPath: this.dbPath,
      });
    }
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any>} */
  async execute(query, params = []) {
    if (!this.db) {
      await this.connect();
    }

    this.inUse = true;
    this.lastUsed = Date.now();
    this.queryCount++;

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      throw new DatabaseError(`Query execution failed: ${err?.message || String(err)}`, query, {
        params,
      });
    } finally {
      this.inUse = false;
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any>} */
  async get(query, params = []) {
    if (!this.db) {
      await this.connect();
    }

    this.inUse = true;
    this.lastUsed = Date.now();
    this.queryCount++;

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.get(...params);
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      throw new DatabaseError(`Query execution failed: ${err?.message || String(err)}`, query, {
        params,
      });
    } finally {
      this.inUse = false;
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any[]>} */
  async all(query, params = []) {
    if (!this.db) {
      await this.connect();
    }

    this.inUse = true;
    this.lastUsed = Date.now();
    this.queryCount++;

    try {
      const stmt = this.db.prepare(query);
      const result = stmt.all(...params);
      return result;
    } catch (error) {
      const err = /** @type {any} */ (error);
      throw new DatabaseError(`Query execution failed: ${err?.message || String(err)}`, query, {
        params,
      });
    } finally {
      this.inUse = false;
    }
  }

  /** @param {number} maxAge @returns {boolean} */
  isExpired(maxAge) {
    return Date.now() - this.createdAt > maxAge;
  }

  /** @param {number} maxIdleTime @returns {boolean} */
  isIdle(maxIdleTime) {
    return Date.now() - this.lastUsed > maxIdleTime;
  }
}

export class ConnectionPool extends EventEmitter {
  /** @param {{maxConnections?:number,minConnections?:number,maxIdleTime?:number,maxAge?:number,acquireTimeout?:number}} [options] */
  constructor(options = {}) {
    super();
    /** @type {{maxConnections:number,minConnections:number,maxIdleTime:number,maxAge:number,acquireTimeout:number}} */
    this.options = {
      maxConnections: options.maxConnections || 10,
      minConnections: options.minConnections || 2,
      maxIdleTime: options.maxIdleTime || 300000,
      maxAge: options.maxAge || 3600000,
      acquireTimeout: options.acquireTimeout || 10000,
      ...options,
    };

    /** @type {any[]} */
    this.connections = [];
    /** @type {Array<{resolve:(connection:any)=>void,reject:(error:any)=>void}>} */
    this.waitingQueue = [];
    this.totalConnections = 0;
    this.activeConnections = 0;
    /** @type {any|null} */
    this.logger = null;
    /** @type {string} */
    this.dbPath = '';
    this.initialized = false;
  }

  /** @param {string} dbPath @returns {Promise<void>} */
  async initialize(dbPath) {
    this.dbPath = dbPath;
    this.logger = container.resolve('logger');

    for (let i = 0; i < this.options.minConnections; i++) {
      await this.createConnection();
    }

    this.startMaintenanceTimer();

    this.initialized = true;
    this.logger.info('Connection pool initialized', {
      dbPath,
      minConnections: this.options.minConnections,
      maxConnections: this.options.maxConnections,
    });

    this.emit('initialized');
  }

  /** @returns {Promise<any>} */
  async createConnection() {
    if (this.totalConnections >= this.options.maxConnections) {
      throw new DatabaseError('Maximum connections reached');
    }

    const connection = new Connection(this.dbPath, this.options);
    await connection.connect();

    this.connections.push(connection);
    this.totalConnections++;

    this.logger.debug('Created new database connection', {
      totalConnections: this.totalConnections,
    });

    return connection;
  }

  /** @returns {Promise<any>} */
  async acquire() {
    if (!this.initialized) {
      throw new DatabaseError('Connection pool not initialized');
    }

    const availableConnection = this.connections.find((conn) => !conn.inUse);

    if (availableConnection) {
      this.activeConnections++;
      return availableConnection;
    }

    if (this.totalConnections < this.options.maxConnections) {
      const newConnection = await this.createConnection();
      this.activeConnections++;
      return newConnection;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex((item) => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new DatabaseError('Connection acquire timeout'));
      }, this.options.acquireTimeout);

      this.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          this.activeConnections++;
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  /** @param {any} connection @returns {Promise<void>} */
  async release(connection) {
    this.activeConnections--;

    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        waiter.resolve(connection);
      }
      return;
    }

    if (
      this.totalConnections > this.options.minConnections &&
      connection.isIdle(this.options.maxIdleTime)
    ) {
      await this.removeConnection(connection);
    }
  }

  /** @param {any} connection @returns {Promise<void>} */
  async removeConnection(connection) {
    const index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.connections.splice(index, 1);
      this.totalConnections--;
      await connection.disconnect();

      this.logger.debug('Removed database connection', {
        totalConnections: this.totalConnections,
      });
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any>} */
  async execute(query, params = []) {
    const connection = await this.acquire();
    try {
      return await connection.execute(query, params);
    } finally {
      await this.release(connection);
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any>} */
  async get(query, params = []) {
    const connection = await this.acquire();
    try {
      return await connection.get(query, params);
    } finally {
      await this.release(connection);
    }
  }

  /** @param {string} query @param {any[]} [params] @returns {Promise<any[]>} */
  async all(query, params = []) {
    const connection = await this.acquire();
    try {
      return await connection.all(query, params);
    } finally {
      await this.release(connection);
    }
  }

  /** @param {any} callback @returns {Promise<any>} */
  async transaction(callback) {
    const connection = await this.acquire();
    try {
      const result = await connection.db.transaction(callback)();
      return result;
    } finally {
      await this.release(connection);
    }
  }

  startMaintenanceTimer() {
    setInterval(() => {
      this.maintenance();
    }, 60000);
  }

  async maintenance() {
    const connectionsToRemove = [];

    for (const connection of this.connections) {
      if (connection.isExpired(this.options.maxAge)) {
        connectionsToRemove.push(connection);
      } else if (
        this.totalConnections > this.options.minConnections &&
        connection.isIdle(this.options.maxIdleTime)
      ) {
        connectionsToRemove.push(connection);
      }
    }

    for (const connection of connectionsToRemove) {
      await this.removeConnection(connection);
    }

    while (this.totalConnections < this.options.minConnections) {
      await this.createConnection();
    }

    if (connectionsToRemove.length > 0) {
      this.logger.debug('Maintenance completed', {
        removedConnections: connectionsToRemove.length,
        totalConnections: this.totalConnections,
      });
    }
  }

  getStats() {
    return {
      totalConnections: this.totalConnections,
      activeConnections: this.activeConnections,
      idleConnections: this.totalConnections - this.activeConnections,
      waitingQueue: this.waitingQueue.length,
      maxConnections: this.options.maxConnections,
      minConnections: this.options.minConnections,
    };
  }

  async close() {
    for (const connection of this.connections) {
      await connection.disconnect();
    }

    this.connections = [];
    this.totalConnections = 0;
    this.activeConnections = 0;
    this.initialized = false;

    this.logger.info('Connection pool closed');
  }
}

container.singleton('connectionPool', () => new ConnectionPool());
