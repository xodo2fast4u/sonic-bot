import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { setBalance, setBank, getUser } from '../../database/database.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['setbalance'],
  desc: "Set a user's cash or bank balance (Owner only)",
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const target = await getTarget(msg, sonic);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to set their balance!`);
    }

    const amountArgs = args[0]?.startsWith('@') ? args.slice(1) : args;
    const field = amountArgs.length >= 2 ? amountArgs[0]?.toLowerCase() : 'cash';
    const amountToken = amountArgs.length >= 2 ? amountArgs[1] : amountArgs[0];
    const parsedAmount = Number(amountToken);
    if (
      !['cash', 'bank'].includes(field ?? '') ||
      !/^\d+$/.test(amountToken ?? '') ||
      !Number.isSafeInteger(parsedAmount)
    ) {
      return text(`${e.cross} Use !setbalance @user cash 1000 or !setbalance @user bank 1000`);
    }

    const targetUser = getUser(target);
    if (!targetUser) {
      return text(`${e.cross} Could not load wallet data for that user.`);
    }

    const oldBalance = targetUser.balance;
    const oldBank = targetUser.bank;
    if (field === 'bank') {
      setBank(target, parsedAmount);
    } else {
      setBalance(target, parsedAmount);
    }
    const updatedUser = getUser(target);
    const newBalance = updatedUser?.balance ?? oldBalance;
    const newBank = updatedUser?.bank ?? oldBank;
    const targetNum = jid.fromUser(target);

    logger.info('[economy:setbalance] Balance updated', {
      bot: sonic.user?.id,
      target,
      oldBalance,
      newBalance,
      oldBank,
      newBank,
      field,
    });

    await text(
      `
${e.admin} *BALANCE SET*

${e.user} Target: @${targetNum}
${e.cross} Old cash: ${formatCoins(oldBalance)}
${e.check} New cash: ${formatCoins(newBalance)}
${e.cross} Old bank: ${formatCoins(oldBank)}
${e.check} New bank: ${formatCoins(newBank)}

${e.ring} Set by: Owner
`.trim(),
    );
  },
};

/** @param {number} amount */
function formatCoins(amount) {
  return `${amount.toLocaleString()} ${e.coin}`;
}
