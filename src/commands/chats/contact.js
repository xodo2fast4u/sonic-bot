import { emoji as e } from '../../config/config.js';
import { parseJid, parseJson } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['contact'],
  desc: 'Add, edit or remove contacts',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    const target = parseJid(args[1]);
    if (!sub || !target) return text(`${e.warn} Use: contact <add|edit|remove> <jid> [json]`);

    try {
      if (sub === 'remove') {
        await sonic.removeContact(target);
        return text(`${e.check} Contact removed: ${target}`);
      }

      const payload = parseJson(args.slice(2).join(' '));
      if (!payload) return text(`${e.warn} Provide contact payload JSON.`);

      await sonic.addOrEditContact(target, payload);
      return text(`${e.check} Contact ${sub}ed: ${target}`);
    } catch (err) {
      return text(`${e.cross} Failed to manage contact. ${getErrorMessage(err) || ''}`);
    }
  },
};
