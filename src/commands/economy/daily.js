import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { random, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['daily', 'claim'],
  desc: 'Claim daily reward',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'daily', COOLDOWN.DAILY))) return;

    const base = 100;
    const bonus = random(0, 100);
    const total = base + bonus;

    const newBalance = addCoins(sender, total);

    await text(
      `
╭━━━ ${e.star} *DAILY REWARD* ━━━╮
┃
┃ ${e.check} Base: ${formatCoins(base)}
┃ ${e.bolt} Bonus: ${formatCoins(bonus)}
┃ ${e.rocket} Total: ${formatCoins(total)}
┃
┃ ${e.ring} Balance: ${formatCoins(newBalance)}
┃
┃ Come back tomorrow! ${e.sonic}
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
