import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { normalizeBanTarget, setUserBanned } from '../../services/ban-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['unban'],
  desc: 'Allow a banned user to use the bot again (Owner only)',
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const mentionedTarget = await getTarget(msg, sonic);
    const target = mentionedTarget
      ? jid.toUser(jid.fromUser(mentionedTarget))
      : jid.toUser(normalizeBanTarget(args.join('')));

    if (!target || !jid.fromUser(target)) {
      return text(
        `${e.cross} Mention a user or provide their phone number. Example: !unban @user or number`,
      );
    }

    const changed = setUserBanned(target, false);
    const status = changed ? 'can use Sonic again.' : 'was not banned.';
    await text(`${e.check} @${jid.fromUser(target)} ${status}`);
  },
};
