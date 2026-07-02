import { emoji as e } from '../../config/config.js';
import { checkPerms } from './_utils.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['revoke'],
  desc: 'Reset group invite link',

  run: async ({ text, sonic, msg }) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return;

    try {
      const code = await sonic.groupRevokeInvite(msg.key.remoteJid);
      await text(`${e.check} Link revoked!\nNew: https://chat.whatsapp.com/${code}`);
    } catch (err) {
      logger.error('[group:revoke]', err);
      await text(`${e.cross} Failed to revoke.`);
    }
  },
};
