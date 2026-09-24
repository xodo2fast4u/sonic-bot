import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender, send } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['slots'],
  desc: 'Gamble your coins (50/50)',

  run: async ({ text, edit, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    const user = getUser(sender);
    if (!user) {
      return text(`${e.cross} Could not load your balance.`);
    }

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet! Example: !slots 100 or !slots all`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    if (!(await checkEconCooldown(sonic, msg, 'slots', 10 * 60 * 1000))) return;

    removeCoins(sender, bet);

    const spinningMessage = await send.text(
      sonic,
      msg,
      `🎰 *SONIC SLOTS*\n\n~[ ❔ | ❔ | ❔ ]~\n\n🎰 The reels are spinning...`,
    );
    const slots = ['🍎', '🍊', '🍋', '🍇', '🍒', '💎', '7️⃣'];
    const result = [
      slots[random(0, slots.length - 1)],
      slots[random(0, slots.length - 1)],
      slots[random(0, slots.length - 1)],
    ];

    const isJackpot = result[0] === result[1] && result[1] === result[2];
    const isDouble = result[0] === result[1] || result[1] === result[2] || result[0] === result[2];

    let winnings = 0;
    let status;

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

    await new Promise((resolve) => {
      setTimeout(resolve, random(3000, 4000));
    });
    await edit(
      spinningMessage.key,
      `
🎰 *SONIC SLOTS*

~[ ${slots[random(0, slots.length - 1)]} | ${slots[random(0, slots.length - 1)]} | ${slots[random(0, slots.length - 1)]} ]~
~[ ${slots[random(0, slots.length - 1)]} | ${slots[random(0, slots.length - 1)]} | ${slots[random(0, slots.length - 1)]} ]~
[ ${result.join(' | ')} ]

${status}
${winnings > 0 ? `Won: ${formatCoins(winnings)}` : `Lost: ${formatCoins(bet)}`}
`.trim(),
    );
  },
};
