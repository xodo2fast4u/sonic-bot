import { config, emoji as e } from '../../config/config.js';

export default {
  cmd: ['about'],
  desc: 'About this bot',

  run: async ({ text }) => {
    await text(
      `
╭━━━ ${e.sonic} *ABOUT ${config.botName.toUpperCase()}* ━━━╮
┃ ${e.star} Name: ${config.botName}
┃ ${e.rocket} Version: ${config.version}
┃ ${e.info} A WhatsApp bot with economic features
┃ ${e.bolt} Fast, reliable & feature-rich
┃ ${e.admin} Owner: @${config.ownerNumber}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
