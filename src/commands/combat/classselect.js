import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import { getCharacter, setCharacterClass } from '../../database/database.js';
import { CHARACTER_CLASSES } from '../../services/rpg-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['classselect'],
  desc: 'Choose your RPG class (warrior / mage / rogue) one-time selection',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const classNames = Object.keys(CHARACTER_CLASSES);
    const choice = args[0]?.toLowerCase();

    if (!choice || choice === 'list' || choice === 'help') {
      const classLines = classNames
        .map((key) => {
          const cls = CHARACTER_CLASSES[key];
          if (!cls) return '';
          return `${cls.emoji} *${cls.name}*\n   ${cls.desc}\n   ATK ×${cls.atkMult} | DEF ×${cls.defMult} | MAG ×${cls.magMult} | +${cls.hpBonus} HP/lvl | ${cls.startingCritChance}% base crit`;
        })
        .filter(Boolean)
        .join('\n\n');

      const currentClass = char.character_class
        ? `\n\n⚔️ Your current class: *${CHARACTER_CLASSES[char.character_class]?.name || char.character_class}*`
        : '\n\n⚠️ You have not selected a class yet!';

      return text(
        `
🏛️ *CLASS SELECTION*
Choose your class to specialise your build. This affects stat growth every level-up.

${classLines}${currentClass}

${char.character_class ? '⚠️ You already have a class. Changing it is free but affects *future* level-up gains only existing stats are preserved.' : ''}
Use: *!classselect <warrior|mage|rogue>*
`.trim(),
      );
    }

    const cls = CHARACTER_CLASSES[choice];
    if (!cls) {
      return text(
        `${e.cross} Unknown class *"${choice}"*. Choose one of: *${classNames.join(', ')}*`,
      );
    }

    const wasAlreadyClass = char.character_class === choice;

    if (wasAlreadyClass) {
      return text(`${e.info} You are already a *${cls.name}*!`);
    }

    const prevClass = char.character_class ? CHARACTER_CLASSES[char.character_class]?.name : null;
    setCharacterClass(sender, choice);

    const changeNote = prevClass ? `\n\n📝 Previous class: *${prevClass}* → *${cls.name}*` : '';

    await text(
      `
${cls.emoji} *CLASS SELECTED: ${cls.name.toUpperCase()}*

${cls.desc}

📊 *Stat Growth Per Level-Up:*
⚔️ ATK multiplier: *×${cls.atkMult}*
🛡️ DEF multiplier: *×${cls.defMult}*
✨ MAG multiplier: *×${cls.magMult}*
❤️ Bonus HP per level: *+${cls.hpBonus}*
⚡ Base crit chance: *${cls.startingCritChance}%*${changeNote}

🚀 Your future level-ups will now follow *${cls.name}* growth!
`.trim(),
    );
  },
};
