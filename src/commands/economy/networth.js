import { emoji as e } from '../../config/config.js';
import { getUser, getInventory } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { jid, getTarget, resolveSender } from '../../utils/utils.js';
import { SHOP_ITEMS } from './shop.js';

/**
 * Appraise inventory value
 * @param {Array<{ item_name: string, quantity: number }>} items
 * @returns {number}
 */
const getInventoryValue = (items) => {
  return items.reduce((sum, item) => {
    const sItem = SHOP_ITEMS.find((s) => s.name.toLowerCase() === item.item_name.toLowerCase());
    const unitPrice = sItem ? sItem.price : 50;
    return sum + unitPrice * item.quantity;
  }, 0);
};

/**
 * Assign financial tier
 * @param {number} total
 * @returns {string}
 */
const getTier = (total) => {
  if (total < 1000) return '🛖 Broke Nomad';
  if (total < 5000) return '💼 Working Hustler';
  if (total < 25000) return '🏢 Middle Class Investor';
  if (total < 100000) return '🎩 High Roller';
  return '👑 Sonic Tycoon';
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['networth'],
  desc: 'View comprehensive financial balance sheet and asset valuation',

  run: async ({ text, mention, sonic, msg }) => {
    const sender = resolveSender(msg);
    const target = (await getTarget(msg, sonic)) || sender;
    const isSelf = jid.fromUser(target) === jid.fromUser(sender);

    const user = getUser(target);
    if (!user) {
      return text(`${e.cross} Profile not found.`);
    }

    const inventory = getInventory(target);
    const inventoryVal = getInventoryValue(inventory);
    const totalWealth = user.balance + user.bank + inventoryVal;
    const tier = getTier(totalWealth);

    const targetNumber = jid.fromUser(target);
    const headerTitle = isSelf
      ? 'YOUR FINANCIAL STATEMENT'
      : `@${targetNumber}'s FINANCIAL STATEMENT`;

    const content = `
📊 *${headerTitle}*
${e.user} Financial Tier: *${tier}*

💵 Liquid Cash: *${formatCoins(user.balance)}*
🏦 Bank Savings: *${formatCoins(user.bank)}*
🎒 Inventory Assets: *${formatCoins(inventoryVal)}* (${inventory.length} items)

💎 *TOTAL NET WORTH*: *${formatCoins(totalWealth)}*
📈 Lifetime Earned: *${formatCoins(user.totalEarned)}*
`.trim();

    if (isSelf) {
      await text(content);
    } else {
      await mention(content, [target]);
    }
  },
};
