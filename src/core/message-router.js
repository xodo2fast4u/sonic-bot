import { isJidStatusBroadcast } from 'baileys';
import { EventEmitter } from 'events';
import { container } from './container.js';
import { getErrorMessage } from '../utils/error-message.js';

export class MessageRouter extends EventEmitter {
  constructor() {
    super();
    /** @type {Array<(context: any) => Promise<boolean|void>>} */
    this.middlewares = [];
    this.commandRegistry = new Map();
    /** @type {any|null} */
    this.cooldownManager = null;
    /** @type {any|null} */
    this.logger = null;
  }

  async initialize() {
    this.cooldownManager = container.resolve('cooldownManager');
    this.logger = container.resolve('logger');
    this.commandRegistry = container.resolve('commandRegistry');

    this.logger.info('MessageRouter initialized');
  }

  /** @param {(context: any) => Promise<boolean|void>} middleware */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
  async processMessage(sonic, msg) {
    const context = {
      sonic,
      msg,
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId(),
    };

    try {
      for (const middleware of this.middlewares) {
        const result = await middleware(context);
        if (result === false) {
          return;
        }
      }

      await this.processCommand(context);
    } catch (error) {
      this.handleError(error, context);
    }
  }

  /** @param {{ sonic: any; msg: import('../../types/index.js').WhatsAppMessage; correlationId: string }} context */
  async processCommand(context) {
    const { sonic, msg, correlationId } = context;

    if (!msg.message || !msg.key.remoteJid || isJidStatusBroadcast(msg.key.remoteJid)) {
      return;
    }

    const text = await this.extractText(msg);
    if (!text || !text.startsWith(this.getPrefix())) {
      return;
    }

    const [cmdName, ...args] = this.parseCommand(text);
    const command = this.commandRegistry.get(cmdName?.toLowerCase());

    if (!command) {
      return;
    }

    const sender = this.resolveSender(msg);
    const cooldown = this.cooldownManager.checkGlobalCooldown(sender);

    if (!cooldown.allowed) {
      await this.handleCooldown(sonic, msg, cooldown);
      return;
    }

    const helpers = this.createHelpers(sonic, msg);

    try {
      await command.run(helpers, args);
      this.emit('command:executed', {
        command: cmdName,
        sender,
        correlationId,
      });
    } catch (error) {
      this.logger.error(`Command execution failed [${cmdName}]:`, getErrorMessage(error));
      await this.sendError(sonic, msg, error);
      this.emit('command:error', {
        command: cmdName,
        error,
        sender,
        correlationId,
      });
    }
  }

  /** @param {import('../../types/index.js').WhatsAppMessage} msg */
  async extractText(msg) {
    const { extractMessageContent } = await import('baileys');
    const m = extractMessageContent(msg.message);
    return (
      m?.conversation ||
      m?.extendedTextMessage?.text ||
      m?.imageMessage?.caption ||
      m?.videoMessage?.caption ||
      ''
    );
  }

  /** @param {string} text */
  parseCommand(text) {
    const prefix = this.getPrefix();
    return text.slice(prefix.length).trim().split(/\s+/);
  }

  getPrefix() {
    const config = container.resolve('config');
    return config.prefix;
  }

  /** @param {import('../../types/index.js').WhatsAppMessage} msg */
  resolveSender(msg) {
    const { jid } = container.resolve('utils');
    return jid.getSender(msg) || msg.key.participant || msg.key.remoteJid;
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
  createHelpers(sonic, msg) {
    const { send } = container.resolve('utils');

    return {
      /** @param {string} message */
      text: (message) => send.text(sonic, msg, message),
      /** @param {string} text @param {string[]} mentions */
      mention: (text, mentions) => send.mention(sonic, msg, text, mentions),
      /** @param {string} emoji @param {any} [key] */
      react: (emoji, key) => send.react(sonic, msg, emoji, key),
      /** @param {any} key @param {string} text */
      edit: (key, text) => send.edit(sonic, msg, key, text),
      /** @param {string} url @param {string} [caption] */
      image: (url, caption) => send.image(sonic, msg, url, caption),
      sonic,
      msg,
    };
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg @param {import('../../types/index.js').CooldownResult} cooldown */
  async handleCooldown(sonic, msg, cooldown) {
    const { emoji } = container.resolve('config');
    const { send } = container.resolve('utils');
    const { formatCooldown } = this.cooldownManager;

    switch (cooldown.action) {
      case 'warn':
        await send.text(
          sonic,
          msg,
          `${emoji.time} Slow down! Wait *${formatCooldown(cooldown.remaining)}* before using another command.`,
        );
        break;

      case 'react':
        await send.react(sonic, msg, '⏳');
        break;

      case 'ignore':
        break;
    }
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg @param {any} error */
  async sendError(sonic, msg, error) {
    const { send } = container.resolve('utils');
    await send.text(sonic, msg, `❌ Error: ${getErrorMessage(error)}`);
  }

  /** @param {any} error @param {{ correlationId: string; msg: import('../../types/index.js').WhatsAppMessage }} context */
  handleError(error, context) {
    this.logger.error('Message routing error:', getErrorMessage(error), {
      correlationId: context.correlationId,
      messageId: context.msg.key.id,
    });

    this.emit('router:error', { error, context });
  }

  generateCorrelationId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      middlewareCount: this.middlewares.length,
      registeredCommands: this.commandRegistry.size,
      uptime: process.uptime(),
    };
  }
}

container.singleton('messageRouter', () => new MessageRouter());
