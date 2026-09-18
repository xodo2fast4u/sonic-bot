import { emoji as e } from '../../config/config.js';
import {
  addCoins,
  getCharacter,
  awardCommandXp,
  claimPeriodicReward,
} from '../../database/database.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { random, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['weekly'],
  desc: 'Claim weekly reward (Requires Level 15+)',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const REQUIRED_LEVEL = 15;
    if (!char.isGod && char.level < REQUIRED_LEVEL) {
      return text(
        `🔒 *WEEKLY REWARD LOCKED!*\nYou must reach at least *Level ${REQUIRED_LEVEL}* to claim weekly rewards!\nYour current level is *${char.level}*.`,
      );
    }

    if (!char.isGod && !(await checkEconCooldown(sonic, msg, 'weekly', COOLDOWN.WEEKLY))) return;

    const base = 5000;
    const bonus = random(1000, 5000);
    const total = base + bonus;
    const xpBonus = 250;

    const newBalance = addCoins(sender, total);
    awardCommandXp(sender, xpBonus, msg.pushName);
    claimPeriodicReward(sender, 'weekly');

    await text(
      `
📅 *WEEKLY REWARD*

${e.check} Base: ${formatCoins(base)} coins
${e.bolt} Bonus: ${formatCoins(bonus)} coins
✨ XP Earned: +${xpBonus} XP
${e.rocket} Total Coins: *+${formatCoins(total)}*

${e.ring} Balance: ${char.isGod ? '∞' : formatCoins(newBalance ?? 0)}

Come back in 7 days! ${e.sonic}
`.trim(),
    );
  },
};
