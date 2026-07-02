import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import { getUser, transferCoins } from '../../database/database.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { formatCoins, checkEconCooldown } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['pay'],
  desc: 'Pay coins to another user',

  run: async ({ mention, text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'pay', COOLDOWN.PAY))) return;

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to pay them!`);
    }

    if (target === sender) {
      return text(`${e.cross} You can't pay yourself!`);
    }

    const amount = parseInt(args[0] ?? '', 10) || parseInt(args[1] ?? '', 10);
    if (!amount || amount <= 0) {
      return text(`${e.cross} Provide a valid amount! Example: !pay @user 100`);
    }

    const result = transferCoins(sender, target, amount);

    if (!result.success) {
      const senderUser = getUser(sender);
      const balanceText = senderUser ? formatCoins(senderUser.balance) : 'unknown';
      return text(`${e.cross} Insufficient coins! You have ${balanceText}`);
    }

    const targetNum = jid.fromUser(target);

    await mention(
      `
╭━━━ ${e.ring} *PAYMENT* ━━━╮
┃
┃ ${e.check} Sent ${formatCoins(amount)}
┃ ${e.user} To: @${targetNum}
┃
┃ ${e.star} Your balance: ${formatCoins(result.fromBalance)}
╰━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      [target],
    );
  },
};
