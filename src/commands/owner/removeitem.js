import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { removeItem, getInventory } from '../../database/database.js';
import { getShopItem } from '../economy/shop.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['removeitem'],
  desc: "Remove items from a user's inventory (Owner only)",
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const target = await getTarget(msg, sonic);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to remove items from them!`);
    }

    const itemArgs = args[0]?.startsWith('@') ? args.slice(1) : args;
    const quantityToken = itemArgs.at(-1);
    const hasQuantity = quantityToken && /^\d+$/.test(quantityToken);
    const quantity = hasQuantity ? Number(quantityToken) : 1;
    const itemName = (hasQuantity ? itemArgs.slice(0, -1) : itemArgs).join(' ').trim();

    if (!itemName) {
      return text(`${e.cross} Provide an item name! Example: !removeitem @user "Diamond Sword" 2`);
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return text(`${e.cross} Quantity must be a positive whole number!`);
    }

    const inventory = getInventory(target);
    const item = getShopItem(itemName);
    const normalizedItemName = itemName.toLowerCase();
    const storedItem = inventory.find((entry) => {
      const storedName = entry.item_name.toLowerCase();
      return (
        storedName === normalizedItemName ||
        (item && (storedName === item.id.toLowerCase() || storedName === item.name.toLowerCase()))
      );
    });

    if (!storedItem || storedItem.quantity < quantity) {
      return text(`${e.cross} User doesn't have ${quantity}x ${item?.name || itemName}!`);
    }

    removeItem(target, storedItem.item_name, quantity);
    const updatedInventory = getInventory(target);
    const totalItems = updatedInventory.reduce((sum, entry) => sum + entry.quantity, 0);
    const targetNum = jid.fromUser(target);

    logger.info('[economy:removeitem] Item removed', {
      bot: sonic.user?.id,
      target,
      itemName: storedItem.item_name,
      quantity,
      totalItems,
    });

    await text(
      `
${e.admin} *ITEM REMOVED*

${e.user} Target: @${targetNum}
${e.cross} Item: ${item?.name || storedItem.item_name}
${e.check} Quantity: -${quantity}
${e.menu} Inventory total: ${totalItems} item(s)
`.trim(),
    );
  },
};
