import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['cups'],
  desc: 'Follow the golden coin under three shuffled cups for 3x payout',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'cups', 6000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const cupChoice = parseInt(args[0] ?? '0', 10);
    if (![1, 2, 3].includes(cupChoice)) {
      return text(`${e.cross} Pick cup 1, 2, or 3!\nExample: !cups 2 100`);
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !cups 2 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const winningCup = random(1, 3);
    const won = cupChoice === winningCup;
    const payout = Math.floor(bet * 3);

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const updated = getUser(sender);

    const visualCups = [1, 2, 3].map((c) => (c === winningCup ? '🪙' : '🥤')).join('   ');
    const labelCups = '  [1]   [2]   [3]';

    await text(
      `
╭━━━ 🥤 *SHELL GAME* ━━━╮
┃ ${visualCups}
┃ ${labelCups}
┃
┃ Coin was under: Cup *${winningCup}*
┃ Your pick: Cup *${cupChoice}*
┃
┃ ${won ? `${e.check} Spot on! Won: *+${formatCoins(payout)}* (x3)` : `${e.cross} Empty cup! Lost: *-${formatCoins(bet)}*`}
┃ ${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
