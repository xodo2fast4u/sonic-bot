import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import { getCharacter, setEquippedItem, setEquippedArmour } from '../../database/database.js';
import { getBattleItem, getArmourItem } from '../../services/rpg-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['unequip'],
  desc: 'Unequip your weapon or armour.',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const slot = args[0]?.toLowerCase();

    const hasWeapon = !!char.equipped_item;
    const hasArmour = !!char.equipped_armour;

    if (!slot && !hasWeapon && !hasArmour) {
      return text(
        `${e.info} You have nothing equipped!\nUsage: !unequip weapon | !unequip armour | !unequip all.`,
      );
    }

    if (!slot) {
      const weapon = getBattleItem(char.equipped_item);
      const armour = getArmourItem(char.equipped_armour);
      const weaponLine = weapon
        ? `⚔️ Weapon: ${weapon.emoji} *${weapon.name}*`
        : `⚔️ Weapon: None`;
      const armourLine = armour
        ? `🛡️ Armour: ${armour.emoji} *${armour.name}*`
        : `🛡️ Armour: None`;

      return text(
        `
🎽 *CURRENT GEAR*
${weaponLine}
${armourLine}

Unequip options:
• *!unequip weapon* - remove weapon
• *!unequip armour* - remove armour
• *!unequip all* - remove everything
`.trim(),
      );
    }

    const unequipWeapon = slot === 'weapon' || slot === 'all';
    const unequipArmour = slot === 'armour' || slot === 'all';

    if (!unequipWeapon && !unequipArmour) {
      return text(
        `${e.cross} Invalid slot! Use *!unequip weapon*, *!unequip armour* or *!unequip all*.`,
      );
    }

    const lines = [];

    if (unequipWeapon) {
      if (!hasWeapon) {
        lines.push(`⚔️ No weapon equipped (already bare-handed 👊)`);
      } else {
        const previousWeapon = getBattleItem(char.equipped_item);
        const weaponName = previousWeapon
          ? `${previousWeapon.emoji} ${previousWeapon.name}`
          : char.equipped_item;
        setEquippedItem(sender, null);
        lines.push(`⚔️ Unequipped weapon: *${weaponName}*`);
      }
    }

    if (unequipArmour) {
      if (!hasArmour) {
        lines.push(`🛡️ No armour equipped (already unprotected 💨)`);
      } else {
        const previousArmour = getArmourItem(char.equipped_armour);
        const armourName = previousArmour
          ? `${previousArmour.emoji} ${previousArmour.name}`
          : char.equipped_armour;
        setEquippedArmour(sender, null);
        lines.push(`🛡️ Unequipped armour: *${armourName}*`);
      }
    }

    await text(
      `
👊 *GEAR REMOVED*
${lines.join('\n')}

Re-equip anytime with *!equip <id>*
`.trim(),
    );
  },
};
