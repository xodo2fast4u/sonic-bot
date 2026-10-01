import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['status'],
  desc: 'Fetch status for one or more JIDs',

  run: async ({ text, sonic }, args) => {
    const jids = args.map(parseJid).filter(Boolean);
    if (!jids.length) return text(`${e.warn} Use: status <jid1> [jid2]...`);

    try {
      const result = await sonic.fetchStatus(...jids);
      return text(`${e.check} Status:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch status. ${getErrorMessage(err) || ''}`);
    }
  },
};
