import { areJidsSameUser } from 'baileys';
import { container } from '../core/container.js';
import { PermissionError, CooldownError } from '../core/errors.js';
import { getErrorMessage } from '../utils/error-message.js';
import { jid, resolveSender } from '../utils/utils.js';

export class MiddlewareContext {
  /**
   * @param {import('../../types/index.js').CommandHelpers} helpers
   * @param {string[]} args
   * @param {import('../../types/index.js').Command} command
   * @param {string} user
   * @param {any} message
   */
  constructor(helpers, args, command, user, message) {
    this.helpers = helpers;
    this.args = args;
    this.command = command;
    this.user = user;
    this.message = message;
    this.correlationId = this.generateCorrelationId();
    this.startTime = Date.now();
    this.data = new Map();
    this.stopped = false;
    /** @type {unknown} */
    this.result = null;
  }

  generateCorrelationId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** @param {unknown} [result] */
  stop(result = null) {
    this.stopped = true;
    this.result = result;
  }

  /** @param {string} key @param {unknown} value */
  set(key, value) {
    this.data.set(key, value);
  }

  /** @param {string} key */
  get(key) {
    return this.data.get(key);
  }

  /** @param {string} key */
  has(key) {
    return this.data.has(key);
  }
}

export class MiddlewarePipeline {
  constructor() {
    /** @type {((context: MiddlewareContext) => Promise<void>)[]} */
    this.middlewares = [];
    this.logger = null;
    this.cooldownManager = null;
    this.utils = null;
    this.configManager = null;
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.cooldownManager = container.resolve('cooldownManager');
    this.utils = container.resolve('utils');
    this.configManager = container.resolve('configManager');

    await this.registerDefaults();
  }

  /** @param {(context: MiddlewareContext) => Promise<void>} middleware */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /** @param {MiddlewareContext} context */
  async execute(context) {
    const timer = this.logger.timer('middleware:pipeline');

    try {
      for (const middleware of this.middlewares) {
        if (context.stopped) {
          break;
        }

        await middleware(context);
      }

      if (!context.stopped) {
        const commandTimer = this.logger.timer(`command:${context.command.cmd[0]}`);

        try {
          await context.command.run(context.helpers, context.args);
          commandTimer.end(true, { user: context.user });

          this.logger.info('Command executed successfully', {
            command: context.command.cmd[0],
            user: context.user,
            duration: Date.now() - context.startTime,
            correlationId: context.correlationId,
          });
        } catch (error) {
          commandTimer.end(false, { user: context.user, error: getErrorMessage(error) });
          throw error;
        }
      }

      timer.end(true, {
        command: context.command.cmd[0],
        user: context.user,
        stopped: context.stopped,
      });

      return context.result;
    } catch (error) {
      timer.end(false, {
        command: context.command.cmd[0],
        user: context.user,
        error: getErrorMessage(error),
      });

      await this.handleError(/** @type {Error} */ (error), context);
      throw error;
    }
  }

  /** @param {Error} error @param {MiddlewareContext} context */
  async handleError(error, context) {
    this.logger.error('Middleware pipeline error', {
      error: getErrorMessage(error),
      command: context.command.cmd[0],
      user: context.user,
      correlationId: context.correlationId,
    });

    if ('getUserMessage' in error && typeof error.getUserMessage === 'function') {
      await context.helpers.text(error.getUserMessage());
    } else {
      await context.helpers.text('❌ An error occurred while processing your command.');
    }
  }

  async registerDefaults() {
    this.use(this.createAuthenticationMiddleware());

    this.use(this.createPermissionMiddleware());

    this.use(this.createCooldownMiddleware());

    this.use(this.createRateLimitMiddleware());

    this.use(this.createLoggingMiddleware());

    this.use(this.createMetricsMiddleware());
  }

  createAuthenticationMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        if (!context.user) {
          context.stop();
          await context.helpers.text('❌ Unable to identify user.');
          return;
        }

        context.set('authenticated', true);
      }
    );
  }

  createPermissionMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        const command = context.command;

        if (command.ownerOnly && !this.utils.isOwner(context.user)) {
          context.stop(
            new PermissionError(
              'This command is restricted to the bot owner',
              context.user,
              /** @type {string | null} */ ('owner'),
            ),
          );
          await context.helpers.text('👑 This command is only available to the bot owner.');
          return;
        }

        if (command.adminOnly) {
          const isAdmin = await this.checkAdminPermissions(
            context.user,
            context.message,
            context.helpers.sonic,
          );

          if (!isAdmin) {
            context.stop(
              new PermissionError(
                'This command requires admin permissions',
                context.user,
                /** @type {string | null} */ ('admin'),
              ),
            );
            await context.helpers.text('👑 This command requires admin privileges.');
            return;
          }
        }

        context.set('authorized', true);
      }
    );
  }

  createCooldownMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        const command = context.command;
        const user = context.user;

        if (command.cooldown) {
          const cooldown = this.cooldownManager.checkCommandCooldown(
            user,
            command.cmd[0] ?? 'unknown',
            command.cooldown,
          );

          if (!cooldown.allowed) {
            context.stop(new CooldownError(command.cmd[0] ?? 'unknown', cooldown.remaining));
            await context.helpers.text(
              `⏱️ Please wait ${Math.ceil(cooldown.remaining / 1000)} seconds before using this command again.`,
            );
            return;
          }
        }

        const globalCooldown = this.cooldownManager.checkGlobalCooldown(user);

        if (!globalCooldown.allowed) {
          context.stop(new CooldownError('global', globalCooldown.remaining));

          switch (globalCooldown.action) {
            case 'warn':
              await context.helpers.text(
                `⏱️ Slow down! Wait *${this.cooldownManager.formatCooldown(globalCooldown.remaining)}* before using another command.`,
              );
              break;
            case 'react':
              await context.helpers.react('⏳');
              break;
            case 'ignore':
              break;
          }
          return;
        }

        context.set('cooldownChecked', true);
      }
    );
  }

  createRateLimitMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        const user = context.user;
        const chatId = context.message?.key?.remoteJid;
        const window = this.configManager.constant('RATE_LIMIT_WINDOW');
        const maxRequests = this.configManager.constant('RATE_LIMIT_MAX_REQUESTS');

        this.logger.debug('Rate limit check', {
          user,
          chatId,
          window,
          maxRequests,
          correlationId: context.correlationId,
        });

        context.set('rateLimited', false);
      }
    );
  }

  createLoggingMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        this.logger.info('Command processing started', {
          command: context.command.cmd[0],
          user: context.user,
          args: context.args,
          correlationId: context.correlationId,
        });

        const originalText = context.helpers.text;

        context.helpers.text = async (/** @type {string} */ message) => {
          this.logger.debug('Command response', {
            command: context.command.cmd[0],
            user: context.user,
            message: message.substring(0, 200),
            correlationId: context.correlationId,
          });

          return await originalText(message);
        };

        context.set('logged', true);
      }
    );
  }

  createMetricsMiddleware() {
    return /** @type {(context: MiddlewareContext) => Promise<void>} */ (
      async (context) => {
        const startTime = Date.now();

        context.set('metricsStart', startTime);

        const originalRun = context.command.run;

        context.command.run = async (...args) => {
          const result = await originalRun(
            .../** @type {[import('../../types/index.js').CommandHelpers, string[]]} */ (args),
          );

          const duration = Date.now() - startTime;

          this.logger.logPerformance(`command:${context.command.cmd[0]}`, duration, true, {
            user: context.user,
            argsCount: context.args.length,
          });

          return result;
        };
      }
    );
  }

  /**
   * @param {string} user
   * @param {any} message
   * @param {any} [sonic]
   */
  async checkAdminPermissions(user, message, sonic) {
    if (this.utils.isOwner(user)) {
      return true;
    }

    const groupJid = message?.key?.remoteJid;
    if (!groupJid || !jid.isGroup(groupJid) || !sonic) {
      return false;
    }

    const sender = resolveSender(message);
    const metadata = await sonic.groupMetadata(groupJid);
    const adminIds = metadata.participants
      .filter((/** @type {any} */ p) => p.admin)
      .map((/** @type {any} */ p) => p.id);

    return adminIds.some(
      (/** @type {string} */ id) =>
        areJidsSameUser(id, sender) ||
        areJidsSameUser(id, user) ||
        jid.fromUser(id) === jid.fromUser(sender),
    );
  }

  getStats() {
    return {
      middlewareCount: this.middlewares.length,
      middlewares: this.middlewares.map((m, index) => ({
        index,
        name: m.name || 'anonymous',
      })),
    };
  }

  clear() {
    this.middlewares = [];
    this.logger?.info('Middleware pipeline cleared');
  }
}

container.singleton('middlewarePipeline', () => new MiddlewarePipeline());
