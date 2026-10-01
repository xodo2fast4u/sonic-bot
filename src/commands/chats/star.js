import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['star'],
  desc: 'Star or unstar a message',

  run: async ({ text, sonic }, args) => {
    const jidArg = parseJid(args[0]);
    const messageId = args[1];
    const value = args[2]?.toLowerCase() === 'true';
    if (!jidArg || !messageId || args[2] === undefined)
      return text(`${e.warn} Use: star <jid> <messageId> <true|false>`);

    try {
      await sonic.star(jidArg, [{ id: messageId }], value);
      return text(`${e.check} Star updated for ${messageId}.`);
    } catch (err) {
      return text(`${e.cross} Failed to update star. ${getErrorMessage(err) || ''}`);
    }
  },
};
