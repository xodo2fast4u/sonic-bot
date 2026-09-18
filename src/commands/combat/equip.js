import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import {
  getInventory,
  getCharacter,
  setEquippedItem,
  setEquippedArmour,
} from '../../database/database.js';
import {
  getBattleItem,
  BATTLE_ITEMS,
  getArmourItem,
  ARMOUR_ITEMS,
} from '../../services/rpg-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['equip'],
  desc: 'Equip a battle weapon or armour piece from your inventory',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);
    const inventory = getInventory(sender);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const query = args.join(' ').toLowerCase().trim();

    if (!query) {
      const ownedWeapons = inventory.map((i) => getBattleItem(i.item_name)).filter(Boolean);
      const ownedArmour = inventory.map((i) => getArmourItem(i.item_name)).filter(Boolean);

      const weaponLines = ownedWeapons.length
        ? ownedWeapons
            .map((w) => `• ${w?.emoji} *${w?.name}* (+${w?.attack} ATK) - \`!equip ${w?.id}\``)
            .join('\n')
        : '• None (visit *!shop* to buy weapons)';

      const armourLines = ownedArmour.length
        ? ownedArmour
            .map(
              (a) =>
                `• ${a?.emoji} *${a?.name}* (+${a?.defense} DEF, +${a?.hp} HP, ${a?.magicResist}% MR) - \`!equip ${a?.id}\``,
            )
            .join('\n')
        : '• None (visit *!shop armour* to buy armour)';

      return text(
        `
⚔️ *YOUR GEAR*
🗡️ *Weapons:*
${weaponLines}

🛡️ *Armour:*
${armourLines}

Usage: *!equip <weapon_or_armour_id>*
`.trim(),
      );
    }

    const matchedWeapon = BATTLE_ITEMS.find(
      (b) => b.id.toLowerCase() === query || b.name.toLowerCase().includes(query),
    );

    const matchedArmour = ARMOUR_ITEMS.find(
      (a) => a.id.toLowerCase() === query || a.name.toLowerCase().includes(query),
    );

    if (!matchedWeapon && !matchedArmour) {
      return text(
        `${e.cross} "${args.join(' ')}" is not a valid weapon or armour piece! Check *!shop* for available gear.`,
      );
    }

    if (matchedWeapon) {
      const ownsWeapon = inventory.some((i) => {
        const name = i.item_name.toLowerCase();
        return name === matchedWeapon.id.toLowerCase() || name === matchedWeapon.name.toLowerCase();
      });

      if (!ownsWeapon && !char.isGod) {
        return text(
          `${e.cross} You do not own *${matchedWeapon.name}* in your inventory! Buy it first with *!shop buy ${matchedWeapon.id}*.`,
        );
      }

      if (!char.isGod && char.level < matchedWeapon.minLevel) {
        return text(
          `${e.cross} *Level Locked!* You must be at least *Level ${matchedWeapon.minLevel}* to equip *${matchedWeapon.name}*! (Your Level: ${char.level})`,
        );
      }

      setEquippedItem(sender, matchedWeapon.id);

      return text(
        `
⚔️ *WEAPON EQUIPPED*

${matchedWeapon.emoji} Weapon: *${matchedWeapon.name}*
⚔️ Attack Bonus: *+${matchedWeapon.attack}* ATK
🛡️ Defense Bonus: *+${matchedWeapon.defense}* DEF

You are ready for battle! Use *!fight @user*
`.trim(),
      );
    }

    if (matchedArmour) {
      const ownsArmour = inventory.some((i) => {
        const name = i.item_name.toLowerCase();
        return name === matchedArmour.id.toLowerCase() || name === matchedArmour.name.toLowerCase();
      });

      if (!ownsArmour && !char.isGod) {
        return text(
          `${e.cross} You do not own *${matchedArmour.name}* in your inventory! Buy it with *!shop buy ${matchedArmour.id}*.`,
        );
      }

      if (!char.isGod && char.level < matchedArmour.minLevel) {
        return text(
          `${e.cross} *Level Locked!* You must be at least *Level ${matchedArmour.minLevel}* to wear *${matchedArmour.name}*! (Your Level: ${char.level})`,
        );
      }

      setEquippedArmour(sender, matchedArmour.id);

      return text(
        `
🛡️ *ARMOUR EQUIPPED*

${matchedArmour.emoji} Armour: *${matchedArmour.name}*
🛡️ Defense Bonus: *+${matchedArmour.defense}* DEF
❤️ Health Bonus: *+${matchedArmour.hp}* HP (in combat)
✨ Magic Resist: *${matchedArmour.magicResist}%* reduction

You are protected! Use *!fight @user* to battle.
`.trim(),
      );
    }
  },
};
