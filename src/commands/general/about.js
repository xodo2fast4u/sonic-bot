import { config, emoji as e, getOwner } from '../../config/config.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['about'],
  desc: 'About this bot',

  run: async ({ text }) => {
    const owner = getOwner();
    const ownerDisplay = owner
      ? owner
          .split(',')
          .map((n) => `@${n.trim().replace(/[^0-9]/g, '')}`)
          .filter(Boolean)
          .join(', ')
      : 'Not configured';

    await text(
      `
╭━━━ ${e.sonic} *ABOUT ${config.botName.toUpperCase()}* ━━━╮
┃ ${e.star} Name: ${config.botName}
┃ ${e.rocket} Version: ${config.version}
┃ ${e.info} A WhatsApp bot with economic features
┃ ${e.bolt} Fast, reliable & feature-rich
┃ ${e.admin} Owner: ${ownerDisplay}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
