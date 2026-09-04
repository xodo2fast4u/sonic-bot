import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { removeItem, hasItem, getInventory } from '../../database/database.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['removeitem'],
  desc: "Remove items from a user's inventory (Owner only)",
  ownerOnly: true,

  run: async ({ text, sonic, msg }, args) => {
    const target = getTarget(msg);
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

    if (!hasItem(target, itemName, quantity)) {
      return text(`${e.cross} User doesn't have ${quantity}x ${itemName}!`);
    }

    removeItem(target, itemName, quantity);
    const inventory = getInventory(target);
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const targetNum = jid.fromUser(target);

    logger.info('[economy:removeitem] Item removed', {
      bot: sonic.user?.id,
      target,
      itemName,
      quantity,
      totalItems,
    });

    await text(
      `
╭━━━ ${e.admin} *ITEM REMOVED* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.cross} Item: ${itemName}
┃ ${e.check} Quantity: -${quantity}
┃ ${e.menu} Inventory total: ${totalItems} item(s)
┃
┃ ${e.ring} Removed by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
