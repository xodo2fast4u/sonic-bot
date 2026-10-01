import { emoji as e } from '../../config/config.js';
import { getTarget, isOwner, jid } from '../../utils/utils.js';
import { normalizeBanTarget, setUserBanned } from '../../services/ban-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['ban'],
  desc: 'Prevent a user from using the bot (Owner only)',
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const mentionedTarget = await getTarget(msg, sonic);
    const target = mentionedTarget
      ? jid.toUser(jid.fromUser(mentionedTarget))
      : jid.toUser(normalizeBanTarget(args.join('')));

    if (!target || !jid.fromUser(target)) {
      return text(
        `${e.cross} Mention a user or provide their phone number. Example: !ban @user or number`,
      );
    }

    if (isOwner(target, sonic)) {
      return text(`${e.cross} Bot owners cannot be banned.`);
    }

    const changed = setUserBanned(target, true);
    const status = changed ? 'is now banned from using Sonic.' : 'was already banned from Sonic.';
    await text(`${e.check} @${jid.fromUser(target)} ${status}`);
  },
};
