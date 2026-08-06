import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { createRequire } from 'module';
import { container } from '../core/container.js';

const require = createRequire(import.meta.url);

/**
 * @typedef {{count:number,totalTime:number,errors:number}} Metric
 * @typedef {{commands:Map<string,Metric>,database:Map<string,Metric>,network:Map<string,Metric>,errors:Map<string,number>}} MetricsMap
 * @typedef {{message?:string,status?:number}} ErrorLike
 */

class PerformanceMetrics {
  constructor() {
    /** @type {MetricsMap} */
    this.metrics = {
      commands: new Map(),
      database: new Map(),
      network: new Map(),
      errors: new Map(),
    };
    this.startTime = Date.now();
  }

  /** @param {string} command @param {number} duration @param {boolean} [success] */
  recordCommand(command, duration, success = true) {
    if (!this.metrics.commands.has(command)) {
      this.metrics.commands.set(command, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = /** @type {Metric} */ (this.metrics.commands.get(command));
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  /** @param {string} operation @param {number} duration @param {boolean} [success] */
  recordDatabase(operation, duration, success = true) {
    if (!this.metrics.database.has(operation)) {
      this.metrics.database.set(operation, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = /** @type {Metric} */ (this.metrics.database.get(operation));
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  /** @param {string} operation @param {number} duration @param {boolean} [success] */
  recordNetwork(operation, duration, success = true) {
    if (!this.metrics.network.has(operation)) {
      this.metrics.network.set(operation, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = /** @type {Metric} */ (this.metrics.network.get(operation));
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  /** @param {string} errorType */
  recordError(errorType) {
    if (!this.metrics.errors.has(errorType)) {
      this.metrics.errors.set(errorType, 0);
    }
    const prev = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, prev + 1);
  }

  /** @returns {object} */
  getMetrics() {
    const uptime = Date.now() - this.startTime;

    return {
      uptime,
      commands: Object.fromEntries(
        Array.from(this.metrics.commands.entries()).map(([cmd, metric]) => [
          cmd,
          {
            ...metric,
            avgTime: metric.totalTime / metric.count,
            errorRate: metric.errors / metric.count,
          },
        ]),
      ),
      database: Object.fromEntries(
        Array.from(this.metrics.database.entries()).map(([op, metric]) => [
          op,
          {
            ...metric,
            avgTime: metric.totalTime / metric.count,
            errorRate: metric.errors / metric.count,
          },
        ]),
      ),
      network: Object.fromEntries(
        Array.from(this.metrics.network.entries()).map(([op, metric]) => [
          op,
          {
            ...metric,
            avgTime: metric.totalTime / metric.count,
            errorRate: metric.errors / metric.count,
          },
        ]),
      ),
      errors: Object.fromEntries(this.metrics.errors),
    };
  }

  reset() {
    this.metrics = {
      commands: new Map(),
      database: new Map(),
      network: new Map(),
      errors: new Map(),
    };
  }
}

export class EnhancedLogger {
  /** @param {any} [config] */
  constructor(config = {}) {
    this.config = {
      level: config.logLevel || 'info',
      prettyPrint: config.environment !== 'production',
      ...config,
    };

    this.metrics = new PerformanceMetrics();
    this.pino = this.createPinoLogger();
    this.contextStore = new Map();
    this.asyncLocalStorage = new AsyncLocalStorage();
  }

  /** @returns {import('pino').Logger} */
  createPinoLogger() {
    /** @type {any} */
    const pinoConfig = {
      level: this.config.level,
      formatters: {
        level: (/** @type {any} */ label) => ({ level: label }),
        log: (/** @type {any} */ object) => {
          const { correlationId, ...rest } = object;
          return {
            ...rest,
            correlationId,
            timestamp: new Date().toISOString(),
            service: 'sonic-bot',
          };
        },
      },
    };

    if (this.config.prettyPrint) {
      try {
        require.resolve('pino-pretty');
        pinoConfig.transport = {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        };
      } catch (err) {
        console.warn('pino-pretty is unavailable; using standard pino output');
      }
    }

    return pino(pinoConfig);
  }

  /** @param {string} level @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  log(level, message, data = {}, correlationId = null) {
    const logData = /** @type {any} */ ({
      ...data,
      correlationId: correlationId || this.getCurrentCorrelationId(),
    });

    // @ts-ignore dynamic level call
    this.pino[level](logData, message);
  }

  /** @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  fatal(message, data = {}, correlationId = null) {
    this.log('fatal', message, data, correlationId);
  }

  /** @param {string} message @param {{error?:ErrorLike}} [data] @param {string|null} [correlationId] */
  error(message, data = {}, correlationId = null) {
    this.log('error', message, data, correlationId);
    const err = /** @type {any} */ (data.error);
    if (err && err.constructor) {
      this.metrics.recordError(err.constructor.name);
    }
  }

  /** @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  warn(message, data = {}, correlationId = null) {
    this.log('warn', message, data, correlationId);
  }

  /** @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  info(message, data = {}, correlationId = null) {
    this.log('info', message, data, correlationId);
  }

  /** @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  debug(message, data = {}, correlationId = null) {
    this.log('debug', message, data, correlationId);
  }

  /** @param {string} message @param {object} [data] @param {string|null} [correlationId] */
  trace(message, data = {}, correlationId = null) {
    this.log('trace', message, data, correlationId);
  }

  /** @param {string} operation @param {number} duration @param {boolean} [success] @param {object} [data] */
  logPerformance(operation, duration, success = true, data = {}) {
    this.debug(`Performance: ${operation}`, {
      operation,
      duration,
      success,
      ...data,
    });

    if (operation.startsWith('command:')) {
      const command = operation.replace('command:', '');
      this.metrics.recordCommand(command, duration, success);
    } else if (operation.startsWith('db:')) {
      const dbOp = operation.replace('db:', '');
      this.metrics.recordDatabase(dbOp, duration, success);
    } else if (operation.startsWith('network:')) {
      const netOp = operation.replace('network:', '');
      this.metrics.recordNetwork(netOp, duration, success);
    }
  }

  /** @param {string} command @param {any} user @param {any[]} args @param {number} duration @param {boolean} success @param {ErrorLike|null} [error] */
  logCommand(command, user, args, duration, success, error = null) {
    const logData = /** @type {any} */ ({
      command,
      user,
      argsCount: args?.length || 0,
      duration,
      success,
    });

    if (error) {
      logData.error = error.message;
      logData.errorType = /** @type {any} */ (error).constructor?.name || 'Error';
    }

    if (success) {
      this.info(`Command executed: ${command}`, logData);
    } else {
      this.error(`Command failed: ${command}`, /** @type {any} */ (logData));
    }

    this.logPerformance(`command:${command}`, duration, success);
  }

  /** @param {string} operation @param {string} table @param {number} duration @param {boolean} success @param {ErrorLike|null} [error] */
  logDatabase(operation, table, duration, success, error = null) {
    const logData = /** @type {any} */ ({
      operation,
      table,
      duration,
      success,
    });

    if (error) {
      logData.error = error.message;
    }

    if (success) {
      this.debug(`Database operation: ${operation}`, logData);
    } else {
      this.error(`Database operation failed: ${operation}`, /** @type {any} */ (logData));
    }

    this.logPerformance(`db:${operation}`, duration, success);
  }

  /** @param {string} operation @param {string} endpoint @param {number} duration @param {boolean} success @param {ErrorLike|null} [error] */
  logNetwork(operation, endpoint, duration, success, error = null) {
    const logData = /** @type {any} */ ({
      operation,
      endpoint,
      duration,
      success,
    });

    if (error) {
      logData.error = error.message;
      logData.statusCode = error.status;
    }

    if (success) {
      this.debug(`Network operation: ${operation}`, logData);
    } else {
      this.error(`Network operation failed: ${operation}`, /** @type {any} */ (logData));
    }

    this.logPerformance(`network:${operation}`, duration, success);
  }

  /** @param {string} correlationId @param {object} [data] */
  setContext(correlationId, data = {}) {
    this.contextStore.set(correlationId, {
      ...data,
      startTime: Date.now(),
    });
  }

  /** @param {string} correlationId */
  getContext(correlationId) {
    return this.contextStore.get(correlationId);
  }

  /** @param {string} correlationId */
  clearContext(correlationId) {
    this.contextStore.delete(correlationId);
  }

  getCurrentCorrelationId() {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId || null;
  }

  /** @param {string} correlationId @param {Function} callback */
  withCorrelationId(correlationId, callback) {
    const context = { correlationId };
    return this.asyncLocalStorage.run(context, () => callback());
  }

  /** @param {string} correlationId */
  setCorrelationId(correlationId) {
    const currentContext = this.asyncLocalStorage.getStore() || {};
    currentContext.correlationId = correlationId;
    this.asyncLocalStorage.enterWith(currentContext);
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  resetMetrics() {
    this.metrics.reset();
  }

  /** @param {object} context */
  child(context) {
    const childLogger = Object.create(this);
    childLogger.pino = this.pino.child(context);
    return childLogger;
  }

  /** @param {string} operation */
  timer(operation) {
    const startTime = process.hrtime.bigint();

    return {
      end: (success = true, data = {}) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        this.logPerformance(operation, duration, success, data);
        return duration;
      },
    };
  }
}

export function createLogger(config = {}) {
  return new EnhancedLogger(config);
}

container.singleton('logger', (/** @type {any} */ c) => {
  try {
    const configManager = c.resolve('configManager');
    return createLogger(configManager.getAll());
  } catch {
    return createLogger({ logLevel: 'info' });
  }
});

export const logger = () => container.resolve('logger');
