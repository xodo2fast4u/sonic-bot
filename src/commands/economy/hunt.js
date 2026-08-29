import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';
import { COOLDOWN } from '../../utils/cooldown.js';

const ANIMALS = [
  { name: 'Rabbit', emoji: '🐇', min: 15, max: 45, rarity: 30 },
  { name: 'Fox', emoji: '🦊', min: 35, max: 80, rarity: 25 },
  { name: 'Deer', emoji: '🦌', min: 60, max: 130, rarity: 20 },
  { name: 'Wolf', emoji: '🐺', min: 100, max: 200, rarity: 15 },
  { name: 'Bear', emoji: '🐻', min: 180, max: 350, rarity: 8 },
  { name: 'Sonic', emoji: '🦔', min: 400, max: 750, rarity: 2 },
];

const HUNT_MESSAGES = [
  'tracked through dense forest',
  'waited silently in the bushes',
  'followed tracks through the mud',
  'set a clever trap',
  'stalked through the wilderness',
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['hunt', 'hunting'],
  desc: 'Go hunting for animals to sell',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'hunt', COOLDOWN.WORK + 15000))) return;

    if (random(1, 100) <= 20) {
      return text(
        `
╭━━━ 🏹 *HUNT* ━━━╮
┃
┃ ${e.cross} You came home empty-handed!
┃ The animals escaped your traps.
╰━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    const totalRarity = ANIMALS.reduce((sum, a) => sum + a.rarity, 0);
    const roll = random(1, totalRarity);
    let cumulative = 0;
    let prey = ANIMALS[0] ?? ANIMALS[0];

    for (const animal of ANIMALS) {
      cumulative += animal.rarity;
      if (roll <= cumulative) {
        prey = animal;
        break;
      }
    }

    const animal = prey ?? ANIMALS[0];
    if (!animal) {
      return text(`${e.cross} The woods were empty. Try again later.`);
    }

    const earned = random(animal.min, animal.max);
    const action = randomFrom(HUNT_MESSAGES);
    const newBalance = addCoins(sender, earned);

    const isSonic = animal.name === 'Sonic';
    const flavorLine = isSonic
      ? '🦔 You caught a Sonic impersonator. Somehow profitable.'
      : `You ${action} and bagged a ${animal.name}!`;

    await text(
      `
╭━━━ 🏹 *HUNT* ━━━╮
┃
┃ ${flavorLine}
┃ ${animal.emoji}
┃
┃ ${e.check} Earned: ${formatCoins(earned)}
┃ ${e.coin} Balance: ${formatCoins(newBalance ?? 0)}
╰━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
