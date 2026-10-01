import { emoji as e } from '../../config/config.js';
import { parseKeyValueArgs } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businessprofile'],
  desc: 'Manage business profile settings',

  run: async ({ text, sonic }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action) return text(`${e.warn} Use: businessprofile <update|cover|removecover> ...`);

    try {
      if (action === 'update') {
        const payload = parseKeyValueArgs(args.slice(1));
        if (!Object.keys(payload).length)
          return text(
            `${e.warn} Provide profile fields like address=... email=... description=... website=... hours=<json>`,
          );

        const result = await sonic.updateBussinesProfile(payload);
        return text(`${e.check} Profile updated: ${JSON.stringify(result)}`);
      }

      if (action === 'cover') {
        const url = args[1];
        if (!url) return text(`${e.warn} Use: businessprofile cover <url>`);
        const id = await sonic.updateCoverPhoto({ url });
        return text(`${e.check} Cover updated: ${id}`);
      }

      if (action === 'removecover') {
        const id = args[1];
        if (!id) return text(`${e.warn} Use: businessprofile removecover <id>`);
        await sonic.removeCoverPhoto(id);
        return text(`${e.check} Cover photo removed.`);
      }

      return text(`${e.warn} Unknown profile action: ${action}`);
    } catch (err) {
      await text(`${e.cross} Failed to update business profile. ${getErrorMessage(err) || ''}`);
    }
  },
};
