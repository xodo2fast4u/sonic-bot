import { emoji as e } from '../../config/config.js';
import { jid, send } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['leave'],
  desc: 'Leave group',

  run: async ({ sonic, msg }, args) => {
    const groupJid = args[0] ? jid.toUser(args[0]) : msg.key.remoteJid;

    if (!jid.isGroup(groupJid)) {
      return send.text(sonic, msg, `${e.cross} Group only!`);
    }

    await send.text(sonic, msg, `${e.sonic} Goodbye! ${e.speed}`);
    await sonic.groupLeave(groupJid);
  },
};
