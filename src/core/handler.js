import { isJidStatusBroadcast } from 'baileys';
import logger from '../utils/logger.js';
import { commands } from '../commands/index.js';
import { config, emoji as e } from '../config/config.js';
import { checkGlobalCooldown, formatCooldown } from '../utils/cooldown.js';
import { getText, send, resolveSender } from '../utils/utils.js';
import { getErrorMessage } from '../utils/error-message.js';

/** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
export const handleMessage = async (sonic, msg) => {
  if (!msg.message || !msg.key.remoteJid || isJidStatusBroadcast(msg.key.remoteJid)) return;

  const text = getText(msg);
  if (!text.startsWith(config.prefix)) return;

  const [cmdName, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  if (!cmdName) return;

  const cmd = commands.get(cmdName.toLowerCase());

  if (!cmd) return;

  const sender = resolveSender(msg);

  const cooldown = checkGlobalCooldown(sender);

  /*
   * Different cooldown actions provide flexibility in spam control: warnings inform
   * users explicitly, reactions give subtle feedback, and ignoring prevents any response
   * to reduce spam visibility.
   */
  if (!cooldown.allowed) {
    switch (cooldown.action) {
      case 'warn':
        await send.text(
          sonic,
          msg,
          `${e.time} Slow down! Wait *${formatCooldown(cooldown.remaining)}* before using another command.`,
        );
        return;

      case 'react':
        await send.react(sonic, msg, '⏳');
        return;

      case 'ignore':
        return;
    }
  }

  const helpers = {
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

  try {
    await cmd.run(helpers, args);
  } catch (err) {
    logger.error(`Error [${cmdName}]:`, getErrorMessage(err));
    await send.text(sonic, msg, `❌ Error: ${getErrorMessage(err)}`);
  }
};
