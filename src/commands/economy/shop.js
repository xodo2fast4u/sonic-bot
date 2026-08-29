import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, addItem } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

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

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['shop', 'store'],
  desc: 'Browse or buy items from the shop',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const action = args[0]?.toLowerCase();

    if (!action || action === 'list' || action === 'view') {
      const listing = SHOP_ITEMS.map(
        (item) =>
          `┃ ${item.emoji} *${item.name}* — ${formatCoins(item.price)}\n┃   ${item.desc} (ID: ${item.id})`,
      ).join('\n┃\n');

      return text(
        `
╭━━━ 🏪 *SHOP* ━━━╮
┃
${listing}
┃
┃ Buy with: !shop buy <id>
╰━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'buy') {
      const itemId = args[1]?.toLowerCase();
      const item = SHOP_ITEMS.find((i) => i.id === itemId);

      if (!item) {
        return text(`${e.cross} Item not found! Use !shop to see available items.`);
      }

      const user = getUser(sender);
      if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

      if (user.balance < item.price) {
        return text(
          `${e.cross} Not enough coins! You need ${formatCoins(item.price)} but have ${formatCoins(user.balance)}.`,
        );
      }

      addCoins(sender, -item.price);
      addItem(sender, item.id);

      const updatedUser = getUser(sender);

      return text(
        `
╭━━━ 🏪 *PURCHASE* ━━━╮
┃
┃ ${item.emoji} Bought: *${item.name}*
┃ ${e.cross} Paid: ${formatCoins(item.price)}
┃ ${e.coin} Balance: ${formatCoins(updatedUser?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    return text(`${e.cross} Unknown action. Use !shop or !shop buy <id>`);
  },
};
