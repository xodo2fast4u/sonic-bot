import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import { resetCooldown } from '../../utils/cooldown.js';
import { getOwner } from '../../config/config.js';

export default {
  cmd: ['resetcooldown', 'resetcd'],
  desc: "Reset a user's cooldowns (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const owner = getOwner();

    const senderNum = jid.fromUser(sender)?.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (senderNum !== owner) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    const command = args[0];

    if (!target && !command) {
      return text(`${e.cross} Mention a user or specify 'all' to reset cooldowns!`);
    }

    if (target === 'all') {
      resetCooldown(sender);
      return text(
        `
╭━━━ ${e.admin} *COOLDOWN RESET* ━━━╮
┃
┃ ${e.check} All your cooldowns have been reset!
┃
┃ ${e.ring} Reset by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (target) {
      const resetCommand = command || null;
      resetCooldown(target, resetCommand);
      const targetNum = jid.fromUser(target);

      const commandText = resetCommand ? ` for command: ${resetCommand}` : '';

      await text(
        `
╭━━━ ${e.admin} *COOLDOWN RESET* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.check} Cooldowns reset${commandText}
┃
┃ ${e.ring} Reset by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }
  },
};
