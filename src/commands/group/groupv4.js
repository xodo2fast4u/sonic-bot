import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import logger from '../../utils/logger.js';

/** @param {string[]} args @param {any} msg @param {any} sonic */
const parseTarget = async (args, msg, sonic) => {
  if (args[1]) return jid.toUser(args[1].replace(/[^0-9]/g, ''));
  return await getTarget(msg, sonic);
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['groupv4'],
  desc: 'Manage v4 group invites (accept/revoke)',

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action || !['accept', 'revoke'].includes(action))
      return text(`${e.warn} Use: groupv4 <accept|revoke> <code|mention>`);

    try {
      if (action === 'accept') {
        const code = args[1]?.replace('https://chat.whatsapp.com/', '')?.trim();
        if (!code) return text(`${e.warn} Provide invite code or link.`);
        const result = await sonic.groupAcceptInvite(code);
        return text(`${e.check} Joined: ${result}`);
      }

      const target = await parseTarget(args, msg, sonic);
      if (!target) return text(`${e.warn} Mention or provide invited user number.`);

      const actor = resolveSender(msg);
      await sonic.groupRevokeInviteV4(msg.key.remoteJid, target);
      await text(`${e.check} Revoked v4 invite for ${target} (by +${jid.fromUser(actor)})`);
    } catch (err) {
      logger.error(`[group:v4:${action}]`, err);
      await text(`${e.cross} Failed to ${action} v4 invite.`);
    }
  },
};
