import { emoji as e } from '../../config/config.js';
import { checkPerms } from './_utils.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['setname'],
  desc: 'Change group name',

  run: async ({ text, sonic, msg }, args) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return;
    if (!args.length) return text(`${e.warn} Provide a name!`);

    try {
      await sonic.groupUpdateSubject(msg.key.remoteJid, args.join(' '));
      await text(`${e.check} Name updated!`);
    } catch (err) {
      logger.error('[group:setname]', err);
      await text(`${e.cross} Failed.`);
    }
  },
};
