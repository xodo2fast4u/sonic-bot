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
  cmd: ['monthly'],
  desc: 'Claim monthly reward (Requires Level 75+)',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const REQUIRED_LEVEL = 75;
    if (!char.isGod && char.level < REQUIRED_LEVEL) {
      return text(
        `🔒 *MONTHLY REWARD LOCKED!*\nYou must reach at least *Level ${REQUIRED_LEVEL}* to claim monthly rewards!\nYour current level is *${char.level}*.`,
      );
    }

    if (!char.isGod && !(await checkEconCooldown(sonic, msg, 'monthly', COOLDOWN.MONTHLY))) return;

    const base = 25000;
    const bonus = random(5000, 25000);
    const total = base + bonus;
    const xpBonus = 1000;

    addCoins(sender, total);
    awardCommandXp(sender, xpBonus, msg.pushName);
    claimPeriodicReward(sender, 'monthly');

    await text(
      `
🌙 *MONTHLY REWARD*

${e.check} Base: ${formatCoins(base)} coins
${e.bolt} Bonus: ${formatCoins(bonus)} coins
✨ XP Earned: +${xpBonus} XP
${e.rocket} Total Coins: *+${formatCoins(total)}*

Come back next month! ${e.sonic}
`.trim(),
    );
  },
};
