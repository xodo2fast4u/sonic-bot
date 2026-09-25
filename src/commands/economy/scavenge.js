import { emoji as e } from '../../config/config.js';
import { addCoins, addItem } from '../../database/database.js';
import { checkEconCooldown, formatCoins, random, randomFrom } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const LOCATIONS = [
  {
    name: 'neon alley',
    emoji: '🌃',
    materials: ['old_wire', 'glass_shard'],
    min: 15,
    max: 55,
  },
  {
    name: 'scrapyard',
    emoji: '🔩',
    materials: ['scrap_metal', 'old_wire'],
    min: 25,
    max: 75,
  },
  {
    name: 'night market',
    emoji: '🏮',
    materials: ['glass_shard', 'scrap_metal'],
    min: 20,
    max: 65,
  },
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['scavenge'],
  desc: 'Search for free salvage and loose coins',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);
    if (!(await checkEconCooldown(sonic, msg, 'scavenge', 8 * 60 * 1000))) return;

    const location = randomFrom(LOCATIONS);
    const material = randomFrom(location.materials);
    const earned = random(location.min, location.max);

    addItem(sender, material, 1);
    addCoins(sender, earned);

    await text(
      `
🧭 *SCAVENGE*

You searched the ${location.name} ${location.emoji} and found salvage.
${e.check} Loose coins: ${formatCoins(earned)}
${e.star} Material: ${material.replace('_', ' ')} x1
`.trim(),
    );
  },
};
