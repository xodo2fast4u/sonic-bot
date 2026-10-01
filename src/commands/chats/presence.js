import { emoji as e } from '../../config/config.js';
import { parseJid } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['presence'],
  desc: 'Manage presence subscriptions and status',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub) return text(`${e.warn} Use: presence <subscribe|update> ...`);

    try {
      if (sub === 'subscribe') {
        const target = parseJid(args[1]);
        if (!target) return text(`${e.warn} Provide JID or number to subscribe.`);
        const result = await sonic.presenceSubscribe(target);
        return text(`${e.check} Subscribed: ${JSON.stringify(result)}`);
      }

      if (sub === 'update') {
        const value = args[1]?.toLowerCase();
        if (!value || !['available', 'unavailable'].includes(value))
          return text(`${e.warn} Use: presence update <available|unavailable>`);
        await sonic.sendPresenceUpdate(value);
        return text(`${e.check} Presence updated to ${value}.`);
      }

      return text(`${e.warn} Unknown presence action: ${sub}`);
    } catch (err) {
      return text(`${e.cross} Failed to manage presence. ${getErrorMessage(err) || ''}`);
    }
  },
};
