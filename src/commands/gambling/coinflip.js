import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['coinflip', 'cf', 'flip'],
  desc: 'Flip a coin — heads or tails',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'coinflip', 8000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const choice = args[0]?.toLowerCase();
    const isChoiceWord = ['heads', 'tails', 'h', 't'].includes(choice ?? '');

    if (!isChoiceWord) {
      return text(`${e.cross} Pick *heads* or *tails*!\nExample: !coinflip heads 100`);
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !coinflip heads 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const normalizedChoice =
      choice === 'h' ? 'heads' : choice === 't' ? 'tails' : (choice ?? 'heads');
    const landed = random(0, 1) === 0 ? 'heads' : 'tails';
    const won = normalizedChoice === landed;
    const coinEmoji = landed === 'heads' ? '🟡' : '⚫';

    if (won) {
      addCoins(sender, bet);
    } else {
      removeCoins(sender, bet);
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    await text(
      `
╭━━━ 🪙 *COIN FLIP* ━━━╮
┃
┃ ${coinEmoji} Landed: *${landed.toUpperCase()}*
┃ Your pick: *${normalizedChoice.toUpperCase()}*
┃
┃ ${won ? `${e.check} Won: ${formatCoins(bet)}` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
