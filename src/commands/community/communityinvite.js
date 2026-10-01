import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

const extractInviteCode = (value = '') => value.replace('https://chat.whatsapp.com/', '').trim();

/** @param {string[]} args @param {any} msg @param {any} sonic */
const parseTarget = async (args, msg, sonic) => {
  if (args[1]) return jid.toUser(args[1]);
  return await getTarget(msg, sonic);
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communityinvite'],
  desc: 'Manage community invite codes and invites',

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action)
      return text(
        `${e.warn} Use: communityinvite <invite|revoke|accept|info|revokev4|acceptv4> ...`,
      );

    try {
      if (action === 'invite') {
        const code = await sonic.communityInviteCode(msg.key.remoteJid);
        return text(`${e.check} Invite link: https://chat.whatsapp.com/${code}`);
      }

      if (action === 'revoke') {
        const code = await sonic.communityRevokeInvite(msg.key.remoteJid);
        return text(`${e.check} Invite revoked. New code: ${code}`);
      }

      if (action === 'accept') {
        const code = extractInviteCode(args[1]);
        if (!code) return text(`${e.warn} Provide invite code or link.`);
        const result = await sonic.communityAcceptInvite(code);
        return text(`${e.check} Joined community: ${result}`);
      }

      if (action === 'info') {
        const code = extractInviteCode(args[1]);
        if (!code) return text(`${e.warn} Provide invite code or link.`);
        const metadata = await sonic.communityGetInviteInfo(code);
        return text(
          `${e.check} Invite info:\nName: ${metadata.subject || 'Unknown'}\nID: ${metadata.id || 'Unknown'}`,
        );
      }

      if (action === 'revokev4') {
        const target = await parseTarget(args, msg, sonic);
        if (!target) return text(`${e.warn} Mention or provide invited user number.`);
        await sonic.communityRevokeInviteV4(msg.key.remoteJid, target);
        return text(`${e.check} Revoked v4 invite for ${target}`);
      }

      if (action === 'acceptv4') {
        const code = extractInviteCode(args[1]);
        if (!code) return text(`${e.warn} Provide invite code or link.`);
        const result = await sonic.communityAcceptInvite(code);
        return text(`${e.check} Joined community: ${result}`);
      }

      return text(`${e.warn} Unknown invite action: ${action}`);
    } catch (err) {
      await text(`${e.cross} Failed to ${action}. ${getErrorMessage(err) || ''}`);
    }
  },
};
