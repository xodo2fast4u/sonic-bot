import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, getInventory, removeItem } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';
import { SHOP_ITEMS } from './shop.js';

/**
 * Calculate resale value for an item
 * @param {string} itemName
 * @returns {number}
 */
const getItemValue = (itemName) => {
  const lower = itemName.toLowerCase();
  const shopItem = SHOP_ITEMS.find(
    (i) => i.id.toLowerCase() === lower || i.name.toLowerCase() === lower,
  );
  if (shopItem) {
    return Math.max(10, Math.floor(shopItem.price * 0.6));
  }
  return 50;
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['sell'],
  desc: 'Sell inventory items for coins',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'sell', 3000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const inventory = getInventory(sender);
    if (!inventory.length) {
      return text(`${e.cross} Your inventory is empty! Nothing to sell.`);
    }

    const target = args[0]?.toLowerCase();
    if (!target) {
      return text(
        `${e.info} Usage: !sell <item_name|id> [quantity] or !sell all\nUse !inventory to check your items.`,
      );
    }

    if (target === 'all') {
      let totalEarned = 0;
      let totalItems = 0;

      for (const item of inventory) {
        const val = getItemValue(item.item_name);
        const earned = val * item.quantity;
        totalEarned += earned;
        totalItems += item.quantity;
        removeItem(sender, item.item_name, item.quantity);
      }

      const newBalance = addCoins(sender, totalEarned);

      return text(
        `
╭━━━ 🏷️ *SOLD ALL ITEMS* ━━━╮
┃ ${e.check} Sold: *${totalItems}* items
┃ ${e.coin} Earned: *${formatCoins(totalEarned)}* coins
┃ ${e.star} Balance: *${formatCoins(newBalance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    const matchedItem = inventory.find(
      (i) =>
        i.item_name.toLowerCase() === target ||
        SHOP_ITEMS.find((s) => s.id.toLowerCase() === target)?.name.toLowerCase() ===
          i.item_name.toLowerCase(),
    );

    if (!matchedItem) {
      return text(`${e.cross} You don't have "${args[0]}" in your inventory!`);
    }

    const qty =
      args[1]?.toLowerCase() === 'all' ? matchedItem.quantity : parseInt(args[1] ?? '1', 10);
    if (isNaN(qty) || qty <= 0) {
      return text(`${e.cross} Invalid quantity! Example: !sell ${target} 2`);
    }

    if (qty > matchedItem.quantity) {
      return text(`${e.cross} You only have ${matchedItem.quantity}x of ${matchedItem.item_name}!`);
    }

    const unitValue = getItemValue(matchedItem.item_name);
    const totalEarnings = unitValue * qty;

    removeItem(sender, matchedItem.item_name, qty);
    const newBalance = addCoins(sender, totalEarnings);

    await text(
      `
╭━━━ 🏷️ *ITEM SOLD* ━━━╮
┃ ${e.check} Sold: *${matchedItem.item_name}* x${qty}
┃ ${e.coin} Earned: *${formatCoins(totalEarnings)}* coins
┃ ${e.star} Balance: *${formatCoins(newBalance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
