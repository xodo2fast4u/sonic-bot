import { emoji as e } from "../../config/config.js";
import { getTarget, jid } from "../../utils/utils.js";
import { removeItem, hasItem, getInventory } from "../../database/database.js";
import { getOwner } from "../../config/config.js";

export default {
  cmd: ["removeitem"],
  desc: "Remove items from a user's inventory (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = jid.getSender(msg);
    const owner = getOwner();
    
    // Check if sender is owner
    const senderNum = jid.fromUser(sender)?.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (senderNum !== owner) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to remove items from them!`);
    }

    // Parse args: itemName and quantity
    const itemName = args[0];
    const quantity = parseInt(args[1]) || 1;

    if (!itemName) {
      return text(`${e.cross} Provide an item name! Example: !removeitem @user "Diamond Sword" 2`);
    }

    if (quantity <= 0) {
      return text(`${e.cross} Quantity must be greater than 0!`);
    }

    // Check if user has the item
    if (!hasItem(target, itemName, quantity)) {
      return text(`${e.cross} User doesn't have ${quantity}x ${itemName}!`);
    }

    removeItem(target, itemName, quantity);
    const inventory = getInventory(target);
    const targetNum = jid.fromUser(target);

    await text(
      `
╭━━━ ${e.admin} *ITEM REMOVED* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.cross} Item: ${itemName}
┃ ${e.check} Quantity: -${quantity}
┃
┃ ${e.ring} Removed by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
