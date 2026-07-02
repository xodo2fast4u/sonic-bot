import { config, emoji as e } from '../../config/config.js';
import { format } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['info'],
  desc: 'Bot information',

  run: async ({ text }) => {
    await text(
      `
╭━━━ ${e.sonic} *${config.botName.toUpperCase()}* ━━━╮
┃ ${e.star} Version: ${config.version}
┃ ${e.time} Uptime: ${format.getUptime()}
┃ ${e.bolt} Prefix: ${config.prefix}
┃ ${e.info} The fastest bot!
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
