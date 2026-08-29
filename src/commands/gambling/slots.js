import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['slots'],
  desc: 'Gamble your coins (50/50)',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'slots', 10000))) return;

    const user = getUser(sender);
    if (!user) {
      return text(`${e.cross} Could not load your wallet. Try again later.`);
    }

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet! Example: !slots 100 or !slots all`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    removeCoins(sender, bet);

    const slots = ['🍎', '🍊', '🍋', '🍇', '🍒', '💎', '7️⃣'];
    const result = [
      slots[random(0, slots.length - 1)],
      slots[random(0, slots.length - 1)],
      slots[random(0, slots.length - 1)],
    ];

    const isJackpot = result[0] === result[1] && result[1] === result[2];
    const isDouble = result[0] === result[1] || result[1] === result[2] || result[0] === result[2];

    let winnings = 0;
    let status = '';

    if (isJackpot) {
      winnings = bet * 5;
      status = `${e.rocket} JACKPOT! x5`;
      addCoins(sender, winnings);
    } else if (isDouble) {
      winnings = bet * 2;
      status = `${e.star} Double! x2`;
      addCoins(sender, winnings);
    } else {
      status = `${e.cross} Lost!`;
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    await text(
      `
╭━━━ 🎰 *SLOTS* ━━━╮
┃
┃ [ ${result.join(' | ')} ]
┃
┃ ${status}
┃ ${winnings > 0 ? `Won: ${formatCoins(winnings)}` : `Lost: ${formatCoins(bet)}`}
┃ ${e.ring} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
