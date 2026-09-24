import { emoji as e } from '../../config/config.js';
import { getUser, getInventory, hasItem, removeItem, addItem } from '../../database/database.js';
import { checkEconCooldown } from './_utils.js';
import { jid, getTarget, resolveSender } from '../../utils/utils.js';
import { SHOP_ITEMS } from './shop.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['gift'],
  desc: 'Gift an item from your inventory to another user',

  run: async ({ text, mention, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const target = await getTarget(msg, sonic);

    if (!target) {
      return text(`${e.cross} Mention someone to gift an item to!\nExample: !gift @user pickaxe 1`);
    }

    if (jid.fromUser(target) === jid.fromUser(sender)) {
      return text(`${e.cross} You cannot gift items to yourself!`);
    }

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const targetUser = getUser(target);
    if (!targetUser) return text(`${e.cross} Recipient profile could not be loaded.`);

    const cleanArgs = args.filter((a) => !a.startsWith('@'));
    const itemQuery = cleanArgs[0]?.toLowerCase();
    const qty = parseInt(cleanArgs[1] ?? '1', 10);

    if (!itemQuery) {
      return text(`${e.cross} Specify the item you want to gift!\nExample: !gift @user pickaxe 1`);
    }

    if (isNaN(qty) || qty <= 0) {
      return text(`${e.cross} Invalid quantity! Must be at least 1.`);
    }

    const inventory = getInventory(sender);
    const matched = inventory.find((i) => {
      const name = i.item_name.toLowerCase();
      if (name === itemQuery) return true;
      const sItem = SHOP_ITEMS.find(
        (s) => s.id.toLowerCase() === itemQuery || s.name.toLowerCase() === itemQuery,
      );
      return sItem && sItem.name.toLowerCase() === name;
    });

    if (!matched) {
      return text(`${e.cross} You do not have "${itemQuery}" in your inventory!`);
    }

    if (!hasItem(sender, matched.item_name, qty)) {
      return text(`${e.cross} You only have ${matched.quantity}x of ${matched.item_name}!`);
    }

    if (!(await checkEconCooldown(sonic, msg, 'gift', 5 * 60 * 1000))) return;

    removeItem(sender, matched.item_name, qty);
    addItem(target, matched.item_name, qty);

    const targetNumber = jid.fromUser(target);

    await mention(
      `
🎁 *GIFT SENT*
${e.check} Item: *${matched.item_name}* x${qty}
${e.user} To: @${targetNumber}

${e.star} Generosity makes the world go round!
`.trim(),
      [target],
    );
  },
};
