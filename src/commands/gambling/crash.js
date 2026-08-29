import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/**
 * Generate a crash multiplier exponential distribution weighted to crash early
 * @returns {number}
 */
const generateCrash = () => {
  const r = Math.random();
  if (r < 0.35) return parseFloat((1 + Math.random() * 0.49).toFixed(2));
  if (r < 0.65) return parseFloat((1.5 + Math.random() * 1.49).toFixed(2));
  if (r < 0.85) return parseFloat((3 + Math.random() * 4.99).toFixed(2));
  if (r < 0.95) return parseFloat((8 + Math.random() * 11.99).toFixed(2));
  return parseFloat((20 + Math.random() * 80).toFixed(2));
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['crash'],
  desc: 'Bet before the rocket crashes pick your cash-out multiplier',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'crash', 10000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const cashoutMultiplier = parseFloat(args[0] ?? '');
    if (isNaN(cashoutMultiplier) || cashoutMultiplier < 1.01) {
      return text(`${e.cross} Set your cash-out multiplier (min 1.01x)!\nExample: !crash 2.0 100`);
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !crash 2.0 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const crashAt = generateCrash();
    const won = cashoutMultiplier <= crashAt;
    const payout = won ? Math.floor(bet * cashoutMultiplier) : 0;

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    const rocketLine = won
      ? `🚀 Rocket soared to *${crashAt}x* — you cashed at *${cashoutMultiplier}x!*`
      : `💥 Rocket crashed at *${crashAt}x* — you wanted *${cashoutMultiplier}x*`;

    await text(
      `
╭━━━ 🚀 *CRASH* ━━━╮
┃
┃ ${rocketLine}
┃
┃ ${won ? `${e.check} Won: ${formatCoins(payout)} (x${cashoutMultiplier})` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
