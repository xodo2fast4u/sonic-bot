import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid, isOwner } from '../../utils/utils.js';
import { removeItem, hasItem, getInventory } from '../../database/database.js';
import logger from '../../utils/logger.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['removeitem'],
  desc: "Remove items from a user's inventory (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    if (!isOwner(sender)) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to remove items from them!`);
    }

    const itemName = args[0];
    const quantity = args[1] ? parseInt(args[1], 10) : 1;

    if (!itemName) {
      return text(`${e.cross} Provide an item name! Example: !removeitem @user "Diamond Sword" 2`);
    }

    if (quantity <= 0) {
      return text(`${e.cross} Quantity must be greater than 0!`);
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
