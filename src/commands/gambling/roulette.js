import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

/** @param {number} n */
const getColor = (n) => {
  if (n === 0) return 'green';
  return RED_NUMBERS.includes(n) ? 'red' : 'black';
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['roulette', 'rl'],
  desc: 'Spin the roulette wheel — bet red/black/green or a number',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'roulette', 12000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const betOn = args[0]?.toLowerCase();
    const validColors = ['red', 'black', 'green', 'r', 'b', 'g'];
    const numericBet = parseInt(betOn ?? '', 10);
    const isBettingNumber = !isNaN(numericBet) && numericBet >= 0 && numericBet <= 36;

    if (!betOn || (!validColors.includes(betOn) && !isBettingNumber)) {
      return text(
        `${e.cross} Invalid bet!\nBet on: *red / black / green* or a number *0-36*\nExample: !roulette red 100`,
      );
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !roulette red 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const landed = random(0, 36);
    const landedColor = getColor(landed);
    const colorEmoji = landedColor === 'red' ? '🔴' : landedColor === 'black' ? '⚫' : '🟢';

    let won = false;
    let multiplier = 0;

    if (isBettingNumber) {
      won = numericBet === landed;
      multiplier = 35;
    } else {
      const resolvedColor =
        betOn === 'r' ? 'red' : betOn === 'b' ? 'black' : betOn === 'g' ? 'green' : betOn;
      won = resolvedColor === landedColor;
      multiplier = resolvedColor === 'green' ? 17 : 1;
    }

    if (won) {
      addCoins(sender, bet * multiplier);
    } else {
      removeCoins(sender, bet);
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    await text(
      `
╭━━━ 🎡 *ROULETTE* ━━━╮
┃
┃ ${colorEmoji} Landed: *${landed}* (${landedColor})
┃ Your bet: *${betOn.toUpperCase()}*
┃
┃ ${won ? `${e.check} Won: ${formatCoins(bet * multiplier)} (x${multiplier + 1})` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
