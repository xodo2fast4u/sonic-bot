import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {import('../../types/index.js').SonicErrorContext} SonicErrorContext
 */

export class SonicError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {SonicErrorContext} [context]
   * @param {string|null} [correlationId]
   */
  constructor(message, code = 'SONIC_ERROR', context = {}, correlationId = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    /** @type {SonicErrorContext} */
    this.context = context;
    this.correlationId = correlationId || uuidv4();
    this.timestamp = new Date().toISOString();
    /** @type {'fatal' | 'error' | 'warn' | 'info'} */
    this.severity = 'error';
    /** @type {unknown} */
    this.originalError = undefined;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      severity: this.severity,
      stack: this.stack,
    };
  }

  getUserMessage() {
    return this.message;
  }
}

export class ConfigurationError extends SonicError {
  /** @param {string} message @param {SonicErrorContext} [context] */
  constructor(message, context = {}) {
    super(message, 'CONFIG_ERROR', context);
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('fatal');
  }
}

export class ValidationError extends ConfigurationError {
  /** @param {string} field @param {any} value @param {string} reason @param {SonicErrorContext} [context] */
  constructor(field, value, reason, context = {}) {
    super(`Validation failed for ${field}: ${reason}`, { field, value, ...context });
    this.code = 'VALIDATION_ERROR';
  }
}

export class DatabaseError extends SonicError {
  /** @param {string} message @param {any} [query] @param {SonicErrorContext} [context] */
  constructor(message, query = null, context = {}) {
    super(message, 'DATABASE_ERROR', { query, ...context });
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('error');
  }
}

export class ConnectionError extends DatabaseError {
  /** @param {string} message @param {SonicErrorContext} [context] */
  constructor(message, context = {}) {
    super(message, null, context);
    this.code = 'CONNECTION_ERROR';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('fatal');
  }
}

export class QueryError extends DatabaseError {
  /** @param {string} message @param {any} query @param {any[]} [params] @param {SonicErrorContext} [context] */
  constructor(message, query, params = [], context = {}) {
    super(message, query, { params, ...context });
    this.code = 'QUERY_ERROR';
  }
}

export class CommandError extends SonicError {
  /** @param {string} message @param {string|null} [command] @param {SonicErrorContext} [context] */
  constructor(message, command = null, context = {}) {
    super(message, 'COMMAND_ERROR', { command, ...context });
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('error');
  }
}

export class CommandNotFoundError extends CommandError {
  /** @param {string} command @param {SonicErrorContext} [context] */
  constructor(command, context = {}) {
    super(`Command not found: ${command}`, command, context);
    this.code = 'COMMAND_NOT_FOUND';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class PermissionError extends CommandError {
  /** @param {string} message @param {string|null} [user] @param {string|null} [requiredPermission] @param {SonicErrorContext} [context] */
  constructor(message, user = null, requiredPermission = null, context = {}) {
    super(message, null, { user, requiredPermission, ...context });
    this.code = 'PERMISSION_ERROR';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class CooldownError extends CommandError {
  /** @param {string} command @param {number} remainingTime @param {SonicErrorContext} [context] */
  constructor(command, remainingTime, context = {}) {
    super(`Command ${command} is on cooldown`, command, { remainingTime, ...context });
    this.code = 'COOLDOWN_ERROR';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('info');
  }

  /** @override */
  getUserMessage() {
    const remainingTime = /** @type {number} */ (this.context.remainingTime ?? 0);
    return `⏱️ Please wait ${Math.ceil(remainingTime / 1000)} seconds before using this command again.`;
  }
}

export class EconomyError extends SonicError {
  /** @param {string} message @param {string|null} [userId] @param {SonicErrorContext} [context] */
  constructor(message, userId = null, context = {}) {
    super(message, 'ECONOMY_ERROR', { userId, ...context });
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('error');
  }
}

export class InsufficientFundsError extends EconomyError {
  /** @param {string} userId @param {number} required @param {number} available @param {SonicErrorContext} [context] */
  constructor(userId, required, available, context = {}) {
    super(`Insufficient funds: required ${required}, available ${available}`, userId, {
      required,
      available,
      ...context,
    });
    this.code = 'INSUFFICIENT_FUNDS';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }

  /** @override */
  getUserMessage() {
    const required = /** @type {number} */ (this.context.required ?? 0);
    const available = /** @type {number} */ (this.context.available ?? 0);
    return `💸 Insufficient funds! You need ${required} but only have ${available}.`;
  }
}

export class InvalidTransactionError extends EconomyError {
  /** @param {string} reason @param {string|null} [userId] @param {SonicErrorContext} [context] */
  constructor(reason, userId = null, context = {}) {
    super(`Invalid transaction: ${reason}`, userId, { reason, ...context });
    this.code = 'INVALID_TRANSACTION';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class NetworkError extends SonicError {
  /** @param {string} message @param {SonicErrorContext} [context] */
  constructor(message, context = {}) {
    super(message, 'NETWORK_ERROR', context);
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('error');
  }
}

export class ConnectionLostError extends NetworkError {
  /** @param {SonicErrorContext} [context] */
  constructor(context = {}) {
    super('WhatsApp connection lost', context);
    this.code = 'CONNECTION_LOST';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class RateLimitError extends NetworkError {
  /** @param {number} limit @param {number} window @param {SonicErrorContext} [context] */
  constructor(limit, window, context = {}) {
    super(`Rate limit exceeded: ${limit} requests per ${window}ms`, { limit, window, ...context });
    this.code = 'RATE_LIMIT';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }

  /** @override */
  getUserMessage() {
    return `⏱️ Rate limit exceeded. Please wait before trying again.`;
  }
}

export class CacheError extends SonicError {
  /** @param {string} message @param {string|null} [key] @param {SonicErrorContext} [context] */
  constructor(message, key = null, context = {}) {
    super(message, 'CACHE_ERROR', { key, ...context });
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class AuthenticationError extends SonicError {
  /** @param {string} message @param {SonicErrorContext} [context] */
  constructor(message, context = {}) {
    super(message, 'AUTH_ERROR', context);
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('error');
  }
}

export class UnauthorizedError extends AuthenticationError {
  /** @param {string|null} [user] @param {string|null} [resource] @param {SonicErrorContext} [context] */
  constructor(user = null, resource = null, context = {}) {
    super(`Unauthorized access to ${resource}`, { user, resource, ...context });
    this.code = 'UNAUTHORIZED';
    this.severity = /** @type {'fatal' | 'error' | 'warn' | 'info'} */ ('warn');
  }
}

export class ErrorFactory {
  /** @param {any} error @param {any} [query] */
  static fromDatabaseError(error, query = null) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return new ValidationError('database', query, 'Constraint violation');
    }
    if (error.code === 'SQLITE_BUSY') {
      return new DatabaseError('Database is busy', query);
    }
    return new DatabaseError(error.message, query);
  }

  /** @param {any} error */
  static fromNetworkError(error) {
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return new ConnectionLostError();
    }
    if (error.status === 429) {
      return new RateLimitError(error.limit, error.window);
    }
    return new NetworkError(error.message);
  }

  /** @param {any} error @param {string} correlationId */
  static withCorrelation(error, correlationId) {
    if (error instanceof SonicError) {
      error.correlationId = correlationId;
      return error;
    }

    const sonicError = new SonicError(error.message, 'EXTERNAL_ERROR');
    sonicError.correlationId = correlationId;
    sonicError.originalError = error;
    return sonicError;
  }
}

export class ErrorBoundary {
  /** @param {any} logger @param {any} eventBus */
  constructor(logger, eventBus) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.errorCounts = new Map();
    /** @type {Record<string, number>} */
    this.errorThresholds = {
      [CommandError.name]: 10,
      [DatabaseError.name]: 5,
      [NetworkError.name]: 3,
    };
  }

  /** @param {any} error @param {SonicErrorContext} [context] */
  async handleError(error, context = {}) {
    const correlationId = error.correlationId || uuidv4();

    this.countError(error);

    this.logger.error('Error occurred', {
      error: error.toJSON ? error.toJSON() : error,
      context,
      correlationId,
    });

    await this.eventBus.emitEvent('error:occurred', {
      error,
      context,
      correlationId,
    });

    if (this.shouldTakeAction(error)) {
      await this.takeAction(error, context);
    }

    return {
      handled: true,
      correlationId,
      userMessage: error.getUserMessage ? error.getUserMessage() : 'An error occurred',
    };
  }

  /** @param {any} error */
  countError(error) {
    const key = error.constructor.name;
    const now = Date.now();
    const window = 60000;

    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, []);
    }

    const errors = /** @type {number[]} */ (this.errorCounts.get(key));
    errors.push(now);

    while (errors.length > 0 && (errors[0] ?? 0) < now - window) {
      errors.shift();
    }
  }

  /** @param {any} error */
  shouldTakeAction(error) {
    const key = error.constructor.name;
    const threshold = this.errorThresholds[key];

    if (!threshold) return false;

    const errors = this.errorCounts.get(key) || [];
    return errors.length >= threshold;
  }

  /** @param {any} error @param {SonicErrorContext} [context] */
  async takeAction(error, context) {
    const key = error.constructor.name;

    switch (key) {
      case 'DatabaseError':
        await this.eventBus.emitEvent('system:database-degraded', { error, context });
        break;
      case 'NetworkError':
        await this.eventBus.emitEvent('system:network-degraded', { error, context });
        break;
      case 'CommandError':
        await this.eventBus.emitEvent('system:command-spam', { error, context });
        break;
      default:
        await this.eventBus.emitEvent('system:critical-error', { error, context });
    }
  }
}

import { container } from './container.js';
container.singleton('errorBoundary', (c) => {
  return new ErrorBoundary(c.resolve('logger'), c.resolve('eventBus'));
});
