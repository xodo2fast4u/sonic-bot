import { v4 as uuidv4 } from 'uuid'

export class SonicError extends Error {
  constructor(message, code = 'SONIC_ERROR', context = {}, correlationId = null) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    this.correlationId = correlationId || uuidv4()
    this.timestamp = new Date().toISOString()
    this.severity = 'error'

    Error.captureStackTrace(this, this.constructor)
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
    }
  }

  getUserMessage() {
    return this.message
  }
}

export class ConfigurationError extends SonicError {
  constructor(message, context = {}) {
    super(message, 'CONFIG_ERROR', context)
    this.severity = 'fatal'
  }
}

export class ValidationError extends ConfigurationError {
  constructor(field, value, reason, context = {}) {
    super(`Validation failed for ${field}: ${reason}`, { field, value, ...context })
    this.code = 'VALIDATION_ERROR'
  }
}

export class DatabaseError extends SonicError {
  constructor(message, query = null, context = {}) {
    super(message, 'DATABASE_ERROR', { query, ...context })
    this.severity = 'error'
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message, context = {}) {
    super(message, null, context)
    this.code = 'CONNECTION_ERROR'
    this.severity = 'fatal'
  }
}

export class QueryError extends DatabaseError {
  constructor(message, query, params = [], context = {}) {
    super(message, query, { params, ...context })
    this.code = 'QUERY_ERROR'
  }
}

export class CommandError extends SonicError {
  constructor(message, command = null, context = {}) {
    super(message, 'COMMAND_ERROR', { command, ...context })
    this.severity = 'error'
  }
}

export class CommandNotFoundError extends CommandError {
  constructor(command, context = {}) {
    super(`Command not found: ${command}`, command, context)
    this.code = 'COMMAND_NOT_FOUND'
    this.severity = 'warn'
  }
}

export class PermissionError extends CommandError {
  constructor(message, user = null, requiredPermission = null, context = {}) {
    super(message, null, { user, requiredPermission, ...context })
    this.code = 'PERMISSION_ERROR'
    this.severity = 'warn'
  }
}

export class CooldownError extends CommandError {
  constructor(command, remainingTime, context = {}) {
    super(`Command ${command} is on cooldown`, command, { remainingTime, ...context })
    this.code = 'COOLDOWN_ERROR'
    this.severity = 'info'
  }

  getUserMessage() {
    return `⏱️ Please wait ${Math.ceil(this.context.remainingTime / 1000)} seconds before using this command again.`
  }
}

export class EconomyError extends SonicError {
  constructor(message, userId = null, context = {}) {
    super(message, 'ECONOMY_ERROR', { userId, ...context })
    this.severity = 'error'
  }
}

export class InsufficientFundsError extends EconomyError {
  constructor(userId, required, available, context = {}) {
    super(`Insufficient funds: required ${required}, available ${available}`, userId, {
      required,
      available,
      ...context,
    })
    this.code = 'INSUFFICIENT_FUNDS'
    this.severity = 'warn'
  }

  getUserMessage() {
    return `💸 Insufficient funds! You need ${this.context.required} but only have ${this.context.available}.`
  }
}

export class InvalidTransactionError extends EconomyError {
  constructor(reason, userId = null, context = {}) {
    super(`Invalid transaction: ${reason}`, userId, { reason, ...context })
    this.code = 'INVALID_TRANSACTION'
    this.severity = 'warn'
  }
}

export class NetworkError extends SonicError {
  constructor(message, context = {}) {
    super(message, 'NETWORK_ERROR', context)
    this.severity = 'error'
  }
}

export class ConnectionLostError extends NetworkError {
  constructor(context = {}) {
    super('WhatsApp connection lost', context)
    this.code = 'CONNECTION_LOST'
    this.severity = 'warn'
  }
}

export class RateLimitError extends NetworkError {
  constructor(limit, window, context = {}) {
    super(`Rate limit exceeded: ${limit} requests per ${window}ms`, { limit, window, ...context })
    this.code = 'RATE_LIMIT'
    this.severity = 'warn'
  }

  getUserMessage() {
    return `⏱️ Rate limit exceeded. Please wait before trying again.`
  }
}

export class CacheError extends SonicError {
  constructor(message, key = null, context = {}) {
    super(message, 'CACHE_ERROR', { key, ...context })
    this.severity = 'warn'
  }
}

export class AuthenticationError extends SonicError {
  constructor(message, context = {}) {
    super(message, 'AUTH_ERROR', context)
    this.severity = 'error'
  }
}

export class UnauthorizedError extends AuthenticationError {
  constructor(user = null, resource = null, context = {}) {
    super(`Unauthorized access to ${resource}`, { user, resource, ...context })
    this.code = 'UNAUTHORIZED'
    this.severity = 'warn'
  }
}

export class ErrorFactory {
  static fromDatabaseError(error, query = null) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return new ValidationError('database', query, 'Constraint violation')
    }
    if (error.code === 'SQLITE_BUSY') {
      return new DatabaseError('Database is busy', query)
    }
    return new DatabaseError(error.message, query)
  }

  static fromNetworkError(error) {
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return new ConnectionLostError()
    }
    if (error.status === 429) {
      return new RateLimitError(error.limit, error.window)
    }
    return new NetworkError(error.message)
  }

  static withCorrelation(error, correlationId) {
    if (error instanceof SonicError) {
      error.correlationId = correlationId
      return error
    }

    const sonicError = new SonicError(error.message, 'EXTERNAL_ERROR')
    sonicError.correlationId = correlationId
    sonicError.originalError = error
    return sonicError
  }
}

export class ErrorBoundary {
  constructor(logger, eventBus) {
    this.logger = logger
    this.eventBus = eventBus
    this.errorCounts = new Map()
    this.errorThresholds = {
      [CommandError.name]: 10,
      [DatabaseError.name]: 5,
      [NetworkError.name]: 3,
    }
  }

  async handleError(error, context = {}) {
    const correlationId = error.correlationId || uuidv4()

    this.countError(error)

    this.logger.error('Error occurred', {
      error: error.toJSON ? error.toJSON() : error,
      context,
      correlationId,
    })

    await this.eventBus.emitEvent('error:occurred', {
      error,
      context,
      correlationId,
    })

    if (this.shouldTakeAction(error)) {
      await this.takeAction(error, context)
    }

    return {
      handled: true,
      correlationId,
      userMessage: error.getUserMessage ? error.getUserMessage() : 'An error occurred',
    }
  }

  countError(error) {
    const key = error.constructor.name
    const now = Date.now()
    const window = 60000

    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, [])
    }

    const errors = this.errorCounts.get(key)
    errors.push(now)

    while (errors.length > 0 && errors[0] < now - window) {
      errors.shift()
    }
  }

  shouldTakeAction(error) {
    const key = error.constructor.name
    const threshold = this.errorThresholds[key]

    if (!threshold) return false

    const errors = this.errorCounts.get(key) || []
    return errors.length >= threshold
  }

  async takeAction(error, context) {
    const key = error.constructor.name

    switch (key) {
      case 'DatabaseError':
        await this.eventBus.emitEvent('system:database-degraded', { error, context })
        break
      case 'NetworkError':
        await this.eventBus.emitEvent('system:network-degraded', { error, context })
        break
      case 'CommandError':
        await this.eventBus.emitEvent('system:command-spam', { error, context })
        break
      default:
        await this.eventBus.emitEvent('system:critical-error', { error, context })
    }
  }
}

import { container } from './container.js'
container.singleton('errorBoundary', c => {
  return new ErrorBoundary(c.resolve('logger'), c.resolve('eventBus'))
})
