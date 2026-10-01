import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['block'],
  desc: 'Fetch or update blocklist status',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub) return text(`${e.warn} Use: block <fetch|block|unblock> [jid]`);

    try {
      if (sub === 'fetch') {
        const result = await sonic.fetchBlocklist();
        return text(`${e.check} Blocklist:\n${JSON.stringify(result)}`);
      }

      const jidArg = parseJid(args[1]);
      if (!jidArg) return text(`${e.warn} Provide JID for block/unblock.`);
      if (!['block', 'unblock'].includes(sub))
        return text(`${e.warn} Use: block <fetch|block|unblock> [jid]`);

      await sonic.updateBlockStatus(jidArg, sub);
      return text(`${e.check} ${sub}ed ${jidArg}.`);
    } catch (err) {
      return text(`${e.cross} Failed to manage block status. ${getErrorMessage(err) || ''}`);
    }
  },
};
