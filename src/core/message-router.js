import { isJidStatusBroadcast } from 'baileys';
import { EventEmitter } from 'events';
import { container } from './container.js';
import { config as botConfig } from '../config/config.js';
import { MiddlewareContext } from '../commands/middleware-pipeline.js';
import '../commands/command-registry.js';
import '../commands/middleware-pipeline.js';
import { getErrorMessage } from '../utils/error-message.js';
import { jid, send } from '../utils/utils.js';

export class MessageRouter extends EventEmitter {
  /** @param {{ commandRegistry?: any, middlewarePipeline?: any }} [options] */
  constructor(options = {}) {
    super();
    /** @type {Array<(context: any) => Promise<boolean|void>>} */
    this.middlewares = [];
    /** @type {any|null} */
    this.commandRegistry = options.commandRegistry || null;
    /** @type {any|null} */
    this.middlewarePipeline = options.middlewarePipeline || null;
    /** @type {any|null} */
    this.cooldownManager = null;
    /** @type {any|null} */
    this.logger = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.cooldownManager = container.resolve('cooldownManager');
    this.logger = container.resolve('logger');
    this.commandRegistry ||= container.resolve('commandRegistry');
    this.middlewarePipeline ||= container.resolve('middlewarePipeline');

    await this.cooldownManager.initialize?.();
    await this.commandRegistry.initialize?.();
    await this.middlewarePipeline.initialize?.();

    this.middlewares = this.middlewarePipeline.middlewares;
    this.initialized = true;
    this.logger.info('MessageRouter initialized');
  }

  /** @param {(context: any) => Promise<boolean|void>} middleware */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
  async processMessage(sonic, msg) {
    await this.initialize();

    const context = {
      sonic,
      msg,
      timestamp: Date.now(),
      correlationId: this.generateCorrelationId(),
    };

    try {
      const process = () => this.processCommand(context);
      if (typeof this.logger.withCorrelationId === 'function') {
        await this.logger.withCorrelationId(context.correlationId, process);
      } else {
        await process();
      }
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
    if (!cmdName) {
      return;
    }

    const command = await this.commandRegistry.get(cmdName?.toLowerCase());
    if (!command) {
      return;
    }

    const sender = this.resolveSender(msg);
    const helpers = this.createHelpers(sonic, msg);
    const middlewareContext = new MiddlewareContext(helpers, args, command, sender, msg);
    middlewareContext.correlationId = correlationId;
    middlewareContext.set('commandName', cmdName);

    try {
      await this.middlewarePipeline.execute(middlewareContext);
      if (!middlewareContext.stopped) {
        this.emit('command:executed', {
          command: cmdName,
          sender,
          correlationId,
        });
      }
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
    const rawMessage = msg.message || {};
    const rawText =
      rawMessage.conversation ||
      rawMessage.extendedTextMessage?.text ||
      rawMessage.imageMessage?.caption ||
      rawMessage.videoMessage?.caption;

    if (rawText) return rawText;

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

  /** @param {string} text @returns {string[]} */
  parseCommand(text) {
    const prefix = this.getPrefix();
    const commandText = text.slice(prefix.length).trim();
    return Array.from(
      commandText.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g),
      (match) => match[1] ?? match[2] ?? match[3] ?? '',
    );
  }

  getPrefix() {
    return botConfig.prefix;
  }

  /** @param {import('../../types/index.js').WhatsAppMessage} msg */
  resolveSender(msg) {
    return jid.getSender(msg) || msg.key.participant || msg.key.remoteJid;
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
  createHelpers(sonic, msg) {
    return {
      /** @param {string} message */
      text: (message) => send.text(sonic, msg, message),
      /** @param {string} text @param {string[]} mentions */
      mention: (text, mentions) => send.mention(sonic, msg, text, mentions),
      /** @param {string} emoji @param {any} [key] */
      react: (emoji, key) => send.react(sonic, msg, emoji, key),
      /** @param {any} key @param {string} text */
      edit: (key, text) => send.edit(sonic, msg, key, text),
      /** @param {string|Buffer} source @param {string} [caption] @param {string} [mimetype] */
      image: (source, caption, mimetype) => send.image(sonic, msg, source, caption, mimetype),
      /** @param {Buffer} sticker */
      sticker: (sticker) => send.sticker(sonic, msg, sticker),
      sonic,
      msg,
    };
  }

  /** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg @param {any} error */
  async sendError(sonic, msg, error) {
    await send.text(sonic, msg, `❌ Error: ${getErrorMessage(error)}`);
  }

  /** @param {any} error @param {{ correlationId: string; msg: import('../../types/index.js').WhatsAppMessage }} context */
  handleError(error, context) {
    this.logger?.error('Message routing error:', getErrorMessage(error), {
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
      registeredCommands: this.commandRegistry?.commands?.size || 0,
      uptime: process.uptime(),
    };
  }
}

container.singleton('messageRouter', () => new MessageRouter());
