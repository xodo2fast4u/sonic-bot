import { emoji as e } from '../../config/config.js';

export default {
  cmd: ['speed'],
  desc: 'Bot speed test',

  run: async ({ text, react, edit, msg }) => {
    const start = Date.now();

    const sent = await text(`${e.sonic} Measuring speed...`);
    await react('⏳');

    const latency = Date.now() - start;

    await edit(sent.key, `⚡ *Speed:* ${latency}ms`);
    await react('⚡', msg.key);
  },
};
