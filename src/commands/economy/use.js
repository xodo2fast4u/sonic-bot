import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, getInventory, removeItem } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';
import { SHOP_ITEMS } from './shop.js';

/** @type {Record<string, { effect: string, min: number, max: number, emoji: string }>} */
const ITEM_EFFECTS = {
  ring: {
    effect: 'The ring glows with Chaos energy, materializing coins from thin air!',
    min: 250,
    max: 600,
    emoji: '💍',
  },
  speedrun: {
    effect: 'You sprint at supersonic speed across Green Hill Zone collecting gold rings!',
    min: 400,
    max: 900,
    emoji: '👟',
  },
  laptop: {
    effect: 'You ran an automated trading algorithm that paid out healthy dividends!',
    min: 300,
    max: 750,
    emoji: '💻',
  },
  pickaxe: {
    effect: 'You broke open a mysterious crystal geode filled with shiny gold nuggets!',
    min: 150,
    max: 400,
    emoji: '⛏️',
  },
  shield: {
    effect: 'You recycled reinforced vibranium plating at the armory for top dollar!',
    min: 200,
    max: 500,
    emoji: '🛡️',
  },
  vault: {
    effect: 'You cracked open the vault secret compartment and recovered hidden treasure!',
    min: 600,
    max: 1400,
    emoji: '🔒',
  },
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['use'],
  desc: 'Use or activate an inventory item',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'use', 5000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const inventory = getInventory(sender);
    if (!inventory.length) {
      return text(`${e.cross} Your inventory is empty! Buy items with !shop buy <id>`);
    }

    const query = args[0]?.toLowerCase();
    if (!query) {
      return text(
        `${e.info} Usage: !use <item_name|id>\nCheck your available items with !inventory`,
      );
    }

    const matchedItem = inventory.find((i) => {
      const iName = i.item_name.toLowerCase();
      if (iName === query) return true;
      const shopMatch = SHOP_ITEMS.find(
        (s) => s.id.toLowerCase() === query || s.name.toLowerCase() === query,
      );
      return shopMatch && shopMatch.name.toLowerCase() === iName;
    });

    if (!matchedItem) {
      return text(`${e.cross} You do not have "${args[0]}" in your inventory!`);
    }

    const shopItem = SHOP_ITEMS.find(
      (s) => s.name.toLowerCase() === matchedItem.item_name.toLowerCase(),
    );
    const effectKey = shopItem?.id || matchedItem.item_name.toLowerCase();
    const effect = ITEM_EFFECTS[effectKey] ?? {
      effect: `You consumed ${matchedItem.item_name} and gained unexpected treasure!`,
      min: 100,
      max: 250,
      emoji: '✨',
    };

    const coinsGained = random(effect.min, effect.max);

    removeItem(sender, matchedItem.item_name, 1);
    addCoins(sender, coinsGained);

    await text(
      `
✨ *ITEM ACTIVATED*
${effect.emoji} Item: *${matchedItem.item_name}*

📜 ${effect.effect}

${e.check} Reward: *+${formatCoins(coinsGained)}* coins
`.trim(),
    );
  },
};
