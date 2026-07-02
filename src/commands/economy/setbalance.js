import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import { setBalance, getUser } from '../../database/database.js';
import { getOwner } from '../../config/config.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['setbalance'],
  desc: "Set a user's balance (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const owner = getOwner();

    const senderNum = jid.fromUser(sender)?.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (senderNum !== owner) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to set their balance!`);
    }

    const amount = parseInt(args[0] ?? '', 10);
    const parsedAmount = Number.isNaN(amount) ? parseInt(args[1] ?? '', 10) : amount;
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      return text(`${e.cross} Provide a valid amount! Example: !setbalance @user 1000`);
    }

    const targetUser = getUser(target);
    if (!targetUser) {
      return text(`${e.cross} Could not load wallet data for that user.`);
    }

    const oldBalance = targetUser.balance;
    setBalance(target, parsedAmount);
    const updatedUser = getUser(target);
    const newBalance = updatedUser?.balance ?? parsedAmount;
    const targetNum = jid.fromUser(target);

    logger.info('[economy:setbalance] Balance updated', {
      bot: sonic.user?.id,
      target,
      oldBalance,
      newBalance,
    });

    await text(
      `
╭━━━ ${e.admin} *BALANCE SET* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.cross} Old: ${formatCoins(oldBalance)}
┃ ${e.check} New: ${formatCoins(newBalance)}
┃
┃ ${e.ring} Set by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};

/** @param {number} amount */
function formatCoins(amount) {
  return `${amount.toLocaleString()} ${e.coin}`;
}
