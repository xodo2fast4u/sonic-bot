import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import { resetCooldown } from '../../utils/cooldown.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['resetcooldown', 'resetcd'],
  desc: "Reset a user's cooldowns (Owner only)",
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const target = getTarget(msg);
    const command = args[0]?.toLowerCase();

    if (!target && !command) {
      return text(
        `${e.cross} Mention a user or specify a command! Example: !resetcooldown @user pay`,
      );
    }

    const resetTarget = target || sender;
    const resetCommand = command === 'all' ? null : command || null;
    resetCooldown(resetTarget, resetCommand);
    const targetNum = jid.fromUser(resetTarget);

    const commandText = resetCommand ? ` for command: ${resetCommand}` : '';

    logger.info('[economy:resetcooldown] Cooldowns reset', {
      bot: sonic.user?.id,
      target: resetTarget,
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
  },
};
