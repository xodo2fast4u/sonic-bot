import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import {
  getCharacter,
  getUser,
  addCoins,
  trainCharacterStat,
  awardCommandXp,
} from '../../database/database.js';
import { calculateTraining } from '../../services/rpg-service.js';
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
      const atkCalc = calculateTraining(char.attack, char.isGod);
      const defCalc = calculateTraining(char.defense, char.isGod);
      const magCalc = calculateTraining(char.magical_power, char.isGod);

      return text(
        `
🏋️ *TRAINING DOJO*
Choose a stat to train:

⚔️ *Attack* (Current: ${char.displayAttack})
   Cost: ${char.isGod ? 'Free' : formatCoins(atkCalc.cost) + ' coins'}
   Command: *!train attack*

🛡️ *Defense* (Current: ${char.displayDefense})
   Cost: ${char.isGod ? 'Free' : formatCoins(defCalc.cost) + ' coins'}
   Command: *!train defense*

✨ *Magic* (Current: ${char.displayMagicalPower})
   Cost: ${char.isGod ? 'Free' : formatCoins(magCalc.cost) + ' coins'}
   Command: *!train magic*

ℹ️ *Note:* HP increases only on Level Up.
`.trim(),
      );
    }

    if (!char.isGod && !(await checkEconCooldown(sonic, msg, 'train', COOLDOWN.TRAIN))) {
      return;
    }

    const currentStatVal = char[targetStat];
    const { cost, gain } = calculateTraining(currentStatVal, char.isGod);

    if (!char.isGod && user.balance < cost) {
      return text(
        `${e.cross} Not enough coins! You need *${formatCoins(cost)}* coins to train but have *${formatCoins(user.balance)}*.`,
      );
    }

    if (!char.isGod) {
      addCoins(sender, -cost);
    }

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
    const balanceDisplay = char.isGod ? '∞' : formatCoins(getUser(sender)?.balance ?? 0);

    await text(
      `
🏋️ *TRAINING COMPLETED*

${statName} increased by *+${gain}*!
📊 New ${statName}: *${char.isGod ? '∞' : newStatVal}*

💰 Cost: ${char.isGod ? 'Free (Owner)' : formatCoins(cost) + ' coins'}
✨ XP Earned: *+${xpBonus}* XP
${e.coin} Balance: ${balanceDisplay} coins
`.trim(),
    );
  },
};
