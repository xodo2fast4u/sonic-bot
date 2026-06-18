import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { container } from '../core/container.js';

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      commands: new Map(),
      database: new Map(),
      network: new Map(),
      errors: new Map(),
    };
    this.startTime = Date.now();
  }

  recordCommand(command, duration, success = true) {
    if (!this.metrics.commands.has(command)) {
      this.metrics.commands.set(command, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = this.metrics.commands.get(command);
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  recordDatabase(operation, duration, success = true) {
    if (!this.metrics.database.has(operation)) {
      this.metrics.database.set(operation, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = this.metrics.database.get(operation);
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  recordNetwork(operation, duration, success = true) {
    if (!this.metrics.network.has(operation)) {
      this.metrics.network.set(operation, { count: 0, totalTime: 0, errors: 0 });
    }

    const metric = this.metrics.network.get(operation);
    metric.count++;
    metric.totalTime += duration;
    if (!success) metric.errors++;
  }

  recordError(errorType) {
    if (!this.metrics.errors.has(errorType)) {
      this.metrics.errors.set(errorType, 0);
    }
    this.metrics.errors.set(errorType, this.metrics.errors.get(errorType) + 1);
  }

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

  createPinoLogger() {
    const pinoConfig = {
      level: this.config.level,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
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
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      };
    }

    return pino(pinoConfig);
  }

  log(level, message, data = {}, correlationId = null) {
    const logData = {
      ...data,
      correlationId: correlationId || this.getCurrentCorrelationId(),
    };

    this.pino[level](logData, message);
  }

  fatal(message, data = {}, correlationId = null) {
    this.log('fatal', message, data, correlationId);
  }

  error(message, data = {}, correlationId = null) {
    this.log('error', message, data, correlationId);
    if (data.error?.constructor) {
      this.metrics.recordError(data.error.constructor.name);
    }
  }

  warn(message, data = {}, correlationId = null) {
    this.log('warn', message, data, correlationId);
  }

  info(message, data = {}, correlationId = null) {
    this.log('info', message, data, correlationId);
  }

  debug(message, data = {}, correlationId = null) {
    this.log('debug', message, data, correlationId);
  }

  trace(message, data = {}, correlationId = null) {
    this.log('trace', message, data, correlationId);
  }

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

  logCommand(command, user, args, duration, success, error = null) {
    const logData = {
      command,
      user,
      argsCount: args?.length || 0,
      duration,
      success,
    };

    if (error) {
      logData.error = error.message;
      logData.errorType = error.constructor.name;
    }

    if (success) {
      this.info(`Command executed: ${command}`, logData);
    } else {
      this.error(`Command failed: ${command}`, logData);
    }

    this.logPerformance(`command:${command}`, duration, success);
  }

  logDatabase(operation, table, duration, success, error = null) {
    const logData = {
      operation,
      table,
      duration,
      success,
    };

    if (error) {
      logData.error = error.message;
    }

    if (success) {
      this.debug(`Database operation: ${operation}`, logData);
    } else {
      this.error(`Database operation failed: ${operation}`, logData);
    }

    this.logPerformance(`db:${operation}`, duration, success);
  }

  logNetwork(operation, endpoint, duration, success, error = null) {
    const logData = {
      operation,
      endpoint,
      duration,
      success,
    };

    if (error) {
      logData.error = error.message;
      logData.statusCode = error.status;
    }

    if (success) {
      this.debug(`Network operation: ${operation}`, logData);
    } else {
      this.error(`Network operation failed: ${operation}`, logData);
    }

    this.logPerformance(`network:${operation}`, duration, success);
  }

  setContext(correlationId, data = {}) {
    this.contextStore.set(correlationId, {
      ...data,
      startTime: Date.now(),
    });
  }

  getContext(correlationId) {
    return this.contextStore.get(correlationId);
  }

  clearContext(correlationId) {
    this.contextStore.delete(correlationId);
  }

  getCurrentCorrelationId() {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId || null;
  }

  withCorrelationId(correlationId, callback) {
    const context = { correlationId };
    return this.asyncLocalStorage.run(context, callback);
  }

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

  child(context) {
    const childLogger = Object.create(this);
    childLogger.pino = this.pino.child(context);
    return childLogger;
  }

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

container.singleton('logger', (c) => {
  const configManager = c.resolve('configManager');
  return createLogger(configManager.getAll());
});

export const logger = () => container.resolve('logger');
