import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import {
  getCharacter,
  getUser,
  addCoins,
  trainCharacterStat,
  awardCommandXp,
} from '../../database/database.js';
import { calculateTraining, MIN_TRAINING_COST } from '../../services/rpg-service.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { checkEconCooldown, formatCoins } from '../economy/_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['train'],
  desc: 'Train your Attack, Defense or Magical Power using coins',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);
    const user = getUser(sender);

    if (!char || !user) {
      return text(`${e.cross} Could not load character profile.`);
    }

    const statChoice = args[0]?.toLowerCase();

    if (statChoice === 'hp' || statChoice === 'health' || statChoice === 'maxhp') {
      return text(
        `${e.cross} *HP cannot be trained!* Health increases automatically every time you level up!`,
      );
    }

    /** @type {Record<string, 'attack'|'defense'|'magical_power'>} */
    const validStats = {
      attack: 'attack',
      atk: 'attack',
      defense: 'defense',
      def: 'defense',
      magic: 'magical_power',
      mag: 'magical_power',
      power: 'magical_power',
    };

    const targetStat = statChoice ? validStats[statChoice] : null;

    if (!targetStat) {
      return text(
        `
🏋️ *TRAINING DOJO*
Choose a stat to train:

⚔️ *Attack* (Current: ${char.displayAttack})
   Minimum: ${formatCoins(MIN_TRAINING_COST)} coins
   Command: *!train attack <coins>*

🛡️ *Defense* (Current: ${char.displayDefense})
   Minimum: ${formatCoins(MIN_TRAINING_COST)} coins
   Command: *!train defense <coins>*

✨ *Magic* (Current: ${char.displayMagicalPower})
   Minimum: ${formatCoins(MIN_TRAINING_COST)} coins
   Command: *!train magic <coins>*

ℹ️ *Note:* Every ${formatCoins(MIN_TRAINING_COST)} coins trains +1 stat point. HP increases only on Level Up.
`.trim(),
      );
    }

    const trainingAmount = Number(args[1]);
    if (!Number.isInteger(trainingAmount) || trainingAmount < MIN_TRAINING_COST) {
      return text(
        `${e.cross} Training requires at least *${formatCoins(MIN_TRAINING_COST)}* coins. Example: *!train ${statChoice} 1000*`,
      );
    }

    if (!(await checkEconCooldown(sonic, msg, 'train', COOLDOWN.TRAIN))) {
      return;
    }

    const currentStatVal = char[targetStat];
    const { cost, gain } = calculateTraining(currentStatVal, trainingAmount);

    if (user.balance < cost) {
      return text(
        `${e.cross} Not enough coins! You need *${formatCoins(cost)}* coins to train but have *${formatCoins(user.balance)}*.`,
      );
    }

    addCoins(sender, -cost);

    const updated = trainCharacterStat(sender, targetStat, gain);
    const xpBonus = 25;
    awardCommandXp(sender, xpBonus, msg.pushName);

    const statName =
      targetStat === 'attack'
        ? '⚔️ Attack'
        : targetStat === 'defense'
          ? '🛡️ Defense'
          : '✨ Magical Power';

    const newStatVal = updated ? updated[targetStat] : currentStatVal + gain;

    await text(
      `
🏋️ *TRAINING COMPLETED*

${statName} increased by *+${gain}*!
📊 New ${statName}: *${newStatVal}*

💰 Cost: ${formatCoins(cost)} coins
✨ XP Earned: *+${xpBonus}* XP
`.trim(),
    );
  },
};
