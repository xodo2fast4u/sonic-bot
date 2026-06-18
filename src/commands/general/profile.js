import { emoji as e } from '../../config/config.js';
import { jid, getTarget, resolveSender, isOwner } from '../../utils/utils.js';

export default {
  cmd: ['profile'],
  desc: 'User profile',

  run: async ({ sonic, msg }) => {
    const target = getTarget(msg) || resolveSender(msg);
    const num = jid.fromUser(target);

    let pp;
    try {
      pp = await sonic.profilePictureUrl(target, 'image');
    } catch (error) {}

    const text = `
╭━━━ ${e.user} *PROFILE* ━━━╮
┃ ${e.star} Number: +${num}
┃ ${e.admin} Owner: ${isOwner(target) ? 'Yes ✓' : 'No'}
╰━━━━━━━━━━━━━━━━━━━╯`.trim();

    await sonic.sendMessage(
      msg.key.remoteJid,
      pp ? { image: { url: pp }, caption: text, mentions: [target] } : { text, mentions: [target] },
      { quoted: msg },
    );
  },
};
