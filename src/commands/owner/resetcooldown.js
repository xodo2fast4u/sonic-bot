import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid, isOwner } from '../../utils/utils.js';
import { resetCooldown } from '../../utils/cooldown.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['resetcooldown', 'resetcd'],
  desc: "Reset a user's cooldowns (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    if (!isOwner(sender)) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    const command = args[0];

    if (!target && !command) {
      return text(
        `${e.cross} Mention a user or specify a command! Example: !resetcooldown @user pay`,
      );
    }

    if (target === 'all') {
      resetCooldown(sender);
      logger.info('[economy:resetcooldown] All cooldowns reset', { bot: sonic.user?.id, sender });
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

      logger.info('[economy:resetcooldown] Cooldowns reset', {
        bot: sonic.user?.id,
        target,
        command: resetCommand,
      });

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
