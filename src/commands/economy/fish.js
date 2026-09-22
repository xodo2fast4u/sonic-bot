import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const CATCHES = [
  { name: 'Old Boot', emoji: '👟', value: 0, min: 0, max: 0, rarity: 20 },
  { name: 'Sardine', emoji: '🐟', value: 0, min: 8, max: 20, rarity: 30 },
  { name: 'Bass', emoji: '🐠', value: 0, min: 20, max: 50, rarity: 25 },
  { name: 'Salmon', emoji: '🐡', value: 0, min: 40, max: 90, rarity: 15 },
  { name: 'Tuna', emoji: '🦈', value: 0, min: 80, max: 150, rarity: 7 },
  { name: 'Golden Carp', emoji: '✨', value: 0, min: 200, max: 400, rarity: 2 },
  { name: 'Legendary Koi', emoji: '🏆', value: 0, min: 500, max: 900, rarity: 1 },
];

const FISH_MESSAGES = [
  'cast your line and waited patiently',
  'found the perfect fishing spot',
  'baited the hook expertly',
  'sat quietly by the river',
  'tried your luck in the deep sea',
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['fish'],
  desc: 'Go fishing for coins',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'fish', 5 * 60 * 1000))) return;

    const totalRarity = CATCHES.reduce((sum, c) => sum + c.rarity, 0);
    const roll = random(1, totalRarity);
    let cumulative = 0;
    let caught = CATCHES[0] ?? CATCHES[0];

    for (const fish of CATCHES) {
      cumulative += fish.rarity;
      if (roll <= cumulative) {
        caught = fish;
        break;
      }
    }

    const fish = caught ?? CATCHES[0];
    if (!fish) {
      return text(`${e.cross} No fish were available. Try again later.`);
    }

    const earned = fish.name === 'Old Boot' ? 0 : random(fish.min, fish.max);
    const action = randomFrom(FISH_MESSAGES);

    if (earned > 0) {
      addCoins(sender, earned);
    }

    const earningsLine =
      earned > 0
        ? `${e.check} Sold for: ${formatCoins(earned)}`
        : `${e.cross} Worth nothing. Toss it back!`;

    await text(
      `
You ${action}... ${fish.emoji} Caught: *${fish.name}*

${earningsLine}
`.trim(),
    );
  },
};
