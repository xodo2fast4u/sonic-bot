import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import {
  getInventory,
  getCharacter,
  setEquippedItem,
  setEquippedArmour,
  setEquippedAccessory,
} from '../../database/database.js';
import {
  getBattleItem,
  BATTLE_ITEMS,
  getArmourItem,
  ARMOUR_ITEMS,
  getAccessoryItem,
  ACCESSORY_ITEMS,
} from '../../services/rpg-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['equip'],
  desc: 'Equip a battle weapon, armour piece or accessory from your inventory',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);
    const inventory = getInventory(sender);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const query = args.join(' ').toLowerCase().trim();

    if (!query) {
      const ownedWeapons = inventory.map((i) => getBattleItem(i.item_name)).filter(Boolean);
      const ownedArmour = inventory.map((i) => getArmourItem(i.item_name)).filter(Boolean);
      const ownedAccessories = inventory.map((i) => getAccessoryItem(i.item_name)).filter(Boolean);

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

      const accessoryLines = ownedAccessories.length
        ? ownedAccessories
            .map(
              (acc) =>
                `• ${acc?.emoji} *${acc?.name}* (+${acc?.critChance}% Crit, +${acc?.xpBoost}% XP) - \`!equip ${acc?.id}\``,
            )
            .join('\n')
        : '• None (visit *!shop accessories* to buy accessories)';

      return text(
        `
⚔️ *YOUR GEAR*
🗡️ *Weapons:*
${weaponLines}

🛡️ *Armour:*
${armourLines}

💍 *Accessories:*
${accessoryLines}

Usage: *!equip <weapon_or_armour_or_accessory_id>*
`.trim(),
      );
    }

    const matchedWeapon = BATTLE_ITEMS.find(
      (b) => b.id.toLowerCase() === query || b.name.toLowerCase().includes(query),
    );

    const matchedArmour = ARMOUR_ITEMS.find(
      (a) => a.id.toLowerCase() === query || a.name.toLowerCase().includes(query),
    );

    const matchedAccessory = ACCESSORY_ITEMS.find(
      (acc) => acc.id.toLowerCase() === query || acc.name.toLowerCase().includes(query),
    );

    if (!matchedWeapon && !matchedArmour && !matchedAccessory) {
      return text(
        `${e.cross} "${args.join(' ')}" is not a valid weapon, armour or accessory! Check *!shop* for available gear.`,
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
🛡️ Defense Bonus: *+${matchedWeapon.defense}* DEF${matchedWeapon.statusEffect ? `\n⚠️ Status Effect: *${matchedWeapon.statusEffect.toUpperCase()}* (25% proc chance)` : ''}

You are ready for battle! Use *!fight @user* or *!rpghunt*
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
💨 Dodge Chance: *${matchedArmour.dodgeChance}%*

You are protected! Use *!fight @user* to battle.
`.trim(),
      );
    }

    if (matchedAccessory) {
      const ownsAccessory = inventory.some((i) => {
        const name = i.item_name.toLowerCase();
        return (
          name === matchedAccessory.id.toLowerCase() || name === matchedAccessory.name.toLowerCase()
        );
      });

      if (!ownsAccessory && !char.isGod) {
        return text(
          `${e.cross} You do not own *${matchedAccessory.name}* in your inventory! Buy it with *!shop buy ${matchedAccessory.id}*.`,
        );
      }

      if (!char.isGod && char.level < matchedAccessory.minLevel) {
        return text(
          `${e.cross} *Level Locked!* You must be at least *Level ${matchedAccessory.minLevel}* to wear *${matchedAccessory.name}*! (Your Level: ${char.level})`,
        );
      }

      setEquippedAccessory(sender, matchedAccessory.id);

      return text(
        `
💍 *ACCESSORY EQUIPPED*

${matchedAccessory.emoji} Accessory: *${matchedAccessory.name}*
⚡ Crit Chance: *+${matchedAccessory.critChance}%*
💥 Crit Damage: *+${matchedAccessory.critDamage}%*
✨ XP Boost: *+${matchedAccessory.xpBoost}%*
🪙 Coin Boost: *+${matchedAccessory.coinBoost}%*

Bonuses apply to all battles and hunts!
`.trim(),
      );
    }
  },
};
