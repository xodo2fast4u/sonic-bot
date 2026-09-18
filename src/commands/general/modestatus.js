import { formatModeStatus } from '../../services/mode-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['modestatus'],
  desc: 'Show Sonic current operating mode',
  run: async ({ text, msg }) => {
    const chatJid = msg?.key?.remoteJid;
    await text(formatModeStatus(chatJid));
  },
};
