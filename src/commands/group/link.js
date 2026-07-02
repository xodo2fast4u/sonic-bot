import { emoji as e } from '../../config/config.js';
import { checkPerms } from './_utils.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['link'],
  desc: 'Get group invite link',

  run: async ({ text, sonic, msg }) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return;

    try {
      const code = await sonic.groupInviteCode(msg.key.remoteJid);
      await text(`${e.ring} *Invite Link:*\nhttps://chat.whatsapp.com/${code}`);
    } catch (err) {
      logger.error('[group:link]', err);
      await text(`${e.cross} Failed to get link.`);
    }
  },
};
