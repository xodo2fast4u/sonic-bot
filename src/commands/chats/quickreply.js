import { emoji as e } from '../../config/config.js';
import { parseJson } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['quickreply'],
  desc: 'Add or remove quick replies',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub) return text(`${e.warn} Use: quickreply <add|remove> ...`);

    try {
      if (sub === 'add') {
        const payload = parseJson(args.slice(1).join(' '));
        if (!payload) return text(`${e.warn} Provide quick reply JSON.`);
        await sonic.addOrEditQuickReply(payload);
        return text(`${e.check} Quick reply added/updated.`);
      }

      if (sub === 'remove') {
        const timestamp = args[1];
        if (!timestamp) return text(`${e.warn} Use: quickreply remove <timestamp>`);
        await sonic.removeQuickReply(timestamp);
        return text(`${e.check} Quick reply removed.`);
      }

      return text(`${e.warn} Unknown quickreply action: ${sub}`);
    } catch (err) {
      return text(`${e.cross} Failed to manage quick replies. ${getErrorMessage(err) || ''}`);
    }
  },
};
