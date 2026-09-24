import { emoji as e } from '../../config/config.js';
import {
  getUser,
  addCoins,
  addItem,
  getCharacter,
  setEquippedItem,
  setEquippedArmour,
} from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';
import {
  BATTLE_ITEMS,
  getBattleItem,
  ARMOUR_ITEMS,
  getArmourItem,
} from '../../services/rpg-service.js';

/** @type {{ id: string, name: string, emoji: string, price: number, desc: string }[]} */
export const SHOP_ITEMS = [
  { id: 'pickaxe', name: 'Pickaxe', emoji: '⛏️', price: 500, desc: 'Boost mine earnings' },
  { id: 'shield', name: 'Shield', emoji: '🛡️', price: 800, desc: 'Reduce rob losses by 50%' },
  { id: 'laptop', name: 'Laptop', emoji: '💻', price: 1200, desc: 'Boost work earnings' },
  { id: 'ring', name: 'Lucky Ring', emoji: '💍', price: 2000, desc: 'Increase beg success rate' },
  {
    id: 'speedrun',
    name: 'Sonic Sneakers',
    emoji: '👟',
    price: 3500,
    desc: 'Reduce all cooldowns by 20%',
  },
  { id: 'vault', name: 'Safe', emoji: '🔒', price: 5000, desc: 'Double bank interest' },
];

/**
 * Find any shop item by its canonical ID or display name.
 * @param {string} query
 */
export const getShopItem = (query) => {
  const normalizedQuery = query.toLowerCase().trim();
  return (
    SHOP_ITEMS.find(
      (item) =>
        item.id.toLowerCase() === normalizedQuery || item.name.toLowerCase() === normalizedQuery,
    ) ||
    getBattleItem(normalizedQuery) ||
    getArmourItem(normalizedQuery)
  );
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['shop'],
  desc: 'Browse or buy items and battle weapons from the shop',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const action = args[0]?.toLowerCase();

    if (!action || action === 'list' || action === 'view') {
      const utilityListing = SHOP_ITEMS.map(
        (item) =>
          `${item.emoji} *${item.name}* - ${formatCoins(item.price)} coins\n  ${item.desc} (ID: \`${item.id}\`)`,
      ).join('\n\n');

      const battleListing = BATTLE_ITEMS.map(
        (item) =>
          `${item.emoji} *${item.name}* [Lvl ${item.minLevel}+] - ${formatCoins(item.price)} coins\n  ${item.desc} (ID: \`${item.id}\`)`,
      ).join('\n\n');

      const armourListing = ARMOUR_ITEMS.map(
        (item) =>
          `${item.emoji} *${item.name}* [Lvl ${item.minLevel}+] - ${formatCoins(item.price)} coins\n  ${item.desc} (ID: \`${item.id}\`)`,
      ).join('\n\n');

      return text(
        `
🏪 *SONIC SHOP*

🛠️ *UTILITY ITEMS*
${utilityListing}

⚔️ *BATTLE WEAPONS*
${battleListing}

🛡️ *ARMOUR*
${armourListing}

💡 Buy with: *!shop buy <id>*
💡 Equip weapons: *!equip <id>*
💡 Equip armour: *!equip <id>*
`.trim(),
      );
    }

    if (action === 'buy') {
      const itemId = args[1]?.toLowerCase();
      if (!itemId) {
        return text(`${e.info} Provide an item ID! Example: !shop buy dragon_katana`);
      }

      const item = getShopItem(itemId);
      const battleItem = getBattleItem(itemId);
      const armourItem = getArmourItem(itemId);

      if (!item) {
        return text(`${e.cross} Item not found! Use *!shop* to see available items.`);
      }

      const char = getCharacter(sender, msg.pushName);
      const user = getUser(sender);

      if (!user) return text(`${e.cross} Could not load your balance.`);

      if (battleItem && !char.isGod) {
        if (char.level < battleItem.minLevel) {
          return text(
            `${e.cross} *Level Locked!* You must be at least *Level ${battleItem.minLevel}* to purchase the ${battleItem.emoji} *${battleItem.name}*!\nYour current level is *${char.level}*.`,
          );
        }
      }

      if (armourItem && !char.isGod) {
        if (char.level < armourItem.minLevel) {
          return text(
            `${e.cross} *Level Locked!* You must be at least *Level ${armourItem.minLevel}* to purchase ${armourItem.emoji} *${armourItem.name}*!\nYour current level is *${char.level}*.`,
          );
        }
      }

      if (!char.isGod && user.balance < item.price) {
        return text(
          `${e.cross} Not enough coins! You need *${formatCoins(item.price)}* coins but have *${formatCoins(user.balance)}*.`,
        );
      }

      if (!char.isGod) {
        addCoins(sender, -item.price);
      }

      addItem(sender, item.id);

      let equippedNote = '';
      if (battleItem) {
        if (!char.equipped_item) {
          setEquippedItem(sender, battleItem.id);
          equippedNote = `\n🗡️ *Auto-Equipped:* ${battleItem.emoji} ${battleItem.name} (+${battleItem.attack} ATK)`;
        } else {
          equippedNote = `\n💡 Equip it anytime with: *!equip ${battleItem.id}*`;
        }
      }

      if (armourItem) {
        if (!char.equipped_armour) {
          setEquippedArmour(sender, armourItem.id);
          equippedNote = `\n🛡️ *Auto-Equipped:* ${armourItem.emoji} ${armourItem.name} (+${armourItem.defense} DEF, +${armourItem.hp} HP)`;
        } else {
          equippedNote = `\n💡 Equip it anytime with: *!equip ${armourItem.id}*`;
        }
      }

      return text(
        `
🏪 *PURCHASE SUCCESS*

${item.emoji} Bought: *${item.name}*
💰 Paid: ${char.isGod ? 'Free (Owner Godmode)' : formatCoins(item.price) + ' coins'}${equippedNote}
`.trim(),
      );
    }

    return text(`${e.cross} Unknown action. Use *!shop* or *!shop buy <id>*`);
  },
};
