import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['profilepicture'],
  desc: 'Get, set or remove profile pictures',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub) return text(`${e.warn} Use: profilepicture <get|set|remove> ...`);

    try {
      if (sub === 'get') {
        const jidArg = parseJid(args[1]);
        const type = args[2] || 'preview';
        if (!jidArg) return text(`${e.warn} Provide JID.`);
        const result = await sonic.profilePictureUrl(jidArg, type);
        return text(`${e.check} Profile picture URL: ${result}`);
      }

      if (sub === 'set') {
        const jidArg = parseJid(args[1]);
        const url = args[2];
        if (!jidArg || !url) return text(`${e.warn} Use: profilepicture set <jid> <url>`);
        await sonic.updateProfilePicture(jidArg, { url });
        return text(`${e.check} Profile picture updated.`);
      }

      if (sub === 'remove') {
        const jidArg = parseJid(args[1]);
        if (!jidArg) return text(`${e.warn} Use: profilepicture remove <jid>`);
        await sonic.removeProfilePicture(jidArg);
        return text(`${e.check} Profile picture removed.`);
      }

      return text(`${e.warn} Unknown profilepicture action: ${sub}`);
    } catch (err) {
      return text(`${e.cross} Failed to manage profile picture. ${getErrorMessage(err) || ''}`);
    }
  },
};
