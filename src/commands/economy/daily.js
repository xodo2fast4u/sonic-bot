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
  cmd: ['daily'],
  desc: 'Claim daily reward (Requires Level 5+)',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const REQUIRED_LEVEL = 5;
    if (!char.isGod && char.level < REQUIRED_LEVEL) {
      return text(
        `🔒 *DAILY REWARD LOCKED!*\nYou must reach at least *Level ${REQUIRED_LEVEL}* to claim daily rewards!\nYour current level is *${char.level}*.`,
      );
    }

    if (!char.isGod && !(await checkEconCooldown(sonic, msg, 'daily', COOLDOWN.DAILY))) return;

    const base = 300;
    const bonus = random(50, 300);
    const total = base + bonus;
    const xpBonus = 50;

    addCoins(sender, total);
    awardCommandXp(sender, xpBonus, msg.pushName);
    claimPeriodicReward(sender, 'daily');

    await text(
      `
${e.star} *DAILY REWARD*

${e.check} Base: ${formatCoins(base)} coins
${e.bolt} Bonus: ${formatCoins(bonus)} coins
✨ XP Earned: +${xpBonus} XP
${e.rocket} Total Coins: *+${formatCoins(total)}*

Come back in 24 hours! ${e.sonic}
`.trim(),
    );
  },
};
