import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/**
 * Generate limbo roll multiplier using inverse probability distribution with ~4% house edge
 * @returns {number}
 */
const rollLimbo = () => {
  const r = Math.random();
  const mult = 0.96 / (1 - r);
  return parseFloat(Math.max(1.0, mult).toFixed(2));
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['limbo'],
  desc: 'Set a target multiplier (1.1x | 100x) and roll above it to win',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const targetMult = parseFloat(args[0] ?? '');
    if (isNaN(targetMult) || targetMult < 1.1 || targetMult > 100) {
      return text(
        `${e.cross} Choose a target multiplier between 1.10x and 100.00x!\nExample: !limbo 2.5 100`,
      );
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !limbo 2.5 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    if (!(await checkEconCooldown(sonic, msg, 'limbo', 2 * 60 * 1000))) return;

    const roll = rollLimbo();
    const won = roll >= targetMult;
    const payout = won ? Math.floor(bet * targetMult) : 0;

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const winChance = ((0.96 / targetMult) * 100).toFixed(1);

    await text(
      `
Target: *${targetMult}x* (Win Chance: ${winChance}%)
Rolled: *${roll}x*

${won ? `${e.check} Target Met! Won: *+${formatCoins(payout)}* (x${targetMult})` : `${e.cross} Under Target! Lost: *-${formatCoins(bet)}*`}
`.trim(),
    );
  },
};
