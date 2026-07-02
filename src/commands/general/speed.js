import { emoji as e } from '../../config/config.js';
import { send } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['speed'],
  desc: 'Bot speed test',

  run: async ({ react, edit, sonic, msg }) => {
    const start = Date.now();

    const sent = await send.text(sonic, msg, `${e.sonic} Measuring speed...`);
    await react('⏳');

    const latency = Date.now() - start;

    await edit(sent.key, `⚡ *Speed:* ${latency}ms`);
    await react('⚡', msg.key);
  },
};
