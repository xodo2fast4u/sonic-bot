import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businessprofile'],
  desc: 'Fetch a business profile by JID',

  run: async ({ text, sonic }, args) => {
    const jidArg = parseJid(args[0]);
    if (!jidArg) return text(`${e.warn} Use: businessprofile <jid>`);

    try {
      const result = await sonic.getBusinessProfile(jidArg);
      return text(`${e.check} Business profile:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch business profile. ${getErrorMessage(err) || ''}`);
    }
  },
};
