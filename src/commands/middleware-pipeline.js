/**
 * Command Middleware Pipeline
 * Provides modular middleware system for command processing
 */
import { container } from '../core/container.js'
import { PermissionError, CooldownError } from '../core/errors.js'

/**
 * Middleware context
 */
export class MiddlewareContext {
  constructor(helpers, args, command, user, message) {
    this.helpers = helpers
    this.args = args
    this.command = command
    this.user = user
    this.message = message
    this.correlationId = this.generateCorrelationId()
    this.startTime = Date.now()
    this.data = new Map() // For middleware to share data
    this.stopped = false
    this.result = null
  }

  generateCorrelationId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  stop(result = null) {
    this.stopped = true
    this.result = result
  }

  set(key, value) {
    this.data.set(key, value)
  }

  get(key) {
    return this.data.get(key)
  }

  has(key) {
    return this.data.has(key)
  }
}

/**
 * Middleware Pipeline
 */
export class MiddlewarePipeline {
  constructor() {
    this.middlewares = []
    this.logger = null
    this.cooldownManager = null
    this.utils = null
    this.configManager = null
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize() {
    this.logger = container.resolve('logger')
    this.cooldownManager = container.resolve('cooldownManager')
    this.utils = container.resolve('utils')
    this.configManager = container.resolve('configManager')

    // Register default middlewares
    await this.registerDefaults()
  }

  /**
   * Add middleware to pipeline
   */
  use(middleware) {
    this.middlewares.push(middleware)
    return this
  }

  /**
   * Execute middleware pipeline
   */
  async execute(context) {
    const timer = this.logger.timer('middleware:pipeline')

    try {
      for (const middleware of this.middlewares) {
        if (context.stopped) {
          break
        }

        await middleware(context)
      }

      // If not stopped, execute the command
      if (!context.stopped) {
        const commandTimer = this.logger.timer(`command:${context.command.cmd[0]}`)

        try {
          await context.command.run(context.helpers, context.args)
          commandTimer.end(true, { user: context.user })

          this.logger.info('Command executed successfully', {
            command: context.command.cmd[0],
            user: context.user,
            duration: Date.now() - context.startTime,
            correlationId: context.correlationId,
          })
        } catch (error) {
          commandTimer.end(false, { user: context.user, error: error.message })
          throw error
        }
      }

      timer.end(true, {
        command: context.command.cmd[0],
        user: context.user,
        stopped: context.stopped,
      })

      return context.result
    } catch (error) {
      timer.end(false, {
        command: context.command.cmd[0],
        user: context.user,
        error: error.message,
      })

      await this.handleError(error, context)
      throw error
    }
  }

  /**
   * Handle middleware errors
   */
  async handleError(error, context) {
    this.logger.error('Middleware pipeline error', {
      error: error.message,
      command: context.command.cmd[0],
      user: context.user,
      correlationId: context.correlationId,
    })

    // Send user-friendly error message
    if (error.getUserMessage) {
      await context.helpers.text(error.getUserMessage())
    } else {
      await context.helpers.text('❌ An error occurred while processing your command.')
    }
  }

  /**
   * Register default middlewares
   */
  async registerDefaults() {
    // Authentication middleware
    this.use(this.createAuthenticationMiddleware())

    // Permission middleware
    this.use(this.createPermissionMiddleware())

    // Cooldown middleware
    this.use(this.createCooldownMiddleware())

    // Rate limiting middleware
    this.use(this.createRateLimitMiddleware())

    // Logging middleware
    this.use(this.createLoggingMiddleware())

    // Metrics middleware
    this.use(this.createMetricsMiddleware())
  }

  /**
   * Authentication middleware
   */
  createAuthenticationMiddleware() {
    return async context => {
      // Check if user is valid
      if (!context.user) {
        context.stop()
        await context.helpers.text('❌ Unable to identify user.')
        return
      }

      context.set('authenticated', true)
    }
  }

  /**
   * Permission middleware
   */
  createPermissionMiddleware() {
    return async context => {
      const command = context.command

      // Check if command requires owner permissions
      if (command.ownerOnly && !this.utils.isOwner(context.user)) {
        context.stop(new PermissionError('This command is restricted to the bot owner', context.user))
        await context.helpers.text('👑 This command is only available to the bot owner.')
        return
      }

      // Check if command requires admin permissions
      if (command.adminOnly) {
        const isAdmin = await this.checkAdminPermissions(context.user, context.message)

        if (!isAdmin) {
          context.stop(new PermissionError('This command requires admin permissions', context.user, 'admin'))
          await context.helpers.text('👑 This command requires admin privileges.')
          return
        }
      }

      context.set('authorized', true)
    }
  }

  /**
   * Cooldown middleware
   */
  createCooldownMiddleware() {
    return async context => {
      const command = context.command
      const user = context.user

      // Check command-specific cooldown
      if (command.cooldown) {
        const cooldown = this.cooldownManager.checkCommandCooldown(user, command.cmd[0], command.cooldown)

        if (!cooldown.allowed) {
          context.stop(new CooldownError(command.cmd[0], cooldown.remaining))
          await context.helpers.text(
            `⏱️ Please wait ${Math.ceil(cooldown.remaining / 1000)} seconds before using this command again.`
          )
          return
        }
      }

      // Check global cooldown
      const globalCooldown = this.cooldownManager.checkGlobalCooldown(user)

      if (!globalCooldown.allowed) {
        context.stop(new CooldownError('global', globalCooldown.remaining))

        switch (globalCooldown.action) {
          case 'warn':
            await context.helpers.text(
              `⏱️ Slow down! Wait *${this.cooldownManager.formatCooldown(globalCooldown.remaining)}* before using another command.`
            )
            break
          case 'react':
            await context.helpers.react('⏳')
            break
          case 'ignore':
            break
        }
        return
      }

      context.set('cooldownChecked', true)
    }
  }

  /**
   * Rate limiting middleware
   */
  createRateLimitMiddleware() {
    return async context => {
      const user = context.user
      const window = this.configManager.constant('RATE_LIMIT_WINDOW')
      const maxRequests = this.configManager.constant('RATE_LIMIT_MAX_REQUESTS')

      // This would integrate with a proper rate limiting service
      // For now, we'll just log it
      this.logger.debug('Rate limit check', {
        user,
        window,
        maxRequests,
        correlationId: context.correlationId,
      })

      context.set('rateLimited', false)
    }
  }

  /**
   * Logging middleware
   */
  createLoggingMiddleware() {
    return async context => {
      this.logger.info('Command processing started', {
        command: context.command.cmd[0],
        user: context.user,
        args: context.args,
        correlationId: context.correlationId,
      })

      // Store original helpers for logging
      const originalText = context.helpers.text

      // Wrap text method to log responses
      context.helpers.text = async message => {
        this.logger.debug('Command response', {
          command: context.command.cmd[0],
          user: context.user,
          message: message.substring(0, 200), // Truncate long messages
          correlationId: context.correlationId,
        })

        return await originalText(message)
      }

      context.set('logged', true)
    }
  }

  /**
   * Metrics middleware
   */
  createMetricsMiddleware() {
    return async context => {
      const startTime = Date.now()

      // Store completion handler
      context.set('metricsStart', startTime)

      // This will be called after command execution
      const originalRun = context.command.run

      context.command.run = async (...args) => {
        const result = await originalRun.apply(context.command, args)

        const duration = Date.now() - startTime

        // Record metrics
        this.logger.logPerformance(`command:${context.command.cmd[0]}`, duration, true, {
          user: context.user,
          argsCount: context.args.length,
        })

        return result
      }
    }
  }

  /**
   * Check admin permissions
   */
  async checkAdminPermissions(user, message) {
    // This would integrate with WhatsApp group admin checking
    // For now, we'll check if user is owner as a fallback
    return this.utils.isOwner(user)
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      middlewareCount: this.middlewares.length,
      middlewares: this.middlewares.map((m, index) => ({
        index,
        name: m.name || 'anonymous',
      })),
    }
  }

  /**
   * Clear pipeline
   */
  clear() {
    this.middlewares = []
    this.logger?.info('Middleware pipeline cleared')
  }
}

// Register as singleton
container.singleton('middlewarePipeline', () => new MiddlewarePipeline())
