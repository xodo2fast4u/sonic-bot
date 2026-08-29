import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';
import { COOLDOWN } from '../../utils/cooldown.js';

const ORES = [
  { name: 'Coal', emoji: '🪨', min: 10, max: 30 },
  { name: 'Iron', emoji: '⚙️', min: 25, max: 60 },
  { name: 'Gold', emoji: '🥇', min: 50, max: 110 },
  { name: 'Diamond', emoji: '💎', min: 100, max: 250 },
  { name: 'Emerald', emoji: '💚', min: 200, max: 400 },
];

const MINE_MESSAGES = [
  'dug deep into the earth',
  'blasted through solid rock',
  'found a hidden vein',
  'drilled for hours',
  'struck the motherload',
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['mine', 'dig'],
  desc: 'Go mining for valuable ores',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'mine', COOLDOWN.WORK))) return;

    const weights = [50, 30, 12, 6, 2];
    const roll = random(1, 100);
    let cumulativeWeight = 0;
    let selectedOre = ORES[0] ?? ORES[0];

    for (let i = 0; i < ORES.length; i++) {
      cumulativeWeight += weights[i] ?? 0;
      if (roll <= cumulativeWeight) {
        selectedOre = ORES[i] ?? selectedOre;
        break;
      }
    }

    const ore = selectedOre ?? ORES[0];
    if (!ore) {
      return text(`${e.cross} No ore was found. Try again later.`);
    }

    const earned = random(ore.min, ore.max);
    const action = randomFrom(MINE_MESSAGES);
    const newBalance = addCoins(sender, earned);

    if (newBalance === null || newBalance === undefined) {
      return text(`${e.cross} Something went wrong. Try again.`);
    }

    await text(
      `
╭━━━ ⛏️ *MINE* ━━━╮
┃
┃ You ${action} and found *${ore.name}!*
┃ ${ore.emoji}
┃
┃ ${e.check} Earned: ${formatCoins(earned)}
┃ ${e.coin} Balance: ${formatCoins(newBalance)}
╰━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
