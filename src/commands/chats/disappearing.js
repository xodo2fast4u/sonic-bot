import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['disappearing'],
  desc: 'Fetch or set disappearing message duration',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub) return text(`${e.warn} Use: disappearing <fetch|set> ...`);

    try {
      if (sub === 'fetch') {
        const jids = args.slice(1).filter(Boolean);
        if (!jids.length) return text(`${e.warn} Use: disappearing fetch <jid1> [jid2]...`);
        const result = await sonic.fetchDisappearingDuration(...jids);
        return text(`${e.check} Disappearing durations:\n${JSON.stringify(result)}`);
      }

      if (sub === 'set') {
        const seconds = Number(args[1]);
        if (Number.isNaN(seconds)) return text(`${e.warn} Use: disappearing set <seconds>`);
        await sonic.updateDefaultDisappearingMode(seconds);
        return text(`${e.check} Default disappearing set to ${seconds}.`);
      }

      return text(`${e.warn} Use: disappearing <fetch|set> ...`);
    } catch (err) {
      return text(`${e.cross} Failed to manage disappearing mode. ${getErrorMessage(err) || ''}`);
    }
  },
};
