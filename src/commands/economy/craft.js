import { emoji as e } from '../../config/config.js';
import { addItem, getInventory, removeItem } from '../../database/database.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {Record<string, { materials: Record<string, number> }>} */
const RECIPES = {
  circuit: {
    materials: { old_wire: 2, glass_shard: 1, scrap_metal: 1 },
  },
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['craft'],
  desc: 'Craft items from scavenged materials',

  run: async ({ text, msg }, args) => {
    const itemName = args[0]?.toLowerCase();
    if (!itemName || !RECIPES[itemName]) {
      return text(
        `${e.info} Available recipe: *circuit* (2 old_wire, 1 glass_shard, 1 scrap_metal). Use *!craft circuit*.`,
      );
    }

    const sender = resolveSender(msg);
    const inventory = getInventory(sender);
    const missingMaterials = Object.entries(RECIPES[itemName].materials).filter(
      ([material, quantity]) =>
        (inventory.find((entry) => entry.item_name === material)?.quantity ?? 0) < quantity,
    );

    if (missingMaterials.length) {
      return text(
        `${e.cross} You need more materials. Scavenge for materials first with *!scavenge*.`,
      );
    }

    for (const [material, quantity] of Object.entries(RECIPES[itemName].materials)) {
      removeItem(sender, material, quantity);
    }
    addItem(sender, itemName);

    return text(`${e.check} Crafted *${itemName}*!`);
  },
};
